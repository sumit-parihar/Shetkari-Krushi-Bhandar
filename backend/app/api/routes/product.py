from fastapi import APIRouter, Request, Depends
from app.db.connection import get_db
from app.utils.response import success_response, error_response
from app.utils.validators import validate_pagination
from app.utils.product_validator import validate_product_data
from app.dependencies.auth import require_admin

router = APIRouter()


# ------------------------
# Get Products with Pagination
# ------------------------
@router.get("/")
async def get_products(request: Request, conn=Depends(get_db)):
    params = request.query_params
    page = params.get("page", 1)
    page_size = params.get("page_size", 10)

    page, page_size, error = validate_pagination(page, page_size)
    if error:
        return error_response(message=error, status_code=400)

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

        return success_response(
            data={
                "products": [dict(row) for row in products],
                "page": page,
                "page_size": page_size,
                "total": total,
            }
        )
    except Exception:
        return error_response(message="Internal server error", status_code=500)


# ------------------------
# Search Products (with filters)
# ------------------------
@router.get("/search")
async def search_products(request: Request, conn=Depends(get_db)):
    params = request.query_params
    try:
        name = params.get("name")
        keyword = params.get("keyword")
        category_id = params.get("category_id")
        min_price = params.get("min_price")
        max_price = params.get("max_price")
        sort = params.get("sort")
        low_stock = params.get("low_stock")
        out_of_stock = params.get("out_of_stock")

        if category_id:
            try:
                category_id = int(category_id)
            except:
                return error_response("category_id must be integer", 400)

        if min_price:
            try:
                min_price = float(min_price)
            except:
                return error_response("min_price must be number", 400)

        if max_price:
            try:
                max_price = float(max_price)
            except:
                return error_response("max_price must be number", 400)

        if sort and sort not in ["asc", "desc"]:
            return error_response("sort must be 'asc' or 'desc'", 400)

        # Build WHERE clause separately so we can reuse for COUNT
        where = "WHERE 1=1"
        query_params = []

        if name:
            where += " AND p.name LIKE ?"
            query_params.append(f"%{name}%")

        if keyword:
            where += " AND (p.name LIKE ? OR p.description LIKE ?)"
            query_params.extend([f"%{keyword}%", f"%{keyword}%"])

        if category_id:
            where += " AND p.category_id = ?"
            query_params.append(category_id)

        if min_price:
            where += " AND p.price >= ?"
            query_params.append(min_price)

        if max_price:
            where += " AND p.price <= ?"
            query_params.append(max_price)

        if low_stock and low_stock.lower() == "true":
            where += " AND p.stock_quantity > 0 AND p.stock_quantity < 10"

        if out_of_stock and out_of_stock.lower() == "true":
            where += " AND p.stock_quantity = 0"

        # Count query — no ORDER BY, no LIMIT
        count_query = f"""
            SELECT COUNT(*) as total
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.category_id
            {where}
        """
        total = conn.execute(count_query, query_params).fetchone()["total"]

        # Pagination
        page = params.get("page", 1)
        page_size = params.get("page_size", 10)
        page, page_size, error = validate_pagination(page, page_size)
        if error:
            return error_response(message=error, status_code=400)

        # Build ORDER BY
        if sort == "asc":
            order = "ORDER BY p.price ASC"
        elif sort == "desc":
            order = "ORDER BY p.price DESC"
        else:
            order = "ORDER BY p.product_id DESC"

        # Data query
        data_query = f"""
            SELECT
                p.product_id,
                p.name,
                p.price,
                p.stock_quantity,
                p.image_url,
                c.category_name
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.category_id
            {where}
            {order}
            LIMIT ? OFFSET ?
        """
        result = conn.execute(data_query, query_params + [page_size, (page - 1) * page_size]).fetchall()

        return success_response(
            data={
                "products": [dict(row) for row in result],
                "page": page,
                "page_size": page_size,
                "total": total,
            }
        )
    except Exception as e:
        return error_response("Internal server error", 500)


# ------------------------
# Add Product (Admin)
# ------------------------
@router.post("/")
async def add_product(request: Request, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    error = validate_product_data(data)
    if error:
        return error_response(error, 400)

    if data.get("category_id") is not None:
        try:
            int(data["category_id"])
        except:
            return error_response("category_id must be integer", 400)

        category = conn.execute(
            "SELECT category_id FROM Categories WHERE category_id = ?", (data["category_id"],)
        ).fetchone()
        if not category:
            return error_response("Invalid category_id", 400)

    try:
        conn.execute(
            """
            INSERT INTO Products (name, description, price, stock_quantity, category_id, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                data["name"],
                data.get("description"),
                data["price"],
                data["stock_quantity"],
                data.get("category_id"),
                data.get("image_url"),
            ),
        )
        conn.commit()
        return success_response(message="Product added successfully")
    except Exception:
        conn.rollback()
        return error_response("Internal server error", 500)


# ------------------------
# Update Product (Admin)
# ------------------------
@router.put("/{product_id}")
async def update_product(product_id: int, request: Request, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data:
        return error_response("Invalid JSON body", 400)

    try:
        product = conn.execute(
            """
            SELECT product_id, name, description, price, stock_quantity, category_id, image_url
            FROM Products WHERE product_id = ?
            """,
            (product_id,),
        ).fetchone()

        if not product:
            return error_response("Product not found", 404)

        if "price" in data:
            try:
                float(data["price"])
            except:
                return error_response("price must be number", 400)

        if "stock_quantity" in data:
            try:
                int(data["stock_quantity"])
            except:
                return error_response("stock_quantity must be integer", 400)

        if "category_id" in data and data["category_id"] is not None:
            try:
                int(data["category_id"])
            except:
                return error_response("category_id must be integer", 400)
            category = conn.execute(
                "SELECT category_id FROM Categories WHERE category_id = ?", (data["category_id"],)
            ).fetchone()
            if not category:
                return error_response("Invalid category_id", 400)

        conn.execute(
            """
            UPDATE Products
            SET name = ?, description = ?, price = ?, stock_quantity = ?, category_id = ?, image_url = ?
            WHERE product_id = ?
            """,
            (
                data.get("name", product["name"]),
                data.get("description", product["description"]),
                data.get("price", product["price"]),
                data.get("stock_quantity", product["stock_quantity"]),
                data.get("category_id", product["category_id"]),
                data.get("image_url", product["image_url"]),
                product_id,
            ),
        )
        conn.commit()
        return success_response(message="Product updated successfully")
    except Exception:
        conn.rollback()
        return error_response("Internal server error", 500)


# ------------------------
# Delete Product (Admin)
# ------------------------
@router.delete("/{product_id}")
async def delete_product(product_id: int, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        product = conn.execute(
            "SELECT product_id FROM Products WHERE product_id = ?", (product_id,)
        ).fetchone()

        if not product:
            return error_response("Product not found", 404)

        try:
            conn.execute("DELETE FROM Products WHERE product_id = ?", (product_id,))
            conn.commit()
            return success_response(message="Product deleted successfully")
        except:
            conn.rollback()
            return error_response("Internal server error", 500)
    except Exception:
        return error_response("Internal server error", 500)


# ------------------------
# Get Product by ID
# ------------------------
@router.get("/{product_id}")
async def get_product_by_id(product_id: int, conn=Depends(get_db)):
    try:
        product = conn.execute(
            """
            SELECT
                p.product_id,
                p.name,
                p.description,
                p.price,
                p.stock_quantity,
                p.image_url,
                c.category_name
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
        return error_response("Internal server error", 500)
