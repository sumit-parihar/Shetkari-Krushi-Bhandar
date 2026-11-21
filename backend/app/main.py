import logging
import sys
import asyncio
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# ── Logging ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# ── Validate required env vars on startup ─────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "").strip()
SECRET_KEY   = os.getenv("SECRET_KEY",   "").strip()

_is_dev  = os.getenv("ENV", "production").lower() in ("dev", "development", "local")
_missing = [k for k, v in [("FRONTEND_URL", FRONTEND_URL), ("SECRET_KEY", SECRET_KEY)] if not v]
if _missing:
    # In dev mode allow fallback; in production crash loudly
    if not _is_dev:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(_missing)}. "
            "Set them before starting the server."
        )
    else:
        logger.warning("DEV MODE — missing env vars: %s. Using fallback values.", _missing)
        if not FRONTEND_URL:
            FRONTEND_URL = "http://localhost:3000"
        if not SECRET_KEY:
            SECRET_KEY = "dev-only-insecure-secret-do-not-use-in-production"

# ── Import routers ─────────────────────────────────────────
from app.api.routes import auth, product, cart, order, dashboard, categories
from app.utils.sse import subscribers, Subscriber, MAX_CONNECTIONS_PER_USER
from app.utils.rate_limiter import limiter  # shared instance used by route decorators
from app.utils.response import APIError, error_response
from app.db.connection import _new_connection, DBConnection
from app.dependencies.auth import user_from_token
from fastapi import HTTPException

# ── App ────────────────────────────────────────────────────
app = FastAPI(
    title="Shetkari Krushi Bhandar API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Attach rate limiter to app state so slowapi can find it
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return error_response(exc.message, exc.status_code)

# ── CORS ───────────────────────────────────────────────────
# Build allowed origins from env — supports comma-separated list
_raw_origins = os.getenv("FRONTEND_URL", FRONTEND_URL)
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# Allow local dev servers only in development, never in production
if _is_dev:
    for _o in ("http://localhost:3000", "http://localhost:5173"):
        if _o not in _allowed_origins:
            _allowed_origins.append(_o)

logger.info("CORS allowed origins: %s", _allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Body size limit (1 MB) ─────────────────────────────────
MAX_BODY_SIZE = 1 * 1024 * 1024  # 1 MB

@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return JSONResponse(
            status_code=413,
            content={"success": False, "error": "Request body too large (max 1 MB)", "data": None, "message": None}
        )
    return await call_next(request)

# ── Routers (all under /api/v1/) ───────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router,       prefix=f"{API_PREFIX}/auth",       tags=["Auth"])
app.include_router(categories.router, prefix=f"{API_PREFIX}/categories",  tags=["Categories"])
app.include_router(product.router,    prefix=f"{API_PREFIX}/products",    tags=["Products"])
app.include_router(cart.router,       prefix=f"{API_PREFIX}/cart",        tags=["Cart"])
app.include_router(order.router,      prefix=f"{API_PREFIX}/orders",      tags=["Orders"])
app.include_router(dashboard.router,  prefix=f"{API_PREFIX}/dashboard",   tags=["Dashboard"])

# ── Root health check ──────────────────────────────────────
@app.get("/")
def home():
    return {"message": "Shetkari Krushi Bhandar API is running!", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ── SSE real-time updates ──────────────────────────────────
SSE_PING_SECONDS = 20


def _sse_user(token: str) -> dict:
    """Validate the stream token with a short-lived DB connection."""
    conn = DBConnection(_new_connection())
    try:
        return user_from_token(token, conn)
    finally:
        conn.close()


@app.get("/stream/updates")
async def stream_updates(request: Request, token: str = ""):
    """
    Server-Sent Events for live order updates.
    EventSource can't send headers, so the JWT comes as ?token=.
    Each user only receives events they are allowed to see (see utils/sse.py).
    """
    if not token:
        return error_response("Not authenticated", 401)
    try:
        user = await asyncio.to_thread(_sse_user, token)
    except HTTPException as e:
        return error_response(str(e.detail), e.status_code)

    if subscribers.count_for(user["user_id"]) >= MAX_CONNECTIONS_PER_USER:
        return error_response("Too many open live-update connections", 429)

    sub = Subscriber(user["user_id"], user["role"])
    subscribers.add(sub)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(sub.queue.get(), timeout=SSE_PING_SECONDS)
                    yield message
                except asyncio.TimeoutError:
                    # Comment line keeps proxies from closing idle connections
                    # and lets us notice disconnected clients.
                    yield ": ping\n\n"
        finally:
            subscribers.remove(sub)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
