const express = require('express');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ✅ FIX: Static routes MUST come before /:id to avoid Express matching them as id params

// Get tasks by upcoming deadline — วางก่อน /:id
router.get('/filter/upcoming', authMiddleware, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const tasks = await db.query(
      `SELECT * FROM tasks 
       WHERE user_id = ? 
       AND status != 'completed'
       AND deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
       ORDER BY deadline ASC`,
      [req.user.id, parseInt(days)]
    );
    res.json({ tasks });
  } catch (error) {
    console.error('Get upcoming tasks error:', error);
    res.status(500).json({ error: 'Failed to get upcoming tasks' });
  }
});

// Get task statistics — วางก่อน /:id
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const allTasks = await db.query(
      'SELECT * FROM tasks WHERE user_id = ?',
      [req.user.id]
    );
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const overdue = allTasks.filter(t =>
      t.status !== 'completed' && new Date(t.deadline) < now
    ).length;
    const urgent = allTasks.filter(t =>
      t.status !== 'completed' &&
      new Date(t.deadline) >= now &&
      new Date(t.deadline) <= in3Days
    ).length;
    const highPriority = allTasks.filter(t =>
      ['high', 'urgent'].includes(t.priority) && t.status !== 'completed'
    ).length;

    res.json({
      stats: {
        total_tasks: total,
        completed_tasks: completed,
        overdue_tasks: overdue,
        urgent_tasks: urgent,
        high_priority_tasks: highPriority
      }
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ error: 'Failed to get task statistics' });
  }
});

// Get all tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, priority, subject, limit = 50 } = req.query;
    let sql = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [req.user.id];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (priority) { sql += ' AND priority = ?'; params.push(priority); }
    if (subject) { sql += ' AND subject = ?'; params.push(subject); }

    sql += ' ORDER BY deadline ASC, priority DESC LIMIT ?';
    params.push(parseInt(limit));

    const tasks = await db.query(sql, params);
    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get task by ID — /:id ต้องอยู่หลัง static routes
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const tasks = await db.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (tasks.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ task: tasks[0] });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// Create task
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, subject, deadline, priority } = req.body;
    if (!title || !deadline) return res.status(400).json({ error: 'title and deadline are required' });
    const result = await db.query(
      `INSERT INTO tasks (user_id, title, description, subject, deadline, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description || null, subject || null, deadline, priority || 'medium', 'pending']
    );
    res.status(201).json({ message: 'Task created successfully', task_id: result.insertId });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const updates = [];
    const values = [];
    // เฉพาะ column ที่มีใน schema จริง
    const allowedFields = ['title', 'description', 'subject', 'deadline', 'priority', 'status'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(taskId);
    values.push(req.user.id);
    await db.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
