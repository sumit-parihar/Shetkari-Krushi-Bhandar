def parse_pagination(page, size, *, default_size=10, max_size=100, size_name="limit"):
    """
    Validate page / page-size query values.
    Returns (page, size, None) or (None, None, error_message).
    """
    try:
        page = int(page) if page not in (None, "") else 1
        size = int(size) if size not in (None, "") else default_size
    except (TypeError, ValueError):
        return None, None, f"page and {size_name} must be valid integers"
    if page < 1:
        return None, None, "page must be >= 1"
    if size < 1 or size > max_size:
        return None, None, f"{size_name} must be between 1 and {max_size}"
    return page, size, None


def validate_page_limit(page, limit):
    """Order lists: ?page=&limit= (max 100)."""
    return parse_pagination(page, limit, max_size=100, size_name="limit")


def validate_pagination(page, page_size):
    """Product / user lists: ?page=&page_size= (max 50)."""
    return parse_pagination(page, page_size, max_size=50, size_name="page_size")


ORDER_STATUSES = ("Pending", "Shipped", "Delivered", "Cancelled")


def validate_status_filter(status):
    """Order list ?status= filter: empty/'All' means no filter."""
    if not status or status == "All":
        return None, None
    if status not in ORDER_STATUSES:
        return None, f"status must be one of: All, {', '.join(ORDER_STATUSES)}"
    return status, None
