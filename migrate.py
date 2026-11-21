"""
Apply database migrations from backend/migrations/*.sql in name order.

Each file runs in its own transaction and is recorded in schema_migrations,
so running this again only applies new files.

Usage (from the project root, backend venv active):
    python migrate.py            # apply pending migrations
    python migrate.py --status   # list applied / pending, change nothing
"""
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
MIGRATIONS_DIR = ROOT / "backend" / "migrations"


def connect():
    load_dotenv(ROOT / "backend" / ".env")
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        raise SystemExit("DATABASE_URL environment variable is not set.")
    return psycopg2.connect(url, sslmode="require")


def run(status_only: bool = False) -> None:
    conn = connect()
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version    TEXT PRIMARY KEY,
            applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)
    conn.commit()

    cur.execute("SELECT version FROM schema_migrations")
    applied = {r[0] for r in cur.fetchall()}
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    pending = [f for f in files if f.stem not in applied]

    for f in files:
        print(f"  {'applied' if f.stem in applied else 'PENDING'}  {f.name}")
    if status_only or not pending:
        print("Nothing to apply." if not pending else f"{len(pending)} pending (status only).")
        conn.close()
        return

    for f in pending:
        print(f"Applying {f.name} ...")
        try:
            cur.execute(f.read_text(encoding="utf-8"))
            cur.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (f.stem,))
            conn.commit()
        except Exception:
            conn.rollback()
            print(f"FAILED: {f.name} - rolled back, database unchanged by this file.")
            conn.close()
            raise
        print(f"  done: {f.name}")
    conn.close()
    print("All migrations applied.")


if __name__ == "__main__":
    run(status_only="--status" in sys.argv)
