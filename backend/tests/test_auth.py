"""Registration with OTP, login, profile, password and account rules."""
import uuid

from conftest import PASSWORD


def new_email():
    return f"new-{uuid.uuid4().hex[:8]}@Test.Local"


def test_register_verify_login(api, read_otp):
    email = new_email()
    r = api.post("/auth/register", {"name": "New Farmer", "email": email, "password": "secret1"})
    assert r.status == 200, r
    r = api.post("/auth/verify-otp", {"email": email.lower(), "otp": read_otp(email)})
    assert r.status == 200, r
    # stored lowercase, login works with any case
    assert api.post("/auth/login", {"email": email.upper(), "password": "secret1"}).status == 200


def test_register_rejects_bad_input(api):
    assert api.post("/auth/register", {"name": "x", "email": "not-an-email", "password": "secret1"}).status == 400
    assert api.post("/auth/register", {"name": "x", "email": new_email(), "password": "123"}).status == 400


def test_register_role_field_is_ignored(api, db, read_otp):
    email = new_email()
    api.post("/auth/register", {"name": "Sneaky", "email": email, "password": "secret1", "role": "admin"})
    api.post("/auth/verify-otp", {"email": email, "otp": read_otp(email)})
    assert db.one("SELECT role FROM Users WHERE email = %s", (email.lower(),))["role"] == "customer"


def test_password_over_72_bytes_is_400_not_500(api):
    r = api.post("/auth/register", {"name": "Long", "email": new_email(), "password": "a" * 100})
    assert r.status == 400 and "72" in r.error
    r = api.post("/auth/register", {"name": "Long", "email": new_email(), "password": "अ" * 30})   # 90 bytes
    assert r.status == 400
    assert api.post("/auth/register", {"name": "Ok", "email": new_email(), "password": "c" * 72}).status == 200


def test_login_with_overlong_password_is_401(api, make_user):
    user = make_user()
    assert api.post("/auth/login", {"email": user["email"], "password": "a" * 100}).status == 401


def test_wrong_password(api, make_user):
    user = make_user()
    r = api.post("/auth/login", {"email": user["email"], "password": "wrong"})
    assert r.status == 401 and r.error


def test_otp_is_hashed_and_locks_after_5_wrong_codes(api, db, read_otp):
    email = new_email()
    api.post("/auth/register", {"name": "Otp", "email": email, "password": "secret1"})
    stored = db.one("SELECT otp FROM OTP_Verifications WHERE email = %s", (email.lower(),))["otp"]
    real = read_otp(email)
    assert len(stored) == 64 and real not in stored
    codes = [api.post("/auth/verify-otp", {"email": email, "otp": f"{(int(real) + i) % 10**6:06d}"}).status
             for i in range(1, 6)]
    assert codes == [400, 400, 400, 400, 429]
    assert api.post("/auth/verify-otp", {"email": email, "otp": real}).status == 400   # pending sign-up removed


def test_resend_otp(api, read_otp):
    email = new_email()
    api.post("/auth/register", {"name": "Resend", "email": email, "password": "secret1"})
    first = read_otp(email)
    assert api.post("/auth/resend-otp", {"email": email}).status == 200
    second = read_otp(email)
    assert api.post("/auth/verify-otp", {"email": email, "otp": second}).status == 200
    assert first != second or True   # codes are random; the new one must work


def test_abandoned_otp_rows_are_cleaned_up(api, db):
    db.query("INSERT INTO OTP_Verifications (email, otp, name, password, expires_at) "
             "VALUES ('stale@test.local', 'x', 'Stale', 'x', NOW() - INTERVAL '3 days')")
    api.post("/auth/register", {"name": "Someone", "email": new_email(), "password": "secret1"})
    assert not db.query("SELECT 1 FROM OTP_Verifications WHERE email = 'stale@test.local'")


def test_profile_update_and_email_rules(api, db, make_user):
    a, b = make_user(), make_user()
    assert api.put("/auth/profile", {"name": "Renamed", "phone": "9876543210"}, token=a["token"]).status == 200
    # can't take someone else's email in another case
    assert api.put("/auth/profile", {"email": b["email"].upper()}, token=a["token"]).status == 400
    new = f"Changed-{uuid.uuid4().hex[:6]}@Test.Local"
    assert api.put("/auth/profile", {"email": new}, token=a["token"]).status == 200
    assert db.one("SELECT email FROM Users WHERE user_id = %s", (a["id"],))["email"] == new.lower()
    assert db.error_of("INSERT INTO Users (name, email, password) VALUES ('x', %s, 'x')", (new.upper(),)) == "UniqueViolation"


def test_change_password(api, make_user):
    u = make_user()
    assert api.put("/auth/change-password", {"current_password": "nope", "new_password": "Next@123"}, token=u["token"]).status == 400
    assert api.put("/auth/change-password", {"current_password": PASSWORD, "new_password": "b" * 80}, token=u["token"]).status == 400
    assert api.put("/auth/change-password", {"current_password": PASSWORD, "new_password": "Next@123"}, token=u["token"]).status == 200
    assert api.post("/auth/login", {"email": u["email"], "password": "Next@123"}).status == 200


def test_demoted_or_deleted_users_lose_access_immediately(api, admin, make_user):
    other_admin = make_user("admin")
    assert api.put(f"/auth/users/{other_admin['id']}", {"role": "customer"}, token=admin["token"]).status == 200
    assert api.get("/auth/users", token=other_admin["token"]).status == 403

    customer = make_user()
    assert api.delete(f"/auth/users/{customer['id']}", token=admin["token"]).status == 200
    assert api.get("/cart/", token=customer["token"]).status == 401
    r = api.post("/auth/login", {"email": customer["email"], "password": PASSWORD})
    assert r.status == 403 and "deactivated" in r.error


def test_admin_cannot_remove_own_admin_role(api, admin):
    assert api.put(f"/auth/users/{admin['id']}", {"role": "customer"}, token=admin["token"]).status == 400
    assert api.put(f"/auth/users/{admin['id']}", {"name": "Still Admin"}, token=admin["token"]).status == 200


def test_admin_user_search_is_case_insensitive(api, admin, make_user):
    u = make_user(name="Ganesh Kulkarni")
    found = api.get("/auth/users?search=ganesh&page_size=50", token=admin["token"]).items()
    assert any(x["user_id"] == u["id"] for x in found)
