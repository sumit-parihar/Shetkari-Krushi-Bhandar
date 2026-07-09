import logging
from fastapi import APIRouter, Request, Depends
from app.db.connection import get_db
from app.utils.response import success_response, error_response
from app.utils.validators import validate_pagination
from app.dependencies.auth import require_admin

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_NAME        = 200
MAX_DESCRIPTION = 2000
MAX_IMAGE_URL   = 500


def _validate_product_fields(data: dict, require_all: bool = True) -> str | None:
    name        = str(data.get("name", "") or "").strip()
    description = str(data.get("description", "") or "")
    image_url   = str(data.get("image_url",   "") or "")

    if require_all and not name:
        return "name is required"
    if name and len(name) > MAX_NAME:
        return f"name must be {MAX_NAME} characters or fewer"
    if description and len(description) > MAX_DESCRIPTION:
        return f"description must be {MAX_DESCRIPTION} characters or fewer"
    if image_url and len(image_url) > MAX_IMAGE_URL:
        return f"image_url must be {MAX_IMAGE_URL} characters or fewer"

    price = data.get("price")
    stock = data.get("stock_quantity")

    if require_all:
        if price is None:
            return "price is required"
        if stock is None:
            return "stock_quantity is required"

    if price is not None:
        try:
            if float(price) < 0:
                return "price must be 0 or greater"
        except (TypeError, ValueError):
            return "price must be a valid number"

    if stock is not None:
        try:
            if int(stock) < 0:
                return "stock_quantity must be 0 or greater"
        except (TypeError, ValueError):
            return "stock_quantity must be a valid integer"

    return None


# ── GET PRODUCTS (paginated) ──────────────────────────
@router.get("/")
async def get_products(request: Request, conn=Depends(get_db)):
    params    = request.query_params
    page, page_size, err = validate_pagination(params.get("page", 1), params.get("page_size", 10))
    if err:
        return error_response(err, 400)
    offset = (page - 1) * page_size

    try:
        total = conn.execute("SELECT COUNT(*) as total FROM Products").fetchone()["total"]
        products = conn.execute(
            """
            SELECT p.product_id, p.name, p.price, p.stock_quantity, p.image_url, c.category_name
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.category_id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
            """,
            (page_size, offset),
        ).fetchall()

        return success_response(data={
            "products":  [dict(r) for r in products],
            "page":      page,
            "page_size": page_size,
            "total":     total,
        })
    except Exception:
        logger.exception("get_products failed")
        return error_response("Internal server error", 500)


# ── SEARCH PRODUCTS ───────────────────────────────────
@router.get("/search")
async def search_products(request: Request, conn=Depends(get_db)):
    params = request.query_params
    try:
        keyword     = params.get("keyword")
        category_id = params.get("category_id")
        min_price   = params.get("min_price")
        max_price   = params.get("max_price")
        sort        = params.get("sort")
        low_stock   = params.get("low_stock")
        out_of_stock = params.get("out_of_stock")

        if category_id:
            try:   category_id = int(category_id)
            except: return error_response("category_id must be integer", 400)
        if min_price:
            try:   min_price = float(min_price)
            except: return error_response("min_price must be number", 400)
        if max_price:
            try:   max_price = float(max_price)
            except: return error_response("max_price must be number", 400)
        if sort and sort not in ("asc", "desc"):
            return error_response("sort must be 'asc' or 'desc'", 400)

        where        = "WHERE 1=1"
        query_params = []

        if keyword:
            where += " AND p.name LIKE ?"
            query_params.append(f"%{keyword}%")
        if category_id:
            where += " AND p.category_id = ?"
            query_params.append(category_id)
        if min_price is not None:
            where += " AND p.price >= ?"
            query_params.append(min_price)
        if max_price is not None:
            where += " AND p.price <= ?"
            query_params.append(max_price)
        if low_stock and low_stock.lower() == "true":
            where += " AND p.stock_quantity > 0 AND p.stock_quantity < 10"
        if out_of_stock and out_of_stock.lower() == "true":
            where += " AND p.stock_quantity = 0"

        total = conn.execute(
            f"SELECT COUNT(*) as total FROM Products p LEFT JOIN Categories c ON p.category_id = c.category_id {where}",
            query_params,
        ).fetchone()["total"]

        page, page_size, err = validate_pagination(params.get("page", 1), params.get("page_size", 10))
        if err:
            return error_response(err, 400)

        order = ("ORDER BY p.price ASC"  if sort == "asc"  else
                 "ORDER BY p.price DESC" if sort == "desc" else
                 "ORDER BY p.product_id DESC")

        products = conn.execute(
            f"""
            SELECT p.product_id, p.name, p.price, p.stock_quantity, p.image_url, c.category_name
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.category_id
            {where}
            {order}
            LIMIT ? OFFSET ?
            """,
            query_params + [page_size, (page - 1) * page_size],
        ).fetchall()

        return success_response(data={
            "products":  [dict(r) for r in products],
            "page":      page,
            "page_size": page_size,
            "total":     total,
        })

    except Exception:
        logger.exception("search_products failed")
        return error_response("Internal server error", 500)


# ── ADD PRODUCT (Admin) ───────────────────────────────
@router.post("/")
async def add_product(request: Request, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    err = _validate_product_fields(data, require_all=True)
    if err:
        return error_response(err, 400)

    if data.get("category_id") is not None:
        try:
            cat_id = int(data["category_id"])
        except (TypeError, ValueError):
            return error_response("category_id must be integer", 400)
        if not conn.execute("SELECT 1 FROM Categories WHERE category_id = ?", (cat_id,)).fetchone():
            return error_response("Invalid category_id", 400)
        data["category_id"] = cat_id

    try:
        conn.execute(
            """
            INSERT INTO Products (name, description, price, stock_quantity, category_id, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                str(data["name"]).strip(),
                str(data.get("description") or "").strip() or None,
                float(data["price"]),
                int(data["stock_quantity"]),
                data.get("category_id"),
                str(data.get("image_url") or "").strip() or None,
            ),
        )
        conn.commit()
        return success_response(message="Product added successfully")
    except Exception:
        logger.exception("add_product failed")
        conn.rollback()
        return error_response("Internal server error", 500)


# ── UPDATE PRODUCT (Admin) ────────────────────────────
@router.put("/{product_id}")
async def update_product(
    product_id: int, request: Request, conn=Depends(get_db), admin=Depends(require_admin)
):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    err = _validate_product_fields(data, require_all=False)
    if err:
        return error_response(err, 400)

    try:
        product = conn.execute(
            "SELECT product_id, name, description, price, stock_quantity, category_id, image_url FROM Products WHERE product_id = ?",
            (product_id,),
        ).fetchone()
        if not product:
            return error_response("Product not found", 404)

        category_id = data.get("category_id", product["category_id"])
        if category_id is not None:
            try:
                category_id = int(category_id)
            except (TypeError, ValueError):
                return error_response("category_id must be integer", 400)
            if not conn.execute("SELECT 1 FROM Categories WHERE category_id = ?", (category_id,)).fetchone():
                return error_response("Invalid category_id", 400)

        conn.execute(
            """
            UPDATE Products
            SET name=?, description=?, price=?, stock_quantity=?, category_id=?, image_url=?
            WHERE product_id=?
            """,
            (
                str(data.get("name", product["name"])).strip(),
                str(data.get("description", product["description"]) or "").strip() or None,
                float(data.get("price", product["price"])),
                int(data.get("stock_quantity", product["stock_quantity"])),
                category_id,
                str(data.get("image_url", product["image_url"]) or "").strip() or None,
                product_id,
            ),
        )
        conn.commit()
        return success_response(message="Product updated successfully")
    except Exception:
        logger.exception("update_product failed for product_id: %s", product_id)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── DELETE PRODUCT (Admin) ────────────────────────────
@router.delete("/{product_id}")
async def delete_product(product_id: int, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        if not conn.execute("SELECT 1 FROM Products WHERE product_id = ?", (product_id,)).fetchone():
            return error_response("Product not found", 404)
        conn.execute("DELETE FROM Products WHERE product_id = ?", (product_id,))
        conn.commit()
        return success_response(message="Product deleted successfully")
    except Exception:
        logger.exception("delete_product failed for product_id: %s", product_id)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── GET PRODUCT BY ID ─────────────────────────────────
@router.get("/{product_id}")
async def get_product_by_id(product_id: int, conn=Depends(get_db)):
    try:
        product = conn.execute(
            """
            SELECT p.product_id, p.name, p.description, p.price, p.stock_quantity,
                   p.image_url, c.category_name
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.category_id
            WHERE p.product_id = ?
            """,
            (product_id,),
        ).fetchone()
        if not product:
            return error_response("Product not found", 404)
        return success_response(dict(product))
    except Exception:
        logger.exception("get_product_by_id failed for product_id: %s", product_id)
        return error_response("Internal server error", 500)