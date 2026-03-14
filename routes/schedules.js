const express = require('express');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all schedules for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { semester, academic_year, day_of_week } = req.query;
    let sql = 'SELECT * FROM schedules WHERE user_id = ? AND is_active = TRUE';
    const params = [req.user.id];

    if (semester) {
      sql += ' AND semester = ?';
      params.push(semester);
    }
    if (academic_year) {
      sql += ' AND academic_year = ?';
      params.push(academic_year);
    }
    if (day_of_week !== undefined) {
      sql += ' AND day_of_week = ?';
      params.push(day_of_week);
    }

    sql += ' ORDER BY day_of_week, start_time';

    const schedules = await db.query(sql, params);
    res.json({ schedules });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to get schedules' });
  }
});

// Get schedule by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const schedules = await db.query(
      'SELECT * FROM schedules WHERE id = ? AND user_id = ? AND is_active = TRUE',
      [req.params.id, req.user.id]
    );

    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ schedule: schedules[0] });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Failed to get schedule' });
  }
});

// Create schedule
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      subject_code, subject_name, teacher, building, room,
      day_of_week, start_time, end_time, color
    } = req.body;

    // Check for conflicts
    const conflicts = await db.query(
      `SELECT * FROM schedules 
       WHERE user_id = ? AND day_of_week = ? AND is_active = TRUE
       AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))`,
      [req.user.id, day_of_week, start_time, start_time, end_time, end_time]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Schedule conflict detected',
        conflicts: conflicts
      });
    }

    const result = await db.query(
      `INSERT INTO schedules 
       (user_id, subject_code, subject_name, teacher, building, room, 
        day_of_week, start_time, end_time, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, subject_code, subject_name, teacher, building, room,
        day_of_week, start_time, end_time, color || '#3B82F6']
    );

    res.status(201).json({
      message: 'Schedule created successfully',
      schedule_id: result.insertId
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Update schedule
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const updates = [];
    const values = [];
    const allowedFields = ['subject_code', 'subject_name', 'teacher', 'building', 'room',
      'day_of_week', 'start_time', 'end_time', 'color'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Check if schedule exists
    const existing = await db.query(
      'SELECT * FROM schedules WHERE id = ? AND user_id = ?',
      [scheduleId, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    values.push(scheduleId);
    values.push(req.user.id);
    await db.query(
      `UPDATE schedules SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    res.json({ message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Delete schedule (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE schedules SET is_active = FALSE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Get weekly schedule
router.get('/view/weekly', authMiddleware, async (req, res) => {
  try {
    const { week_start } = req.query;
    const schedules = await db.query(
      `SELECT s.*, 
        CASE s.day_of_week
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
          WHEN 0 THEN 'Sunday'
        END as day_name
       FROM schedules s
       WHERE s.user_id = ? AND s.is_active = TRUE
       ORDER BY s.day_of_week, s.start_time`,
      [req.user.id]
    );

    // Group by day
    const weekly = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };
    schedules.forEach(s => {
      weekly[s.day_of_week].push(s);
    });

    res.json({
      week_start: week_start || new Date().toISOString().split('T')[0],
      weekly_schedule: weekly
    });
  } catch (error) {
    console.error('Get weekly schedule error:', error);
    res.status(500).json({ error: 'Failed to get weekly schedule' });
  }
});

module.exports = router;
