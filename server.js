require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise'); // Using promise-based API

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10kb' })); // Limit payload size
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Cache for deactivated numbers
let deactivatedNumbersCache = [];
let cacheLastUpdated = 0;
const CACHE_TTL = 5000; // 5 seconds cache

// Middleware to verify database connection
app.use(async (req, res, next) => {
    try {
        await pool.getConnection();
        next();
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(503).json({ error: 'Service temporarily unavailable' });
    }
});

// Helper function for database queries
async function queryDB(sql, params) {
    const connection = await pool.getConnection();
    try {
        const [results] = await connection.query(sql, params);
        return results;
    } finally {
        connection.release();
    }
}

// Optimized endpoint with caching
app.get('/deactivated-numbers', async (req, res) => {
    try {
        // Return cached data if still fresh
        if (Date.now() - cacheLastUpdated < CACHE_TTL && deactivatedNumbersCache.length > 0) {
            return res.status(200).json(deactivatedNumbersCache);
        }

        const results = await queryDB(
            'SELECT deactivated_numbers FROM participants_wheel01 WHERE deactivated_numbers IS NOT NULL'
        );

        // Process and cache results
        deactivatedNumbersCache = results
            .flatMap(participant => 
                participant.deactivated_numbers
                    .split(',')
                    .map(Number)
                    .filter(num => !isNaN(num))
            .filter((num, index, self) => self.indexOf(num) === index)); // Deduplicate

        cacheLastUpdated = Date.now();
        res.status(200).json(deactivatedNumbersCache);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Optimized update endpoint
app.post('/update-deactivated-numbers', async (req, res) => {
    try {
        const { id, deactivatedNumbers } = req.body;

        if (!id || !deactivatedNumbers || !Array.isArray(deactivatedNumbers)) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        // Validate numbers are within range
        const validNumbers = deactivatedNumbers
            .map(Number)
            .filter(num => !isNaN(num) && num >= 1 && num <= 250);

        // Update cache immediately
        deactivatedNumbersCache = [...new Set([...deactivatedNumbersCache, ...validNumbers])];
        cacheLastUpdated = Date.now();

        await queryDB(
            'UPDATE participants_wheel01 SET deactivated_numbers = ? WHERE id = ?',
            [validNumbers.join(','), id]
        );

        res.status(200).json({ message: 'Deactivated numbers updated successfully' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Optimized form submission
app.post('/submit', async (req, res) => {
    try {
        const { nombre, boletos } = req.body;

        if (!nombre || !boletos || boletos < 1 || boletos > 250) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const [result] = await queryDB(
            'INSERT INTO participants_wheel01 (nombre, boletos) VALUES (?, ?)',
            [nombre, boletos]
        );

        res.status(200).json({
            message: 'Participant added successfully',
            participant: { id: result.insertId, nombre, boletos },
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Optimized tickets update
app.post('/update-tickets', async (req, res) => {
    try {
        const { id, tickets, total } = req.body;

        if (!id || !tickets || !total) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        await queryDB(
            'UPDATE participants_wheel01 SET tickets = ?, total = ? WHERE id = ?',
            [tickets, total, id]
        );

        res.status(200).json({ message: 'Tickets and total updated successfully' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Optimized participants endpoint
app.get('/participants', async (req, res) => {
    try {
        const results = await queryDB('SELECT * FROM participants_wheel01');
        res.status(200).json(results);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Cleanup on exit
process.on('SIGTERM', () => {
    pool.end();
    process.exit(0);
});

process.on('SIGINT', () => {
    pool.end();
    process.exit(0);
});