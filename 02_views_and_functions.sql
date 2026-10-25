USE hospital_db;

-- -------------------------------------------------------------
-- USER-DEFINED FUNCTIONS (UDF)
-- -------------------------------------------------------------
DELIMITER //

-- Function 1: Calculate Patient Age
CREATE FUNCTION fn_CalculatePatientAge(p_dob DATE) 
RETURNS INT
DETERMINISTIC
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, p_dob, CURDATE());
END //

-- Function 2: Total Paid Revenue per Doctor
CREATE FUNCTION fn_GetDoctorPaidRevenue(p_doctor_id INT) 
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2);
    
    SELECT IFNULL(SUM(b.total_amount), 0.00) INTO v_total
    FROM bills b
    JOIN appointments a ON b.appointment_id = a.id
    JOIN doctor_schedules ds ON a.schedule_id = ds.id
    WHERE ds.doctor_id = p_doctor_id AND b.status = 'Paid';
    
    RETURN v_total;
END //

-- Function 3: Doctor Revenue based on Completed visits
CREATE FUNCTION fn_GetDoctorRevenue(p_doctor_id INT) 
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE total_revenue DECIMAL(10,2);
    
    SELECT IFNULL(SUM(b.total_amount), 0.00) INTO total_revenue
    FROM bills b
    JOIN appointments a ON b.appointment_id = a.id
    JOIN doctor_schedules ds ON a.schedule_id = ds.id
    WHERE ds.doctor_id = p_doctor_id AND a.status = 'Completed';

    RETURN total_revenue;
END //

DELIMITER ;

-- -------------------------------------------------------------
-- DATABASE VIEWS
-- -------------------------------------------------------------

-- View 1: Active Doctor Schedules
CREATE OR REPLACE VIEW vw_active_doctor_schedules AS
SELECT 
    ds.id AS schedule_id,
    d.id AS doctor_id,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    s.name AS specialization,
    ds.day_of_week,
    ds.start_time,
    ds.end_time,
    COALESCE(ds.max_patients, 5) AS max_patients,
    COALESCE(d.consultation_fee, 2000.00) AS consultation_fee
FROM doctor_schedules ds
JOIN doctors d ON ds.doctor_id = d.id
JOIN specializations s ON d.specialization_id = s.id
WHERE d.is_active = 1 AND ds.is_active = TRUE;

-- View 2: Soft-Deleted Doctors
CREATE OR REPLACE VIEW vw_deleted_doctors AS
SELECT 
    d.id,
    d.first_name,
    d.last_name,
    s.name AS specialization,
    d.consultation_fee
FROM doctors d
JOIN specializations s ON d.specialization_id = s.id
WHERE d.is_active = 0[cite: 6];

-- View 3: Soft-Deleted Patients
CREATE OR REPLACE VIEW vw_deleted_patients AS
SELECT 
    id,
    first_name,
    last_name,
    contact_number,
    dob
FROM patients
WHERE is_active = 0;

-- View 4: Financial & Billing Summary
CREATE OR REPLACE VIEW vw_financial_summary AS
SELECT 
    b.id AS bill_id,
    b.appointment_id,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    b.total_amount,
    b.status,
    b.payment_method,
    b.issued_at
FROM bills b
JOIN appointments a ON b.appointment_id = a.id
JOIN patients p ON a.patient_id = p.id
JOIN doctor_schedules ds ON a.schedule_id = ds.id
JOIN doctors d ON ds.doctor_id = d.id;

-- View 5: Patient Billing Details View
CREATE OR REPLACE VIEW vw_patient_billing_details AS
SELECT 
    b.id AS bill_id,
    b.appointment_id,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    b.total_amount,
    b.status,
    b.payment_method,
    b.issued_at
FROM bills b
JOIN appointments a ON b.appointment_id = a.id
JOIN patients p ON a.patient_id = p.id;