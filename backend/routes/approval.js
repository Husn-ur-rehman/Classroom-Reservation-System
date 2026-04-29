const express = require('express');
const router = express.Router();
const pool = require('../db/pool.js');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// GET /api/approvals/pending - get all pending approvals (admin only)
router.get('/pending', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM PENDING_APPROVALS');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/approvals/:id - approve or reject a reservation (admin only)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, approved_by } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const result = await pool.query(
            `UPDATE APPROVAL_REQUEST 
             SET APPROVAL_STATUS = $1, APPROVED_BY = $2, APPROVAL_TIME = CURRENT_TIMESTAMP
             WHERE RESERVATION_ID = $3 AND APPROVAL_STATUS = 'pending'
             RETURNING *`,
            [status, approved_by, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pending approval not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/approvals/:reservation_id - get approval status for a reservation
router.get('/:reservation_id', verifyToken, async (req, res) => {
    const { reservation_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM APPROVAL_REQUEST WHERE RESERVATION_ID = $1`,
            [reservation_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Approval not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;