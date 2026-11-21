"""
Request-body dependencies.

Route handlers are plain `def` functions (FastAPI runs them in a worker thread,
so blocking DB / bcrypt / email calls don't freeze the server). A sync handler
can't `await request.json()`, so the body is parsed here instead.
"""
from fastapi import Request

from app.utils.response import APIError


async def json_body(request: Request) -> dict:
    """Required JSON object body. Invalid JSON or a non-object body -> 400."""
    try:
        data = await request.json()
    except Exception:
        raise APIError("Invalid JSON body", 400)
    if not isinstance(data, dict):
        raise APIError("Request body must be a JSON object", 400)
    return data


async def optional_json_body(request: Request) -> dict:
    """Optional JSON object body. Missing / invalid / non-object -> {}."""
    try:
        data = await request.json()
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}
