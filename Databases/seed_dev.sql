-- Dev seed: passwords are bcrypt hashes (admin123 / 123456)
INSERT INTO Users (name, email, password, phone, address, role)
VALUES 
('Admin', 'admin@gmail.com', '$2b$12$PoALL/zema/A08CoKeM4junAi1cH/fINIU7ewmD3M8yZZeQisSmKC', '9999999999', 'Sangola', 'admin'),
('Ramesh Patil', 'ramesh@gmail.com', '$2b$12$7/pPAzAnPgnEKfdrH6rSx.yqpTqafffsby78rxiKZVXixDwcaCIO6', '9876543210', 'Kolhapur', 'customer'),
('Suresh Jadhav', 'suresh@gmail.com', '$2b$12$7/pPAzAnPgnEKfdrH6rSx.yqpTqafffsby78rxiKZVXixDwcaCIO6', '9123456780', 'Sangli', 'customer');

INSERT INTO Categories (category_name, description)
VALUES
('Fertilizers', 'Crop nutrition products'),
('Seeds', 'High quality seeds'),
('Pesticides', 'Crop protection chemicals'),
('Tools', 'Farming equipment');

INSERT INTO Products (name, description, price, stock_quantity, category_id, image_url)
VALUES
('Urea Fertilizer', 'Nitrogen rich fertilizer', 300, 50, 1, 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400'),
('DAP Fertilizer', 'Phosphate fertilizer', 1200, 30, 1, 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400'),
('Wheat Seeds', 'High yield wheat seeds', 200, 100, 2, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'),
('Cotton Seeds', 'BT cotton seeds', 800, 60, 2, 'https://images.unsplash.com/photo-1500937386664-c56f46129a19?w=400'),
('Insecticide Spray', 'Kills harmful insects', 450, 40, 3, 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400'),
('Fungicide Powder', 'Prevents fungal diseases', 350, 25, 3, 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400'),
('Water Sprayer', 'Manual sprayer tool', 1500, 15, 4, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400');

INSERT INTO Cart (user_id) VALUES (2), (3);

INSERT INTO Cart_Items (cart_id, product_id, quantity)
VALUES
(1, 1, 2),
(1, 3, 1),
(2, 2, 1);

INSERT INTO Orders (user_id, total_amount, order_status, payment_method, delivery_address)
VALUES
(2, 800, 'Pending', 'COD', 'Kolhapur, Maharashtra'),
(3, 1200, 'Shipped', 'COD', 'Sangli, Maharashtra');

INSERT INTO Order_Items (order_id, product_id, quantity, price)
VALUES
(1, 1, 2, 300),
(1, 3, 1, 200),
(2, 2, 1, 1200);
