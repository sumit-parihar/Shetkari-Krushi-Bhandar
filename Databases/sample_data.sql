--------------------------------------------------
-- USERS
--------------------------------------------------
INSERT INTO Users (name, email, password, phone, address, role)
VALUES
('Admin', 'admin@gmail.com', 'admin123', '9999999999', 'Sangola', 'admin'),
('Ramesh Patil', 'ramesh@gmail.com', '123456', '9876543210', 'Kolhapur', 'customer'),
('Suresh Jadhav', 'suresh@gmail.com', '123456', '9123456780', 'Sangli', 'customer'),
('Sumit Parihar', 'user@gmail.com', '123456', NULL, NULL, 'customer'),
('Delivery Boy', 'delivery@gmail.com', '123456', '9123456789', 'Sangola', 'delivery_boy');

--------------------------------------------------
-- CATEGORIES
--------------------------------------------------
INSERT INTO Categories (category_name, description)
VALUES
('Fertilizers', 'Crop nutrition products'),
('Seeds', 'High quality seeds'),
('Pesticides', 'Crop protection chemicals'),
('Tools', 'Farming equipment');

--------------------------------------------------
-- PRODUCTS
--------------------------------------------------
INSERT INTO Products (name, description, price, stock_quantity, category_id, image_url)
VALUES
('Urea Fertilizer', 'Nitrogen rich fertilizer', 300, 50, 1, 'https://example.com/images/urea.jpg'),
('DAP Fertilizer', 'Phosphate fertilizer', 1200, 30, 1, 'https://example.com/images/dap.jpg'),
('Wheat Seeds', 'High yield wheat seeds', 200, 100, 2, 'https://example.com/images/wheat.jpg'),
('Cotton Seeds', 'BT cotton seeds', 800, 60, 2, 'https://example.com/images/cotton.jpg'),
('Insecticide Spray', 'Kills harmful insects', 450, 40, 3, 'https://example.com/images/spray.jpg'),
('Fungicide Powder', 'Prevents fungal diseases', 350, 25, 3, 'https://example.com/images/fungicide.jpg'),
('Water Sprayer', 'Manual sprayer tool', 1500, 15, 4, 'https://example.com/images/sprayer.jpg');

--------------------------------------------------
-- CART
--------------------------------------------------
INSERT INTO Cart (user_id)
VALUES (2), (3);

--------------------------------------------------
-- CART ITEMS
--------------------------------------------------
INSERT INTO Cart_Items (cart_id, product_id, quantity)
VALUES
(1, 1, 2),
(1, 3, 1),
(2, 2, 1);

--------------------------------------------------
-- ORDERS
--------------------------------------------------
INSERT INTO Orders (user_id, total_amount, order_status, payment_method, delivery_address)
VALUES
(2, 800, 'Pending', 'COD', 'Kolhapur, Maharashtra'),
(3, 1200, 'Confirmed', 'COD', 'Sangli, Maharashtra');

--------------------------------------------------
-- ORDER ITEMS
--------------------------------------------------
INSERT INTO Order_Items (order_id, product_id, quantity, price)
VALUES
(1, 1, 2, 300),
(1, 3, 1, 200),
(2, 2, 1, 1200);

--------------------------------------------------
-- INVENTORY LOG
--------------------------------------------------
INSERT INTO Inventory_Log (product_id, change_type, quantity)
VALUES
(1, 'added', 50),
(2, 'added', 30),
(1, 'sold', -2),
(3, 'sold', -1);

--------------------------------------------------
-- SHOP INFO
--------------------------------------------------
INSERT INTO Shop_Info (name, address, latitude, longitude, contact_number)
VALUES
('Shetkari Krushi Bhandar', 'Sangola, Maharashtra', 17.4399, 75.1938, '9876543210');