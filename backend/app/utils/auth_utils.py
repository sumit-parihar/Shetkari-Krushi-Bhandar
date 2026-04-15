import bcrypt
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()


def _load_secret_key() -> str:
    raw = os.getenv("SECRET_KEY") or "dev-only-set-SECRET_KEY-in-production"
    # .env lines like SECRET_KEY="abc" must not keep quotes in the key material
    return raw.strip().strip('"').strip("'")


SECRET_KEY = _load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7
ISSUER = "agri-ecommerce"
AUDIENCE = "agri-users"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int, role: str) -> str:
    from app.utils.roles import normalize_role

    role = normalize_role(role)
    payload = {
        "user_id": user_id,
        "role": role,
        "type": "access",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def generate_jwt(user_id: int, role: str) -> str:
    return create_access_token(user_id, role)


def create_refresh_token(user_id: int, role: str) -> str:
    from app.utils.roles import normalize_role

    role = normalize_role(role)
    payload = {
        "user_id": user_id,
        "role": role,
        "type": "refresh",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
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