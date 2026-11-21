import os
import time
import logging
import threading

import psycopg2
import psycopg2.errors
import psycopg2.extras
import psycopg2.pool

from app.utils.response import APIError

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    env = os.getenv("ENV", "production").lower()
    if env in ("dev", "development", "local"):
        logger.warning("DATABASE_URL not set — running without DB connection")
    else:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Set it to your PostgreSQL connection string before starting the server."
        )

_CONNECT_KWARGS = dict(
    cursor_factory=psycopg2.extras.RealDictCursor,
    sslmode="require",
    # TCP keepalives so idle pooled connections aren't silently dropped
    keepalives=1, keepalives_idle=30, keepalives_interval=10, keepalives_count=3,
)

# ── Connection pool ────────────────────────────────────────
# Reusing connections avoids a new TLS handshake to the database on every request.
POOL_MAX          = int(os.getenv("DB_POOL_MAX", "10"))
POOL_WAIT_SECONDS = 30      # how long a request waits for a free connection
IDLE_PING_SECONDS = 60      # connections idle longer than this are checked first

_pool: psycopg2.pool.ThreadedConnectionPool | None = None
_pool_lock  = threading.Lock()
_pool_slots = threading.BoundedSemaphore(POOL_MAX)   # ThreadedConnectionPool doesn't wait, it errors
_last_used: dict[int, float] = {}


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = psycopg2.pool.ThreadedConnectionPool(1, POOL_MAX, DATABASE_URL, **_CONNECT_KWARGS)
    return _pool


def _new_connection():
    """A standalone connection (outside the pool), e.g. for the live-update stream."""
    conn = psycopg2.connect(DATABASE_URL, **_CONNECT_KWARGS)
    conn.autocommit = False
    return conn


def _is_alive(conn) -> bool:
    if conn.closed:
        return False
    if time.monotonic() - _last_used.get(id(conn), 0) < IDLE_PING_SECONDS:
        return True
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        conn.rollback()
        return True
    except Exception:
        return False


def _checkout():
    if not _pool_slots.acquire(timeout=POOL_WAIT_SECONDS):
        raise APIError("Server is busy, please try again in a moment", 503)
    pool = _get_pool()
    try:
        for _ in range(3):
            conn = pool.getconn()
            if _is_alive(conn):
                conn.autocommit = False
                return conn
            _last_used.pop(id(conn), None)
            pool.putconn(conn, close=True)      # stale: drop it, the pool opens a new one
        conn = pool.getconn()
        conn.autocommit = False
        return conn
    except Exception:
        _pool_slots.release()
        raise


def _checkin(conn):
    pool = _get_pool()
    try:
        broken = bool(conn.closed)
        if not broken:
            try:
                conn.rollback()                  # never hand over an open transaction
            except Exception:
                broken = True
        if broken:
            _last_used.pop(id(conn), None)
        else:
            _last_used[id(conn)] = time.monotonic()
        pool.putconn(conn, close=broken)
    finally:
        _pool_slots.release()


# ── Constraint violations → clear 409 messages ─────────────
_CONSTRAINT_MESSAGES = {
    "users_email_key":                "Email already in use",
    "users_email_lower_key":          "Email already in use",
    "categories_name_lower_key":      "A category with this name already exists",
    "cart_user_unique":               "Your cart changed at the same time. Please try again.",
    "cart_items_cart_product_unique": "Your cart changed at the same time. Please try again.",
    "products_stock_nonnegative":     "Not enough stock",
    "products_price_nonnegative":     "Price must be 0 or greater",
    "cart_items_quantity_positive":   "Quantity must be greater than 0",
    "order_items_quantity_positive":  "Quantity must be greater than 0",
}


def _integrity_error(e: psycopg2.IntegrityError) -> APIError:
    name = getattr(getattr(e, "diag", None), "constraint_name", None)
    if name in _CONSTRAINT_MESSAGES:
        return APIError(_CONSTRAINT_MESSAGES[name], 409)
    if isinstance(e, psycopg2.errors.ForeignKeyViolation):
        return APIError("This record is linked to other data and can't be changed", 409)
    return APIError("Conflicting data. Please refresh and try again.", 409)


class DBConnection:
    """
    Thin wrapper around a psycopg2 connection: conn.execute(...).fetchone()
    style used by all route files. SQL uses %s placeholders.
    """

    def __init__(self, conn):
        self._conn   = conn
        self._cursor = conn.cursor()

    def execute(self, sql: str, params=None):
        try:
            self._cursor.execute(sql, params or None)
        except psycopg2.IntegrityError as e:
            self._conn.rollback()
            raise _integrity_error(e) from e
        return self

    def fetchone(self):
        row = self._cursor.fetchone()
        return _DictRow(row) if row is not None else None

    def fetchall(self):
        return [_DictRow(r) for r in self._cursor.fetchall()]

    @property
    def lastrowid(self):
        self._cursor.execute("SELECT lastval()")
        return self._cursor.fetchone()["lastval"]

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        try:
            self._conn.close()
        except Exception:
            pass


class _DictRow:
    """Thin wrapper — row["key"] and row[0] both work."""

    def __init__(self, data):
        self._data = dict(data)
        self._keys = list(self._data.keys())

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._data[self._keys[key]]
        return self._data[key]

    def __iter__(self):
        return iter(self._data.values())

    def get(self, key, default=None):
        return self._data.get(key, default)

    def keys(self):
        return self._data.keys()

    def items(self):
        return self._data.items()

    def __contains__(self, key):
        return key in self._data

    def __repr__(self):
        return repr(self._data)


def get_db():
    """
    FastAPI dependency — borrows a pooled connection for the request and
    returns it afterwards (any unfinished transaction is rolled back).
    """
    conn = _checkout()
    db_conn = DBConnection(conn)
    try:
        yield db_conn
    finally:
        try:
            db_conn._cursor.close()
        except Exception:
            pass
        _checkin(conn)
