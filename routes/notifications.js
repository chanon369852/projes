const express = require('express');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Get all notifications for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const notifications = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    const unreadCount = await db.query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({
      notifications,
      unreadCount: unreadCount[0]?.count || 0,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: notifications.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Get unread notifications count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({ count: result[0]?.count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ 
      message: 'All notifications marked as read',
      markedCount: result.affectedRows,
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Register device for push notifications
router.post('/register-device', authMiddleware, async (req, res) => {
  try {
    const { pushToken, deviceId, platform, model } = req.body;

    if (!pushToken || !deviceId) {
      return res.status(400).json({ error: 'Push token and device ID required' });
    }

    const result = await notificationService.registerDevice(req.user.id, pushToken, {
      deviceId,
      platform,
      model,
    });

    if (result.success) {
      res.json({ message: 'Device registered successfully' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Unregister device
router.post('/unregister-device', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    const result = await notificationService.unregisterDevice(req.user.id, deviceId);

    if (result.success) {
      res.json({ message: 'Device unregistered successfully' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Unregister device error:', error);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
});

// Test notification (for development)
router.post('/test', authMiddleware, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test endpoint not available in production' });
  }

  try {
    const result = await notificationService.notifyUser(req.user.id, {
      type: 'test',
      title: '🧪 ทดสอบการแจ้งเตือน',
      message: 'นี่คือการทดสอบการแจ้งเตือน',
    });

    if (result.success) {
      res.json({ message: 'Test notification sent' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

module.exports = router;
