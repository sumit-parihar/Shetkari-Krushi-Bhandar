--------------------------------------------------
-- INVENTORY LOG OPERATIONS
--------------------------------------------------

-- Log Stock Added
INSERT INTO Inventory_Log (product_id, change_type, quantity)
VALUES (1, 'added', 10);

-- Log Product Sold
INSERT INTO Inventory_Log (product_id, change_type, quantity)
VALUES (1, 'sold', -2);

-- View Logs
SELECT * FROM Inventory_Log;