from pathlib import Path
import logging
import sys
import asyncio

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")
load_dotenv(_backend_dir / "app" / "utils" / ".env")

# Import routers
from app.api.routes import auth, product, cart, order, dashboard, categories

# Import DB connection
from app.db.connection import get_db_connection

# Import SSE subscriber manager (to avoid circular import)
from app.utils.sse import subscribers

app = FastAPI()

# -----------------------------
# CORS CONFIG (same as Flask)
# -----------------------------
FRONTEND_URL = os.getenv("FRONTEND_URL")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL] if FRONTEND_URL else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# ROUTERS (Blueprint replacement)
# -----------------------------
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(product.router, prefix="/products", tags=["Products"])
app.include_router(cart.router, prefix="/cart", tags=["Cart"])
app.include_router(order.router, prefix="/orders", tags=["Orders"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

# -----------------------------
# ROOT
# -----------------------------
@app.get("/")
def home():
    return {"message": "Backend is running!"}


# -----------------------------
# SSE REAL-TIME UPDATES
# -----------------------------
@app.get("/stream/updates")
async def stream_updates(request: Request):
    """Server-Sent Events endpoint for real-time updates"""
    queue = asyncio.Queue()
    subscribers.add(queue)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                message = await queue.get()
                yield message
        finally:
            subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# -----------------------------
# HELPER: Broadcast update
# -----------------------------
async def broadcast_update(event_type: str, data: dict):
    """Broadcast an update to all connected SSE clients"""
    await subscribers.broadcast({
        "type": event_type,
        "data": data
    })

# -----------------------------
# TEST DB (same logic)
# -----------------------------
@app.get("/test-db")
def test_db():
    conn = get_db_connection()
    data = conn.execute(
        'SELECT name FROM sqlite_master WHERE type="table";'
    ).fetchall()
    conn.close()

    return [row["name"] for row in data]