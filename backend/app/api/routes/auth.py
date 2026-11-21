import logging
import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Request, Depends
from app.db.connection import get_db
from app.dependencies.auth import require_admin, require_user
from app.utils.response import success_response, error_response
from app.utils.auth_utils import hash_password, verify_password, generate_jwt
from app.utils.roles import normalize_role
from app.utils.validators import validate_pagination
from app.utils.rate_limiter import limiter
from app.utils.email import send_otp_email

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_NAME     = 100
MAX_EMAIL    = 255
MAX_PASSWORD = 128
MAX_PHONE    = 20
MAX_ADDRESS  = 500
OTP_EXPIRY_MINUTES = 10


def _generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))


def _validate_register_fields(data: dict) -> str | None:
    name     = str(data.get("name",     "")).strip()
    email    = str(data.get("email",    "")).strip()
    password = str(data.get("password", ""))
    phone    = str(data.get("phone",    "") or "").strip()
    address  = str(data.get("address",  "") or "").strip()

    if not name:                                        return "name is required"
    if len(name) > MAX_NAME:                            return f"name must be {MAX_NAME} characters or fewer"
    if not email:                                       return "email is required"
    if len(email) > MAX_EMAIL:                          return f"email must be {MAX_EMAIL} characters or fewer"
    if "@" not in email or "." not in email.split("@")[-1]: return "valid email is required"
    if not password:                                    return "password is required"
    if len(password) < 6:                               return "password must be at least 6 characters"
    if len(password) > MAX_PASSWORD:                    return f"password must be {MAX_PASSWORD} characters or fewer"
    if phone   and len(phone)   > MAX_PHONE:            return f"phone must be {MAX_PHONE} characters or fewer"
    if address and len(address) > MAX_ADDRESS:          return f"address must be {MAX_ADDRESS} characters or fewer"
    return None


# ── REGISTER — Step 1: validate + send OTP ────────────
@router.post("/register")
@limiter.limit("10/minute")
async def register(request: Request, conn=Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    err = _validate_register_fields(data)
    if err:
        return error_response(err, 400)

    email = str(data["email"]).strip().lower()
    name  = str(data["name"]).strip()

    try:
        # Check if already a registered verified user
        existing = conn.execute(
            "SELECT user_id, is_verified FROM Users WHERE LOWER(TRIM(email)) = %s",
            (email,),
        ).fetchone()
        if existing:
            if existing["is_verified"]:
                return error_response("Email already registered", 400)
            # Unverified user exists — allow re-sending OTP (handled below)

        # Delete any previous pending OTP for this email
        conn.execute("DELETE FROM OTP_Verifications WHERE email = %s", (email,))

        otp        = _generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
        hashed_pw  = hash_password(data["password"])
        phone      = str(data.get("phone",   "") or "").strip() or None
        address    = str(data.get("address", "") or "").strip() or None

        conn.execute(
            """
            INSERT INTO OTP_Verifications (email, otp, name, password, phone, address, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (email, otp, name, hashed_pw, phone, address, expires_at),
        )
        conn.commit()

        # Send OTP email
        sent = send_otp_email(to_email=email, otp=otp, name=name)
        if not sent:
            conn.execute("DELETE FROM OTP_Verifications WHERE email = %s", (email,))
            conn.commit()
            return error_response("Failed to send verification email. Please try again.", 500)

        return success_response(
            data={"email": email},
            message=f"Verification code sent to {email}. Please check your inbox.",
        )

    except Exception:
        logger.exception("Registration step 1 failed for email: %s", email)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── VERIFY OTP — Step 2: verify code + create account ─
@router.post("/verify-otp")
@limiter.limit("10/minute")
async def verify_otp(request: Request, conn=Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    email = str(data.get("email", "")).strip().lower()
    otp   = str(data.get("otp",   "")).strip()

    if not email or not otp:
        return error_response("Email and OTP are required", 400)

    try:
        record = conn.execute(
            """
            SELECT id, name, password, phone, address, expires_at
            FROM OTP_Verifications
            WHERE email = %s AND otp = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (email, otp),
        ).fetchone()

        if not record:
            return error_response("Invalid verification code", 400)

        # Check expiry
        expires_at = record["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if datetime.utcnow() > expires_at:
            conn.execute("DELETE FROM OTP_Verifications WHERE email = %s", (email,))
            conn.commit()
            return error_response("Verification code has expired. Please register again.", 400)

        # Check if user already exists (edge case: verified between requests)
        existing = conn.execute(
            "SELECT user_id FROM Users WHERE LOWER(TRIM(email)) = %s AND is_verified = TRUE",
            (email,),
        ).fetchone()
        if existing:
            conn.execute("DELETE FROM OTP_Verifications WHERE email = %s", (email,))
            conn.commit()
            return error_response("Email already registered", 400)

        # Delete unverified user if exists
        conn.execute(
            "DELETE FROM Users WHERE LOWER(TRIM(email)) = %s AND is_verified = FALSE",
            (email,),
        )

        # Create the verified account
        conn.execute(
            """
            INSERT INTO Users (name, email, password, role, phone, address, is_verified)
            VALUES (%s, %s, %s, 'customer', %s, %s, TRUE)
            """,
            (record["name"], email, record["password"], record["phone"], record["address"]),
        )

        # Clean up OTP
        conn.execute("DELETE FROM OTP_Verifications WHERE email = %s", (email,))
        conn.commit()

        return success_response(message="Email verified successfully! You can now log in.")

    except Exception:
        logger.exception("OTP verification failed for email: %s", email)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── RESEND OTP ─────────────────────────────────────────
@router.post("/resend-otp")
@limiter.limit("5/minute")
async def resend_otp(request: Request, conn=Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    email = str(data.get("email", "")).strip().lower()
    if not email:
        return error_response("Email is required", 400)

    try:
        record = conn.execute(
            "SELECT name FROM OTP_Verifications WHERE email = %s ORDER BY created_at DESC LIMIT 1",
            (email,),
        ).fetchone()

        if not record:
            return error_response("No pending registration found for this email", 404)

        otp        = _generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

        conn.execute(
            "UPDATE OTP_Verifications SET otp = %s, expires_at = %s WHERE email = %s",
            (otp, expires_at, email),
        )
        conn.commit()

        sent = send_otp_email(to_email=email, otp=otp, name=record["name"])
        if not sent:
            return error_response("Failed to send email. Please try again.", 500)

        return success_response(message="New verification code sent to your email.")

    except Exception:
        logger.exception("Resend OTP failed for email: %s", email)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── LOGIN ─────────────────────────────────────────────
@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, conn=Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    email    = str(data.get("email",    "")).strip()
    password = str(data.get("password", ""))

    if not email:    return error_response("email is required", 400)
    if not password: return error_response("password is required", 400)
    if len(email) > MAX_EMAIL: return error_response("Invalid credentials", 401)

    try:
        user = conn.execute(
            """
            SELECT user_id, name, email, password, phone, address, role, is_verified
            FROM Users
            WHERE LOWER(TRIM(email)) = LOWER(TRIM(%s))
            """,
            (email,),
        ).fetchone()

        if not user or not verify_password(password, user["password"]):
            return error_response("Invalid email or password", 401)

        # Block unverified users from logging in
        if not user["is_verified"]:
            return error_response(
                "Email not verified. Please check your inbox for the verification code.", 403
            )

        role  = normalize_role(user["role"])
        token = generate_jwt(user["user_id"], role)

        return success_response(
            data={
                "token": token,
                "user": {
                    "user_id": user["user_id"],
                    "name":    user["name"],
                    "email":   user["email"],
                    "role":    role,
                    "phone":   user["phone"],
                    "address": user["address"],
                },
            },
            message="Login successful",
        )

    except Exception:
        logger.exception("Login failed for email: %s", email)
        return error_response("Internal server error", 500)


# ── UPDATE OWN PROFILE ────────────────────────────────
@router.put("/profile")
async def update_own_profile(request: Request, conn=Depends(get_db), user=Depends(require_user)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    user_id = user["user_id"]
    try:
        row = conn.execute(
            "SELECT user_id, name, email, phone, address FROM Users WHERE user_id = %s",
            (user_id,),
        ).fetchone()
        if not row:
            return error_response("User not found", 404)

        name  = str(data.get("name",  row["name"])).strip()  or row["name"]
        email = str(data.get("email", row["email"])).strip() or row["email"]

        if not name:                  return error_response("Name is required", 400)
        if len(name) > MAX_NAME:      return error_response(f"Name must be {MAX_NAME} characters or fewer", 400)
        if not email or "@" not in email: return error_response("Valid email is required", 400)
        if len(email) > MAX_EMAIL:    return error_response(f"Email must be {MAX_EMAIL} characters or fewer", 400)

        existing = conn.execute(
            "SELECT user_id FROM Users WHERE email = %s AND user_id != %s", (email, user_id)
        ).fetchone()
        if existing:
            return error_response("Email already in use by another account", 400)

        phone   = str(data.get("phone")   or "").strip() or None
        address = str(data.get("address") or "").strip() or None

        if phone   and len(phone)   > MAX_PHONE:   return error_response(f"Phone must be {MAX_PHONE} characters or fewer", 400)
        if address and len(address) > MAX_ADDRESS: return error_response(f"Address must be {MAX_ADDRESS} characters or fewer", 400)

        conn.execute(
            "UPDATE Users SET name = %s, email = %s, phone = %s, address = %s WHERE user_id = %s",
            (name, email, phone, address, user_id),
        )
        conn.commit()
        return success_response(message="Profile updated successfully")

    except Exception:
        logger.exception("Profile update failed for user_id: %s", user_id)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── CHANGE OWN PASSWORD ───────────────────────────────
@router.put("/change-password")
async def change_password(request: Request, conn=Depends(get_db), user=Depends(require_user)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    current_password = data.get("current_password", "")
    new_password     = data.get("new_password",     "")

    if not current_password:                   return error_response("Current password is required", 400)
    if not new_password or len(new_password) < 6: return error_response("New password must be at least 6 characters", 400)
    if len(new_password) > MAX_PASSWORD:       return error_response(f"Password must be {MAX_PASSWORD} characters or fewer", 400)

    try:
        row = conn.execute(
            "SELECT user_id, password FROM Users WHERE user_id = %s", (user["user_id"],)
        ).fetchone()
        if not row:
            return error_response("User not found", 404)

        if not verify_password(current_password, row["password"]):
            return error_response("Current password is incorrect", 400)

        conn.execute(
            "UPDATE Users SET password = %s WHERE user_id = %s",
            (hash_password(new_password), user["user_id"]),
        )
        conn.commit()
        return success_response(message="Password changed successfully")

    except Exception:
        logger.exception("Password change failed for user_id: %s", user.get("user_id"))
        conn.rollback()
        return error_response("Internal server error", 500)


# ── ADMIN: LIST USERS ─────────────────────────────────
@router.get("/users")
async def list_users(request: Request, conn=Depends(get_db), admin=Depends(require_admin)):
    params = request.query_params
    page, page_size, err = validate_pagination(params.get("page", 1), params.get("page_size", 10))
    if err:
        return error_response(err, 400)

    search      = (params.get("search") or "").strip()
    role_filter = (params.get("role")   or "").strip()
    offset      = (page - 1) * page_size

    try:
        base = "FROM Users WHERE 1=1"
        qp: list = []
        if search:
            base += " AND (name LIKE %s OR email LIKE %s)"
            qp.extend([f"%{search}%", f"%{search}%"])
        if role_filter:
            base += " AND role = %s"
            qp.append(role_filter)

        total = conn.execute(f"SELECT COUNT(*) AS c {base}", tuple(qp)).fetchone()["c"]
        rows  = conn.execute(
            f"""
            SELECT user_id, name, email, role, phone, address, is_verified, created_at
            {base}
            ORDER BY user_id DESC
            LIMIT %s OFFSET %s
            """,
            tuple(qp + [page_size, offset]),
        ).fetchall()

        users_out = []
        for r in rows:
            d = dict(r)
            d["role"] = normalize_role(d.get("role"))
            users_out.append(d)

        return success_response(
            data={"users": users_out, "page": page, "page_size": page_size, "total": total}
        )

    except Exception:
        logger.exception("List users failed")
        return error_response("Internal server error", 500)


# ── ADMIN: DELETE USER ────────────────────────────────
@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: int, conn=Depends(get_db), admin=Depends(require_admin)):
    if user_id == admin["user_id"]:
        return error_response("You cannot delete your own account", 400)
    try:
        row = conn.execute("SELECT user_id FROM Users WHERE user_id = %s", (user_id,)).fetchone()
        if not row:
            return error_response("User not found", 404)
        conn.execute("DELETE FROM Users WHERE user_id = %s", (user_id,))
        conn.commit()
        return success_response(message="User deleted successfully")
    except Exception:
        logger.exception("Delete user failed for user_id: %s", user_id)
        conn.rollback()
        return error_response("Cannot delete user (may have orders or related data)", 400)


# ── ADMIN: UPDATE USER ────────────────────────────────
@router.put("/users/{user_id}")
async def admin_update_user(
    user_id: int, request: Request, conn=Depends(get_db), admin=Depends(require_admin)
):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    try:
        row = conn.execute(
            "SELECT user_id, name, email, role, phone, address FROM Users WHERE user_id = %s",
            (user_id,),
        ).fetchone()
        if not row:
            return error_response("User not found", 404)

        role = normalize_role(data.get("role", row["role"]))
        if role not in ("customer", "admin", "delivery_boy"):
            return error_response("Invalid role", 400)

        name    = str(data.get("name",  row["name"])).strip()  or row["name"]
        email   = str(data.get("email", row["email"])).strip() or row["email"]
        phone   = data.get("phone",   row["phone"])
        address = data.get("address", row["address"])

        if len(name)  > MAX_NAME:  return error_response(f"Name max {MAX_NAME} chars",  400)
        if len(email) > MAX_EMAIL: return error_response(f"Email max {MAX_EMAIL} chars", 400)

        existing = conn.execute(
            "SELECT user_id FROM Users WHERE email = %s AND user_id != %s", (email, user_id)
        ).fetchone()
        if existing:
            return error_response("Email already in use", 400)

        conn.execute(
            "UPDATE Users SET name=%s, email=%s, role=%s, phone=%s, address=%s WHERE user_id=%s",
            (name, email, role, phone, address, user_id),
        )
        conn.commit()
        return success_response(message="User updated successfully")

    except Exception:
        logger.exception("Update user failed for user_id: %s", user_id)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── ADMIN: LIST DELIVERY BOYS ─────────────────────────
@router.get("/delivery-boys")
async def list_delivery_boys(conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        rows = conn.execute(
            "SELECT user_id, name, email, phone FROM Users WHERE role = 'delivery_boy' ORDER BY name"
        ).fetchall()
        return success_response(data={"delivery_boys": [dict(r) for r in rows]})
    except Exception:
        logger.exception("List delivery boys failed")
        return error_response("Internal server error", 500)
