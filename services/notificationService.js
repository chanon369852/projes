// Notification Service with Push Notifications
const db = require('../database/connection');

// Expo SDK — optional (ถ้าไม่ได้ติดตั้ง ใช้ fallback)
let Expo;
try {
  Expo = require('expo-server-sdk').Expo;
} catch (e) {
  Expo = null;
}

class NotificationService {
  constructor() {
    this.expo = Expo ? new Expo() : null;
  }

  // Send push notification to mobile devices
  async sendPushNotification(pushTokens, message) {
    if (!this.expo) return [];
    const messages = [];

    for (const pushToken of pushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) continue;

      messages.push({
        to: pushToken,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data || {},
        priority: 'high',
        badge: message.badge || 1,
      });
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Push notification error:', error);
      }
    }

    return tickets;
  }

  // Send notification to user (ใช้เฉพาะ columns ที่มีใน schema จริง)
  async notifyUser(userId, notification) {
    try {
      // 1. Save to database — เฉพาะ columns: user_id, type, title, message, is_read
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, is_read)
         VALUES (?, ?, ?, ?, FALSE)`,
        [userId, notification.type, notification.title, notification.message]
      );

      // 2. Get user's push tokens
      const tokens = await db.query(
        'SELECT push_token FROM user_devices WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      const pushTokens = tokens.map(t => t.push_token).filter(Boolean);

      // 3. Send push notification if tokens exist
      if (pushTokens.length > 0) {
        await this.sendPushNotification(pushTokens, {
          title: notification.title,
          body: notification.message,
          data: { type: notification.type },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Notify user error:', error);
      return { success: false, error: error.message };
    }
  }

  // Process notifications — ลบ scheduled_at/sent_at (ไม่มีใน schema)
  async processScheduledNotifications() {
    // Schema ปัจจุบันไม่มี scheduled_at/sent_at — ข้ามไป
    return { processed: 0 };
  }

  // Register device token (ใช้เฉพาะ columns ที่มีใน user_devices schema)
  async registerDevice(userId, pushToken, deviceInfo) {
    try {
      // Deactivate old tokens for this device
      await db.query(
        'UPDATE user_devices SET is_active = FALSE WHERE user_id = ? AND device_id = ?',
        [userId, deviceInfo.deviceId]
      );

      // Insert new token — เฉพาะ columns ที่มี: user_id, push_token, device_id, platform
      await db.query(
        `INSERT INTO user_devices (user_id, push_token, device_id, platform, is_active)
         VALUES (?, ?, ?, ?, TRUE)`,
        [userId, pushToken, deviceInfo.deviceId, deviceInfo.platform || 'unknown']
      );

      return { success: true };
    } catch (error) {
      console.error('Register device error:', error);
      return { success: false, error: error.message };
    }
  }

  // Unregister device
  async unregisterDevice(userId, deviceId) {
    try {
      await db.query(
        'UPDATE user_devices SET is_active = FALSE WHERE user_id = ? AND device_id = ?',
        [userId, deviceId]
      );
      return { success: true };
    } catch (error) {
      console.error('Unregister device error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get unread notifications for user
  async getUnreadNotifications(userId, limit = 20) {
    try {
      const notifications = await db.query(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, limit]
      );
      const unreadCount = await db.query(
        `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
        [userId]
      );
      return { notifications, unreadCount: unreadCount[0]?.count || 0 };
    } catch (error) {
      console.error('Get notifications error:', error);
      return { notifications: [], unreadCount: 0 };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Mark all as read
  async markAllAsRead(userId) {
    try {
      await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Notification creators
  async createTaskReminder(userId, task) {
    const hoursUntil = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60));
    return this.notifyUser(userId, {
      type: 'task_deadline',
      title: `⏰ แจ้งเตือน: ${task.title}`,
      message: `เหลือเวลาอีก ${hoursUntil} ชั่วโมง ก่อน deadline`,
    });
  }

  async createScheduleReminder(userId, schedule) {
    return this.notifyUser(userId, {
      type: 'schedule_reminder',
      title: `📚 ถึงเวลาเรียน: ${schedule.subject_name}`,
      message: `เริ่มในอีก 15 นาที ที่ ${schedule.building} ${schedule.room}`,
    });
  }

  async createStressAlert(userId, stressLevel) {
    return this.notifyUser(userId, {
      type: 'stress_warning',
      title: '⚠️ ความเครียดสูง',
      message: 'คุณมีภาระงานมาก ควรพักผ่อนให้เพียงพอ',
    });
  }

  async createFriendRequest(userId, fromUser) {
    return this.notifyUser(userId, {
      type: 'friend_request',
      title: '👥 คำขอเป็นเพื่อน',
      message: `${fromUser.full_name} ส่งคำขอเป็นเพื่อน`,
    });
  }

  async createExpenseAlert(userId, amount, budget) {
    const percent = (amount / budget) * 100;
    return this.notifyUser(userId, {
      type: 'expense_alert',
      title: '💰 แจ้งเตือนงบประมาณ',
      message: `คุณใช้เงินไปแล้ว ${percent.toFixed(0)}% ของงบประมาณรายเดือน`,
    });
  }
}

module.exports = new NotificationService();
