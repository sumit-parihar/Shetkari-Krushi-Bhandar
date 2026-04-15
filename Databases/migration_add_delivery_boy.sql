-- ============================================================
-- MIGRATION: Add delivery boy support
-- Run this on your existing database (shetkari.db) ONCE
-- ============================================================

PRAGMA foreign_keys = OFF;

-- Step 1: Recreate Users table with updated role CHECK constraint
CREATE TABLE IF NOT EXISTS Users_new (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    role TEXT CHECK(role IN ('customer','admin','delivery_boy')) DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Users_new SELECT * FROM Users;
DROP TABLE Users;
ALTER TABLE Users_new RENAME TO Users;

-- Step 2: Add delivery_boy_id column to Orders (if not exists)
ALTER TABLE Orders ADD COLUMN delivery_boy_id INTEGER REFERENCES Users(user_id);

PRAGMA foreign_keys = ON;

-- Verify
SELECT 'Migration complete. Tables:' AS status;
SELECT name FROM sqlite_master WHERE type='table';
