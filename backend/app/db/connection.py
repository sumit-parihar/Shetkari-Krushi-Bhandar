import os
import logging
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from pathlib import Path

# Load .env from backend/app/utils/.env
_utils_env = Path(__file__).resolve().parent.parent / "utils" / ".env"
load_dotenv(_utils_env)
load_dotenv()  # also try local .env

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


def _new_connection():
    """Create a fresh psycopg2 connection to PostgreSQL."""
    conn = psycopg2.connect(
        DATABASE_URL,
        cursor_factory=psycopg2.extras.RealDictCursor,
        sslmode="require",
    )
    conn.autocommit = False
    return conn


class DBConnection:
    """
    Wraps a psycopg2 connection to mimic the sqlite3 interface
    used across all route files — conn.execute(), conn.commit(),
    conn.rollback(), fetchone(), fetchall() all work identically.
    No route file needs to change.
    """

    def __init__(self, conn):
        self._conn   = conn
        self._cursor = conn.cursor()

    def execute(self, sql: str, params=None):
        # Convert SQLite ? placeholders → PostgreSQL %s
        pg_sql = sql.replace("?", "%s")
        # Convert SQLite CAST(x AS TEXT) → PostgreSQL x::text
        pg_sql = pg_sql.replace("CAST(o.order_id AS TEXT)", "o.order_id::text")
        pg_sql = pg_sql.replace("CAST(order_id AS TEXT)",   "order_id::text")

        self._cursor.execute(pg_sql, params or None)
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
    """Thin wrapper — row["key"] and row[0] both work like sqlite3.Row."""

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
    FastAPI dependency — opens a fresh connection per request,
    closes it when the request finishes. Simple and reliable.
    """
    conn    = _new_connection()
    db_conn = DBConnection(conn)
    logger.debug("PostgreSQL connection opened")
    try:
        yield db_conn
    finally:
        db_conn.close()
        logger.debug("PostgreSQL connection closed")