require('dotenv').config(); // Load environment variables
 const express = require('express');
 const bodyParser = require('body-parser');
 const cors = require('cors');
 const path = require('path');
 const mysql = require('mysql2');
 
 const app = express();
 const PORT = process.env.PORT || 3000;
 
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
 
 // Endpoint to fetch deactivated numbers
 app.get('/deactivated-numbers', (req, res) => {
     const query = 'SELECT deactivated_numbers FROM participants_wheel01 WHERE deactivated_numbers IS NOT NULL';
     connection.query(query, (err, results) => {
         if (err) {
             console.error('Error fetching deactivated numbers:', err);
             return res.status(500).json({ error: 'Database error' });
         }
 
         // Combine all deactivated numbers into a single array
         const deactivatedNumbers = results
             .flatMap(participant => participant.deactivated_numbers.split(','))
             .map(Number);
 
         console.log('Deactivated numbers:', deactivatedNumbers);
         res.status(200).json(deactivatedNumbers);
     });
 });
 
 // Endpoint to update deactivated numbers
 app.post('/update-deactivated-numbers', (req, res) => {
     const { id, deactivatedNumbers } = req.body;
 
     // Validate input
     if (!id || !deactivatedNumbers) {
         return res.status(400).json({ error: 'Invalid input' });
     }
 
     // Update the participant's deactivated numbers in the database
     const query = 'UPDATE participants_wheel01 SET deactivated_numbers = ? WHERE id = ?';
     connection.query(query, [deactivatedNumbers.join(','), id], (err, results) => {
         if (err) {
             console.error('Error updating deactivated numbers:', err);
             return res.status(500).json({ error: 'Database error' });
         }
 
         console.log('Deactivated numbers updated:', results);
         res.status(200).json({ message: 'Deactivated numbers updated successfully' });
     });
 });
 
 // Endpoint to handle form submission
 app.post('/submit', (req, res) => {
     const { nombre, boletos } = req.body;
 
     // Validate input
     if (!nombre || !boletos || boletos < 1 || boletos > 250) {
         console.error('Invalid input:', { nombre, boletos });
         return res.status(400).json({ error: 'Invalid input' });
     }
 
     // Insert participant into the database
     const query = 'INSERT INTO participants_wheel01 (nombre, boletos) VALUES (?, ?)';
     connection.query(query, [nombre, boletos], (err, results) => {
         if (err) {
             console.error('Error inserting participant:', err);
             return res.status(500).json({ error: 'Database error' });
         }
 
         console.log('Participant added:', results);
         res.status(200).json({
             message: 'Participant added successfully',
             participant: { id: results.insertId, nombre, boletos },
         });
     });
 });
 
 // Endpoint to update tickets and total for a participant
 app.post('/update-tickets', (req, res) => {
     const { id, tickets, total } = req.body;
 
     // Validate input
     if (!id || !tickets || !total) {
         console.error('Invalid input:', { id, tickets, total });
         return res.status(400).json({ error: 'Invalid input' });
     }
 
     // Update the participant's tickets and total in the database
     const query = 'UPDATE participants_wheel01 SET tickets = ?, total = ? WHERE id = ?';
     connection.query(query, [tickets, total, id], (err, results) => {
         if (err) {
             console.error('Error updating tickets and total:', err);
             return res.status(500).json({ error: 'Database error' });
         }
 
         console.log('Tickets and total updated:', results);
         res.status(200).json({ message: 'Tickets and total updated successfully' });
     });
 });
 
 // Endpoint to get all participants (optional)
 app.get('/participants', (req, res) => {
     const query = 'SELECT * FROM participants_wheel01';
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