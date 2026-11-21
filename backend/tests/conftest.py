"""
Shared fixtures for the API test suite.

- A throwaway PostgreSQL is started with Docker (or TEST_DATABASE_URL is used),
  initialised with init_db.py (schema, seed data, migrations) and removed at the end.
- The backend runs as a real server process (tests/_server.py) with email stubbed.
- backend/.env is never read, and Neon URLs are refused, so the live database
  can't be touched by the tests.
"""
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

import bcrypt
import psycopg2
import psycopg2.extras
import pytest

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
PASSWORD = "Test@12345"
PASSWORD_HASH = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt(rounds=4)).decode()


# ── helpers ─────────────────────────────────────────────────────────────────
def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Resp:
    def __init__(self, status, body, headers):
        self.status = status
        self.raw = body
        self.headers = {k.lower(): v for k, v in headers.items()}
        try:
            self.json = json.loads(body) if body else None
        except ValueError:
            self.json = None

    @property
    def data(self):
        return (self.json or {}).get("data")

    @property
    def error(self):
        return (self.json or {}).get("error")

    def items(self):
        """The list inside data (orders / products / users / ...)."""
        d = self.data
        if isinstance(d, list):
            return d
        if isinstance(d, dict):
            for v in d.values():
                if isinstance(v, list):
                    return v
        return []

    def __repr__(self):
        return f"<{self.status} {self.raw[:200]!r}>"


class Api:
    def __init__(self, base: str):
        self.base = base

    def request(self, method, path, body=None, token=None, raw=None, headers=None, prefix="/api/v1"):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        req = urllib.request.Request(self.base + prefix + path, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return Resp(r.status, r.read(), dict(r.headers))
        except urllib.error.HTTPError as e:
            try:
                body = e.read()
            except Exception:
                body = b""
            return Resp(e.code, body, dict(e.headers))

    def get(self, path, **kw):    return self.request("GET", path, **kw)
    def post(self, path, body=None, **kw):  return self.request("POST", path, body, **kw)
    def put(self, path, body=None, **kw):   return self.request("PUT", path, body, **kw)
    def patch(self, path, body=None, **kw): return self.request("PATCH", path, body, **kw)
    def delete(self, path, **kw): return self.request("DELETE", path, **kw)

    def login(self, email, password=PASSWORD):
        r = self.post("/auth/login", {"email": email, "password": password})
        assert r.status == 200, r
        return r.data["token"]


class DB:
    def __init__(self, url):
        self.url = url

    def query(self, sql, args=()):
        conn = psycopg2.connect(self.url, sslmode="require", cursor_factory=psycopg2.extras.RealDictCursor)
        conn.autocommit = True
        try:
            with conn.cursor() as cur:
                cur.execute(sql, args)
                return cur.fetchall() if cur.description else None
        finally:
            conn.close()

    def one(self, sql, args=()):
        rows = self.query(sql, args)
        return rows[0] if rows else None

    def error_of(self, sql, args=()):
        """Run SQL expected to fail; return the psycopg2 error class name (or None)."""
        try:
            self.query(sql, args)
            return None
        except psycopg2.Error as e:
            return type(e).__name__


# ── database ────────────────────────────────────────────────────────────────
def _wait_for_db(url, timeout=90):
    deadline, ok_in_a_row = time.time() + timeout, 0
    while time.time() < deadline:
        try:
            psycopg2.connect(url, sslmode="require", connect_timeout=3).close()
            ok_in_a_row += 1
            if ok_in_a_row >= 2:       # postgres restarts once after initdb
                return
        except psycopg2.OperationalError:
            ok_in_a_row = 0
        time.sleep(1)
    raise RuntimeError("test database did not become ready")


@pytest.fixture(scope="session")
def db_url():
    url = os.getenv("TEST_DATABASE_URL")
    container = None
    if not url:
        container = f"skb-test-{uuid.uuid4().hex[:8]}"
        port = free_port()
        subprocess.run(
            ["docker", "run", "-d", "--rm", "--name", container,
             "-e", "POSTGRES_PASSWORD=test", "-e", "POSTGRES_DB=skbtest",
             "-p", f"127.0.0.1:{port}:5432", "postgres:16",
             "-c", "ssl=on",
             "-c", "ssl_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem",
             "-c", "ssl_key_file=/etc/ssl/private/ssl-cert-snakeoil.key"],
            check=True, capture_output=True,
        )
        url = f"postgresql://postgres:test@127.0.0.1:{port}/skbtest"
    assert "neon.tech" not in url, "Refusing to run tests against the live Neon database"
    try:
        _wait_for_db(url)
        subprocess.run([sys.executable, str(ROOT / "init_db.py")], cwd=ROOT, check=True,
                       env={**os.environ, "DATABASE_URL": url, "PYTHONIOENCODING": "utf-8"},
                       capture_output=True)
        yield url
    finally:
        if container:
            subprocess.run(["docker", "rm", "-f", container], capture_output=True)


@pytest.fixture(scope="session")
def db(db_url):
    d = DB(db_url)
    d.query("UPDATE Users SET password = %s", (PASSWORD_HASH,))   # seed users get a known password
    return d


# ── backend server ──────────────────────────────────────────────────────────
def start_server(db_url, workdir: Path, rate_limit: bool):
    port = free_port()
    otp_file = workdir / f"otps-{port}.json"
    env = {
        **os.environ,
        "DATABASE_URL": db_url,
        "SECRET_KEY": "test-secret-key-0123456789abcdef0123456789abcdef",
        "FRONTEND_URL": "http://localhost:3100",
        "ENV": "production",
        "BREVO_API_KEY": "", "SENDER_EMAIL": "", "SENDER_NAME": "",
        "RATE_LIMIT_ENABLED": "true" if rate_limit else "false",
        "SKB_TEST_OTP_FILE": str(otp_file),
        "PORT": str(port),
        "PYTHONIOENCODING": "utf-8",
    }
    log = open(workdir / f"server-{port}.log", "w", encoding="utf-8")
    proc = subprocess.Popen([sys.executable, str(BACKEND / "tests" / "_server.py")],
                            env=env, cwd=BACKEND, stdout=log, stderr=subprocess.STDOUT)
    base = f"http://127.0.0.1:{port}"
    for _ in range(120):
        try:
            if urllib.request.urlopen(base + "/health", timeout=2).status == 200:
                break
        except Exception:
            if proc.poll() is not None:
                raise RuntimeError((workdir / f"server-{port}.log").read_text())
            time.sleep(0.25)
    return proc, base, otp_file, workdir / f"server-{port}.log", log


@pytest.fixture(scope="session")
def server(db, db_url, tmp_path_factory):
    proc, base, otp_file, log_path, log = start_server(db_url, tmp_path_factory.mktemp("server"), rate_limit=False)
    yield {"base": base, "otp_file": otp_file, "log": log_path}
    proc.terminate(); proc.wait(10); log.close()
    tracebacks = log_path.read_text(encoding="utf-8", errors="ignore").count("Traceback")
    assert tracebacks == 0, f"backend logged {tracebacks} traceback(s), see {log_path}"


@pytest.fixture(scope="session")
def api(server):
    return Api(server["base"])


@pytest.fixture(scope="session")
def read_otp(server):
    def _read(email):
        return json.loads(server["otp_file"].read_text())[email.lower()]
    return _read


# ── test data factories ─────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def make_user(db, api):
    def _make(role="customer", name=None):
        email = f"{role}-{uuid.uuid4().hex[:8]}@test.local"
        row = db.one(
            "INSERT INTO Users (name, email, password, role, is_verified) VALUES (%s, %s, %s, %s, TRUE) RETURNING user_id",
            (name or f"Test {role}", email, PASSWORD_HASH, role),
        )
        return {"id": row["user_id"], "email": email, "token": api.login(email)}
    return _make


@pytest.fixture(scope="session")
def make_product(db):
    def _make(stock=100, price=100, category_id=1, name=None):
        row = db.one(
            "INSERT INTO Products (name, price, stock_quantity, category_id) VALUES (%s, %s, %s, %s) RETURNING product_id",
            (name or f"Product {uuid.uuid4().hex[:6]}", price, stock, category_id),
        )
        return row["product_id"]
    return _make


@pytest.fixture(scope="session")
def place_order(api):
    def _place(customer, product_id, qty=1, address="Test Lane, Sangola"):
        assert api.post("/cart/", {"product_id": product_id, "quantity": qty}, token=customer["token"]).status == 200
        r = api.post("/orders/", {"delivery_address": address}, token=customer["token"])
        assert r.status == 200, r
        return r.data["order_id"]
    return _place


@pytest.fixture(scope="session")
def admin(api, make_user):
    return make_user("admin")


@pytest.fixture(scope="session")
def stock_of(db):
    return lambda pid: db.one("SELECT stock_quantity FROM Products WHERE product_id = %s", (pid,))["stock_quantity"]
