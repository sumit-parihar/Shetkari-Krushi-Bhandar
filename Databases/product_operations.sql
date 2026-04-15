--------------------------------------------------
-- PRODUCT OPERATIONS
--------------------------------------------------

-- Get All Products
SELECT * FROM Products;

-- Get Products with Category
SELECT p.product_id, p.name, p.price, c.category_name
FROM Products p
JOIN Categories c ON p.category_id = c.category_id;

-- Get Products by Category
SELECT * FROM Products
WHERE category_id = 1;

-- Add Product
INSERT INTO Products (name, description, price, stock_quantity, category_id, image_url)
VALUES ('Organic Fertilizer', 'Eco-friendly fertilizer', 500, 20, 1, 'https://example.com/organic.jpg');

-- Update Product
UPDATE Products
SET price = 550, stock_quantity = 25
WHERE product_id = 1;

-- Delete Product
DELETE FROM Products
WHERE product_id = 1;