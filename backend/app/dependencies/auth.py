from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.connection import get_db
from app.utils.auth_utils import decode_token
from app.utils.roles import normalize_role

# auto_error=False: return 401 JSON instead of FastAPI's default 403 "Not authenticated" for missing Bearer
security = HTTPBearer(auto_error=False)


def _unauthorized(detail: str):
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def user_from_token(token: str, conn) -> dict:
    """
    Validate a JWT and confirm the account still exists and is verified.
    The role is taken from the database, not the token, so a role change or
    account deletion takes effect immediately instead of after token expiry.
    """
    decoded = decode_token(token)
    if "error" in decoded:
        raise _unauthorized(decoded["error"])
    if decoded.get("type") != "access":
        raise _unauthorized("Invalid token type")

    row = conn.execute(
        "SELECT user_id, role, is_verified, is_active FROM Users WHERE user_id = %s",
        (int(decoded["user_id"]),),
    ).fetchone()
    if not row or not row["is_verified"] or not row["is_active"]:
        raise _unauthorized("Account no longer exists")

    return {"user_id": row["user_id"], "role": normalize_role(row["role"])}


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    conn=Depends(get_db),
):
    if not credentials or not credentials.credentials:
        raise _unauthorized("Not authenticated")

    user = user_from_token(credentials.credentials, conn)
    request.state.user = user
    return user


def require_user(user=Depends(get_current_user)):
    """Any authenticated user (customer, admin, or delivery_boy)."""
    return user


def require_customer(user=Depends(get_current_user)):
    if user["role"] != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: customer only"
        )
    return user


def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: admin only"
        )
    return user


def require_delivery_boy(user=Depends(get_current_user)):
    if user["role"] != "delivery_boy":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: delivery boy only"
        )
    return user
