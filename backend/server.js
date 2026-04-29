const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = require('./db/pool.js');

pool.connect()
    .then(() => console.log('Connected to database'))
    .catch(err => console.error('Database connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/approvals', require('./routes/approvals'));

app.listen(process.env.PORT, () => {
    console.log(`Server running on http://localhost:${process.env.PORT}`);
});