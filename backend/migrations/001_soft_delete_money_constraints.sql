-- ============================================================================
-- 001: deactivate instead of delete, exact money, data-integrity rules, indexes
-- Safe to run more than once. Applied by migrate.py inside one transaction.
-- ============================================================================

-- ── BUG-07: deactivate users / products instead of deleting them ────────────
-- Order history keeps pointing at the original rows.
ALTER TABLE Users    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE Products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ── SEC-07: one account per email, regardless of upper/lower case ───────────
UPDATE Users SET email = LOWER(TRIM(email)) WHERE email <> LOWER(TRIM(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON Users (LOWER(email));
DROP INDEX IF EXISTS idx_users_email;   -- duplicate of the UNIQUE constraint's index

-- ── DB-01: money as exact decimals instead of 4-byte floats ─────────────────
ALTER TABLE Products    ALTER COLUMN price        TYPE NUMERIC(10,2) USING ROUND(price::numeric, 2);
ALTER TABLE Orders      ALTER COLUMN total_amount TYPE NUMERIC(10,2) USING ROUND(total_amount::numeric, 2);
ALTER TABLE Order_Items ALTER COLUMN price        TYPE NUMERIC(10,2) USING ROUND(price::numeric, 2);

-- ── DB-02: rules the database itself enforces ───────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_nonnegative') THEN
        ALTER TABLE Products ADD CONSTRAINT products_stock_nonnegative CHECK (stock_quantity >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_price_nonnegative') THEN
        ALTER TABLE Products ADD CONSTRAINT products_price_nonnegative CHECK (price >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_quantity_positive') THEN
        ALTER TABLE Cart_Items ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_positive') THEN
        ALTER TABLE Order_Items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_user_unique') THEN
        ALTER TABLE Cart ADD CONSTRAINT cart_user_unique UNIQUE (user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_cart_product_unique') THEN
        ALTER TABLE Cart_Items ADD CONSTRAINT cart_items_cart_product_unique UNIQUE (cart_id, product_id);
    END IF;
END $$;

-- ── DB-03: what happens when a referenced row is removed ────────────────────
-- Cart data is disposable; order history (Orders / Order_Items) stays protected.
ALTER TABLE Cart       DROP CONSTRAINT IF EXISTS cart_user_id_fkey,
                       ADD  CONSTRAINT cart_user_id_fkey
                            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE;
ALTER TABLE Cart_Items DROP CONSTRAINT IF EXISTS cart_items_cart_id_fkey,
                       ADD  CONSTRAINT cart_items_cart_id_fkey
                            FOREIGN KEY (cart_id) REFERENCES Cart(cart_id) ON DELETE CASCADE;
ALTER TABLE Cart_Items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey,
                       ADD  CONSTRAINT cart_items_product_id_fkey
                            FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE;
ALTER TABLE Products   DROP CONSTRAINT IF EXISTS products_category_id_fkey,
                       ADD  CONSTRAINT products_category_id_fkey
                            FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE SET NULL;

-- ── DB-05: indexes for the lookups the app does on every order list / cart ──
CREATE INDEX IF NOT EXISTS idx_order_items_order ON Order_Items (order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart   ON Cart_Items (cart_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON Products (is_active);
