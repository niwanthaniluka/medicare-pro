const express = require('express');
const router = express.Router();
const pool = require('../db');
const {sanitizeText,isValidPositiveInt,isValidPhone,isValidEmail,isValidDate,isValidTime} = require('../middleware/validation');

// Original lines 115-172 | POST /api/specializations
router.post('/specializations', async (req, res) => {
    const rawName = req.body.name || req.body.specialization || req.body.category || req.body.specialization_name || '';
    const name = sanitizeText(rawName);
    const description = sanitizeText(req.body.description);

    if (!name || name.length < 2 || name.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Category නම සඳහා අවම වශයෙන් අකුරු 2ක් (උපරිම 100ක්) තිබිය යුතුය.'
        });
    }

    try {
        let insertId;
        try {
            const [result] = await pool.execute(
                'INSERT INTO specializations (name, description) VALUES (?, ?)',
                [name, description]
            );
            insertId = result.insertId;
        } catch (dbErr) {
            if (dbErr.errno === 1054 || dbErr.code === 'ER_BAD_FIELD_ERROR') {
                const [result] = await pool.execute(
                    'INSERT INTO specializations (name) VALUES (?)',
                    [name]
                );
                insertId = result.insertId;
            } else if (dbErr.code === 'ER_DUP_ENTRY' || dbErr.errno === 1062) {
                const [existing] = await pool.query('SELECT * FROM specializations WHERE name = ?', [name]);
                if (existing.length > 0) {
                    return res.status(200).json({
                        success: true,
                        id: existing[0].id,
                        specialization_id: existing[0].id,
                        name: existing[0].name,
                        data: existing[0],
                        message: 'මෙම Specialization Category එක දැනටමත් පවතී.'
                    });
                }
                throw dbErr;
            } else {
                throw dbErr;
            }
        }

        res.status(201).json({
            success: true,
            id: insertId,
            specialization_id: insertId,
            name: name,
            data: { id: insertId, name: name },
            message: 'Specialization created successfully!'
        });
    } catch (error) {
        console.error('Specialization creation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 175-182 | GET /api/specializations
router.get('/specializations', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, description FROM specializations ORDER BY name ASC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 185-213 | DELETE /api/specializations/:id
router.delete('/specializations/:id', async (req, res) => {
    const specializationId = req.params.id;
    if (!isValidPositiveInt(specializationId)) {
        return res.status(400).json({ success: false, message: 'වලංගු නොවන Specialization ID එකකි.' });
    }

    try {
        const [doctors] = await pool.query(
            'SELECT id FROM doctors WHERE specialization_id = ? AND is_active = 1',
            [specializationId]
        );

        if (doctors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'මෙම Category එකට සම්බන්ධ Active Doctors ලා සිටින බැවින් Delete කළ නොහැක!'
            });
        }

        const [result] = await pool.execute('DELETE FROM specializations WHERE id = ?', [specializationId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Category එක සොයාගත නොහැකි විය.' });
        }

        res.status(200).json({ success: true, message: 'Category සාර්ථකව Delete කරන ලදී!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 220-251 | PUT /api/patients/:id
router.put('/patients/:id', async (req, res) => {
    const patientId = req.params.id;
    if (!isValidPositiveInt(patientId)) {
        return res.status(400).json({ success: false, message: 'Invalid Patient ID' });
    }

    const { first_name, last_name, contact_number, address } = req.body;
    const fName = sanitizeText(first_name);
    const lName = sanitizeText(last_name);
    const contact = sanitizeText(contact_number);
    const addr = sanitizeText(address);

    if (!fName || !lName || fName.length < 2 || lName.length < 2) {
        return res.status(400).json({ success: false, message: 'Patient First name සහ Last name අනිවාර්ය වේ.' });
    }
    if (contact && !isValidPhone(contact)) {
        return res.status(400).json({ success: false, message: 'වලංගු Contact Number එකක් ලබාදෙන්න (උදා: 0771234567).' });
    }

    try {
        const [result] = await pool.execute(
            'UPDATE patients SET first_name = ?, last_name = ?, contact_number = ?, address = ? WHERE id = ?',
            [fName, lName, contact, addr, patientId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Patient සොයාගත නොහැකි විය.' });
        }
        res.status(200).json({ success: true, message: 'Patient details updated successfully!' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Original lines 254-269 | DELETE /api/patients/:id
router.delete('/patients/:id', async (req, res) => {
    const patientId = req.params.id;
    if (!isValidPositiveInt(patientId)) {
        return res.status(400).json({ success: false, message: 'Invalid Patient ID' });
    }

    try {
        const [result] = await pool.execute('UPDATE patients SET is_active = 0 WHERE id = ?', [patientId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Patient සොයාගත නොහැකි විය.' });
        }
        res.status(200).json({ success: true, message: 'Patient deactivated (Soft deleted) successfully!' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Original lines 276-289 | GET /api/doctors
router.get('/doctors', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.id, d.first_name, d.last_name, s.name AS specialization, d.consultation_fee, d.is_active
            FROM doctors d
            JOIN specializations s ON d.specialization_id = s.id
            WHERE d.is_active = 1
            ORDER BY d.id DESC
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 292-402 | POST /api/doctors
router.post('/doctors', async (req, res) => {
    const {
        first_name,
        last_name,
        specialization_id,
        consultation_fee,
        email,
        phone,
        contact_number,
        day_of_week,
        start_time,
        end_time,
        max_patients
    } = req.body;

    const fName = sanitizeText(first_name);
    const lName = sanitizeText(last_name);
    const contactVal = sanitizeText(contact_number || phone);
    const emailVal = sanitizeText(email);

    // 1. Name Check
    if (!fName || fName.length < 2 || !lName || lName.length < 2) {
        return res.status(400).json({ success: false, message: 'Doctor First name සහ Last name අනිවාර්ය වේ (අවම වශයෙන් අකුරු 2ක්).' });
    }

    // 2. Specialization ID Check
    if (!isValidPositiveInt(specialization_id)) {
        return res.status(400).json({ success: false, message: 'කරුණාකර වලංගු Specialization එකක් තෝරන්න.' });
    }

    // 3. Fee Validation
    const feeNum = Number(consultation_fee);
    if (isNaN(feeNum) || feeNum <= 0 || feeNum > 100000) {
        return res.status(400).json({ success: false, message: 'Consultation Fee එක රු. 1 සිට රු. 100,000 දක්වා ධන අගයක් විය යුතුය.' });
    }

    // 4. Contact Number Validation
    if (!contactVal) {
        return res.status(400).json({ success: false, message: 'Contact Number (දුරකථන අංකය) ඇතුළත් කිරීම අනිවාර්යයි!' });
    }
    if (!isValidPhone(contactVal)) {
        return res.status(400).json({ success: false, message: 'වලංගු ශ්‍රී ලාංකික Contact Number එකක් ලබාදෙන්න! (උදා: 0771234567 හෝ +94771234567)' });
    }

    // 5. Email Validation
    if (emailVal && !isValidEmail(emailVal)) {
        return res.status(400).json({ success: false, message: 'වලංගු Email ලිපිනයක් ඇතුළත් කරන්න (උදා: doctor@medicare.lk).' });
    }

    // 6. Day & Time Validation
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (day_of_week && !validDays.includes(day_of_week)) {
        return res.status(400).json({ success: false, message: 'වලංගු දිනයක් තෝරන්න.' });
    }
    if (start_time && end_time) {
        if (!isValidTime(start_time) || !isValidTime(end_time)) {
            return res.status(400).json({ success: false, message: 'වලංගු වේලාවක් (HH:MM) ලබාදෙන්න.' });
        }
        if (start_time >= end_time) {
            return res.status(400).json({ success: false, message: 'Clinic Start Time එක End Time එකට පෙර විය යුතුය!' });
        }
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Duplicate Email Check
        if (emailVal) {
            const [existingDoc] = await connection.execute('SELECT id FROM doctors WHERE email = ?', [emailVal]);
            if (existingDoc.length > 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'මෙම Email ලිපිනය දැනටමත් වෙනත් Doctor කෙනෙකු සතුව පවතී.' });
            }
        }

        // Insert into doctors table
        const [docResult] = await connection.execute(
            `INSERT INTO doctors 
             (first_name, last_name, specialization_id, consultation_fee, email, contact_number, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [fName, lName, specialization_id, feeNum, emailVal, contactVal]
        );
        const doctorId = docResult.insertId;

        // Insert Schedule
        if (day_of_week && start_time && end_time) {
            const slots = isValidPositiveInt(max_patients) ? Math.min(Math.max(Number(max_patients), 1), 100) : 10;
            await connection.execute(
                `INSERT INTO doctor_schedules 
                 (doctor_id, day_of_week, start_time, end_time, max_patients) 
                 VALUES (?, ?, ?, ?, ?)`,
                [doctorId, day_of_week, start_time, end_time, slots]
            );
        }

        await connection.commit();
        res.status(201).json({
            success: true,
            doctor_id: doctorId,
            message: 'New Doctor and Schedule registered successfully!'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Doctor onboarding error:', error);
        res.status(400).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// Original lines 405-435 | PUT /api/doctors/:id
router.put('/doctors/:id', async (req, res) => {
    const doctorId = req.params.id;
    if (!isValidPositiveInt(doctorId)) {
        return res.status(400).json({ success: false, message: 'Invalid Doctor ID' });
    }

    const { first_name, last_name, consultation_fee } = req.body;
    const fName = sanitizeText(first_name);
    const lName = sanitizeText(last_name);
    const feeNum = Number(consultation_fee);

    if (!fName || !lName) {
        return res.status(400).json({ success: false, message: 'First name සහ Last name අනිවාර්ය වේ.' });
    }
    if (isNaN(feeNum) || feeNum <= 0 || feeNum > 100000) {
        return res.status(400).json({ success: false, message: 'Fee එක රු. 1 සිට රු. 100,000 අතර විය යුතුය.' });
    }

    try {
        const [result] = await pool.execute(
            'UPDATE doctors SET first_name = ?, last_name = ?, consultation_fee = ? WHERE id = ?',
            [fName, lName, feeNum, doctorId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Doctor සොයාගත නොහැකි විය.' });
        }
        res.status(200).json({ success: true, message: 'Doctor updated! (Audit Trigger Logged)' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Original lines 438-457 | DELETE /api/doctors/:id
router.delete('/doctors/:id', async (req, res) => {
    const doctorId = req.params.id;
    if (!isValidPositiveInt(doctorId)) return res.status(400).json({success:false,message:'Invalid Doctor ID'});
    try {
        // 3. Doctor Soft Delete (is_active = 0) කිරීම
        const [result] = await pool.execute('UPDATE doctors SET is_active = 0 WHERE id = ?', [doctorId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Doctor not found!' });
        }

        res.status(200).json({ 
            success: true, 
            message: `Doctor #${doctorId} deactivated safely without breaking schedule history!` 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 465-516 | POST /api/appointments/book
router.post('/appointments/book', async (req, res) => {
    const { patient_id, schedule_id, appointment_date } = req.body;

    if (!isValidPositiveInt(patient_id)) {
        return res.status(400).json({ success: false, message: 'කරුණාකර වලංගු Patient කෙනෙක් තෝරන්න.' });
    }
    if (!isValidPositiveInt(schedule_id)) {
        return res.status(400).json({ success: false, message: 'කරුණාකර Doctor Session එකක් තෝරන්න.' });
    }
    if (!isValidDate(appointment_date)) {
        return res.status(400).json({ success: false, message: 'වලංගු දිනයක් (YYYY-MM-DD) ලබාදෙන්න.' });
    }

    // Past Date Security Check
    const today = new Date().toISOString().split('T')[0];
    if (appointment_date < today) {
        return res.status(400).json({ success: false, message: 'පසුගිය දින සඳහා Appointment Book කළ නොහැක.' });
    }

    try {
        await pool.execute('CALL sp_BookAppointment(?, ?, ?)', [
            patient_id,
            schedule_id,
            appointment_date
        ]);

        const [latest] = await pool.query(`
            SELECT a.id, a.queue_number, a.appointment_date,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   CONCAT('Dr. ', d.first_name, ' ', d.last_name) AS doctor_name,
                   s.name AS specialization,
                   ds.start_time, ds.end_time,
                   b.id AS bill_id, b.total_amount
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctor_schedules ds ON a.schedule_id = ds.id
            JOIN doctors d ON ds.doctor_id = d.id
            JOIN specializations s ON d.specialization_id = s.id
            JOIN bills b ON a.id = b.appointment_id
            WHERE a.patient_id = ?
            ORDER BY a.id DESC LIMIT 1
        `, [patient_id]);

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully!',
            tokenData: latest.length > 0 ? latest[0] : null
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Original lines 519-539 | GET /api/appointments
router.get('/appointments', async (req, res) => {
    try {
        const query = `
            SELECT a.id, 
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                   a.appointment_date, a.queue_number, a.status,
                   b.id AS bill_id, b.total_amount, b.status AS payment_status, b.payment_method
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctor_schedules ds ON a.schedule_id = ds.id
            JOIN doctors d ON ds.doctor_id = d.id
            LEFT JOIN bills b ON a.id = b.appointment_id
            ORDER BY a.id DESC
        `;
        const [rows] = await pool.query(query);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 542-560 | PUT /api/appointments/:id/status
router.put('/appointments/:id/status', async (req, res) => {
    const appointmentId = req.params.id;
    const { status } = req.body;
    const validStatuses = ['Scheduled', 'Completed', 'Cancelled'];

    if (!isValidPositiveInt(appointmentId) || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'වලංගු Status එකක් (Scheduled, Completed, Cancelled) තෝරන්න.' });
    }

    try {
        const [result] = await pool.execute('UPDATE appointments SET status = ? WHERE id = ?', [status, appointmentId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Appointment සොයාගත නොහැකි විය.' });
        }
        res.status(200).json({ success: true, message: 'Status updated (Trigger executed)!' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Original lines 567-578 | GET /api/patients
router.get('/patients', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *, fn_CalculatePatientAge(dob) AS calculated_age 
            FROM patients 
            ORDER BY id DESC
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 581-615 | POST /api/patients
router.post('/patients', async (req, res) => {
    const { first_name, last_name, dob, gender, contact_number, email, address } = req.body;

    const fName = sanitizeText(first_name);
    const lName = sanitizeText(last_name);
    const contactVal = sanitizeText(contact_number);
    const emailVal = sanitizeText(email);
    const addrVal = sanitizeText(address);

    if (!fName || !lName || fName.length < 2 || lName.length < 2) {
        return res.status(400).json({ success: false, message: 'First name සහ Last name අනිවාර්ය වේ.' });
    }
    if (!isValidDate(dob)) {
        return res.status(400).json({ success: false, message: 'වලංගු Date of Birth (YYYY-MM-DD) ලබාදෙන්න.' });
    }
    if (!['Male', 'Female', 'Other'].includes(gender)) {
        return res.status(400).json({ success: false, message: 'Gender එක Male, Female, හෝ Other විය යුතුය.' });
    }
    if (!contactVal || !isValidPhone(contactVal)) {
        return res.status(400).json({ success: false, message: 'වලංගු ශ්‍රී ලාංකික Contact Number එකක් ලබාදෙන්න (උදා: 0771234567).' });
    }
    if (emailVal && !isValidEmail(emailVal)) {
        return res.status(400).json({ success: false, message: 'වලංගු Email ලිපිනයක් ලබාදෙන්න.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO patients (first_name, last_name, dob, gender, contact_number, email, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [fName, lName, dob, gender, contactVal, emailVal, addrVal]
        );
        res.status(201).json({ success: true, patient_id: result.insertId, message: 'Patient registered successfully!' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Original lines 698-721 | GET /api/schedules
router.get('/schedules', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                s.id AS schedule_id,
                d.id AS doctor_id,
                CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                sp.name AS specialization,
                s.day_of_week,
                s.start_time,
                s.end_time,
                s.max_patients,
                d.consultation_fee
            FROM doctor_schedules s
            JOIN doctors d ON s.doctor_id = d.id
            JOIN specializations sp ON d.specialization_id = sp.id
            WHERE d.is_active = 1
            ORDER BY s.id DESC
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 954-1014 | PUT /api/specializations/:id
router.put('/specializations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // 1. Validation: Name must not be empty and at least 2 characters long
        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Category name must be at least 2 characters long!'
            });
        }

        const trimmedName = name.trim();

        // 2. Validation: Prevent names that consist solely of numbers
        if (/^\d+$/.test(trimmedName)) {
            return res.status(400).json({
                success: false,
                message: 'Category name cannot contain only numbers!'
            });
        }

        // 3. Validation: Duplicate name check (case-insensitive)
        const [existing] = await pool.query(
            'SELECT id FROM specializations WHERE LOWER(name) = LOWER(?) AND id != ?',
            [trimmedName, id]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Category "${trimmedName}" already exists!`
            });
        }

        // 4. Perform database update
        const [result] = await pool.query(
            'UPDATE specializations SET name = ? WHERE id = ?',
            [trimmedName, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found!'
            });
        }

        res.status(200).json({
            success: true,
            message: `Category updated to "${trimmedName}" successfully!`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


module.exports = router;
