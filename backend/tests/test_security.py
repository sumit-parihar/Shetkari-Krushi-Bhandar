"""Access control, live updates, headers, limits and the error format."""
import json
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

import pytest

from conftest import Api, start_server


def test_role_guards(api, admin, make_user):
    c, d = make_user(), make_user("delivery_boy")
    assert api.get("/cart/").status == 401
    assert api.get("/cart/", token="x.y.z").status == 401
    assert api.get("/auth/users", token=c["token"]).status == 403
    assert api.get("/orders/admin", token=d["token"]).status == 403
    assert api.get("/cart/", token=admin["token"]).status == 403
    assert api.get("/dashboard/admin/export", token=c["token"]).status == 403


def test_customers_cannot_touch_each_others_data(api, make_user, make_product, place_order):
    a, b = make_user(), make_user()
    o = place_order(a, make_product(), 1)
    assert api.get(f"/orders/{o}/detail", token=b["token"]).status == 403
    assert api.patch(f"/orders/{o}/cancel", token=b["token"]).status == 403
    api.post("/cart/", {"product_id": make_product(), "quantity": 1}, token=a["token"])
    item = api.get("/cart/", token=a["token"]).items()[0]["cart_item_id"]
    assert api.patch(f"/cart/{item}", {"quantity": 2}, token=b["token"]).status == 404
    assert api.delete(f"/cart/{item}", token=b["token"]).status == 404


def test_sql_injection_probes_are_harmless(api, admin, db):
    users_before = db.one("SELECT COUNT(*) AS n FROM Users")["n"]
    for probe in ["' OR 1=1--", "%' UNION SELECT password FROM Users--", "1;DROP TABLE Users"]:
        q = urllib.parse.quote(probe)
        for path in [f"/products/search?keyword={q}", f"/orders/admin?search={q}", f"/auth/users?search={q}"]:
            assert api.get(path, token=admin["token"]).status < 500
    assert db.one("SELECT COUNT(*) AS n FROM Users")["n"] == users_before


def _listen(base, token, out, timeout=6):
    url = base + "/stream/updates" + (f"?token={urllib.parse.quote(token)}" if token else "")
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            out.append(("status", r.status))
            for line in r:
                if line.startswith(b"data:"):
                    out.append(json.loads(line[5:]))
                    return
    except urllib.error.HTTPError as e:
        out.append(("status", e.code))
    except Exception:
        pass


def test_live_updates_need_login_and_are_filtered(api, server, admin, make_user, make_product):
    anon = []
    _listen(server["base"], None, anon)
    assert ("status", 401) in anon

    owner, stranger, d = make_user(), make_user(), make_user("delivery_boy")
    pid = make_product()
    got = {k: [] for k in ("admin", "owner", "stranger", "delivery")}
    tokens = {"admin": admin["token"], "owner": owner["token"], "stranger": stranger["token"], "delivery": d["token"]}
    threads = [threading.Thread(target=_listen, args=(server["base"], tokens[k], got[k]), daemon=True) for k in got]
    [t.start() for t in threads]; time.sleep(1.5)
    api.post("/cart/", {"product_id": pid, "quantity": 1}, token=owner["token"])
    api.post("/orders/", {"delivery_address": "x"}, token=owner["token"])
    [t.join(8) for t in threads]
    received = {k: any(isinstance(x, dict) and x.get("type") == "new_order" for x in v) for k, v in got.items()}
    assert received == {"admin": True, "owner": True, "stranger": False, "delivery": False}


def test_csv_export_escapes_formulas(api, admin, make_user, make_product, place_order):
    c = make_user(name='=HYPERLINK("http://evil.example","x")')
    place_order(c, make_product(), 1, address="@SUM(1)")
    csv_text = api.get("/dashboard/admin/export", token=admin["token"]).raw.decode()
    assert "'=HYPERLINK" in csv_text and "'@SUM(1)" in csv_text


def test_security_headers_and_hidden_docs(api, server):
    r = api.get("/health", prefix="")
    h = r.headers
    assert h["x-content-type-options"] == "nosniff" and h["x-frame-options"] == "DENY"
    assert "default-src 'none'" in h["content-security-policy"] and "max-age" in h["strict-transport-security"]
    for path in ("/api/docs", "/api/redoc", "/api/openapi.json"):
        assert api.get(path, prefix="").status == 404


def test_cors(api):
    allowed = api.request("OPTIONS", "/auth/login", headers={"Origin": "http://localhost:3100", "Access-Control-Request-Method": "POST"})
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3100"
    for origin in ("https://evil.example", "http://localhost:3000"):     # localhost only in ENV=dev
        r = api.request("OPTIONS", "/auth/login", headers={"Origin": origin, "Access-Control-Request-Method": "POST"})
        assert "access-control-allow-origin" not in r.headers


def _chunked_post(base, path, size):
    host, port = base.replace("http://", "").split(":")
    s = socket.create_connection((host, int(port)), timeout=30)
    s.sendall(f"POST {path} HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked\r\n\r\n".encode())
    payload = b'{"email":"' + b"a" * max(0, size - 30) + b'","password":"x"}'
    try:
        for i in range(0, len(payload), 65536):
            part = payload[i:i + 65536]
            s.sendall(f"{len(part):x}\r\n".encode() + part + b"\r\n")
        s.sendall(b"0\r\n\r\n")
    except OSError:
        pass
    data = b""
    try:
        while b"\r\n" not in data:
            chunk = s.recv(4096)
            if not chunk:
                break
            data += chunk
    except OSError:
        pass
    s.close()
    return int(data.split(b" ")[1]) if data.startswith(b"HTTP/") else None


def _declared_size_post(base, path, size):
    """Send only the headers, declaring a big body. The server must answer 413 without
    reading it (sending the body too would race with the server closing the socket)."""
    host, port = base.replace("http://", "").split(":")
    with socket.create_connection((host, int(port)), timeout=30) as s:
        s.sendall(f"POST {path} HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\n"
                  f"Content-Length: {size}\r\n\r\n".encode())
        data = b""
        while b"\r\n" not in data:
            chunk = s.recv(4096)
            if not chunk:
                break
            data += chunk
    return int(data.split(b" ")[1]) if data.startswith(b"HTTP/") else None


def test_body_size_limit(server):
    assert _declared_size_post(server["base"], "/api/v1/auth/login", 1024 * 1024 + 10) == 413
    assert _chunked_post(server["base"], "/api/v1/auth/login", 1024 * 1024 + 5000) == 413
    assert _chunked_post(server["base"], "/api/v1/auth/login", 200) == 401


def test_every_error_has_the_same_shape(api, admin, make_user):
    c = make_user()
    cases = [("GET", "/cart/", None, 401), ("GET", "/auth/users", c["token"], 403), ("GET", "/nope", None, 404),
             ("DELETE", "/categories/", admin["token"], 405), ("GET", "/products/abc", None, 422),
             ("POST", "/categories/", admin["token"], 400)]
    for method, path, token, status in cases:
        r = api.request(method, path, token=token, raw=b"{bad" if method == "POST" else None)
        assert r.status == status, (path, r)
        assert r.json["success"] is False and isinstance(r.error, str) and "detail" not in r.json, (path, r)
    assert api.get("/cart/").headers.get("www-authenticate") == "Bearer"
    assert api.post("/auth/login", raw=b'["not", "an", "object"]').status == 400


def test_concurrent_requests_share_the_connection_pool(api, db):
    barrier, codes = threading.Barrier(30), []

    def hit():
        barrier.wait()
        codes.append(api.get("/products/?page=1&page_size=5").status)

    threads = [threading.Thread(target=hit) for _ in range(30)]
    [t.start() for t in threads]; [t.join() for t in threads]
    assert codes == [200] * 30
    conns = db.one("SELECT COUNT(*) AS n FROM pg_stat_activity WHERE datname = 'skbtest' "
                   "AND backend_type = 'client backend' AND pid <> pg_backend_pid()")["n"]
    assert 0 < conns <= 10


@pytest.fixture(scope="module")
def limited_api(db, db_url, tmp_path_factory):
    proc, base, _, _, log = start_server(db_url, tmp_path_factory.mktemp("limited"), rate_limit=True)
    yield Api(base)
    proc.terminate(); proc.wait(10); log.close()


def test_login_rate_limit(limited_api):
    codes = [limited_api.post("/auth/login", {"email": "nobody@test.local", "password": "x"}).status for _ in range(12)]
    assert codes[:10] == [401] * 10 and 429 in codes[10:]


def test_rate_limit_is_per_visitor_behind_cloudflare(limited_api):
    """Each visitor (CF-Connecting-IP) has its own limit; a faked X-Forwarded-For doesn't help."""
    def attempt(cf_ip, xff=None):
        headers = {"CF-Connecting-IP": cf_ip}
        if xff:
            headers["X-Forwarded-For"] = xff
        return limited_api.post("/auth/login", {"email": "nobody@test.local", "password": "x"}, headers=headers).status

    attacker = [attempt("203.0.113.7", xff=f"198.51.100.{i}") for i in range(12)]
    assert 429 in attacker                       # rotating X-Forwarded-For does not bypass the limit
    assert attempt("203.0.113.8") == 401         # a different visitor is not blocked
