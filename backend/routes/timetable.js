const express = require('express');
const router = express.Router();

const pool = require('../db/pool.js');

// GET /api/timetable - all timetable entries
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM TIMETABLE_GRID');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/timetable?section_id=2A - filter by section
router.get('/section', async (req, res) => {
    const { section_id } = req.query;
    try {
        const result = await pool.query(
            'SELECT * FROM TIMETABLE_GRID WHERE SECTION_ID = $1',
            [section_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/timetable/room/:room_no - filter by room
router.get('/room/:room_no', async (req, res) => {
    const { room_no } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM TIMETABLE_GRID WHERE ROOM_NO = $1',
            [room_no]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;