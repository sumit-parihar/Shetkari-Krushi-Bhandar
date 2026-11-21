import os
import json
import html
import logging
import urllib.request
import urllib.error
from dotenv import load_dotenv
from pathlib import Path

# Load from backend/app/utils/.env
_utils_env = Path(__file__).resolve().parent / ".env"
load_dotenv(_utils_env)
load_dotenv()

logger = logging.getLogger(__name__)

APP_NAME       = "Shetkari Krushi Bhandar"
BREVO_API_KEY  = os.getenv("BREVO_API_KEY", "").strip()
SENDER_EMAIL   = os.getenv("SENDER_EMAIL", "").strip()
SENDER_NAME    = os.getenv("SENDER_NAME", APP_NAME).strip() or APP_NAME
BREVO_API_URL  = "https://api.brevo.com/v3/smtp/email"

if not BREVO_API_KEY or not SENDER_EMAIL:
    logger.warning("BREVO_API_KEY or SENDER_EMAIL not set — email sending will fail")


def send_otp_email(to_email: str, otp: str, name: str) -> bool:
    """
    Send OTP verification email to user via Brevo's HTTPS API.
    Returns True if sent successfully, False otherwise.
    """
    if not BREVO_API_KEY or not SENDER_EMAIL:
        logger.error("Cannot send OTP email: BREVO_API_KEY or SENDER_EMAIL missing")
        return False

    safe_name = html.escape(name or "")

    payload = {
        "sender":  {"name": SENDER_NAME, "email": SENDER_EMAIL},
        "to":      [{"email": to_email, "name": name or to_email}],
        "subject": f"Your {APP_NAME} verification code",
        "htmlContent": f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 30px; text-align: center;">
    <h2 style="color: #15803d; margin-bottom: 6px;">🌾 {APP_NAME}</h2>
    <p style="color: #4b7a54; margin-bottom: 24px;">Email Verification</p>
    <p style="font-size: 15px;">Hello <strong>{safe_name}</strong>,</p>
    <p style="font-size: 14px; color: #555;">Use the code below to verify your email address:</p>
    <div style="background: #fff; border: 2px dashed #16a34a; border-radius: 10px; padding: 20px; margin: 20px 0;">
      <span style="font-size: 38px; font-weight: bold; letter-spacing: 10px; color: #15803d;">{otp}</span>
    </div>
    <p style="font-size: 13px; color: #888;">This code expires in <strong>10 minutes</strong>.</p>
    <p style="font-size: 13px; color: #888;">If you did not create an account, please ignore this email.</p>
  </div>
</body>
</html>
""",
        "textContent": (
            f"Hello {name},\n\n"
            f"Your {APP_NAME} verification code is: {otp}\n"
            "This code expires in 10 minutes.\n\n"
            "If you did not create an account, please ignore this email."
        ),
    }

    request = urllib.request.Request(
        BREVO_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key":      BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept":       "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                logger.info("OTP email sent successfully to %s", to_email)
                return True
            logger.error("Brevo returned status %s for %s", response.status, to_email)
            return False
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.error("Brevo API error %s sending to %s: %s", e.code, to_email, body)
        return False
    except Exception:
        logger.exception("Failed to send OTP email to %s", to_email)
        return False
