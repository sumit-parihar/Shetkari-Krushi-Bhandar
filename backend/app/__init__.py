"""
Load environment variables once, before any other app module is imported.

Locally, values come from backend/.env.
On Render, variables are set in the dashboard and there is no .env file;
load_dotenv() never overrides variables that are already set.
"""
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
