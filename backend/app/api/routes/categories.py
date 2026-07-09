import logging
from fastapi import APIRouter, Request, Depends
from app.db.connection import get_db
from app.dependencies.auth import require_admin
from app.utils.response import success_response, error_response

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_CATEGORY_NAME = 100
MAX_DESCRIPTION   = 500


# ── LIST ALL CATEGORIES ───────────────────────────────
@router.get("/")
async def list_categories(conn=Depends(get_db)):
    try:
        rows = conn.execute(
            "SELECT category_id, category_name, description FROM Categories ORDER BY category_name"
        ).fetchall()
        return success_response(data=[dict(r) for r in rows])
    except Exception:
        logger.exception("list_categories failed")
        return error_response("Internal server error", 500)


# ── GET SINGLE CATEGORY ───────────────────────────────
@router.get("/{category_id}")
async def get_category(category_id: int, conn=Depends(get_db)):
    try:
        row = conn.execute(
            "SELECT category_id, category_name, description FROM Categories WHERE category_id = ?",
            (category_id,),
        ).fetchone()
        if not row:
            return error_response("Category not found", 404)
        return success_response(data=dict(row))
    except Exception:
        logger.exception("get_category failed for category_id: %s", category_id)
        return error_response("Internal server error", 500)


# ── ADD CATEGORY (Admin) ──────────────────────────────
@router.post("/")
async def add_category(request: Request, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    name = str(data.get("category_name", "") or "").strip()
    if not name:
        return error_response("category_name is required", 400)
    if len(name) > MAX_CATEGORY_NAME:
        return error_response(f"category_name must be {MAX_CATEGORY_NAME} characters or fewer", 400)

    description = str(data.get("description", "") or "").strip() or None
    if description and len(description) > MAX_DESCRIPTION:
        return error_response(f"description must be {MAX_DESCRIPTION} characters or fewer", 400)

    try:
        conn.execute(
            "INSERT INTO Categories (category_name, description) VALUES (?, ?)",
            (name, description),
        )
        conn.commit()
        return success_response(message="Category added successfully")
    except Exception:
        logger.exception("add_category failed for name: %s", name)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── UPDATE CATEGORY (Admin) ───────────────────────────
@router.put("/{category_id}")
async def update_category(
    category_id: int, request: Request, conn=Depends(get_db), admin=Depends(require_admin)
):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    try:
        row = conn.execute(
            "SELECT category_id, category_name, description FROM Categories WHERE category_id = ?",
            (category_id,),
        ).fetchone()
        if not row:
            return error_response("Category not found", 404)

        name = str(data.get("category_name", row["category_name"]) or "").strip()
        if not name:
            return error_response("category_name cannot be empty", 400)
        if len(name) > MAX_CATEGORY_NAME:
            return error_response(f"category_name must be {MAX_CATEGORY_NAME} characters or fewer", 400)

        description = str(data.get("description", row["description"]) or "").strip() or None
        if description and len(description) > MAX_DESCRIPTION:
            return error_response(f"description must be {MAX_DESCRIPTION} characters or fewer", 400)

        conn.execute(
            "UPDATE Categories SET category_name = ?, description = ? WHERE category_id = ?",
            (name, description, category_id),
        )
        conn.commit()
        return success_response(message="Category updated successfully")
    except Exception:
        logger.exception("update_category failed for category_id: %s", category_id)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── DELETE CATEGORY (Admin) ───────────────────────────
@router.delete("/{category_id}")
async def delete_category(category_id: int, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        if not conn.execute(
            "SELECT 1 FROM Categories WHERE category_id = ?", (category_id,)
        ).fetchone():
            return error_response("Category not found", 404)

        # Check if any products are using this category
        product_count = conn.execute(
            "SELECT COUNT(*) as c FROM Products WHERE category_id = ?", (category_id,)
        ).fetchone()["c"]
        if product_count > 0:
            return error_response(
                f"Cannot delete — {product_count} product(s) are assigned to this category. "
                "Reassign or delete those products first.",
                400,
            )

        conn.execute("DELETE FROM Categories WHERE category_id = ?", (category_id,))
        conn.commit()
        return success_response(message="Category deleted successfully")

    except Exception:
        logger.exception("delete_category failed for category_id: %s", category_id)
        conn.rollback()
        return error_response("Internal server error", 500)