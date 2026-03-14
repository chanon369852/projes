const express = require('express');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// AI Assistant Logic
const AI_ASSISTANT = {
  // Analyze user context from database
  async getUserContext(userId) {
    try {
      // Get today's schedule
      const today = new Date().getDay();
      const schedules = await db.query(
        `SELECT * FROM schedules 
         WHERE user_id = ? AND day_of_week = ? AND is_active = TRUE
         ORDER BY start_time`,
        [userId, today]
      );

      // Get pending tasks
      const tasks = await db.query(
        `SELECT * FROM tasks 
         WHERE user_id = ? AND status != 'completed'
         ORDER BY deadline ASC
         LIMIT 10`,
        [userId]
      );

      // Get urgent tasks (within 3 days)
      const urgentTasks = tasks.filter(t => {
        const deadline = new Date(t.deadline);
        const now = new Date();
        const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        return diffDays <= 3 && diffDays >= 0;
      });

      // Get recent expenses (filter 7 days in JS instead of DATE_SUB)
      const allExpenses = await db.query(
        `SELECT * FROM expenses WHERE user_id = ?`,
        [userId]
      );
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const expenses = allExpenses
        .filter(e => new Date(e.date) >= sevenDaysAgo)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      // free_time_slots ไม่มีใน schema — ใช้ค่าว่าง

      return {
        todaySchedule: schedules,
        pendingTasks: tasks,
        urgentTasks,
        recentExpenses: expenses,
        freeTimeSlots: [],
        currentTime: new Date()
      };
    } catch (error) {
      console.error('Get user context error:', error);
      return null;
    }
  },

  // Generate study plan based on context
  async generateStudyPlan(context, subject, duration) {
    const { todaySchedule, freeTimeSlots, urgentTasks } = context;
    const hours = duration || 2;
    
    // Find available slots
    let suggestions = [];
    
    if (freeTimeSlots.length > 0) {
      // Suggest free time slots
      const suitableSlots = freeTimeSlots
        .filter(slot => slot.duration_minutes >= hours * 60)
        .slice(0, 3);
      
      suitableSlots.forEach(slot => {
        suggestions.push({
          date: slot.date,
          start: slot.start_time,
          end: slot.end_time,
          duration: `${Math.floor(slot.duration_minutes / 60)}h ${slot.duration_minutes % 60}m`
        });
      });
    }

    if (suggestions.length === 0) {
      // Suggest times after classes
      const busyHours = todaySchedule.map(s => ({
        start: parseInt(s.start_time.split(':')[0]),
        end: parseInt(s.end_time.split(':')[0])
      }));
      
      const suggestedTimes = [19, 20, 14]; // Evening and afternoon options
      for (const time of suggestedTimes) {
        const isBusy = busyHours.some(h => time >= h.start && time < h.end);
        if (!isBusy) {
          suggestions.push({
            date: 'today',
            start: `${time}:00`,
            end: `${time + hours}:00`,
            duration: `${hours} hours`
          });
          break;
        }
      }
    }

    return suggestions;
  },

  // Analyze workload and provide recommendations
  async analyzeWorkload(context) {
    const { pendingTasks, urgentTasks, todaySchedule } = context;
    
    const totalTasks = pendingTasks.length;
    const urgentCount = urgentTasks.length;
    const todayClasses = todaySchedule.length;
    
    let analysis = {
      workloadLevel: 'normal',
      stressScore: 0,
      recommendations: [],
      warnings: []
    };

    // Calculate stress score
    analysis.stressScore = (totalTasks * 10) + (urgentCount * 20);
    
    if (analysis.stressScore > 80) {
      analysis.workloadLevel = 'high';
      analysis.warnings.push('คุณมีภาระงานสูงมาก ควรพักผ่อนให้เพียงพอ');
      analysis.recommendations.push('เริ่มทำงานที่ deadline ใกล้ที่สุดทันที');
      analysis.recommendations.push('แบ่งงานใหญ่เป็นงานย่อยๆ');
    } else if (analysis.stressScore > 50) {
      analysis.workloadLevel = 'moderate';
      analysis.recommendations.push('วางแผนทำงานตามลำดับความสำคัญ');
    }

    if (todayClasses > 4) {
      analysis.recommendations.push('วันนี้เรียนหนัก ควรพักระหว่างคาบ');
    }

    return analysis;
  }
};

// Get all conversations
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await db.query(
      `SELECT * FROM chat_conversations 
       WHERE user_id = ? AND is_active = TRUE
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Create new conversation
router.post('/conversations', authMiddleware, async (req, res) => {
  try {
    const { title, context_type } = req.body;
    
    const result = await db.query(
      `INSERT INTO chat_conversations (user_id, title, context_type)
       VALUES (?, ?, ?)`,
      [req.user.id, title || 'New Chat', context_type || 'general']
    );

    // Add welcome message
    await db.query(
      `INSERT INTO chat_messages (conversation_id, role, message, action_type)
       VALUES (?, ?, ?, ?)`,
      [result.insertId, 'ai', 'สวัสดี! ฉันเป็น AI Assistant ที่จะช่วยคุณวางแผนการเรียนและชีวิตประจำวัน คุณต้องการให้ฉันช่วยอะไรครับ?', 'general']
    );

    res.status(201).json({
      conversation_id: result.insertId,
      message: 'Conversation created'
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages in conversation
router.get('/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    // Verify ownership
    const conversations = await db.query(
      'SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await db.query(
      `SELECT * FROM chat_messages 
       WHERE conversation_id = ?
       ORDER BY created_at ASC`,
      [req.params.id]
    );

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message and get AI response
router.post('/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const conversationId = req.params.id;

    // Verify ownership
    const conversations = await db.query(
      'SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?',
      [conversationId, req.user.id]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Save user message
    await db.query(
      `INSERT INTO chat_messages (conversation_id, role, message, action_type)
       VALUES (?, ?, ?, ?)`,
      [conversationId, 'user', message, 'general']
    );

    // Get user context
    const context = await AI_ASSISTANT.getUserContext(req.user.id);

    // Generate AI response based on message content
    let aiResponse = '';
    let actionType = 'general';
    let metadata = {};

    const lowerMessage = message.toLowerCase();

    // Analyze message intent
    if (lowerMessage.includes('อ่านหนังสือ') || lowerMessage.includes('เรียน') || lowerMessage.includes('สอบ')) {
      // Study planning request
      const subject = message.match(/วิชา?\s*(\S+)/)?.[1] || 'ทั่วไป';
      const suggestions = await AI_ASSISTANT.generateStudyPlan(context, subject);
      
      actionType = 'study_plan';
      metadata = { suggestions, subject };
      
      if (suggestions.length > 0) {
        aiResponse = `นี่คือช่วงเวลาที่แนะนำสำหรับการอ่านหนังสือ${subject}:\n\n`;
        suggestions.forEach((slot, i) => {
          aiResponse += `${i + 1}. ${slot.date === 'today' ? 'วันนี้' : slot.date} ${slot.start} - ${slot.end} (${slot.duration})\n`;
        });
        aiResponse += `\nคุณต้องการให้ฉันช่วยวางแผนเพิ่มเติมไหมครับ?`;
      } else {
        aiResponse = 'ขออภัย ฉันไม่พบช่วงเวลาว่างในระบบ คุณอาจต้องปรับตารางเรียนหรือตรวจสอบเวลาว่างของคุณ';
      }
    } else if (lowerMessage.includes('ภาระงาน') || lowerMessage.includes('เครียด') || lowerMessage.includes('เหนื่อย')) {
      // Workload analysis
      const analysis = await AI_ASSISTANT.analyzeWorkload(context);
      
      actionType = 'stress_alert';
      metadata = analysis;
      
      aiResponse = `วิเคราะห์ภาระงานของคุณ:\n\n`;
      aiResponse += `- จำนวนงานรอทำ: ${context.pendingTasks.length} งาน\n`;
      aiResponse += `- งานเร่งด่วน (3 วัน): ${context.urgentTasks.length} งาน\n`;
      aiResponse += `- เรียนวันนี้: ${context.todaySchedule.length} คาบ\n`;
      aiResponse += `- ระดับความเครียด: ${analysis.workloadLevel} (คะแนน: ${analysis.stressScore})\n\n`;
      
      if (analysis.warnings.length > 0) {
        aiResponse += `⚠️ ${analysis.warnings.join('\n')}\n\n`;
      }
      
      aiResponse += `💡 คำแนะนำ:\n${analysis.recommendations.map(r => `- ${r}`).join('\n')}`;
    } else if (lowerMessage.includes('ตาราง') || lowerMessage.includes('เวลา')) {
      // Schedule info
      actionType = 'schedule_suggestion';
      
      if (context.todaySchedule.length > 0) {
        aiResponse = `ตารางเรียนวันนี้ของคุณ:\n\n`;
        context.todaySchedule.forEach(s => {
          aiResponse += `📚 ${s.subject_name}\n`;
          aiResponse += `   เวลา: ${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}\n`;
          aiResponse += `   ห้อง: ${s.building || '-'} ${s.room || '-'}\n\n`;
        });
      } else {
        aiResponse = 'วันนี้คุณไม่มีตารางเรียน เป็นวันที่ดีสำหรับการอ่านหนังสือหรือทำงาน! 🎉';
      }
    } else if (lowerMessage.includes('เงิน') || lowerMessage.includes('ใช้จ่าย') || lowerMessage.includes('ค่าใช้จ่าย')) {
      // Expense advice
      actionType = 'expense_advice';
      
      const totalExpense = context.recentExpenses
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      aiResponse = `สรุปการใช้จ่าย 7 วันที่ผ่านมา:\n\n`;
      aiResponse += `💸 รายจ่ายรวม: ฿${totalExpense.toFixed(2)}\n`;
      aiResponse += `📊 จำนวนรายการ: ${context.recentExpenses.length} รายการ\n\n`;
      aiResponse += `คำแนะนำ: ติดตามการใช้จ่ายอย่างสม่ำเสมอและตั้งงบประมาณรายเดือนเพื่อควบคุมการเงิน`;
    } else {
      // General response
      aiResponse = `เข้าใจครับ! คุณสามารถถามฉันได้หลายอย่าง เช่น:\n\n`;
      aiResponse += `- "ช่วยวางแผนอ่านหนังสือ Database"\n`;
      aiResponse += `- "ตรวจสอบภาระงานของฉัน"\n`;
      aiResponse += `- "ดูตารางเรียนวันนี้"\n`;
      aiResponse += `- "สรุปการใช้จ่าย"\n\n`;
      aiResponse += `คุณต้องการให้ช่วยอะไรครับ?`;
    }

    // Save AI response
    await db.query(
      `INSERT INTO chat_messages (conversation_id, role, message, action_type)
       VALUES (?, ?, ?, ?)`,
      [conversationId, 'ai', aiResponse, actionType]
    );

    // chat_conversations updated_at update logic simplified or removed
    // Since we don't have updated_at, we just let it be.

    res.json({
      message: aiResponse,
      action_type: actionType,
      metadata
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Quick ask endpoint (no conversation history)
router.post('/quick-ask', authMiddleware, async (req, res) => {
  try {
    const { question } = req.body;
    const context = await AI_ASSISTANT.getUserContext(req.user.id);
    
    // Simple response logic
    let response = '';
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('สอบ') || lowerQ.includes('อ่านหนังสือ')) {
      const suggestions = await AI_ASSISTANT.generateStudyPlan(context, null, 2);
      response = suggestions.length > 0 
        ? `แนะนำอ่านหนังสือช่วง ${suggestions[0].start} - ${suggestions[0].end} ครับ`
        : 'ตรวจสอบตารางเรียนและเวลาว่างของคุณก่อนนะครับ';
    } else if (lowerQ.includes('เครียด')) {
      const analysis = await AI_ASSISTANT.analyzeWorkload(context);
      response = analysis.workloadLevel === 'high' 
        ? 'คุณมีภาระงานสูง ควรพักผ่อนและเริ่มทำงานที่สำคัญที่สุดก่อน'
        : 'ภาระงานของคุณอยู่ในระดับปกติ ทำตามแผนที่วางไว้ได้เลยครับ';
    } else {
      response = 'ฉันพร้อมช่วยเหลือ! ลองถามเกี่ยวกับการวางแผนเรียน ตารางเวลา หรือภาระงานดูครับ';
    }

    res.json({ response, context_type: 'quick' });
  } catch (error) {
    console.error('Quick ask error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

module.exports = router;
