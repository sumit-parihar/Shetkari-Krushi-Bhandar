from fastapi import APIRouter, Request, Depends
from app.db.connection import get_db
from app.utils.response import success_response, error_response
from app.utils.validators import validate_page_limit
from app.dependencies.auth import require_user, require_admin, require_customer, require_delivery_boy
from app.utils.roles import normalize_role
from app.utils.sse import broadcast_update

router = APIRouter()


# ------------------------
# Place Order (COD, Customer)
# ------------------------
@router.post("/")
async def place_order(request: Request, conn=Depends(get_db), user=Depends(require_customer)):
    user_id = user['user_id']
    delivery_address = None
    try:
        body = await request.json()
        if isinstance(body, dict):
            addr = body.get("delivery_address")
            if addr is not None and str(addr).strip():
                delivery_address = str(addr).strip()
    except Exception:
        pass

    try:
        cart = conn.execute("SELECT cart_id FROM Cart WHERE user_id = ?", (user_id,)).fetchone()
        if not cart:
            return error_response("Cart is empty", 400)
        cart_id = cart['cart_id']

        items = conn.execute("""
            SELECT ci.cart_item_id, ci.product_id, ci.quantity, p.price, p.stock_quantity
            FROM Cart_Items ci
            JOIN Products p ON ci.product_id = p.product_id
            WHERE ci.cart_id = ?
        """, (cart_id,)).fetchall()

        if not items:
            return error_response("Cart is empty", 400)

        for item in items:
            if item['quantity'] > item['stock_quantity']:
                return error_response(f"Insufficient stock for product_id {item['product_id']}", 400)

        total_amount = sum(item['quantity'] * item['price'] for item in items)

        cursor = conn.execute("""
            INSERT INTO Orders (user_id, total_amount, payment_method, order_status, delivery_address)
            VALUES (?, ?, 'COD', 'Pending', ?)
        """, (user_id, total_amount, delivery_address))
        order_id = cursor.lastrowid

        for item in items:
            conn.execute("""
                INSERT INTO Order_Items (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
            """, (order_id, item['product_id'], item['quantity'], item['price']))

            conn.execute("""
                UPDATE Products SET stock_quantity = stock_quantity - ? WHERE product_id = ?
            """, (item['quantity'], item['product_id']))

        conn.execute("DELETE FROM Cart_Items WHERE cart_id = ?", (cart_id,))
        conn.commit()

        # Broadcast new order to all connected clients
        await broadcast_update("new_order", {"order_id": order_id, "user_id": user_id})

        return success_response(data={"order_id": order_id}, message=f"Order placed successfully with order_id {order_id}")

    except Exception:
        conn.rollback()
        return error_response("Internal server error", 500)


# ------------------------
# Order History (Customer)
# ------------------------
@router.get("/")
async def order_history(request: Request, conn=Depends(get_db), user=Depends(require_customer)):
    user_id = user['user_id']
    params = request.query_params
    status = params.get('status')
    search = params.get('search')
    from_date = params.get('from_date')
    to_date = params.get('to_date')

    try:
        page, limit, perr = validate_page_limit(params.get("page"), params.get("limit"))
        if perr:
            return error_response(perr, 400)
        offset = (page - 1) * limit

        base_query = "FROM Orders WHERE user_id = ?"
        query_params = [user_id]

        if status and status != "All":
            base_query += " AND order_status = ?"
            query_params.append(status)

        if search:
            base_query += " AND CAST(order_id AS TEXT) LIKE ?"
            query_params.append(f"%{search}%")

        if from_date and to_date:
            base_query += " AND DATE(order_date) BETWEEN DATE(?) AND DATE(?)"
            query_params.extend([from_date, to_date])
        elif from_date:
            base_query += " AND DATE(order_date) >= DATE(?)"
            query_params.append(from_date)
        elif to_date:
            base_query += " AND DATE(order_date) <= DATE(?)"
            query_params.append(to_date)

        total = conn.execute(f"SELECT COUNT(*) {base_query}", tuple(query_params)).fetchone()[0]
        total_pages = (total + limit - 1) // limit

        query = f"""
            SELECT order_id, total_amount, order_status, payment_method, order_date, delivery_address
            {base_query}
            ORDER BY order_date DESC
            LIMIT ? OFFSET ?
        """
        orders = conn.execute(query, tuple(query_params + [limit, offset])).fetchall()

        result = []
        for order in orders:
            items = conn.execute("""
                SELECT oi.product_id, p.name, oi.quantity, oi.price
                FROM Order_Items oi
                JOIN Products p ON oi.product_id = p.product_id
                WHERE oi.order_id = ?
            """, (order['order_id'],)).fetchall()

            result.append({
                "order_id": order['order_id'],
                "total_amount": order['total_amount'],
                "order_status": order['order_status'],
                "payment_method": order['payment_method'],
                "order_date": order['order_date'],
                "delivery_address": order['delivery_address'],
                "items": [dict(i) for i in items]
            })

        return success_response(data={
            "orders": result,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        })

    except Exception:
        return error_response("Internal server error", 500)


# ------------------------
# Update Order Status (Admin)
# ------------------------
@router.patch("/{order_id}")
async def update_order_status(order_id: int, request: Request, conn=Depends(get_db), user=Depends(require_admin)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    if not data or 'order_status' not in data:
        return error_response("order_status is required", 400)

    status = data['order_status']
    if status not in ['Pending', 'Shipped', 'Delivered', 'Cancelled']:
        return error_response("Invalid order_status", 400)

    try:
        order = conn.execute(
            "SELECT order_id, order_status FROM Orders WHERE order_id = ?",
            (order_id,)
        ).fetchone()
        if not order:
            return error_response("Order not found", 404)

        current_status = order['order_status']
        valid_transitions = {
            "Pending": ["Shipped", "Cancelled"],
            "Shipped": ["Delivered", "Cancelled"],
            "Delivered": [],
            "Cancelled": []
        }
        if status not in valid_transitions[current_status]:
            return error_response(f"Cannot change status from {current_status} to {status}", 400)

        conn.execute("UPDATE Orders SET order_status = ? WHERE order_id = ?", (status, order_id))
        conn.commit()

        # Broadcast status update to all connected clients
        await broadcast_update("order_status_changed", {"order_id": order_id, "new_status": status})

        return success_response(message="Order status updated successfully")

    except Exception:
        conn.rollback()
        return error_response("Internal server error", 500)


# ------------------------
# Get All Orders (Admin)
# ------------------------
@router.get("/admin")
async def get_all_orders(request: Request, conn=Depends(get_db), user=Depends(require_admin)):
    params = request.query_params
    status = params.get('status')
    search = params.get('search')
    from_date = params.get('from_date')
    to_date = params.get('to_date')

    try:
        page, limit, perr = validate_page_limit(params.get("page"), params.get("limit"))
        if perr:
            return error_response(perr, 400)
        offset = (page - 1) * limit

        base_query = """
            FROM Orders o
            JOIN Users u ON o.user_id = u.user_id
            LEFT JOIN Users db ON o.delivery_boy_id = db.user_id
            WHERE 1=1
        """
        query_params = []

        if status and status != "All":
            base_query += " AND o.order_status = ?"
            query_params.append(status)

        if search:
            base_query += " AND (u.name LIKE ? OR CAST(o.order_id AS TEXT) LIKE ?)"
            query_params.extend([f"%{search}%", f"%{search}%"])

        if from_date and to_date:
            base_query += " AND DATE(o.order_date) BETWEEN DATE(?) AND DATE(?)"
            query_params.extend([from_date, to_date])
        elif from_date:
            base_query += " AND DATE(o.order_date) >= DATE(?)"
            query_params.append(from_date)
        elif to_date:
            base_query += " AND DATE(o.order_date) <= DATE(?)"
            query_params.append(to_date)

        total = conn.execute(f"SELECT COUNT(*) {base_query}", tuple(query_params)).fetchone()[0]
        total_pages = (total + limit - 1) // limit

        query = f"""
            SELECT o.order_id, u.name AS user_name, o.total_amount,
                   o.order_status, o.payment_method, o.order_date,
                   o.delivery_boy_id, db.name AS delivery_boy_name
            {base_query}
            ORDER BY o.order_date DESC
            LIMIT ? OFFSET ?
        """
        orders = conn.execute(query, tuple(query_params + [limit, offset])).fetchall()

        result = []
        for order in orders:
            items = conn.execute("""
                SELECT oi.product_id, p.name, oi.quantity, oi.price
                FROM Order_Items oi
                JOIN Products p ON oi.product_id = p.product_id
                WHERE oi.order_id = ?
            """, (order['order_id'],)).fetchall()

            result.append({
                "order_id": order['order_id'],
                "user_name": order['user_name'],
                "total_amount": order['total_amount'],
                "order_status": order['order_status'],
                "payment_method": order['payment_method'],
                "order_date": order['order_date'],
                "delivery_boy_id": order['delivery_boy_id'],
                "delivery_boy_name": order['delivery_boy_name'],
                "items": [dict(i) for i in items]
            })

        return success_response(data={
            "orders": result,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        })

    except Exception:
        return error_response("Internal server error", 500)


# ------------------------
# Assign Delivery Boy to Order (Admin)
# ------------------------
@router.patch("/{order_id}/assign")
async def assign_delivery_boy(order_id: int, request: Request, conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    delivery_boy_id = data.get("delivery_boy_id")

    try:
        order = conn.execute(
            "SELECT order_id, order_status FROM Orders WHERE order_id = ?", (order_id,)
        ).fetchone()
        if not order:
            return error_response("Order not found", 404)

        if order['order_status'] not in ('Pending', 'Shipped'):
            return error_response("Can only assign delivery boy to Pending or Shipped orders", 400)

        if delivery_boy_id is not None:
            db_user = conn.execute(
                "SELECT user_id FROM Users WHERE user_id = ? AND role = 'delivery_boy'",
                (delivery_boy_id,)
            ).fetchone()
            if not db_user:
                return error_response("Delivery boy not found", 404)

        conn.execute(
            "UPDATE Orders SET delivery_boy_id = ? WHERE order_id = ?",
            (delivery_boy_id, order_id)
        )
        conn.commit()
        return success_response(message="Delivery boy assigned successfully")

    except Exception:
        conn.rollback()
        return error_response("Internal server error", 500)


# ------------------------
# Get Single Order Details
# ------------------------
@router.get("/{order_id}/detail")
async def get_order_detail(order_id: int, conn=Depends(get_db), user=Depends(require_user)):
    try:
        order = conn.execute("""
            SELECT order_id, user_id, total_amount, order_status, payment_method,
                   order_date, delivery_address, delivery_boy_id
            FROM Orders
            WHERE order_id = ?
        """, (order_id,)).fetchone()

        if not order:
            return error_response("Order not found", 404)

        role = normalize_role(user["role"])

        if role == "customer" and order["user_id"] != user["user_id"]:
            return error_response("Unauthorized access", 403)

        if role == "delivery_boy" and order["delivery_boy_id"] != user["user_id"]:
            return error_response("Unauthorized access", 403)

        items = conn.execute("""
            SELECT oi.product_id, p.name, oi.quantity, oi.price
            FROM Order_Items oi
            JOIN Products p ON oi.product_id = p.product_id
            WHERE oi.order_id = ?
        """, (order_id,)).fetchall()

        return success_response(data={
            "order_id": order['order_id'],
            "total_amount": order['total_amount'],
            "order_status": order['order_status'],
            "payment_method": order['payment_method'],
            "order_date": order['order_date'],
            "delivery_address": order['delivery_address'],
            "items": [dict(i) for i in items]
        })

    except Exception:
        return error_response("Internal server error", 500)


# ------------------------
# Cancel Order (Customer)
# ------------------------
@router.patch("/{order_id}/cancel")
async def cancel_order(order_id: int, conn=Depends(get_db), user=Depends(require_customer)):
    user_id = user['user_id']
    try:
        order = conn.execute("""
            SELECT order_id, user_id, order_status
            FROM Orders
            WHERE order_id = ?
        """, (order_id,)).fetchone()

        if not order:
            return error_response("Order not found", 404)

        if order['user_id'] != user_id:
            return error_response("Unauthorized", 403)

        if order['order_status'] not in ['Pending', 'Shipped']:
            return error_response("Order cannot be cancelled", 400)

        conn.execute("UPDATE Orders SET order_status = 'Cancelled' WHERE order_id = ?", (order_id,))
        conn.commit()

        return success_response(message="Order cancelled successfully")

    except Exception:
        conn.rollback()
        return error_response("Internal server error", 500)


# ============================================================
# DELIVERY BOY ENDPOINTS
# ============================================================

# ------------------------
# Get My Assigned Orders (Delivery Boy)
# ------------------------
@router.get("/delivery/my-orders")
async def delivery_boy_orders(request: Request, conn=Depends(get_db), user=Depends(require_delivery_boy)):
    delivery_boy_id = user['user_id']
    params = request.query_params

    try:
        page, limit, perr = validate_page_limit(params.get("page"), params.get("limit"))
        if perr:
            return error_response(perr, 400)
        offset = (page - 1) * limit

        status_filter = params.get("status", "")

        base_query = "FROM Orders WHERE delivery_boy_id = ?"
        query_params = [delivery_boy_id]

        if status_filter and status_filter != "All":
            base_query += " AND order_status = ?"
            query_params.append(status_filter)

        total = conn.execute(f"SELECT COUNT(*) {base_query}", tuple(query_params)).fetchone()[0]
        total_pages = (total + limit - 1) // limit

        orders = conn.execute(
            f"""
            SELECT o.order_id, u.name AS customer_name, o.total_amount,
                   o.order_status, o.order_date, o.delivery_address
            FROM Orders o
            JOIN Users u ON o.user_id = u.user_id
            WHERE o.delivery_boy_id = ?
            {"AND o.order_status = ?" if status_filter and status_filter != "All" else ""}
            ORDER BY o.order_date DESC
            LIMIT ? OFFSET ?
            """,
            tuple(query_params + [limit, offset])
        ).fetchall()

        result = []
        for order in orders:
            items = conn.execute("""
                SELECT oi.product_id, p.name, oi.quantity, oi.price
                FROM Order_Items oi
                JOIN Products p ON oi.product_id = p.product_id
                WHERE oi.order_id = ?
            """, (order['order_id'],)).fetchall()

            result.append({
                "order_id": order['order_id'],
                "customer_name": order['customer_name'],
                "total_amount": order['total_amount'],
                "order_status": order['order_status'],
                "order_date": order['order_date'],
                "delivery_address": order['delivery_address'],
                "items": [dict(i) for i in items]
            })

        return success_response(data={
            "orders": result,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        })

    except Exception:
        return error_response("Internal server error", 500)


# ------------------------
# Update Status of Assigned Order (Delivery Boy)
# Delivery boy can: Pending -> Shipped, Shipped -> Delivered
# ------------------------
@router.patch("/delivery/{order_id}/status")
async def delivery_boy_update_status(order_id: int, request: Request, conn=Depends(get_db), user=Depends(require_delivery_boy)):
    delivery_boy_id = user['user_id']
    try:
        data = await request.json()
    except Exception:
        return error_response("Invalid JSON body", 400)

    new_status = data.get("order_status")
    if not new_status:
        return error_response("order_status is required", 400)

    # Delivery boy can only mark orders as Shipped or Delivered
    if new_status not in ['Shipped', 'Delivered']:
        return error_response("Delivery boy can only mark orders as Shipped or Delivered", 400)

    try:
        order = conn.execute(
            "SELECT order_id, order_status, delivery_boy_id FROM Orders WHERE order_id = ?",
            (order_id,)
        ).fetchone()

        if not order:
            return error_response("Order not found", 404)

        # Enforce: only the assigned delivery boy can update
        if order['delivery_boy_id'] != delivery_boy_id:
            return error_response("This order is not assigned to you", 403)

        # Validate status transitions for delivery boy
        valid_transitions = {
            'Pending': 'Shipped',      # Pick up the order
            'Shipped': 'Delivered',    # Complete the delivery
        }

        current_status = order['order_status']
        if current_status not in valid_transitions:
            return error_response(f"Cannot update order with status '{current_status}'", 400)

        expected_next = valid_transitions[current_status]
        if new_status != expected_next:
            return error_response(f"Cannot change status from {current_status} to {new_status}. Expected: {expected_next}", 400)

        conn.execute("UPDATE Orders SET order_status = ? WHERE order_id = ?", (new_status, order_id))
        conn.commit()

        # Broadcast status update to all connected clients
        await broadcast_update("order_status_changed", {"order_id": order_id, "new_status": new_status})

        return success_response(message=f"Order marked as {new_status}")

    except Exception:
        conn.rollback()
        return error_response("Internal server error", 500)
