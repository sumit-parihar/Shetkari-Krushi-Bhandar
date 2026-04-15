from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.utils.auth_utils import decode_token
from app.utils.roles import normalize_role

# auto_error=False: return 401 JSON instead of FastAPI's default 403 "Not authenticated" for missing Bearer
security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    decoded = decode_token(token)

    if "error" in decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=decoded["error"],
            headers={"WWW-Authenticate": "Bearer"},
        )

    if decoded.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = {
        "user_id": int(decoded["user_id"]),
        "role": normalize_role(decoded.get("role")),
    }

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
    if normalize_role(user["role"]) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: admin only"
        )
    return user


def require_delivery_boy(user=Depends(get_current_user)):
    if normalize_role(user["role"]) != "delivery_boy":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: delivery boy only"
        )
    return user
