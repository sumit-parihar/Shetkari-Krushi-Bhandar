--------------------------------------------------
-- CART OPERATIONS
--------------------------------------------------

-- Create Cart
INSERT INTO Cart (user_id)
VALUES (2);

-- Add to Cart
INSERT INTO Cart_Items (cart_id, product_id, quantity)
VALUES (1, 2, 3);

-- View Cart
SELECT p.name, ci.quantity, p.price
FROM Cart_Items ci
JOIN Products p ON ci.product_id = p.product_id
WHERE ci.cart_id = 1;

-- Update Cart Quantity
UPDATE Cart_Items
SET quantity = 5
WHERE cart_item_id = 1;

-- Remove from Cart
DELETE FROM Cart_Items
WHERE cart_item_id = 1;