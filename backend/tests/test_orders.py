"""Cart, orders, stock, delivery workflow and dashboards."""
import threading


def test_cart_flow(api, make_user, make_product):
    c = make_user()
    pid = make_product(stock=5)
    assert api.post("/cart/", {"product_id": pid, "quantity": 2}, token=c["token"]).status == 200
    assert api.post("/cart/", {"product_id": pid, "quantity": 1}, token=c["token"]).status == 200   # merges line
    items = api.get("/cart/", token=c["token"]).items()
    assert len(items) == 1 and items[0]["quantity"] == 3
    r = api.post("/cart/", {"product_id": pid, "quantity": 10}, token=c["token"])
    assert r.status == 400 and "stock" in r.error
    for bad in [0, -1, "abc"]:
        assert api.post("/cart/", {"product_id": pid, "quantity": bad}, token=c["token"]).status == 400
    item = items[0]["cart_item_id"]
    assert api.patch(f"/cart/{item}", {"quantity": 4}, token=c["token"]).status == 200
    assert api.delete(f"/cart/{item}", token=c["token"]).status == 200


def test_place_order_deducts_stock_and_empties_cart(api, db, make_user, make_product, stock_of):
    c = make_user()
    pid = make_product(stock=10, price=19.99)
    api.post("/cart/", {"product_id": pid, "quantity": 4}, token=c["token"])
    r = api.post("/orders/", {"delivery_address": "Lane 1"}, token=c["token"])
    assert r.status == 200
    assert stock_of(pid) == 6
    assert api.get("/cart/", token=c["token"]).items() == []
    total = db.one("SELECT total_amount FROM Orders WHERE order_id = %s", (r.data["order_id"],))["total_amount"]
    assert str(total) == "79.96"
    assert api.post("/orders/", {"delivery_address": "x"}, token=c["token"]).status == 400          # empty cart


def test_order_requires_address(api, make_user, make_product):
    c = make_user()
    api.post("/cart/", {"product_id": make_product(), "quantity": 1}, token=c["token"])
    assert api.post("/orders/", {}, token=c["token"]).status == 400
    assert api.post("/orders/", {"delivery_address": "   "}, token=c["token"]).status == 400


def test_cancel_restores_stock_once(api, admin, make_user, make_product, place_order, stock_of):
    c = make_user()
    pid = make_product(stock=10)
    o = place_order(c, pid, 4)
    assert stock_of(pid) == 6
    assert api.patch(f"/orders/{o}/cancel", token=c["token"]).status == 200
    assert stock_of(pid) == 10
    assert api.patch(f"/orders/{o}/cancel", token=c["token"]).status == 400
    assert stock_of(pid) == 10
    o2 = place_order(c, pid, 2)
    assert api.patch(f"/orders/{o2}", {"order_status": "Shipped"}, token=admin["token"]).status == 200
    assert api.patch(f"/orders/{o2}", {"order_status": "Cancelled"}, token=admin["token"]).status == 200
    assert stock_of(pid) == 10
    assert api.patch(f"/orders/{o2}", {"order_status": "Pending"}, token=admin["token"]).status == 400


def test_last_unit_race(api, make_user, make_product, stock_of):
    pid = make_product(stock=1)
    a, b = make_user(), make_user()
    for c in (a, b):
        api.post("/cart/", {"product_id": pid, "quantity": 1}, token=c["token"])
    barrier, codes = threading.Barrier(2), []

    def buy(c):
        barrier.wait()
        codes.append(api.post("/orders/", {"delivery_address": "x"}, token=c["token"]).status)

    threads = [threading.Thread(target=buy, args=(c,)) for c in (a, b)]
    [t.start() for t in threads]; [t.join() for t in threads]
    assert sorted(codes) == [200, 400]
    assert stock_of(pid) == 0


def test_delivery_workflow_and_summary(api, admin, make_user, make_product, place_order):
    c, d, other_d = make_user(), make_user("delivery_boy"), make_user("delivery_boy")
    o = place_order(c, make_product(), 1)
    assert api.patch(f"/orders/{o}/assign", {"delivery_boy_id": "abc"}, token=admin["token"]).status == 400
    assert api.patch(f"/orders/{o}/assign", {"delivery_boy_id": d["id"]}, token=admin["token"]).status == 200
    assert any(x["order_id"] == o for x in api.get("/orders/delivery/my-orders", token=d["token"]).items())
    assert api.patch(f"/orders/delivery/{o}/status", {"order_status": "Shipped"}, token=other_d["token"]).status == 403
    assert api.patch(f"/orders/delivery/{o}/status", {"order_status": "Delivered"}, token=d["token"]).status == 400
    assert api.patch(f"/orders/delivery/{o}/status", {"order_status": "Shipped"}, token=d["token"]).status == 200
    assert api.patch(f"/orders/delivery/{o}/status", {"order_status": "Delivered"}, token=d["token"]).status == 200
    assert api.patch(f"/orders/{o}/cancel", token=c["token"]).status == 400
    s = api.get("/orders/delivery/summary", token=d["token"]).data
    assert s["total"] == 1 and s["delivered"] == 1
    assert api.get("/orders/delivery/summary", token=c["token"]).status == 403


def test_cancel_vs_deliver_at_same_moment_stays_consistent(api, admin, db, make_user, make_product, place_order, stock_of):
    c, d = make_user(), make_user("delivery_boy")
    pid = make_product(stock=100)
    for _ in range(10):
        o = place_order(c, pid, 1)
        api.patch(f"/orders/{o}/assign", {"delivery_boy_id": d["id"]}, token=admin["token"])
        api.patch(f"/orders/delivery/{o}/status", {"order_status": "Shipped"}, token=d["token"])
        before = stock_of(pid)
        barrier = threading.Barrier(2)
        threads = [
            threading.Thread(target=lambda: (barrier.wait(), api.patch(f"/orders/{o}/cancel", token=c["token"]))),
            threading.Thread(target=lambda: (barrier.wait(), api.patch(f"/orders/delivery/{o}/status", {"order_status": "Delivered"}, token=d["token"]))),
        ]
        [t.start() for t in threads]; [t.join() for t in threads]
        status = db.one("SELECT order_status FROM Orders WHERE order_id = %s", (o,))["order_status"]
        expected = before + 1 if status == "Cancelled" else before
        assert status in ("Cancelled", "Delivered") and stock_of(pid) == expected


def test_order_lists_and_filters(api, admin, make_user, make_product, place_order):
    c = make_user(name="Savita Shinde")
    o = place_order(c, make_product(), 2)
    hist = api.get("/orders/", token=c["token"]).items()
    assert hist[0]["order_id"] == o and hist[0]["items"][0]["quantity"] == 2
    found = api.get("/orders/admin?search=savita&limit=100", token=admin["token"]).items()
    assert any(x["order_id"] == o for x in found)
    assert any(x["order_id"] == o for x in api.get(f"/orders/admin?search={o}", token=admin["token"]).items())
    assert api.get("/orders/admin?status=Pending", token=admin["token"]).status == 200
    for path, tok in [("/orders/?status=Bogus", c), ("/orders/admin?status=Bogus", admin)]:
        assert api.get(path, token=tok["token"]).status == 400
    assert api.get("/orders/?limit=101", token=c["token"]).status == 400
    assert api.get("/products/?page_size=51").status == 400


def test_dashboards_match_database(api, admin, db, make_user, make_product, place_order):
    c = make_user()
    place_order(c, make_product(), 1)
    d = api.get("/dashboard/admin", token=admin["token"]).data
    sql = db.one("""SELECT COUNT(*) AS total,
                           COUNT(*) FILTER (WHERE order_status = 'Pending') AS pending,
                           COALESCE(SUM(total_amount) FILTER (WHERE order_status != 'Cancelled'), 0) AS revenue
                    FROM Orders""")
    assert (d["total_orders"], d["pending"]) == (sql["total"], sql["pending"])
    assert round(d["revenue"], 2) == float(sql["revenue"])
    cd = api.get("/dashboard/customer", token=c["token"]).data
    assert cd["total_orders"] == 1 and cd["pending"] == 1 and len(cd["recent_orders"]) == 1
    assert api.get("/dashboard/admin/report", token=admin["token"]).status == 200


def test_deactivated_customer_keeps_order_history(api, admin, db, make_user, make_product, place_order):
    c = make_user(name="Old Customer")
    o = place_order(c, make_product(), 1)
    assert api.delete(f"/auth/users/{c['id']}", token=admin["token"]).status == 200
    assert db.one("SELECT 1 AS x FROM Orders WHERE order_id = %s", (o,))
    assert any(x["order_id"] == o for x in api.get("/orders/admin?search=Old%20Customer", token=admin["token"]).items())


def test_removing_delivery_boy_unassigns_open_orders(api, admin, db, make_user, make_product, place_order):
    c, d = make_user(), make_user("delivery_boy")
    o = place_order(c, make_product(), 1)
    api.patch(f"/orders/{o}/assign", {"delivery_boy_id": d["id"]}, token=admin["token"])
    assert api.delete(f"/auth/users/{d['id']}", token=admin["token"]).status == 200
    assert db.one("SELECT delivery_boy_id FROM Orders WHERE order_id = %s", (o,))["delivery_boy_id"] is None
    assert api.patch(f"/orders/{o}/assign", {"delivery_boy_id": d["id"]}, token=admin["token"]).status == 404


def test_database_rejects_invalid_data(db):
    assert db.error_of("UPDATE Products SET stock_quantity = -1 WHERE product_id = 1") == "CheckViolation"
    assert db.error_of("UPDATE Products SET price = -5 WHERE product_id = 1") == "CheckViolation"
    assert db.error_of("INSERT INTO Cart (user_id) SELECT user_id FROM Cart LIMIT 1") == "UniqueViolation"
