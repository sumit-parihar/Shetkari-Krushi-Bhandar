import os
import logging
import resend
from dotenv import load_dotenv
from pathlib import Path

# Load from backend/app/utils/.env
_utils_env = Path(__file__).resolve().parent / ".env"
load_dotenv(_utils_env)
load_dotenv()

logger = logging.getLogger(__name__)

RESEND_API_KEY  = os.getenv("RESEND_API_KEY", "").strip()
FROM_EMAIL      = "Shetkari Krushi Bhandar <onboarding@resend.dev>"
APP_NAME        = "Shetkari Krushi Bhandar"

if not RESEND_API_KEY:
    logger.warning("RESEND_API_KEY not set — email sending will fail")
else:
    resend.api_key = RESEND_API_KEY


def send_otp_email(to_email: str, otp: str, name: str) -> bool:
    """
    Send OTP verification email to user.
    Returns True if sent successfully, False otherwise.
    """
    try:
        params: resend.Emails.SendParams = {
            "from":    FROM_EMAIL,
            "to":      [to_email],
            "subject": f"Your {APP_NAME} verification code",
            "html": f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 30px; text-align: center;">
    <h2 style="color: #15803d; margin-bottom: 6px;">🌾 {APP_NAME}</h2>
    <p style="color: #4b7a54; margin-bottom: 24px;">Email Verification</p>
    <p style="font-size: 15px;">Hello <strong>{name}</strong>,</p>
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
        }
        resend.Emails.send(params)
        logger.info("OTP email sent successfully to %s", to_email)
        return True
    except Exception:
        logger.exception("Failed to send OTP email to %s", to_email)
        return False