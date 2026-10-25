const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const fs = require('fs');
const {sanitizeText,isValidPositiveInt,isValidPhone,isValidEmail,isValidDate,isValidTime} = require('../middleware/validation');

// Original lines 674-695 | GET /api/analytics/doctors
router.get('/analytics/doctors', async (req, res) => {
    try {
        const query = `
            SELECT 
                d.id AS doctor_id,
                CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                s.name AS specialization,
                COUNT(a.id) AS total_consultations,
                fn_GetDoctorRevenue(d.id) AS total_revenue
            FROM doctors d
            JOIN specializations s ON d.specialization_id = s.id
            LEFT JOIN doctor_schedules ds ON d.id = ds.doctor_id
            LEFT JOIN appointments a ON ds.id = a.schedule_id AND a.status = 'Completed'
            GROUP BY d.id, d.first_name, d.last_name, s.name
            ORDER BY total_consultations DESC;
        `;
        const [rows] = await pool.query(query);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 845-876 | GET /api/ai/forecast
router.get('/ai/forecast', (req, res) => {
    try {
        const forecastPath = path.join(
            __dirname,
            'october_forecast.json'
        );

        if (!fs.existsSync(forecastPath)) {
            return res.status(404).json({
                success: false,
                message: 'Forecast file not found. Please copy october_forecast.json into the hospital-backend folder.'
            });
        }

        const forecast = JSON.parse(
            fs.readFileSync(forecastPath, 'utf8')
        );

        return res.status(200).json({
            success: true,
            message: 'AI patient visit forecast loaded successfully',
            data: forecast
        });
    } catch (error) {
        console.error('AI forecast error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to load AI forecast'
        });
    }
});


module.exports = router;
