def validate_page_limit(page, limit, default_page=1, default_limit=10, max_limit=100):
    try:
        page = int(page if page is not None and page != "" else default_page)
        limit = int(limit if limit is not None and limit != "" else default_limit)
    except (TypeError, ValueError):
        return None, None, "page and limit must be valid integers"
    if page < 1:
        return None, None, "page must be >= 1"
    if limit < 1 or limit > max_limit:
        return None, None, f"limit must be between 1 and {max_limit}"
    return page, limit, None


def validate_pagination(page, page_size):
    try:
        page = int(page)
        page_size = int(page_size)
    except:
        return None, None, "Page and page_size must be integers"

    if page < 1:
        return None, None, "Page must be >= 1"

    if page_size < 1 or page_size > 50:
        return None, None, "page_size must be between 1 and 50"

    return page, page_size, None