const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const {sanitizeText,isValidPositiveInt,isValidPhone,isValidEmail,isValidDate,isValidTime} = require('../middleware/validation');

// Original lines 739-771 | POST /api/auth/register
router.post('/auth/register', async (req, res) => {
    const username = sanitizeText(req.body.username);
    const password = req.body.password;
    const role = 'app_user'; // Public signup cannot choose elevated roles.

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({success:false,message:'Password must be at least 8 characters'});
    if (username.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters long' });
    }

    try {
        const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.execute(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );

        res.status(201).json({ success: true, message: 'User registered successfully! Please log in.' });
    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).json({ success: false, message: 'Unable to register account' });
    }
});

// Original lines 774-809 | POST /api/auth/login
router.post('/auth/login', async (req, res) => {
    const username = sanitizeText(req.body.username);
    const password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {
        const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            success: true,
            token,
            role: user.role,
            username: user.username
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Original lines 815-837 | GET /api/health
router.get('/health', async (req, res) => {
    try {
        const startTime = Date.now();
        await pool.query('SELECT 1 + 1 AS health_check');
        const latencyMs = Date.now() - startTime;

        res.status(200).json({
            success: true,
            status: 'HEALTHY',
            engine: 'MySQL InnoDB (ACID)',
            connectionPool: 'Active (10 Max)',
            latencyMs: latencyMs + 'ms',
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'UNHEALTHY',
            error: error.message
        });
    }
});


module.exports = router;
