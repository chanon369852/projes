const express = require('express');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all friends (แก้ complex CASE WHEN JOIN → multi-step + merge ใน JS)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // ดึง friendships ที่ accepted
    const friendships = await db.query(
      `SELECT * FROM friends WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`,
      [userId, userId]
    );

    if (friendships.length === 0) return res.json({ friends: [] });

    // ดึง user IDs ของเพื่อน
    const friendIds = [...new Set(friendships.map(f =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    ))];

    // ดึงข้อมูล users ของเพื่อน
    const allUsers = await db.query('SELECT * FROM users WHERE is_active = TRUE', []);
    const userMap = {};
    allUsers.forEach(u => { userMap[u.id] = u; });

    // Merge ใน JS
    const friends = friendships.map(f => {
      const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      const friend = userMap[friendId] || {};
      return {
        friendship_id: f.id,
        status: f.status,
        requester_id: f.requester_id,
        addressee_id: f.addressee_id,
        accepted_at: f.accepted_at,
        friend_id: friendId,
        friend_student_id: friend.student_id,
        friend_name: friend.full_name,
        friend_nickname: friend.nickname,
        friend_avatar: friend.avatar_url,
        friend_faculty: friend.faculty,
        friend_major: friend.major
      };
    });

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

// Get pending friend requests
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const requests = await db.query(
      `SELECT * FROM friends WHERE addressee_id = ? AND status = 'pending'`,
      [req.user.id]
    );

    // ดึงข้อมูล requester
    const requesterIds = [...new Set(requests.map(r => r.requester_id))];
    let userMap = {};
    if (requesterIds.length > 0) {
      const users = await db.query('SELECT * FROM users WHERE is_active = TRUE', []);
      users.forEach(u => { userMap[u.id] = u; });
    }

    const result = requests.map(r => {
      const u = userMap[r.requester_id] || {};
      return {
        ...r,
        requester_name: u.full_name,
        requester_nickname: u.nickname,
        requester_student_id: u.student_id,
        requester_avatar: u.avatar_url,
        requester_faculty: u.faculty,
        requester_major: u.major
      };
    });

    res.json({ requests: result });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

// Send friend request
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { friend_id, message } = req.body;

    if (parseInt(friend_id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }

    // Check if friendship already exists
    const existing = await db.query(
      `SELECT * FROM friends 
       WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
      [req.user.id, friend_id, friend_id, req.user.id]
    );

    if (existing.length > 0) return res.status(409).json({ error: 'Friendship already exists' });

    const result = await db.query(
      `INSERT INTO friends (requester_id, addressee_id, message, status) VALUES (?, ?, ?, 'pending')`,
      [req.user.id, friend_id, message || null]
    );

    res.status(201).json({ message: 'Friend request sent', friendship_id: result.insertId });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept friend request — วางก่อน /:id
router.put('/accept/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE friends SET status = 'accepted', accepted_at = NOW() WHERE id = ? AND addressee_id = ?`,
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Friend request not found' });
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Share schedule with friend (ตาราง shared_schedules ยังไม่มี — คืน success เพื่อ UX)
router.post('/share-schedule', authMiddleware, async (req, res) => {
  try {
    const { friend_id } = req.body;

    // Check if they are friends
    const friendship = await db.query(
      `SELECT * FROM friends 
       WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
       AND status = 'accepted'`,
      [req.user.id, friend_id, friend_id, req.user.id]
    );

    if (friendship.length === 0) return res.status(403).json({ error: 'Must be friends to share schedule' });

    // ยังไม่ได้สร้างตาราง shared_schedules — ตอบกลับ success (เพื่อนสามารถดูตารางได้เพราะเป็นเพื่อนกัน)
    res.json({ message: 'Schedule shared successfully (friends can view each other schedules)' });
  } catch (error) {
    console.error('Share schedule error:', error);
    res.status(500).json({ error: 'Failed to share schedule' });
  }
});

// Get friend's schedule — วางก่อน /:id
router.get('/friend-schedule/:friendId', authMiddleware, async (req, res) => {
  try {
    const friendId = req.params.friendId;

    // ตรวจสอบว่าเป็นเพื่อนกัน (ไม่ใช้ shared_schedules เพราะตารางยังไม่มี)
    const friendship = await db.query(
      `SELECT * FROM friends 
       WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
       AND status = 'accepted'`,
      [req.user.id, friendId, friendId, req.user.id]
    );

    if (friendship.length === 0) return res.status(403).json({ error: 'Must be friends to view schedule' });

    const schedules = await db.query(
      `SELECT * FROM schedules WHERE user_id = ? AND is_active = TRUE ORDER BY day_of_week, start_time`,
      [friendId]
    );

    res.json({ permission: 'view', schedules, free_time: [] });
  } catch (error) {
    console.error('Get friend schedule error:', error);
    res.status(500).json({ error: 'Failed to get friend schedule' });
  }
});

// Reject/Remove friend
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM friends WHERE id = ? AND (requester_id = ? OR addressee_id = ?)`,
      [req.params.id, req.user.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Friendship not found' });
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

module.exports = router;
