from pathlib import Path
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# Import routers (we will create these next)
from app.api.routes import auth, product, cart, order, dashboard, categories

# Import DB connection
from app.db.connection import get_db_connection

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