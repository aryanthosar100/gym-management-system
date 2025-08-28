CREATE DATABASE IF NOT EXISTS gymdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
use gymdb;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','member','trainer') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE memberships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,        -- e.g. Basic, Premium, Pro
  price DECIMAL(10,2) NOT NULL,
  duration_months INT NOT NULL,     -- e.g. 1, 3, 12
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  age INT,
  plan_id INT,
  join_date DATE DEFAULT (CURRENT_DATE),
  expiry_date DATE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES memberships(id)
);
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE DEFAULT (CURRENT_DATE),
  status ENUM('paid','pending') DEFAULT 'paid',
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
CREATE TABLE workouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  workout_name VARCHAR(100),
  description TEXT,
  assigned_date DATE DEFAULT (CURRENT_DATE),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
CREATE TABLE diets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  diet_name VARCHAR(100),
  description TEXT,
  assigned_date DATE DEFAULT (CURRENT_DATE),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
INSERT INTO memberships (name, price, duration_months) VALUES
('Basic', 1000, 1),
('Premium', 2500, 3),
('Pro', 9000, 12);
SHOW TABLES;
select*from users;
SELECT * FROM memberships;