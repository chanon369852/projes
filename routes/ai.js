const express = require('express');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get study recommendations (ใช้เฉพาะ columns ที่มีใน schema จริง)
router.get('/study-recommendations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get tasks grouped by subject in JS (Supabase adapter ไม่รองรับ GROUP BY)
    const allTasks = await db.query(
      'SELECT * FROM tasks WHERE user_id = ?',
      [userId]
    );

    const subjectMap = {};
    allTasks.forEach(t => {
      if (!t.subject) return;
      if (!subjectMap[t.subject]) {
        subjectMap[t.subject] = { subject: t.subject, task_count: 0, completed: 0, pending: 0 };
      }
      subjectMap[t.subject].task_count++;
      if (t.status === 'completed') subjectMap[t.subject].completed++;
      else subjectMap[t.subject].pending++;
    });

    const subjects = Object.values(subjectMap)
      .sort((a, b) => b.task_count - a.task_count)
      .slice(0, 5);

    // study_sessions ยังไม่มี — ข้ามไป
    const studyTimes = [];

    // Generate recommendations
    const recommendations = [];

    if (subjects.length > 0) {
      const mostWork = subjects[0];
      recommendations.push({
        type: 'subject_focus',
        title: `โฟกัสที่วิชา ${mostWork.subject}`,
        message: `คุณมีงาน${mostWork.subject} ${mostWork.pending} งานที่ยังไม่เสร็จ`,
        priority: mostWork.pending > 3 ? 'high' : 'normal'
      });
    }

    const pendingTasks = allTasks.filter(t => t.status !== 'completed');
    if (pendingTasks.length > 5) {
      recommendations.push({
        type: 'workload',
        title: 'ภาระงานสูง',
        message: `คุณมี ${pendingTasks.length} งานที่ยังไม่เสร็จ แนะนำให้เริ่มทำงานที่ deadline ใกล้ที่สุดก่อน`,
        priority: 'high'
      });
    }

    res.json({
      subjects,
      optimal_times: studyTimes,
      recommendations
    });
  } catch (error) {
    console.error('Get study recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get productivity insights (ใช้ JS แทน MySQL functions)
router.get('/productivity-insights', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const allTasks = await db.query(
      'SELECT * FROM tasks WHERE user_id = ?',
      [userId]
    );

    // Completion trend (last 30 days) — group by date ใน JS
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendMap = {};
    allTasks
      .filter(t => new Date(t.created_at) >= thirtyDaysAgo)
      .forEach(t => {
        const date = new Date(t.created_at).toISOString().split('T')[0];
        if (!trendMap[date]) trendMap[date] = { date, created: 0, completed: 0 };
        trendMap[date].created++;
        if (t.status === 'completed') trendMap[date].completed++;
      });

    const completionTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    // Overall stats
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const totalTasks = allTasks.length;
    const completionRate = totalTasks > 0 ? ((completedTasks.length / totalTasks) * 100).toFixed(1) : 0;

    res.json({
      completion_trend: completionTrend,
      average_completion_time: { completion_rate: completionRate },
      productivity_by_day: [],
      total_tasks: totalTasks,
      completed_tasks: completedTasks.length
    });
  } catch (error) {
    console.error('Get productivity insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Generate optimal schedule
router.post('/generate-schedule', authMiddleware, async (req, res) => {
  try {
    const { tasks } = req.body;
    const userId = req.user.id;

    if (!tasks || tasks.length === 0) {
      return res.status(400).json({ error: 'No tasks provided' });
    }

    // Get existing schedule
    const existingSchedule = await db.query(
      `SELECT day_of_week, start_time, end_time FROM schedules WHERE user_id = ? AND is_active = TRUE`,
      [userId]
    );

    // Simple schedule generation
    const generatedSchedule = [];
    const days = [1, 2, 3, 4, 5]; // Monday to Friday

    tasks.forEach((task, index) => {
      const day = days[index % days.length];
      let startHour = 16; // Default after classes

      // Check for conflicts
      const conflicts = existingSchedule.filter(s =>
        s.day_of_week === day &&
        parseInt(String(s.start_time).split(':')[0]) <= startHour &&
        parseInt(String(s.end_time).split(':')[0]) > startHour
      );

      if (conflicts.length > 0) {
        startHour = Math.max(...conflicts.map(c => parseInt(String(c.end_time).split(':')[0]))) + 1;
      }

      const duration = 2; // default 2 hours

      generatedSchedule.push({
        task_id: task.id,
        task_title: task.title,
        day_of_week: day,
        start_time: `${startHour}:00`,
        end_time: `${startHour + duration}:00`,
        priority: task.priority
      });
    });

    res.json({
      suggested_schedule: generatedSchedule,
      total_tasks: tasks.length,
      message: 'ตารางแนะนำถูกสร้างขึ้นจากเวลาว่างหลังเรียน'
    });
  } catch (error) {
    console.error('Generate schedule error:', error);
    res.status(500).json({ error: 'Failed to generate schedule' });
  }
});

module.exports = router;
