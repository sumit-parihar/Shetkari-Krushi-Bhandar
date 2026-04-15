def validate_product_data(data):
    required_fields = ["name", "price", "stock_quantity"]

    for field in required_fields:
        if field not in data or str(data[field]).strip() == "":
            return f"{field} is required"

    if not isinstance(data["name"], str):
        return "name must be string"

    try:
        price = float(data["price"])
    except:
        return "price must be a number"

    try:
        stock = int(data["stock_quantity"])
    except:
        return "stock_quantity must be integer"

    if price <= 0:
        return "price must be greater than 0"

    if stock < 0:
        return "stock_quantity cannot be negative"

    if len(data["name"]) > 255:
        return "name too long"

    if not data["name"].strip():
        return "name cannot be empty"

    if data.get("description") and len(data["description"]) > 1000:
        return "description too long"

    if data.get("image_url") and not str(data["image_url"]).startswith("http"):
        return "invalid image_url"

    return None