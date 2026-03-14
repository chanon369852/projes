const express = require('express');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper: คำนวณ stress ใน JS
function calculateStress(taskCount, urgentCount) {
  const score = Math.min(100, (taskCount * 10) + (urgentCount * 20));
  const level = score <= 30 ? 'normal' : score <= 60 ? 'moderate' : 'high';
  return { stress_score: score, stress_level: level };
}

// Get current stress analysis
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // ✅ FIX: คำนวณ stress ใน JS แทน CALL CalculateStressScore
    const allTasks = await db.query(
      `SELECT * FROM tasks WHERE user_id = ? AND status != 'completed'`,
      [req.user.id]
    );
    const taskCount = allTasks.length;
    const urgentCount = allTasks.filter(t => {
      const d = new Date(t.deadline);
      return d >= now && d <= in3Days;
    }).length;

    const { stress_score, stress_level } = calculateStress(taskCount, urgentCount);

    // บันทึกหรืออัพเดท stress_analysis
    try {
      const existing = await db.query(
        'SELECT * FROM stress_analysis WHERE user_id = ? AND analysis_date = ?',
        [req.user.id, today]
      );
      if (existing.length === 0) {
        await db.query(
          `INSERT INTO stress_analysis (user_id, analysis_date, task_count, urgent_task_count, stress_score, stress_level)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [req.user.id, today, taskCount, urgentCount, stress_score, stress_level]
        );
      } else {
        await db.query(
          `UPDATE stress_analysis SET task_count = ?, urgent_task_count = ?, stress_score = ?, stress_level = ? WHERE id = ?`,
          [taskCount, urgentCount, stress_score, stress_level, existing[0].id]
        );
      }
    } catch (e) {
      console.warn('Could not save stress analysis:', e.message);
    }

    // Generate recommendations
    const recommendations = [];
    if (stress_level === 'high') {
      recommendations.push('⚠️ เริ่มทำงานที่ deadline ใกล้ที่สุดทันที');
      recommendations.push('💤 พักผ่อนอย่างน้อย 7-8 ชั่วโมง');
      recommendations.push('🧘 ออกกำลังกายเบาๆ เช่น โยคะหรือเดิน');
      recommendations.push('📋 แบ่งงานใหญ่ออกเป็นงานย่อยๆ');
    } else if (stress_level === 'moderate') {
      recommendations.push('📅 วางแผนทำงานตามลำดับความสำคัญ');
      recommendations.push('⏰ ใช้เทคนิค Pomodoro (25 นาทีทำงาน + 5 นาทีพัก)');
    } else {
      recommendations.push('🎯 รักษาจังหวะการทำงานที่ดีต่อไป');
      recommendations.push('📚 ใช้เวลาว่างเพิ่มทักษะใหม่ๆ');
    }

    res.json({
      stress_score,
      stress_level,
      task_count: taskCount,
      urgent_count: urgentCount,
      recommendations,
      date: today
    });
  } catch (error) {
    console.error('Get stress analysis error:', error);
    res.status(500).json({ error: 'Failed to get stress analysis' });
  }
});

// Get stress history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const history = await db.query(
      `SELECT analysis_date, stress_score, stress_level, task_count, urgent_task_count
       FROM stress_analysis
       WHERE user_id = ?
       ORDER BY analysis_date DESC`,
      [req.user.id]
    );

    // Filter by days in JS (Supabase adapter ไม่รองรับ DATE_SUB)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    const filtered = history.filter(h => new Date(h.analysis_date) >= cutoff);

    res.json({ history: filtered });
  } catch (error) {
    console.error('Get stress history error:', error);
    res.status(500).json({ error: 'Failed to get stress history' });
  }
});

// Manual stress calculation trigger
router.post('/calculate', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const allTasks = await db.query(
      `SELECT * FROM tasks WHERE user_id = ? AND status != 'completed'`,
      [req.user.id]
    );
    const taskCount = allTasks.length;
    const urgentCount = allTasks.filter(t => {
      const d = new Date(t.deadline);
      return d >= now && d <= in3Days;
    }).length;

    const { stress_score, stress_level } = calculateStress(taskCount, urgentCount);

    res.json({
      message: 'Stress score calculated',
      stress_score,
      stress_level,
      task_count: taskCount,
      urgent_count: urgentCount,
      date: today
    });
  } catch (error) {
    console.error('Calculate stress error:', error);
    res.status(500).json({ error: 'Failed to calculate stress score' });
  }
});

// Get workload breakdown
router.get('/workload', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const allTasks = await db.query(
      'SELECT * FROM tasks WHERE user_id = ?',
      [req.user.id]
    );

    const taskStats = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      pending: allTasks.filter(t => t.status !== 'completed').length,
      overdue: allTasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < now).length,
      urgent: allTasks.filter(t =>
        t.status !== 'completed' && new Date(t.deadline) >= now && new Date(t.deadline) <= in3Days
      ).length,
      high_priority: allTasks.filter(t =>
        ['high', 'urgent'].includes(t.priority) && t.status !== 'completed'
      ).length
    };

    const schedules = await db.query(
      'SELECT * FROM schedules WHERE user_id = ? AND is_active = TRUE',
      [req.user.id]
    );

    // Group schedule load by day
    const scheduleLoad = {};
    schedules.forEach(s => {
      if (!scheduleLoad[s.day_of_week]) {
        scheduleLoad[s.day_of_week] = { day_of_week: s.day_of_week, class_count: 0 };
      }
      scheduleLoad[s.day_of_week].class_count++;
    });

    // Free time (ตาราง free_time_slots ยังไม่มี — ใช้ค่าว่าง)
    const freeTime = [];

    res.json({
      tasks: taskStats,
      schedule_load: Object.values(scheduleLoad),
      free_time: freeTime
    });
  } catch (error) {
    console.error('Get workload error:', error);
    res.status(500).json({ error: 'Failed to get workload data' });
  }
});

module.exports = router;
