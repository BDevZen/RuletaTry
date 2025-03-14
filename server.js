require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1); // Exit if the database connection fails
    }
    console.log('Connected to MySQL database');
});

// Endpoint to get deactivated numbers (numbers already assigned)
app.get('/deactivated-numbers', (req, res) => {
    const query = 'SELECT boletos FROM participants';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching deactivated numbers:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!results || results.length === 0) {
            // No participants found, return empty array
            return res.status(200).json([]);
        }

        // Extract all assigned numbers
        try {
            // Extract all assigned numbers, handling potential undefined boletos
            const deactivatedNumbers = results.flatMap(participant => {
                if (Array.isArray(participant.boletos)) {
                    return participant.boletos;
                } else {
                    console.warn('Participant has no or invalid boletos:', participant);
                    return []; // Skip invalid entries
                }
            });

            res.status(200).json(deactivatedNumbers);
        } catch (error) {
            console.error('Error processing results:', error);
            return res.status(500).json({ error: 'Error processing data', details: error.message });
        }
    });
});

// Endpoint to handle form submission
app.post('/submit', (req, res) => {
    const { nombre, boletos } = req.body;

    // Validate input
    if (!nombre || !boletos || boletos < 1 || boletos > 250) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    // Insert participant into the database
    const query = 'INSERT INTO participants (nombre, boletos) VALUES (?, ?)';
    connection.query(query, [nombre, boletos], (err, results) => {
        if (err) {
            console.error('Error inserting participant:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Respond with success
        res.status(200).json({
            message: 'Participant added successfully',
            participant: { id: results.insertId, nombre, boletos },
        });
    });
});

// Endpoint to get all participants (optional)
app.get('/participants', (req, res) => {
    const query = 'SELECT * FROM participants';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching participants:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json(results);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});