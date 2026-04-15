import sqlite3
from pathlib import Path

# Repository root: backend/app/db -> parents[3] == repo root
_REPO_ROOT = Path(__file__).resolve().parents[3]

# Prefer the original project database name (user's file with full sample data).
_LEGACY_DB = _REPO_ROOT / "Databases" / "Shetkari Krushi Bhandar.db"
_FALLBACK_DB = _REPO_ROOT / "Databases" / "shetkari.db"


def _resolve_db_path() -> Path:
    if _LEGACY_DB.is_file():
        return _LEGACY_DB
    if _FALLBACK_DB.is_file():
        return _FALLBACK_DB
    # Default target so error messages point at the expected legacy path
    return _LEGACY_DB


_DB_PATH = _resolve_db_path()


def get_db_connection():
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH), timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()
