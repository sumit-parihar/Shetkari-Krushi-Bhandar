import logging
from fastapi import APIRouter, Request, Depends
from app.db.connection import get_db
from app.utils.response import success_response, error_response
from app.dependencies.auth import require_customer

router = APIRouter()
logger = logging.getLogger(__name__)


# ── GET CART ──────────────────────────────────────────
@router.get("/")
async def get_cart(conn=Depends(get_db), user=Depends(require_customer)):
    user_id = user["user_id"]
    try:
        cart = conn.execute("SELECT cart_id FROM Cart WHERE user_id = ?", (user_id,)).fetchone()
        if not cart:
            conn.execute("INSERT INTO Cart (user_id) VALUES (?)", (user_id,))
            conn.commit()
            cart_id = conn.execute(
                "SELECT cart_id FROM Cart WHERE user_id = ?", (user_id,)
            ).fetchone()["cart_id"]
        else:
            cart_id = cart["cart_id"]

        items = conn.execute(
            """
            SELECT ci.cart_item_id, p.product_id, p.name, p.price,
                   p.image_url, ci.quantity, p.stock_quantity
            FROM Cart_Items ci
            JOIN Products p ON ci.product_id = p.product_id
            WHERE ci.cart_id = ?
            """,
            (cart_id,),
        ).fetchall()

        return success_response(data={"cart_id": cart_id, "items": [dict(i) for i in items]})

    except Exception:
        logger.exception("get_cart failed for user_id: %s", user_id)
        return error_response("Internal server error", 500)


# ── ADD TO CART ───────────────────────────────────────
@router.post("/")
async def add_to_cart(request: Request, conn=Depends(get_db), user=Depends(require_customer)):
    user_id = user["user_id"]
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data or "product_id" not in data or "quantity" not in data:
        return error_response("product_id and quantity are required", 400)

    try:
        product_id = int(data["product_id"])
        quantity   = int(data["quantity"])
        if quantity <= 0:
            return error_response("Quantity must be greater than 0", 400)
    except (TypeError, ValueError):
        return error_response("Invalid product_id or quantity", 400)

    try:
        product = conn.execute(
            "SELECT stock_quantity FROM Products WHERE product_id = ?", (product_id,)
        ).fetchone()
        if not product:
            return error_response("Product not found", 404)
        if product["stock_quantity"] < quantity:
            return error_response("Insufficient stock", 400)

        cart = conn.execute("SELECT cart_id FROM Cart WHERE user_id = ?", (user_id,)).fetchone()
        if not cart:
            conn.execute("INSERT INTO Cart (user_id) VALUES (?)", (user_id,))
            conn.commit()
            cart_id = conn.execute(
                "SELECT cart_id FROM Cart WHERE user_id = ?", (user_id,)
            ).fetchone()["cart_id"]
        else:
            cart_id = cart["cart_id"]

        existing = conn.execute(
            "SELECT cart_item_id, quantity FROM Cart_Items WHERE cart_id = ? AND product_id = ?",
            (cart_id, product_id),
        ).fetchone()

        if existing:
            new_qty = existing["quantity"] + quantity
            if new_qty > product["stock_quantity"]:
                return error_response(
                    f"Cannot add more — only {product['stock_quantity']} in stock", 400
                )
            conn.execute(
                "UPDATE Cart_Items SET quantity = ? WHERE cart_item_id = ?",
                (new_qty, existing["cart_item_id"]),
            )
        else:
            conn.execute(
                "INSERT INTO Cart_Items (cart_id, product_id, quantity) VALUES (?, ?, ?)",
                (cart_id, product_id, quantity),
            )

        conn.commit()
        return success_response(message="Product added to cart successfully")

    except Exception:
        logger.exception("add_to_cart failed for user_id: %s product_id: %s", user_id, product_id)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── UPDATE CART ITEM QUANTITY ─────────────────────────
@router.patch("/{cart_item_id}")
async def update_cart_item(
    cart_item_id: int, request: Request, conn=Depends(get_db), user=Depends(require_customer)
):
    user_id = user["user_id"]
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data or "quantity" not in data:
        return error_response("quantity is required", 400)

    try:
        quantity = int(data["quantity"])
        if quantity <= 0:
            return error_response("Quantity must be greater than 0", 400)
    except (TypeError, ValueError):
        return error_response("Invalid quantity", 400)

    try:
        cart_item = conn.execute(
            """
            SELECT ci.cart_item_id, ci.product_id, ci.cart_id
            FROM Cart_Items ci
            JOIN Cart c ON ci.cart_id = c.cart_id
            WHERE ci.cart_item_id = ? AND c.user_id = ?
            """,
            (cart_item_id, user_id),
        ).fetchone()

        if not cart_item:
            return error_response("Cart item not found", 404)

        product = conn.execute(
            "SELECT stock_quantity FROM Products WHERE product_id = ?",
            (cart_item["product_id"],),
        ).fetchone()
        if product["stock_quantity"] < quantity:
            return error_response(
                f"Cannot set quantity to {quantity} — only {product['stock_quantity']} in stock", 400
            )

        conn.execute(
            "UPDATE Cart_Items SET quantity = ? WHERE cart_item_id = ?", (quantity, cart_item_id)
        )
        conn.commit()
        return success_response(message="Cart item quantity updated")

    except Exception:
        logger.exception("update_cart_item failed for cart_item_id: %s", cart_item_id)
        conn.rollback()
        return error_response("Internal server error", 500)


# ── REMOVE CART ITEM ──────────────────────────────────
@router.delete("/{cart_item_id}")
async def remove_cart_item(
    cart_item_id: int, conn=Depends(get_db), user=Depends(require_customer)
):
    user_id = user["user_id"]
    try:
        cart_item = conn.execute(
            """
            SELECT ci.cart_item_id
            FROM Cart_Items ci
            JOIN Cart c ON ci.cart_id = c.cart_id
            WHERE ci.cart_item_id = ? AND c.user_id = ?
            """,
            (cart_item_id, user_id),
        ).fetchone()

        if not cart_item:
            return error_response("Cart item not found", 404)

        conn.execute("DELETE FROM Cart_Items WHERE cart_item_id = ?", (cart_item_id,))
        conn.commit()
        return success_response(message="Cart item removed successfully")

    except Exception:
        logger.exception("remove_cart_item failed for cart_item_id: %s", cart_item_id)
        conn.rollback()
        return error_response("Internal server error", 500)