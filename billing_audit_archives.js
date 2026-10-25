const express = require('express');
const router = express.Router();
const pool = require('../db');
const {sanitizeText,isValidPositiveInt,isValidPhone,isValidEmail,isValidDate,isValidTime} = require('../middleware/validation');

// Original lines 622-642 | GET /api/bills
router.get('/bills', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vw_patient_billing_details ORDER BY bill_id DESC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        try {
            const [fallback] = await pool.query(`
                SELECT b.id AS bill_id, b.appointment_id, 
                       CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                       b.total_amount, b.status, b.payment_method, b.issued_at
                FROM bills b
                JOIN appointments a ON b.appointment_id = a.id
                JOIN patients p ON a.patient_id = p.id
                ORDER BY b.id DESC
            `);
            res.status(200).json({ success: true, data: fallback });
        } catch (fbErr) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
});

// Original lines 645-667 | PUT /api/bills/:id/pay
router.put('/bills/:id/pay', async (req, res) => {
    const billId = req.params.id;
    if (!isValidPositiveInt(billId)) {
        return res.status(400).json({ success: false, message: 'Invalid Bill ID' });
    }

    const { payment_method } = req.body;
    const validMethods = ['Cash', 'Card', 'Online'];
    const selectedMethod = validMethods.includes(payment_method) ? payment_method : 'Cash';

    try {
        const [result] = await pool.execute(
            'UPDATE bills SET status = "Paid", payment_method = ? WHERE id = ?',
            [selectedMethod, billId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Bill සොයාගත නොහැකි විය.' });
        }
        res.status(200).json({ success: true, message: 'Payment completed!' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Original lines 725-732 | GET /api/audit-logs
router.get('/audit-logs', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY changed_at DESC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 898-910 | GET /api/views/deleted-patients
router.get('/views/deleted-patients', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, first_name, last_name, dob, gender, contact_number, email, address, is_active
            FROM patients 
            WHERE is_active = 0 
            ORDER BY id DESC
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Original lines 919-933 | GET /api/views/deleted-doctors
router.get('/views/deleted-doctors', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.id, d.first_name, d.last_name, s.name AS specialization, 
                   d.consultation_fee, d.contact_number, d.email, d.is_active
            FROM doctors d
            JOIN specializations s ON d.specialization_id = s.id
            WHERE d.is_active = 0
            ORDER BY d.id DESC
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


module.exports = router;
