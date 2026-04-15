--------------------------------------------------
-- REPORT QUERIES
--------------------------------------------------

-- Total Orders
SELECT COUNT(*) As FROM Orders;

-- Total Sales
SELECT SUM(total_amount) FROM Orders;

-- Best Selling Products
SELECT product_id, SUM(quantity) AS total_sold
FROM Order_Items
GROUP BY product_id
ORDER BY total_sold DESC;

-- Low Stock Products
SELECT * FROM Products
WHERE stock_quantity < 10;