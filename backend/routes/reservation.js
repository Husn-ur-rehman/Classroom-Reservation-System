const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/reservations?staff_id=1 - get reservations by staff
router.get('/', verifyToken, async (req, res) => {
    const { staff_id } = req.query;
    try {
        const result = await pool.query(
            `SELECT R.*, TS.STARTING_TIME, TS.ENDING_TIME, AR.APPROVAL_STATUS
            FROM RESERVATION R
            JOIN TIMESLOT TS ON R.TIMESLOT_ID = TS.SLOT_ID
            LEFT JOIN APPROVAL_REQUEST AR ON R.RESERVATION_ID = AR.RESERVATION_ID
            WHERE R.CREATED_BY = $1
            ORDER BY R.RESERVED_DATE DESC`,
            [staff_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/reservations - create new reservation
router.post('/', verifyToken, async (req, res) => {
    const { reserved_date, room_id, timeslot_id, section_id, created_by } = req.body;

    try {
        // Check if room is already reserved for that slot and date
        const conflict = await pool.query(
            `SELECT R.RESERVATION_ID FROM RESERVATION R
             JOIN APPROVAL_REQUEST AR ON R.RESERVATION_ID = AR.RESERVATION_ID
             WHERE R.ROOM_ID = $1 
             AND R.TIMESLOT_ID = $2 
             AND R.RESERVED_DATE = $3
             AND AR.APPROVAL_STATUS = 'approved'`,
            [room_id, timeslot_id, reserved_date]
        );

        if (conflict.rows.length > 0) {
            return res.status(409).json({ error: 'Room already reserved for this slot' });
        }

        // Insert reservation
        const result = await pool.query(
            `INSERT INTO RESERVATION (RESERVED_DATE, ROOM_ID, TIMESLOT_ID, CREATED_BY, SECTION_ID)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [reserved_date, room_id, timeslot_id, created_by, section_id]
        );

        const reservation = result.rows[0];

        // Auto-create approval request with pending status
        await pool.query(
            `INSERT INTO APPROVAL_REQUEST (APPROVAL_STATUS, RESERVATION_ID) VALUES ('pending', $1)`,
            [reservation.reservation_id]
        );

        res.status(201).json(reservation);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/reservations/:id/cancel - cancel a pending reservation
router.put('/:id/cancel', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(
            `UPDATE APPROVAL_REQUEST SET APPROVAL_STATUS = 'rejected'
             WHERE RESERVATION_ID = $1 AND APPROVAL_STATUS = 'pending'`,
            [id]
        );
        res.json({ message: 'Reservation cancelled' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/reservations/available - get available rooms for slot+day+date
router.get('/available', verifyToken, async (req, res) => {
    const { slot_id, day_no, reserved_date } = req.query;
    try {
        const result = await pool.query(
            `SELECT C.ROOM_NO FROM CLASSROOM C
             WHERE C.ROOM_NO NOT IN (
                SELECT T.ROOM_NO FROM TIMETABLE T
                WHERE T.SLOT_ID = $1 AND T.DAY_NO = $2
             )
             AND C.ROOM_NO NOT IN (
                SELECT R.ROOM_ID FROM RESERVATION R
                JOIN APPROVAL_REQUEST AR ON R.RESERVATION_ID = AR.RESERVATION_ID
                WHERE R.TIMESLOT_ID = $1
                AND R.RESERVED_DATE = $3
                AND AR.APPROVAL_STATUS = 'approved'
             )`,
            [slot_id, day_no, reserved_date]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;