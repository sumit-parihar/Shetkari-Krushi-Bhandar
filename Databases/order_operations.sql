--------------------------------------------------
-- ORDER OPERATIONS
--------------------------------------------------

-- Place Order
INSERT INTO Orders (user_id, total_amount, delivery_address)
VALUES (2, 1000, 'Kolhapur');

-- Add Order Items
INSERT INTO Order_Items (order_id, product_id, quantity, price)
VALUES (1, 2, 2, 500);

-- View Orders (User)
SELECT * FROM Orders
WHERE user_id = 2;

-- View Order Details
SELECT p.name, oi.quantity, oi.price
FROM Order_Items oi
JOIN Products p ON oi.product_id = p.product_id
WHERE oi.order_id = 1;

-- Update Order Status
UPDATE Orders
SET order_status = 'Delivered'
WHERE order_id = 1;