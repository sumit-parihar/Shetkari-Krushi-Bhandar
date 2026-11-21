"""
Start the backend for the automated tests.

Run by tests/conftest.py (and frontend/e2e) as a separate process. Email is never
sent: the OTP is written to the JSON file named by SKB_TEST_OTP_FILE instead,
so tests can read it. All configuration comes from environment variables set by
the caller; backend/.env is not needed.
"""
import json
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)

import app.api.routes.auth as auth_routes  # noqa: E402

OTP_FILE = Path(os.environ["SKB_TEST_OTP_FILE"])


def fake_send_otp_email(to_email: str, otp: str, name: str) -> bool:
    data = json.loads(OTP_FILE.read_text()) if OTP_FILE.exists() else {}
    data[to_email] = otp
    OTP_FILE.write_text(json.dumps(data))
    return True


auth_routes.send_otp_email = fake_send_otp_email

import uvicorn  # noqa: E402

uvicorn.run("app.main:app", host="127.0.0.1", port=int(os.environ["PORT"]), log_level="warning")
