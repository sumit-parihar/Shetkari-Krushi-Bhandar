"""Products, search and categories."""
import threading
import uuid


def test_public_catalog(api):
    r = api.get("/products/?page=1&page_size=10")
    assert r.status == 200 and len(r.items()) > 0
    assert all(isinstance(p["price"], (int, float)) for p in r.items())
    assert api.get("/products/3").status == 200
    assert api.get("/products/999999").status == 404
    assert api.get("/categories/").status == 200


def test_search_is_case_insensitive(api):
    upper = api.get("/products/search?keyword=Urea").items()
    lower = api.get("/products/search?keyword=urea").items()
    assert len(upper) == len(lower) == 1


def test_search_filters_and_sort(api):
    r = api.get("/products/search?min_price=100&max_price=500&sort=asc")
    prices = [p["price"] for p in r.items()]
    assert r.status == 200 and prices == sorted(prices) and all(100 <= p <= 500 for p in prices)
    assert api.get("/products/search?sort=sideways").status == 400


def test_admin_product_crud(api, admin, db):
    name = f"Neem Oil {uuid.uuid4().hex[:4]}"
    assert api.post("/products/", {"name": name, "price": 99.99, "stock_quantity": 10, "category_id": 1}, token=admin["token"]).status == 200
    pid = db.one("SELECT product_id FROM Products WHERE name = %s", (name,))["product_id"]
    assert api.put(f"/products/{pid}", {"price": 19.99}, token=admin["token"]).status == 200
    assert str(db.one("SELECT price FROM Products WHERE product_id = %s", (pid,))["price"]) == "19.99"


def test_price_validation(api, admin):
    for bad in ["NaN", "Infinity", "-Infinity", -5, 100_000_000]:
        r = api.post("/products/", {"name": "Bad", "price": bad, "stock_quantity": 1}, token=admin["token"])
        assert r.status == 400, (bad, r)
    assert api.get("/products/?page=1&page_size=50").status == 200


def test_exact_money(api, admin, db):
    name = f"Exact {uuid.uuid4().hex[:4]}"
    api.post("/products/", {"name": name, "price": 12345678.91, "stock_quantity": 1}, token=admin["token"])
    assert str(db.one("SELECT price FROM Products WHERE name = %s", (name,))["price"]) == "12345678.91"


def test_product_edit_rejects_empty_name(api, admin, make_product, db):
    pid = make_product(name="Keep Me")
    assert api.put(f"/products/{pid}", {"name": "   "}, token=admin["token"]).status == 400
    assert db.one("SELECT name FROM Products WHERE product_id = %s", (pid,))["name"] == "Keep Me"


def test_deleted_product_is_deactivated(api, admin, make_user, make_product, place_order):
    customer = make_user()
    pid = make_product(stock=10)
    order_id = place_order(customer, pid, 1)
    other = make_user()
    api.post("/cart/", {"product_id": pid, "quantity": 1}, token=other["token"])

    assert api.delete(f"/products/{pid}", token=admin["token"]).status == 200
    assert api.get(f"/products/{pid}").status == 404
    assert all(p["product_id"] != pid for p in api.get("/products/?page=1&page_size=50").items())
    assert api.get("/cart/", token=other["token"]).items() == []                 # removed from carts
    assert api.post("/cart/", {"product_id": pid, "quantity": 1}, token=other["token"]).status == 404
    detail = api.get(f"/orders/{order_id}/detail", token=customer["token"])
    assert detail.data["items"][0]["product_id"] == pid                           # history kept
    assert api.put(f"/products/{pid}", {"price": 1}, token=admin["token"]).status == 404


def test_category_rules(api, admin, db, make_product):
    assert api.post("/categories/", {"category_name": "seeds"}, token=admin["token"]).status == 409   # 'Seeds' exists
    name = f"Cat {uuid.uuid4().hex[:4]}"
    assert api.post("/categories/", {"category_name": name}, token=admin["token"]).status == 200
    cid = db.one("SELECT category_id FROM Categories WHERE category_name = %s", (name,))["category_id"]
    assert api.put(f"/categories/{cid}", {"category_name": "TOOLS"}, token=admin["token"]).status == 409
    pid = make_product(category_id=cid)
    assert api.delete(f"/categories/{cid}", token=admin["token"]).status == 400          # active product
    api.delete(f"/products/{pid}", token=admin["token"])
    assert api.delete(f"/categories/{cid}", token=admin["token"]).status == 200          # only inactive left
    assert db.one("SELECT category_id FROM Products WHERE product_id = %s", (pid,))["category_id"] is None


def test_simultaneous_duplicate_categories_give_409_not_500(api, admin, db):
    name = f"Race {uuid.uuid4().hex[:4]}"
    barrier, codes = threading.Barrier(6), []

    def add():
        barrier.wait()
        codes.append(api.post("/categories/", {"category_name": name}, token=admin["token"]).status)

    threads = [threading.Thread(target=add) for _ in range(6)]
    [t.start() for t in threads]; [t.join() for t in threads]
    assert sorted(codes) == [200] + [409] * 5
    assert db.one("SELECT COUNT(*) AS n FROM Categories WHERE category_name = %s", (name,))["n"] == 1
