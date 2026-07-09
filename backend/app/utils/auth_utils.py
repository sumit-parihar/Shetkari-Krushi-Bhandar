import logging
import os

import bcrypt
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Secret key — crash if missing in production ────────────
def _load_secret_key() -> str:
    raw = os.getenv("SECRET_KEY", "").strip().strip('"').strip("'")
    if not raw:
        env = os.getenv("ENV", "production").lower()
        if env in ("dev", "development", "local"):
            logger.warning(
                "SECRET_KEY is not set. Using insecure dev fallback. "
                "NEVER do this in production."
            )
            return "dev-only-insecure-secret-do-not-use-in-production"
        raise RuntimeError(
            "SECRET_KEY environment variable is not set. "
            "This is required for JWT signing. "
            "Set it in your .env file or deployment environment."
        )
    return raw


SECRET_KEY = _load_secret_key()
ALGORITHM  = "HS256"

# 8 hours — long enough for a full working day without re-login
# Short enough to limit exposure if a token is stolen
ACCESS_TOKEN_EXPIRE_HOURS  = 8
REFRESH_TOKEN_EXPIRE_DAYS  = 7

ISSUER   = "skb-api"
AUDIENCE = "skb-users"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int, role: str) -> str:
    from app.utils.roles import normalize_role
    payload = {
        "user_id": user_id,
        "role":    normalize_role(role),
        "type":    "access",
        "iss":     ISSUER,
        "aud":     AUDIENCE,
        "exp":     datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# Alias kept for backward compatibility with existing route files
def generate_jwt(user_id: int, role: str) -> str:
    return create_access_token(user_id, role)


def create_refresh_token(user_id: int, role: str) -> str:
    from app.utils.roles import normalize_role
    payload = {
        "user_id": user_id,
        "role":    normalize_role(role),
        "type":    "refresh",
        "iss":     ISSUER,
        "aud":     AUDIENCE,
        "exp":     datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=AUDIENCE,
            issuer=ISSUER,
        )
    except jwt.ExpiredSignatureError:
        return {"error": "Token expired"}
    except jwt.InvalidTokenError:
        return {"error": "Invalid token"}