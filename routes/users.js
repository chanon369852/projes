const express = require('express');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Search users (for friend search) — วางก่อน /:id
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // ดึง users ทั้งหมด แล้ว filter ใน JS (Supabase adapter ไม่รองรับ LIKE)
    const allUsers = await db.query(
      `SELECT id, student_id, full_name, nickname, faculty, major, year, avatar_url
       FROM users WHERE is_active = TRUE`,
      []
    );

    const q = query.toLowerCase();
    const users = allUsers
      .filter(u => u.id !== req.user.id)
      .filter(u =>
        (u.student_id || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.nickname || '').toLowerCase().includes(q)
      )
      .slice(0, 20);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get user profile with stats — วางก่อน /:id
router.get('/:id/profile', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const users = await db.query(
      `SELECT id, student_id, full_name, nickname, faculty, major, year, university, avatar_url, created_at
       FROM users WHERE id = ? AND is_active = TRUE`,
      [userId]
    );

    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    // แยก query แต่ละอย่างแทน subquery (Supabase adapter ไม่รองรับ subquery ใน SELECT)
    const [completedTasks, activeSchedules, friendships] = await Promise.all([
      db.query(`SELECT * FROM tasks WHERE user_id = ? AND status = 'completed'`, [userId]),
      db.query(`SELECT * FROM schedules WHERE user_id = ? AND is_active = TRUE`, [userId]),
      db.query(
        `SELECT * FROM friends WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'`,
        [userId, userId]
      )
    ]);

    res.json({
      user: users[0],
      stats: {
        completed_tasks: completedTasks.length,
        total_subjects: activeSchedules.length,
        friend_count: friendships.length
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const users = await db.query(
      `SELECT id, student_id, full_name, nickname, faculty, major, year, university, avatar_url
       FROM users WHERE id = ? AND is_active = TRUE`,
      [req.params.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
