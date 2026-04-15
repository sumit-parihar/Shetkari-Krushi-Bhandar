--------------------------------------------------
-- SEARCH & FILTER OPERATIONS
--------------------------------------------------

-- Search Products by Name (case-insensitive)
SELECT * FROM Products
WHERE name LIKE '%fertilizer%';

--------------------------------------------------

-- Search Products by Keyword (name or description)
SELECT * FROM Products
WHERE name LIKE '%seed%'
   OR description LIKE '%seed%';

--------------------------------------------------

-- Filter Products by Category
SELECT * FROM Products
WHERE category_id = 1;

--------------------------------------------------

-- Filter Products by Price Range
SELECT * FROM Products
WHERE price BETWEEN 200 AND 1000;

--------------------------------------------------

-- Sort Products by Price (Low to High)
SELECT * FROM Products
ORDER BY price ASC;

--------------------------------------------------

-- Sort Products by Price (High to Low)
SELECT * FROM Products
ORDER BY price DESC;

--------------------------------------------------

-- Show Low Stock Products
SELECT * FROM Products
WHERE stock_quantity < 10;

--------------------------------------------------

-- Show Out of Stock Products
SELECT * FROM Products
WHERE stock_quantity = 0;

--------------------------------------------------

-- Search + Filter Combined
SELECT * FROM Products
WHERE name LIKE '%fertilizer%'
  AND price < 1000
  AND category_id = 1;

--------------------------------------------------

-- Products with Category Name (for display)
SELECT p.name, p.price, c.category_name
FROM Products p
JOIN Categories c ON p.category_id = c.category_id;