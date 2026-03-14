const express = require('express');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper: คำนวณ stress score ใน JavaScript แทน MySQL Stored Procedure
function calculateStress(pendingCount, urgentCount) {
  const score = Math.min(100, (pendingCount * 10) + (urgentCount * 20));
  const level = score <= 30 ? 'normal' : score <= 60 ? 'moderate' : 'high';
  return { stress_score: score, stress_level: level };
}

// Get dashboard data
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    // 1. Today's schedule
    const todaySchedule = await db.query(
      `SELECT * FROM schedules 
       WHERE user_id = ? AND day_of_week = ? AND is_active = TRUE
       ORDER BY start_time`,
      [userId, new Date().getDay()]
    );

    // 2. Upcoming tasks (next 7 days)
    const upcomingTasks = await db.query(
      `SELECT * FROM tasks 
       WHERE user_id = ? AND status != 'completed'
       AND deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
       ORDER BY deadline ASC
       LIMIT 5`,
      [userId]
    );

    // 3. Urgent tasks (within 3 days)
    const urgentTasks = await db.query(
      `SELECT * FROM tasks 
       WHERE user_id = ? AND status != 'completed'
       AND deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
       ORDER BY deadline ASC`,
      [userId]
    );

    // 4. Task statistics
    const allUserTasks = await db.query(
      'SELECT * FROM tasks WHERE user_id = ?',
      [userId]
    );
    const now = new Date();
    const taskStats = {
      total: allUserTasks.length,
      completed: allUserTasks.filter(t => t.status === 'completed').length,
      pending: allUserTasks.filter(t => t.status !== 'completed').length,
      overdue: allUserTasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < now).length
    };

    // 5. ✅ FIX: คำนวณ stress ใน JS แทน CALL CalculateStressScore (MySQL Stored Procedure)
    const stressResult = calculateStress(taskStats.pending, urgentTasks.length);

    // 6. Monthly expense data
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const allExpenses = await db.query(
      `SELECT * FROM expenses WHERE user_id = ?`,
      [userId]
    );
    const monthlyExpenses = allExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
    });
    const totalExpense = monthlyExpenses
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalIncome = monthlyExpenses
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    // 7. Categories (fetch separately, merge in JS — Supabase adapter ไม่รองรับ JOIN)
    const allCategories = await db.query(
      'SELECT * FROM expense_categories WHERE is_default = TRUE OR user_id = ?',
      [userId]
    );
    const catMap = {};
    allCategories.forEach(c => { catMap[c.id] = c; });

    const expensesByCategory = {};
    monthlyExpenses.filter(e => e.type === 'expense').forEach(e => {
      const cat = catMap[e.category_id];
      const catName = cat?.name || 'อื่นๆ';
      if (!expensesByCategory[catName]) {
        expensesByCategory[catName] = {
          name: catName,
          color: cat?.color || '#6B7280',
          icon: cat?.icon || 'wallet',
          total: 0
        };
      }
      expensesByCategory[catName].total += parseFloat(e.amount || 0);
    });

    // 8. User budget
    const userInfo = await db.query('SELECT monthly_budget, full_name FROM users WHERE id = ?', [userId]);
    const budget = parseFloat(userInfo[0]?.monthly_budget || 5000);

    // 9. Free time slots (ตาราง free_time_slots ยังไม่มี — ใช้ค่าว่าง)
    const freeTime = [];

    // 10. Shared schedules (ตาราง shared_schedules ยังไม่มี — ใช้ค่าว่าง)
    const sharedWithMe = [];

    // 11. Unread notifications
    const notifications = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? AND is_read = FALSE
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    // 12. AI Suggestions
    const suggestions = [];

    if (urgentTasks.length > 0) {
      const nextTask = urgentTasks[0];
      const hoursUntil = Math.ceil((new Date(nextTask.deadline) - now) / (1000 * 60 * 60));
      suggestions.push({
        type: 'urgent_task',
        title: `ทำงาน "${nextTask.title}" ด่วน!`,
        message: `เหลือเวลาอีก ${hoursUntil} ชั่วโมง ก่อน deadline`,
        action: `/tasks/${nextTask.id}`,
        priority: 'high'
      });
    }

    if (stressResult.stress_level === 'high') {
      suggestions.push({
        type: 'stress_warning',
        title: 'ความเครียดสูง',
        message: 'คุณมีภาระงานมาก ควรพักผ่อนให้เพียงพอ',
        action: '/stress',
        priority: 'high'
      });
    }

    if (totalExpense > budget * 0.8) {
      suggestions.push({
        type: 'expense_warning',
        title: 'ใกล้เกินงบประมาณ',
        message: `ใช้เงินไปแล้ว ${((totalExpense / budget) * 100).toFixed(0)}% ของงบประมาณรายเดือน`,
        action: '/expenses',
        priority: 'medium'
      });
    }

    res.json({
      greeting: getGreeting(currentHour),
      user: { id: userId, name: userInfo[0]?.full_name || '' },
      today: {
        date: today,
        day_name: getDayName(new Date().getDay()),
        schedule: todaySchedule,
        schedule_count: todaySchedule.length,
        free_time: freeTime
      },
      tasks: {
        upcoming: upcomingTasks,
        urgent: urgentTasks,
        urgent_count: urgentTasks.length,
        stats: taskStats
      },
      stress: {
        score: stressResult.stress_score,
        level: stressResult.stress_level,
        max_score: 100
      },
      expenses: {
        summary: {
          total_expense: totalExpense,
          total_income: totalIncome,
          balance: totalIncome - totalExpense,
          transaction_count: monthlyExpenses.length
        },
        by_category: Object.values(expensesByCategory).sort((a, b) => b.total - a.total).slice(0, 5),
        budget,
        remaining: budget - totalExpense
      },
      friends: { shared_schedules: sharedWithMe, shared_count: sharedWithMe.length },
      notifications: { unread: notifications, unread_count: notifications.length },
      ai_suggestions: suggestions
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

function getGreeting(hour) {
  if (hour < 12) return 'สวัสดีตอนเช้า';
  if (hour < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

function getDayName(dayIndex) {
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  return days[dayIndex];
}

module.exports = router;
