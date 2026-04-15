--------------------------------------------------
-- USER OPERATIONS
--------------------------------------------------

-- Register User
INSERT INTO Users (name, email, password, phone, address)
VALUES ('Amit Patil', 'amit@gmail.com', '123456', '9876543211', 'Pune');

-- Login User
SELECT * FROM Users
WHERE email = 'amit@gmail.com' AND password = '123456';

-- View All Users (Admin)
SELECT * FROM Users;

-- Update User
UPDATE Users
SET phone = '9999999999'
WHERE user_id = 1;

-- Delete User
DELETE FROM Users
WHERE user_id = 3;