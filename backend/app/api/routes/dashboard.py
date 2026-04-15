import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.db.connection import get_db
from app.utils.response import success_response, error_response
from app.dependencies.auth import require_customer, require_admin

router = APIRouter()


# ------------------------
# Customer Dashboard
# ------------------------
@router.get("/customer")
async def customer_dashboard(conn=Depends(get_db), user=Depends(require_customer)):
    user_id = user["user_id"]
    try:
        total_orders = conn.execute(
            "SELECT COUNT(*) as count FROM Orders WHERE user_id = ?", (user_id,)
        ).fetchone()["count"]

        pending = conn.execute(
            "SELECT COUNT(*) as count FROM Orders WHERE user_id = ? AND order_status = 'Pending'", 
            (user_id,)
        ).fetchone()["count"]

        shipped = conn.execute(
            "SELECT COUNT(*) as count FROM Orders WHERE user_id = ? AND order_status = 'Shipped'", 
            (user_id,)
        ).fetchone()["count"]

        delivered = conn.execute(
            "SELECT COUNT(*) as count FROM Orders WHERE user_id = ? AND order_status = 'Delivered'", 
            (user_id,)
        ).fetchone()["count"]

        cancelled = conn.execute(
            "SELECT COUNT(*) as count FROM Orders WHERE user_id = ? AND order_status = 'Cancelled'", 
            (user_id,)
        ).fetchone()["count"]

        recent_orders = conn.execute(
            """
            SELECT order_id, total_amount, order_status, order_date
            FROM Orders
            WHERE user_id = ?
            ORDER BY order_date DESC
            LIMIT 5
            """,
            (user_id,)
        ).fetchall()

        return success_response(
            data={
                "total_orders": total_orders,
                "pending": pending,
                "shipped": shipped,
                "delivered": delivered,
                "cancelled": cancelled,
                "recent_orders": [dict(o) for o in recent_orders],
            }
        )
    except Exception:
        return error_response("Internal server error", 500)


# ------------------------
# Admin Dashboard
# ------------------------
@router.get("/admin")
async def admin_dashboard(conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        total_orders = conn.execute(
            "SELECT COUNT(*) as count FROM Orders"
        ).fetchone()["count"]

        revenue = conn.execute(
            "SELECT SUM(total_amount) as total FROM Orders WHERE order_status != 'Cancelled'"
        ).fetchone()["total"] or 0

        pending = conn.execute(
            "SELECT COUNT(*) as count FROM Orders WHERE order_status = 'Pending'"
        ).fetchone()["count"]

        shipped = conn.execute(
            "SELECT COUNT(*) as count FROM Orders WHERE order_status = 'Shipped'"
        ).fetchone()["count"]

        delivered = conn.execute(
            "SELECT COUNT(*) as count FROM Orders WHERE order_status = 'Delivered'"
        ).fetchone()["count"]

        cancelled = conn.execute(
            "SELECT COUNT(*) as count FROM Orders WHERE order_status = 'Cancelled'"
        ).fetchone()["count"]

        return success_response(
            data={
                "total_orders": total_orders,
                "revenue": revenue,
                "pending": pending,
                "shipped": shipped,
                "delivered": delivered,
                "cancelled": cancelled,
            }
        )
    except Exception:
        return error_response("Internal server error", 500)

# ------------------------
# Admin Sales Report
# ------------------------
@router.get("/admin/report")
async def admin_report(conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        # Revenue by month (last 12 months)
        monthly = conn.execute("""
            SELECT strftime('%Y-%m', order_date) AS month,
                   COUNT(*) AS total_orders,
                   SUM(CASE WHEN order_status != 'Cancelled' THEN total_amount ELSE 0 END) AS revenue,
                   SUM(CASE WHEN order_status = 'Delivered'  THEN 1 ELSE 0 END) AS delivered,
                   SUM(CASE WHEN order_status = 'Cancelled'  THEN 1 ELSE 0 END) AS cancelled
            FROM Orders
            WHERE order_date >= date('now', '-12 months')
            GROUP BY month
            ORDER BY month ASC
        """).fetchall()

        # Top 10 products by quantity sold
        top_products = conn.execute("""
            SELECT p.name, SUM(oi.quantity) AS total_sold,
                   SUM(oi.quantity * oi.price) AS revenue
            FROM Order_Items oi
            JOIN Products p ON oi.product_id = p.product_id
            JOIN Orders o ON oi.order_id = o.order_id
            WHERE o.order_status != 'Cancelled'
            GROUP BY p.product_id
            ORDER BY total_sold DESC
            LIMIT 10
        """).fetchall()

        # Top 5 categories by revenue
        top_categories = conn.execute("""
            SELECT c.category_name, SUM(oi.quantity * oi.price) AS revenue,
                   SUM(oi.quantity) AS total_sold
            FROM Order_Items oi
            JOIN Products p ON oi.product_id = p.product_id
            JOIN Categories c ON p.category_id = c.category_id
            JOIN Orders o ON oi.order_id = o.order_id
            WHERE o.order_status != 'Cancelled'
            GROUP BY c.category_id
            ORDER BY revenue DESC
            LIMIT 5
        """).fetchall()

        # Delivery boy performance
        delivery_perf = conn.execute("""
            SELECT u.name,
                   COUNT(*) AS total_assigned,
                   SUM(CASE WHEN o.order_status = 'Delivered' THEN 1 ELSE 0 END) AS delivered
            FROM Orders o
            JOIN Users u ON o.delivery_boy_id = u.user_id
            WHERE o.delivery_boy_id IS NOT NULL
            GROUP BY o.delivery_boy_id
            ORDER BY delivered DESC
        """).fetchall()

        return success_response(data={
            "monthly":        [dict(r) for r in monthly],
            "top_products":   [dict(r) for r in top_products],
            "top_categories": [dict(r) for r in top_categories],
            "delivery_perf":  [dict(r) for r in delivery_perf],
        })
    except Exception:
        return error_response("Internal server error", 500)


# ------------------------
# Export orders as CSV data
# ------------------------
@router.get("/admin/export")
async def admin_export(conn=Depends(get_db), admin=Depends(require_admin)):
    try:
        orders = conn.execute("""
            SELECT o.order_id, u.name AS customer, o.total_amount,
                   o.order_status, o.payment_method, o.order_date,
                   o.delivery_address,
                   COALESCE(db.name, 'Unassigned') AS delivery_boy
            FROM Orders o
            JOIN Users u ON o.user_id = u.user_id
            LEFT JOIN Users db ON o.delivery_boy_id = db.user_id
            ORDER BY o.order_date DESC
        """).fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Order ID', 'Customer', 'Total (INR)', 'Status',
                         'Payment', 'Date', 'Delivery Address', 'Delivery Boy'])
        for o in orders:
            writer.writerow([
                o['order_id'], o['customer'], o['total_amount'],
                o['order_status'], o['payment_method'], o['order_date'],
                o['delivery_address'] or '', o['delivery_boy']
            ])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=orders_export.csv"}
        )
    except Exception:
        return error_response("Internal server error", 500)
