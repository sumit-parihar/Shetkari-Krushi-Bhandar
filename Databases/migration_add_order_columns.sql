-- ============================================================
-- MIGRATION: Add assigned_at, delivery_failed_reason columns
-- and Assignment_History table, and delivery boy availability
-- Run this on your existing database (shetkari.db) ONCE
-- ============================================================

PRAGMA foreign_keys = OFF;

-- Step 1: Add columns to Orders table if not exists
-- Note: SQLite requires table recreation for CHECK constraint changes

CREATE TABLE Orders_new (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_amount REAL,
    order_status TEXT CHECK(order_status IN ('Pending','Shipped', 'Delivered', 'Cancelled', 'Delivery Failed')) DEFAULT 'Pending',
    payment_method TEXT DEFAULT 'COD',
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivery_address TEXT,
    delivery_boy_id INTEGER,
    assigned_at DATETIME,
    delivery_failed_reason TEXT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (delivery_boy_id) REFERENCES Users(user_id)
);

-- Copy data from old table
INSERT INTO Orders_new SELECT * FROM Orders;

-- Drop old table and rename new one
DROP TABLE Orders;
ALTER TABLE Orders_new RENAME TO Orders;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON Orders(user_id);

-- Step 2: Add available column to Users table for delivery boy availability
CREATE TABLE Users_new (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    role TEXT CHECK(role IN ('customer','admin','delivery_boy')) DEFAULT 'customer',
    available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Users_new SELECT user_id, name, email, password, phone, address, role, 1 as available, created_at FROM Users;

DROP TABLE Users;
ALTER TABLE Users_new RENAME TO Users;

-- Step 3: Create Assignment_History table for audit trail
CREATE TABLE IF NOT EXISTS Assignment_History (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    delivery_boy_id INTEGER,
    action TEXT CHECK(action IN ('assigned', 'unassigned', 'reassigned')) NOT NULL,
    assigned_by INTEGER,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    FOREIGN KEY (delivery_boy_id) REFERENCES Users(user_id),
    FOREIGN KEY (assigned_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_history_order ON Assignment_History(order_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_delivery_boy ON Assignment_History(delivery_boy_id);

PRAGMA foreign_keys = ON;

-- Verify
SELECT 'Migration complete!' AS status;
SELECT 'Orders table: added assigned_at, delivery_failed_reason, updated CHECK constraint' AS changes;
SELECT 'Users table: added available column' AS changes;
SELECT 'Assignment_History table: created for audit trail' AS changes;
