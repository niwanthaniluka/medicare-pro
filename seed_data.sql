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

-- 3. Doctors
INSERT INTO doctors (id, specialization_id, first_name, last_name, contact_number, email, consultation_fee, is_active) VALUES
(1, 1, 'Nisal', 'Perera', '0771234567', 'nisal@test.com', 2500.00, 1),
(2, 2, 'Anoma', 'Silva', '0765554321', 'anoma@test.com', 2000.00, 1),
(3, 3, 'Chandrasena', 'Perera', '0761122334', 'chandrasena@test.com', 4000.00, 1);

-- 4. Schedules
INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, max_patients, is_active) VALUES
(1, 1, 'Monday', '08:00:00', '12:00:00', 5, TRUE),
(2, 2, 'Wednesday', '09:00:00', '13:00:00', 10, TRUE),
(3, 3, 'Friday', '14:00:00', '18:00:00', 8, TRUE);

-- 5. Patients
INSERT INTO patients (id, first_name, last_name, dob, gender, contact_number, email, address, is_active) VALUES
(1, 'Saman', 'Kumara', '1990-01-01', 'Male', '0701122334', 'saman@test.com', 'Colombo', 1),
(2, 'Nayani', 'Fernando', '1995-05-05', 'Female', '0789988776', 'nayani@test.com', 'Kandy', 1);