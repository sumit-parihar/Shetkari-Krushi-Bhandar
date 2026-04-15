--------------------------------------------------
-- STOCK OPERATIONS
--------------------------------------------------

-- Reduce Stock
UPDATE Products
SET stock_quantity = stock_quantity - 2
WHERE product_id = 1;

-- Increase Stock
UPDATE Products
SET stock_quantity = stock_quantity + 10
WHERE product_id = 1;