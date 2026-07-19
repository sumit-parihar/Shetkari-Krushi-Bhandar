import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

print("Connecting to PostgreSQL...")
conn = psycopg2.connect(DATABASE_URL, sslmode="require")
conn.autocommit = False
cur = conn.cursor()

# ── Schema ─────────────────────────────────────────────────
print("Creating schema...")

cur.execute("""
    CREATE TABLE IF NOT EXISTS Users (
        user_id    SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        email      TEXT UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        phone      TEXT,
        address    TEXT,
        role       TEXT CHECK(role IN ('customer','admin','delivery_boy')) DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT NOW()
    );
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS Categories (
        category_id   SERIAL PRIMARY KEY,
        category_name TEXT NOT NULL,
        description   TEXT
    );
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS Products (
        product_id     SERIAL PRIMARY KEY,
        name           TEXT NOT NULL,
        description    TEXT,
        price          REAL NOT NULL,
        stock_quantity INTEGER NOT NULL,
        category_id    INTEGER REFERENCES Categories(category_id),
        image_url      TEXT,
        created_at     TIMESTAMP DEFAULT NOW()
    );
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS Cart (
        cart_id    SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES Users(user_id),
        created_at TIMESTAMP DEFAULT NOW()
    );
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS Cart_Items (
        cart_item_id SERIAL PRIMARY KEY,
        cart_id      INTEGER REFERENCES Cart(cart_id),
        product_id   INTEGER REFERENCES Products(product_id),
        quantity     INTEGER NOT NULL
    );
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS Orders (
        order_id         SERIAL PRIMARY KEY,
        user_id          INTEGER REFERENCES Users(user_id),
        total_amount     REAL,
        order_status     TEXT CHECK(order_status IN ('Pending','Shipped','Delivered','Cancelled')) DEFAULT 'Pending',
        payment_method   TEXT DEFAULT 'COD',
        order_date       TIMESTAMP DEFAULT NOW(),
        delivery_address TEXT,
        delivery_boy_id  INTEGER REFERENCES Users(user_id)
    );
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS Order_Items (
        order_item_id SERIAL PRIMARY KEY,
        order_id      INTEGER REFERENCES Orders(order_id),
        product_id    INTEGER REFERENCES Products(product_id),
        quantity      INTEGER,
        price         REAL
    );
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS Inventory_Log (
        log_id      SERIAL PRIMARY KEY,
        product_id  INTEGER REFERENCES Products(product_id),
        change_type TEXT,
        quantity    INTEGER,
        date        TIMESTAMP DEFAULT NOW()
    );
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS Shop_Info (
        shop_id        SERIAL PRIMARY KEY,
        name           TEXT,
        address        TEXT,
        latitude       REAL,
        longitude      REAL,
        contact_number TEXT
    );
""")

# ── Indexes ────────────────────────────────────────────────
cur.execute("CREATE INDEX IF NOT EXISTS idx_product_category ON Products(category_id);")
cur.execute("CREATE INDEX IF NOT EXISTS idx_orders_user      ON Orders(user_id);")
cur.execute("CREATE INDEX IF NOT EXISTS idx_orders_status    ON Orders(order_status);")
cur.execute("CREATE INDEX IF NOT EXISTS idx_orders_delivery  ON Orders(delivery_boy_id);")
cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email      ON Users(email);")

print("✓ Schema created successfully")

# ── Seed data ──────────────────────────────────────────────
# Only insert if tables are empty — safe to re-run
print("Checking for existing data...")

cur.execute("SELECT COUNT(*) FROM Users")
user_count = cur.fetchone()[0]

if user_count == 0:
    print("Seeding data...")

    # Users — passwords: admin=admin123, customers=123456
    cur.execute("""
        INSERT INTO Users (name, email, password, phone, address, role) VALUES
        ('Admin',         'admin@gmail.com',  '$2b$12$PoALL/zema/A08CoKeM4junAi1cH/fINIU7ewmD3M8yZZeQisSmKC', '9999999999', 'Sangola',   'admin'),
        ('Ramesh Patil',  'ramesh@gmail.com', '$2b$12$7/pPAzAnPgnEKfdrH6rSx.yqpTqafffsby78rxiKZVXixDwcaCIO6', '9876543210', 'Kolhapur',  'customer'),
        ('Suresh Jadhav', 'suresh@gmail.com', '$2b$12$7/pPAzAnPgnEKfdrH6rSx.yqpTqafffsby78rxiKZVXixDwcaCIO6', '9123456780', 'Sangli',    'customer');
    """)

    # Categories
    cur.execute("""
        INSERT INTO Categories (category_name, description) VALUES
        ('Fertilizers', 'Crop nutrition products'),
        ('Seeds',        'High quality seeds'),
        ('Pesticides',   'Crop protection chemicals'),
        ('Tools',        'Farming equipment');
    """)

    # Products
    cur.execute("""
        INSERT INTO Products (name, description, price, stock_quantity, category_id, image_url) VALUES
        ('Urea Fertilizer',  'Nitrogen rich fertilizer',  300,  50,  1, 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400'),
        ('DAP Fertilizer',   'Phosphate fertilizer',      1200, 30,  1, 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400'),
        ('Wheat Seeds',      'High yield wheat seeds',    200,  100, 2, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'),
        ('Cotton Seeds',     'BT cotton seeds',           800,  60,  2, 'https://images.unsplash.com/photo-1500937386664-c56f46129a19?w=400'),
        ('Insecticide Spray','Kills harmful insects',     450,  40,  3, 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400'),
        ('Fungicide Powder', 'Prevents fungal diseases',  350,  25,  3, 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400'),
        ('Water Sprayer',    'Manual sprayer tool',       1500, 15,  4, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400');
    """)

    # Carts for customers
    cur.execute("INSERT INTO Cart (user_id) VALUES (2), (3);")

    # Sample orders
    cur.execute("""
        INSERT INTO Orders (user_id, total_amount, order_status, payment_method, delivery_address) VALUES
        (2, 800,  'Pending', 'COD', 'Kolhapur, Maharashtra'),
        (3, 1200, 'Shipped', 'COD', 'Sangli, Maharashtra');
    """)

    cur.execute("""
        INSERT INTO Order_Items (order_id, product_id, quantity, price) VALUES
        (1, 1, 2, 300),
        (1, 3, 1, 200),
        (2, 2, 1, 1200);
    """)

    print("✓ Seed data inserted successfully")
else:
    print(f"✓ Database already has {user_count} users — skipping seed")

conn.commit()

# ── Verify ─────────────────────────────────────────────────
cur.execute("SELECT COUNT(*) FROM Users")
print(f"✓ Users:      {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM Categories")
print(f"✓ Categories: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM Products")
print(f"✓ Products:   {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM Orders")
print(f"✓ Orders:     {cur.fetchone()[0]}")

cur.close()
conn.close()
print("\n✅ PostgreSQL database initialization complete!")