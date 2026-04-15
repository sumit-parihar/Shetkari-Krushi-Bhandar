# 🌿 Shetkari Krushi Bhandar

A full-stack agricultural e-commerce platform — premium farming products, direct to your door.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python 3.11) |
| Database | SQLite |
| Auth | JWT (Bearer token) |

---

## Project Structure

```
Shetkari-Krushi-Bhandar/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/routes/      # auth, products, cart, orders, categories, dashboard
│   │   ├── db/              # SQLite connection
│   │   ├── dependencies/    # JWT auth middleware
│   │   └── utils/           # helpers, validators
│   ├── .env                 # SECRET_KEY, FRONTEND_URL
│   └── requirements.txt
│
└── frontend/                # React frontend (this folder)
    ├── src/
    │   ├── components/      # Navbar, Footer, UI primitives, ProductCard, etc.
    │   ├── contexts/        # AuthContext, CartContext
    │   ├── pages/           # All pages (customer + admin)
    │   ├── services/        # Axios API layer
    │   └── utils/           # helpers (format, debounce, etc.)
    ├── .env                 # VITE_API_URL
    └── vite.config.js
```

---

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt

# Make sure your .env has:
# SECRET_KEY="your_secret_key"
# FRONTEND_URL="http://localhost:3000"

uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

---

## Environment Variables

### Backend (`backend/.env`)
```env
SECRET_KEY="your_jwt_secret_key_here"
FRONTEND_URL="http://localhost:3000"
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000
```

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Customer** | Browse products, manage cart, place/cancel orders, view dashboard |
| **Admin** | All customer features + manage products, categories, orders, users |

### Default Admin Setup
Register a user normally, then manually update their role in the SQLite database:
```sql
UPDATE Users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## API Endpoints

### Auth
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login, returns JWT
- `GET /auth/users` — List users (admin)
- `PUT /auth/users/:id` — Update user (admin)
- `DELETE /auth/users/:id` — Delete user (admin)

### Products
- `GET /products/` — List products (paginated)
- `GET /products/search` — Search/filter products
- `GET /products/:id` — Get single product
- `POST /products/` — Add product (admin)
- `PUT /products/:id` — Update product (admin)
- `DELETE /products/:id` — Delete product (admin)

### Categories
- `GET /categories/` — List all
- `POST /categories/` — Add (admin)
- `PUT /categories/:id` — Update (admin)
- `DELETE /categories/:id` — Delete (admin)

### Cart
- `GET /cart/` — Get user cart
- `POST /cart/` — Add item
- `PATCH /cart/:item_id` — Update quantity
- `DELETE /cart/:item_id` — Remove item

### Orders
- `POST /orders/` — Place order (COD)
- `GET /orders/` — Customer order history
- `GET /orders/admin` — All orders (admin)
- `GET /orders/:id/detail` — Order details
- `PATCH /orders/:id` — Update status (admin)
- `PATCH /orders/:id/cancel` — Cancel order (customer)

### Dashboard
- `GET /dashboard/customer` — Customer stats
- `GET /dashboard/admin` — Admin stats + revenue

---

## Features

### Customer
- 🛒 Full cart management (add, update quantity, remove)
- 📦 Order placement with delivery address
- 🚫 Order cancellation (Pending / Shipped)
- 📊 Personal dashboard with order stats
- 🔍 Product search with filters (category, price range, sort)

### Admin
- 📈 Business dashboard with revenue chart
- 📦 Product CRUD with image support
- 🏷️ Category management
- 🚚 Order status workflow (Pending → Shipped → Delivered / Cancelled)
- 👥 User management (view, edit role, delete)

---

## Production Deployment

### Backend (e.g. Railway, Render, Fly.io)
```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Update `FRONTEND_URL` in `.env` to your production frontend URL.

### Frontend (e.g. Vercel, Netlify)
```bash
npm run build
# Deploy the dist/ folder
```

Update `VITE_API_URL` in `.env` to your production backend URL.

---

## Database

SQLite file: `Databases/Shetkari Krushi Bhandar.db`

### Tables
- `Users` — user_id, name, email, password, role, phone, address, created_at
- `Categories` — category_id, category_name, description
- `Products` — product_id, name, description, price, stock_quantity, category_id, image_url, created_at
- `Cart` — cart_id, user_id
- `Cart_Items` — cart_item_id, cart_id, product_id, quantity
- `Orders` — order_id, user_id, total_amount, payment_method, order_status, delivery_address, order_date
- `Order_Items` — order_item_id, order_id, product_id, quantity, price
