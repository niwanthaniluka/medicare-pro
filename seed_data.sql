USE hospital_db;

-- 1. Users (Password: 123456 encrypted)
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$10$w81cIqZ0Zq9sEaJvj8N0U.kPjHk2YvV3yC0yM4S1Cq0X7z5B9u8eG', 'db_admin'),
('reception', '$2b$10$w81cIqZ0Zq9sEaJvj8N0U.kPjHk2YvV3yC0yM4S1Cq0X7z5B9u8eG', 'app_user');

-- 2. Specializations
INSERT INTO specializations (id, name, description) VALUES
(1, 'Cardiology', 'Heart and cardiovascular care'),
(2, 'Pediatrics', 'Comprehensive child healthcare'),
(3, 'Dermatology', 'Skin, hair, and nail treatments'),
(4, 'Dentist', 'Dental surgery and oral care');
