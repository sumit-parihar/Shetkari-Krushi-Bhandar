"""Normalize user roles from DB / JWT for consistent auth checks."""


def normalize_role(value) -> str:
    if value is None or (isinstance(value, str) and not value.strip()):
        return "customer"
    r = str(value).strip().lower()
    if r in ("admin", "administrator", "superadmin"):
        return "admin"
    if r in ("delivery_boy", "delivery", "deliveryboy"):
        return "delivery_boy"
    if r in ("customer", "user", "farmer", "buyer"):
        return "customer"
    return "customer"
