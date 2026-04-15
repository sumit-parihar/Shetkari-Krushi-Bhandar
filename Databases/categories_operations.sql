--------------------------------------------------
-- CATEGORY OPERATIONS
--------------------------------------------------

-- Add Category
INSERT INTO Categories (category_name)
VALUES ('Fertilizers');

INSERT INTO Categories (category_name)
VALUES ('Seeds');

--------------------------------------------------

-- View All Categories
SELECT * FROM Categories;

--------------------------------------------------

-- View Single Category
SELECT * FROM Categories
WHERE category_id = 1;

--------------------------------------------------

-- Update Category
UPDATE Categories
SET category_name = 'Organic Fertilizers'
WHERE category_id = 1;

--------------------------------------------------

-- Delete Category
DELETE FROM Categories
WHERE category_id = 2;

--------------------------------------------------

-- Count Total Categories
SELECT COUNT(*) FROM Categories;

--------------------------------------------------

-- Categories with Product Count
SELECT c.category_name, COUNT(p.product_id) AS total_products
FROM Categories c
LEFT JOIN Products p ON c.category_id = p.category_id
GROUP BY c.category_id;

--------------------------------------------------

-- Categories having Products only
SELECT DISTINCT c.category_name
FROM Categories c
JOIN Products p ON c.category_id = p.category_id;