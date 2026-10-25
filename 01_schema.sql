CREATE DATABASE IF NOT EXISTS hospital_db;
USE hospital_db;

-- 1. Users Table (RBAC Login Credentials)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('db_admin', 'app_user', 'report_user', 'receptionist', 'doctor') NOT NULL DEFAULT 'app_user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Specializations Table
CREATE TABLE specializations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB;

-- 3. Doctors Table (Soft-Delete Supported)
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    specialization_id INT NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    email VARCHAR(100) UNIQUE,
    consultation_fee DECIMAL(10,2) NOT NULL CHECK (consultation_fee >= 0),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (specialization_id) REFERENCES specializations(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Patients Table (Soft-Delete Supported)
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    dob DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Doctor Schedules Table
CREATE TABLE doctor_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_patients INT NOT NULL CHECK (max_patients > 0),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Appointments Table
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    schedule_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    queue_number INT NOT NULL CHECK (queue_number > 0),
    status ENUM('Booked', 'Completed', 'Cancelled') DEFAULT 'Booked',
    payment_status ENUM('Pending', 'Paid') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
    FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_appointment_slot (schedule_id, appointment_date, queue_number)
) ENGINE=InnoDB;

-- 7. Bills Table
CREATE TABLE bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL UNIQUE,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status ENUM('Pending', 'Paid', 'Refunded') DEFAULT 'Pending',
    payment_method ENUM('Cash', 'Card', 'Online') DEFAULT 'Cash',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 8. Audit Logs Table (JSON State Storage)
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_data JSON,
    new_data JSON,
    changed_by INT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Indexes
CREATE INDEX idx_doctor_name ON doctors(last_name, first_name);
CREATE INDEX idx_doctor_active ON doctors(is_active);
CREATE INDEX idx_patient_name ON patients(last_name, first_name);
CREATE INDEX idx_schedule_lookup ON doctor_schedules(doctor_id, day_of_week);
CREATE INDEX idx_appointment_date ON appointments(appointment_date);