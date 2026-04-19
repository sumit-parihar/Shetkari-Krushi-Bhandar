import logging
from fastapi import APIRouter, Request, Depends
from app.db.connection import get_db
from app.dependencies.auth import require_admin, require_user
from app.utils.response import success_response, error_response
from app.utils.auth_utils import hash_password, verify_password, generate_jwt
from app.utils.roles import normalize_role
from app.utils.validators import validate_pagination

router = APIRouter()
logger = logging.getLogger(__name__)

# ------------------------
# REGISTER
# ------------------------
@router.post("/register")
async def register(request: Request, conn=Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    required_fields = ['name', 'email', 'password']
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            return error_response(f"{field} is required", 400)

    try:
        existing = conn.execute(
            "SELECT user_id FROM Users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))",
            (str(data["email"]).strip(),),
        ).fetchone()
        if existing:
            return error_response("Email already registered", 400)

        hashed_password = hash_password(data['password'])
        role = "customer"
        phone = str(data.get('phone', '') or '').strip() or None
        address = str(data.get('address', '') or '').strip() or None
        conn.execute(
            "INSERT INTO Users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
            (data['name'], data['email'], hashed_password, role, phone, address)
        )
        conn.commit()
        return success_response(message="User registered successfully")

    except Exception as e:
        logger.exception("Registration failed for email: %s", data.get("email", "unknown"))
        conn.rollback()
        return error_response("Internal server error", 500)

# ------------------------
# LOGIN
# ------------------------
@router.post("/login")
async def login(request: Request, conn=Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    required_fields = ['email', 'password']
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            return error_response(f"{field} is required", 400)

    try:
        email_in = str(data["email"]).strip()
        user = conn.execute(
            """
            SELECT user_id, name, email, password, phone, address, role FROM Users
            WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
            """,
            (email_in,),
        ).fetchone()

        if not user or not verify_password(data['password'], user['password']):
            return error_response("Invalid email or password", 401)

        role = normalize_role(user["role"])
        token = generate_jwt(user["user_id"], role)
        return success_response(
            data={
                "token": token,
                "user": {
                    "user_id": user["user_id"],
                    "name": user["name"],
                    "email": user["email"],
                    "role": role,
                    "phone": user["phone"],
                    "address": user["address"]
                }
            },
            message="Login successful"
        )

    except Exception as e:
        logger.exception("Login failed for email: %s", data.get("email", "unknown"))
        return error_response("Internal server error", 500)


# ------------------------
# UPDATE OWN PROFILE (any logged-in user)
# ------------------------
@router.put("/profile")
async def update_own_profile(request: Request, conn=Depends(get_db), user=Depends(require_user)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    user_id = user["user_id"]
    try:
        row = conn.execute(
            "SELECT user_id, name, email, phone, address FROM Users WHERE user_id = ?", (user_id,)
        ).fetchone()
        if not row:
            return error_response("User not found", 404)

        name = str(data.get("name", row["name"])).strip() or row["name"]
        email = str(data.get("email", row["email"])).strip() or row["email"]
        if not name:
            return error_response("Name is required", 400)
        if not email or not ("@" in email):
            return error_response("Valid email is required", 400)

        existing = conn.execute(
            "SELECT user_id FROM Users WHERE email = ? AND user_id != ?", (email, user_id)
        ).fetchone()
        if existing:
            return error_response("Email already in use by another account", 400)

        phone = str(data.get("phone") or "").strip() or None
        address = str(data.get("address") or "").strip() or None

        conn.execute(
            "UPDATE Users SET name = ?, email = ?, phone = ?, address = ? WHERE user_id = ?",
            (name, email, phone, address, user_id),
        )
        conn.commit()
        return success_response(message="Profile updated successfully")
    except Exception as e:
        logger.exception("Profile update failed for user_id: %s", user.get("user_id"))
        conn.rollback()
        return error_response("Internal server error", 500)


# ------------------------
# CHANGE OWN PASSWORD (any logged-in user)
# ------------------------
@router.put("/change-password")
async def change_password(request: Request, conn=Depends(get_db), user=Depends(require_user)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password:
        return error_response("Current password is required", 400)
    if not new_password or len(new_password) < 6:
        return error_response("New password must be at least 6 characters", 400)

    try:
        row = conn.execute(
            "SELECT user_id, password FROM Users WHERE user_id = ?", (user["user_id"],)
        ).fetchone()
        if not row:
            return error_response("User not found", 404)

        if not verify_password(current_password, row["password"]):
            return error_response("Current password is incorrect", 400)

        conn.execute(
            "UPDATE Users SET password = ? WHERE user_id = ?",
            (hash_password(new_password), user["user_id"]),
        )
        conn.commit()
        return success_response(message="Password changed successfully")
    except Exception as e:
        logger.exception("Password change failed for user_id: %s", user.get("user_id"))
        conn.rollback()
        return error_response("Internal server error", 500)


# ------------------------
# ADMIN: list / delete / update users
# ------------------------
@router.get("/users")
async def list_users(request: Request, conn=Depends(get_db), admin=Depends(require_admin)):
    params = request.query_params
    page, page_size, err = validate_pagination(params.get("page", 1), params.get("page_size", 10))
    if err:
        return error_response(err, 400)
    search = (params.get("search") or "").strip()
    role_filter = (params.get("role") or "").strip()
    offset = (page - 1) * page_size

    try:
        base = "FROM Users WHERE 1=1"
        qp: list = []
        if search:
            base += " AND (name LIKE ? OR email LIKE ?)"
            qp.extend([f"%{search}%", f"%{search}%"])
        if role_filter:
            base += " AND role = ?"
            qp.append(role_filter)

        total = conn.execute(f"SELECT COUNT(*) AS c {base}", tuple(qp)).fetchone()["c"]
        rows = conn.execute(
            f"""
            SELECT user_id, name, email, role, phone, address, created_at
            {base}
            ORDER BY user_id DESC
            LIMIT ? OFFSET ?
            """,
            tuple(qp + [page_size, offset]),
        ).fetchall()

        users_out = []
        for r in rows:
            d = dict(r)
            d["role"] = normalize_role(d.get("role"))
            users_out.append(d)

        return success_response(
            data={
                "users": users_out,
                "page": page,
                "page_size": page_size,
                "total": total,
            }
        )
    except Exception as e:
        logger.exception("List users failed")
        return error_response("Internal server error", 500)


@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: int, conn=Depends(get_db), admin=Depends(require_admin)):
    if user_id == admin["user_id"]:
        return error_response("You cannot delete your own account", 400)
    try:
        row = conn.execute("SELECT user_id FROM Users WHERE user_id = ?", (user_id,)).fetchone()
        if not row:
            return error_response("User not found", 404)
        conn.execute("DELETE FROM Users WHERE user_id = ?", (user_id,))
        conn.commit()
        return success_response(message="User deleted successfully")
    except Exception as e:
        logger.exception("Delete user failed for user_id: %s", user_id)
        conn.rollback()
        return error_response("Cannot delete user (may have orders or related data)", 400)


@router.put("/users/{user_id}")
async def admin_update_user(user_id: int, request: Request, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    try:
        row = conn.execute(
            "SELECT user_id, name, email, role, phone, address FROM Users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            return error_response("User not found", 404)

        role = normalize_role(data.get("role", row["role"]))
        # BUG FIX: allow delivery_boy as a valid role
        if role not in ("customer", "admin", "delivery_boy"):
            return error_response("Invalid role", 400)

        name = str(data.get("name", row["name"])).strip() or row["name"]
        email = str(data.get("email", row["email"])).strip() or row["email"]
        phone = data.get("phone", row["phone"])
        address = data.get("address", row["address"])

        existing = conn.execute(
            "SELECT user_id FROM Users WHERE email = ? AND user_id != ?", (email, user_id)
        ).fetchone()
        if existing:
            return error_response("Email already in use", 400)

        conn.execute(
            """
            UPDATE Users SET name = ?, email = ?, role = ?, phone = ?, address = ?
            WHERE user_id = ?
            """,
            (name, email, role, phone, address, user_id),
        )
        conn.commit()
        return success_response(message="User updated successfully")
    except Exception as e:
        logger.exception("Update user failed for user_id: %s", user_id)
        conn.rollback()
        return error_response("Internal server error", 500)


# ------------------------
# ADMIN: list delivery boys
# ------------------------
@router.get("/delivery-boys")
async def list_delivery_boys(conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        rows = conn.execute(
            "SELECT user_id, name, email, phone FROM Users WHERE role = 'delivery_boy' ORDER BY name"
        ).fetchall()
        return success_response(data={"delivery_boys": [dict(r) for r in rows]})
    except Exception as e:
        logger.exception("List delivery boys failed")
        return error_response("Internal server error", 500)
