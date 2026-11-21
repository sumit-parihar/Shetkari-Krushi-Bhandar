# 🌿 Shetkari Krushi Bhandar

A full-stack agricultural e-commerce platform: farmers browse seeds, fertilizers, pesticides and tools, order with Cash on Delivery, and track delivery. The shop owner manages products, orders and delivery staff from an admin panel. The UI is available in **English and Marathi**.

---

## Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | React 18, Vite, Tailwind CSS, React Router, i18next, Recharts | Vercel |
| Backend | FastAPI (Python 3.10+), JWT auth, slowapi rate limiting | Render |
| Database | PostgreSQL | Neon |
| Email | Brevo transactional API (OTP verification) | — |
| Real-time | Server-Sent Events (`/stream/updates`) | — |

---

## Project Structure

```
SKB-updated/
├── backend/
│   ├── app/
│   │   ├── __init__.py        # loads backend/.env once for the whole app
│   │   ├── main.py            # FastAPI app, CORS, routers, SSE endpoint
│   │   ├── api/routes/        # auth, products, categories, cart, orders, dashboard
│   │   ├── db/connection.py   # PostgreSQL connection (psycopg2)
│   │   ├── dependencies/      # JWT auth + role guards
│   │   └── utils/             # email (Brevo), rate limiter, SSE, validators, responses
│   ├── .env.example           # required backend variables
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/        # Navbar, Footer, UI primitives, ProductCard, route guards
│   │   ├── contexts/          # AuthContext, CartContext
│   │   ├── locales/           # en + mr translations
│   │   ├── pages/             # customer, delivery and admin pages
│   │   ├── services/api.js    # Axios API layer + SSE client
│   │   └── utils/helpers.js   # formatting, debounce, error messages
│   ├── .env.example
│   └── vercel.json            # SPA rewrites for Vercel
├── init_db.py                 # creates tables + seeds demo data (run once)
├── migrate.py                 # applies backend/migrations/*.sql (schema updates)
└── start-dev.sh               # starts backend + frontend together (Git Bash / Linux / macOS)
```

---

## Local Setup

### Prerequisites
- Python 3.10+ and Node.js 18+
- A PostgreSQL database (e.g. a free [Neon](https://neon.tech) project)
- A free [Brevo](https://www.brevo.com) account with a verified sender email and an API key

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1          # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env               # Linux/macOS: cp .env.example .env
# fill in backend/.env (see "Environment Variables" below)
```

### 2. Database (first time only)

```powershell
# from the project root, with the backend venv active
python init_db.py
```

Creates all tables, applies all migrations, and if the `Users` table is empty seeds demo categories, products and orders. Safe to run again: it never duplicates or deletes data.

### Updating an existing database

Schema changes live in `backend/migrations/` as numbered `.sql` files. To apply new ones to an existing database (e.g. Neon) **before deploying code that needs them**:

```powershell
python migrate.py --status   # shows applied / pending, changes nothing
python migrate.py            # applies pending migrations, each in one transaction
```

### 3. Run

```powershell
# Terminal 1 — backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

| URL | What |
|-----|------|
| http://localhost:3000 | Website |
| http://localhost:8000/api/docs | Interactive API docs (Swagger) — only with `ENV=dev`, hidden in production |

On Git Bash / Linux / macOS you can instead run `./start-dev.sh` from the project root.

---

## Environment Variables

### Backend — `backend/.env` locally, **Environment** tab on Render

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | PostgreSQL connection string |
| `SECRET_KEY` | 64-char random string | Signs login tokens. Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `FRONTEND_URL` | `http://localhost:3000` / `https://your-app.vercel.app` | Allowed CORS origin(s), comma-separated, no trailing `/` |
| `BREVO_API_KEY` | `xkeysib-...` | Brevo API key (Transactional email permission) |
| `SENDER_EMAIL` | `you@gmail.com` | Verified sender in Brevo |
| `SENDER_NAME` | `Shetkari Krushi Bhandar` | Name shown in the inbox |
| `ENV` | `dev` | **Local only.** Enables dev fallbacks, localhost CORS and the API docs; leave unset in production |
| `DB_POOL_MAX` | `10` | Optional. Max database connections the backend keeps open (default 10) |
| `PYTHON_VERSION` | `3.10.x` | **Render only.** Pins the Python version |

### Frontend — `frontend/.env` locally, **Environment Variables** on Vercel

| Variable | Local | Production |
|----------|-------|-----------|
| `VITE_API_URL` | `http://localhost:8000` | `https://<your-backend>.onrender.com` |

Vite bakes this value in at build time — redeploy on Vercel after changing it.

> Never commit `.env` files. They are git-ignored; only the `.env.example` files are tracked.

---

## User Roles

| Role | Can do |
|------|--------|
| **Customer** | Browse and search products, manage cart, place and cancel orders, view order history and dashboard, edit profile |
| **Delivery boy** | See orders assigned to them, mark them Shipped / Delivered |
| **Admin** | Manage products, categories, orders (status + delivery assignment) and users; dashboard, reports and CSV export |

New sign-ups are always customers. To create the **first admin**, register normally and run this on the database:

```sql
UPDATE Users SET role = 'admin' WHERE email = 'your@email.com';
```

After that, the admin can change any user's role (e.g. to `delivery_boy`) from **Admin → Users**.

---

## Key Flows

**Registration with email OTP**
1. User submits the sign-up form → backend stores a pending registration and emails a 6-digit code via Brevo.
2. User enters the code within 10 minutes → account is created and verified.
3. Unverified emails cannot log in.

**Orders and stock**
- Status flow: `Pending → Shipped → Delivered`, or `Cancelled` from Pending/Shipped.
- Stock is deducted when the order is placed, atomically and only if enough is still available, so two simultaneous orders can never oversell.
- Cancelling an order (by customer or admin) returns its items to stock.
- New orders and status changes are pushed live to open dashboards over SSE.

**Security**
- Passwords hashed with bcrypt; JWT tokens expire after 8 hours.
- Rate limits on login, register, OTP verify and resend.
- Role guards on every protected endpoint; request bodies capped at 1 MB.

---

## API Overview

All endpoints are under `/api/v1`. Full, interactive docs: `/api/docs` (local dev only). Every error response has the same shape: `{"success": false, "error": "…"}`.

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/login` · `PUT /auth/profile`, `/auth/change-password` |
| Users (admin) | `GET /auth/users`, `GET /auth/delivery-boys`, `PUT /auth/users/{id}`, `DELETE /auth/users/{id}` |
| Products | `GET /products/`, `/products/search`, `/products/{id}` · admin: `POST`, `PUT`, `DELETE` |
| Categories | `GET /categories/`, `/categories/{id}` · admin: `POST`, `PUT`, `DELETE` |
| Cart (customer) | `GET /cart/`, `POST /cart/`, `PATCH /cart/{item_id}`, `DELETE /cart/{item_id}` |
| Orders | customer: `POST /orders/`, `GET /orders/`, `PATCH /orders/{id}/cancel` · `GET /orders/{id}/detail` · admin: `GET /orders/admin`, `PATCH /orders/{id}`, `PATCH /orders/{id}/assign` · delivery: `GET /orders/delivery/my-orders`, `PATCH /orders/delivery/{id}/status` |
| Dashboard | `GET /dashboard/customer` · admin: `GET /dashboard/admin`, `/dashboard/admin/report`, `/dashboard/admin/export` (CSV) |
| Other | `GET /health`, `GET /stream/updates` (SSE) |

---

## Deployment

### Backend → Render (Web Service)
| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Environment | all backend variables above except `ENV` |

Render's free tier blocks outgoing SMTP, which is why email goes through Brevo's HTTPS API. Free instances also sleep after ~15 minutes idle; the first request afterwards takes 30–50 s.

### Frontend → Vercel
| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Environment | `VITE_API_URL` = your Render URL |

After the first Vercel deploy, put the Vercel URL into `FRONTEND_URL` on Render so CORS allows it.

---

## Database Tables

| Table | Columns |
|-------|---------|
| `Users` | user_id, name, email (lowercase, unique ignoring case), password (bcrypt), phone, address, role, is_verified, is_active, created_at |
| `OTP_Verifications` | pending sign-ups: email, otp, name, password, phone, address, expires_at |
| `Categories` | category_id, category_name, description |
| `Products` | product_id, name, description, price (NUMERIC 10,2), stock_quantity (≥ 0), category_id, image_url, is_active, created_at |
| `Cart` / `Cart_Items` | one cart per customer; cart_item_id, product_id, quantity |
| `Orders` | order_id, user_id, total_amount, order_status, payment_method, order_date, delivery_address, delivery_boy_id |
| `Order_Items` | order_item_id, order_id, product_id, quantity, price (price at time of order) |
| `Inventory_Log` | reserved for stock history (not used yet) |

Deleting a user or product in the admin panel **deactivates** it (`is_active = false`): it disappears from the shop, carts and admin lists and can't log in, but past orders and sales reports keep it. Money columns are exact decimals, and the database itself rejects negative stock/prices, zero-quantity lines, a second cart per user and duplicate emails.

The base schema is in `init_db.py`; later changes are in `backend/migrations/`.
