import sqlite3
from fastapi import APIRouter, Request, Depends

from app.db.connection import get_db
from app.dependencies.auth import require_admin
from app.utils.response import success_response, error_response

router = APIRouter()


@router.get("/")
async def list_categories(conn=Depends(get_db)):
    try:
        rows = conn.execute(
            "SELECT category_id, category_name, description FROM Categories ORDER BY category_name"
        ).fetchall()
        return success_response(data=[dict(r) for r in rows])
    except Exception:
        return error_response("Internal server error", 500)


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
        return error_response("Internal server error", 500)


@router.post("/")
async def add_category(request: Request, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data or not str(data.get("category_name", "")).strip():
        return error_response("category_name is required", 400)

    try:
        conn.execute(
            "INSERT INTO Categories (category_name, description) VALUES (?, ?)",
            (str(data["category_name"]).strip(), data.get("description")),
        )
        conn.commit()
        return success_response(message="Category added successfully")
    except Exception:
        conn.rollback()
        return error_response("Internal server error", 500)


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

        name = str(data.get("category_name", row["category_name"])).strip()
        if not name:
            return error_response("category_name cannot be empty", 400)

        conn.execute(
            "UPDATE Categories SET category_name = ?, description = ? WHERE category_id = ?",
            (name, data.get("description", row["description"]), category_id),
        )
        conn.commit()
        return success_response(message="Category updated successfully")
    except Exception:
        conn.rollback()
        return error_response("Internal server error", 500)


@router.delete("/{category_id}")
async def delete_category(category_id: int, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        row = conn.execute(
            "SELECT category_id FROM Categories WHERE category_id = ?", (category_id,)
        ).fetchone()
        if not row:
            return error_response("Category not found", 404)
        try:
            conn.execute("DELETE FROM Categories WHERE category_id = ?", (category_id,))
            conn.commit()
            return success_response(message="Category deleted successfully")
        except sqlite3.IntegrityError:
            conn.rollback()
            return error_response("Category is assigned to products and cannot be deleted", 400)
    except Exception:
        conn.rollback()
        return error_response("Internal server error", 500)
