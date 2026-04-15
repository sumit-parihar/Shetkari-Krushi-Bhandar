-- Enable Foreign Keys
PRAGMA foreign_keys = ON;

--------------------------------------------------
-- USERS TABLE
--------------------------------------------------
CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    role TEXT CHECK(role IN ('customer','admin','delivery_boy')) DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------
-- CATEGORIES TABLE
--------------------------------------------------
CREATE TABLE Categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL,
    description TEXT
);

--------------------------------------------------
-- PRODUCTS TABLE
--------------------------------------------------
CREATE TABLE Products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock_quantity INTEGER NOT NULL,
    category_id INTEGER,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
);

--------------------------------------------------
-- CART TABLE
--------------------------------------------------
CREATE TABLE Cart (
    cart_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

--------------------------------------------------
-- CART ITEMS TABLE
--------------------------------------------------
CREATE TABLE Cart_Items (
    cart_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (cart_id) REFERENCES Cart(cart_id),
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

--------------------------------------------------
-- ORDERS TABLE
--------------------------------------------------
CREATE TABLE Orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_amount REAL,
    order_status TEXT CHECK(order_status IN ('Pending','Shipped', 'Delivered', 'Cancelled')) DEFAULT 'Pending',
    payment_method TEXT DEFAULT 'COD',
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivery_address TEXT,
    delivery_boy_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (delivery_boy_id) REFERENCES Users(user_id)
);

--------------------------------------------------
-- ORDER ITEMS TABLE
--------------------------------------------------
CREATE TABLE Order_Items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

--------------------------------------------------
-- INVENTORY LOG (OPTIONAL BUT GOOD)
--------------------------------------------------
CREATE TABLE Inventory_Log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    change_type TEXT,
    quantity INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

--------------------------------------------------
-- SHOP INFO (OPTIONAL)
--------------------------------------------------
CREATE TABLE Shop_Info (
    shop_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    address TEXT,
    latitude REAL,
    longitude REAL,
    contact_number TEXT
);

--------------------------------------------------
-- INDEXES (FOR PERFORMANCE)
--------------------------------------------------
CREATE INDEX idx_product_category ON Products(category_id);
CREATE INDEX idx_orders_user ON Orders(user_id);