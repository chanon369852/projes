const axios = require('axios');
const db = require('../database/connection');

// Advanced AI Service with OpenAI Integration
class AdvancedAIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.useOpenAI = !!this.openaiApiKey;
  }

  // Get comprehensive user context for AI
  async getUserContext(userId) {
    try {
      const [
        userProfile,
        schedules,
        tasks,
        expenses,
        stressAnalysis,
        studySessions,
        friends,
      ] = await Promise.all([
        db.query('SELECT * FROM users WHERE id = ?', [userId]),
        db.query(
          `SELECT * FROM schedules 
           WHERE user_id = ? AND is_active = TRUE 
           AND day_of_week BETWEEN 0 AND 6
           ORDER BY day_of_week, start_time`,
          [userId]
        ),
        db.query(
          `SELECT * FROM tasks 
           WHERE user_id = ? AND status != 'completed'
           ORDER BY deadline ASC`,
          [userId]
        ),
        db.query(
          `SELECT * FROM expenses 
           WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           ORDER BY date DESC`,
          [userId]
        ),
        db.query(
          `SELECT * FROM stress_analysis 
           WHERE user_id = ? AND analysis_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
           ORDER BY analysis_date DESC`,
          [userId]
        ),
        db.query(
          `SELECT * FROM study_sessions 
           WHERE user_id = ? AND actual_start >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
           ORDER BY actual_start DESC`,
          [userId]
        ),
        db.query(
          `SELECT f.*, u.full_name, u.student_id
           FROM friends f
           JOIN users u ON (f.requester_id = u.id OR f.addressee_id = u.id)
           WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
           AND u.id != ?`,
          [userId, userId, userId]
        ),
      ]);

      return {
        profile: userProfile[0],
        schedules: schedules || [],
        tasks: tasks || [],
        expenses: expenses || [],
        stressHistory: stressAnalysis || [],
        studySessions: studySessions || [],
        friends: friends || [],
      };
    } catch (error) {
      console.error('Get user context error:', error);
      return null;
    }
  }

  // Generate AI response using OpenAI or fallback
  async generateResponse(userMessage, userId, context) {
    if (this.useOpenAI) {
      return await this.generateOpenAIResponse(userMessage, context);
    } else {
      return await this.generateLocalResponse(userMessage, userId, context);
    }
  }

  // OpenAI GPT Integration
  async generateOpenAIResponse(userMessage, context) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        message: response.data.choices[0].message.content,
        actionType: 'ai_generated',
        metadata: { model: 'gpt-4' },
      };
    } catch (error) {
      console.error('OpenAI error:', error);
      return await this.generateLocalResponse(userMessage, context.userId, context);
    }
  }

  // Build system prompt for OpenAI
  buildSystemPrompt(context) {
    const { profile, schedules, tasks, expenses, stressHistory } = context;
    
    const today = new Date().toLocaleDateString('th-TH', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const upcomingTasks = tasks.slice(0, 5).map(t => 
      `- ${t.title} (deadline: ${new Date(t.deadline).toLocaleDateString('th-TH')})`
    ).join('\n');

    const todaySchedule = schedules
      .filter(s => s.day_of_week === new Date().getDay())
      .map(s => `- ${s.subject_name}: ${s.start_time?.slice(0, 5)}-${s.end_time?.slice(0, 5)}`)
      .join('\n');

    const latestStress = stressHistory[0];

    return `คุณเป็น AI Assistant สำหรับนักศึกษาชื่อ "Smart Student AI" 
วันนี้คือ ${today}

ข้อมูลผู้ใช้:
- ชื่อ: ${profile?.full_name}
- คณะ: ${profile?.faculty || 'ไม่ระบุ'}
- สาขา: ${profile?.major || 'ไม่ระบุ'}
- ชั้นปี: ${profile?.year || 'ไม่ระบุ'}

ตารางเรียนวันนี้:
${todaySchedule || 'ไม่มีตารางเรียน'}

งานที่รอทำ (${tasks.length} งาน):
${upcomingTasks || 'ไม่มีงาน'}

ระดับความเครียดล่าสุด: ${latestStress?.stress_level || 'ไม่มีข้อมูล'} (คะแนน: ${latestStress?.stress_score || 0})

คุณสามารถ:
1. ช่วยวางแผนการเรียนและอ่านหนังสือ
2. แนะนำการจัดลำดับความสำคัญของงาน
3. ให้คำแนะนำเกี่ยวกับการบริหารเวลา
4. วิเคราะห์ภาระงานและความเครียด
5. ตอบคำถามทั่วไปเกี่ยวกับชีวิตนักศึกษา

ตอบเป็นภาษาไทย กระชับ เป็นกันเอง และให้คำแนะนำที่ actionable`;
  }

  // Local AI Logic (Fallback)
  async generateLocalResponse(userMessage, userId, context) {
    const lowerMsg = userMessage.toLowerCase();
    
    // Intent detection
    if (lowerMsg.includes('อ่านหนังสือ') || lowerMsg.includes('เรียน') || lowerMsg.includes('สอบ')) {
      return await this.generateStudyPlan(context);
    }
    
    if (lowerMsg.includes('ภาระงาน') || lowerMsg.includes('เครียด') || lowerMsg.includes('stress')) {
      return await this.analyzeWorkload(context);
    }
    
    if (lowerMsg.includes('ตาราง') || lowerMsg.includes('เวลา')) {
      return await this.getScheduleInfo(context);
    }
    
    if (lowerMsg.includes('เงิน') || lowerMsg.includes('ใช้จ่าย') || lowerMsg.includes('ค่าใช้จ่าย')) {
      return await this.analyzeExpenses(context);
    }

    if (lowerMsg.includes('เพื่อน') || lowerMsg.includes('friend')) {
      return await this.getFriendsInfo(context);
    }

    // Default response
    return {
      message: `สวัสดี! ฉันสามารถช่วยคุณได้หลายอย่าง:\n\n` +
        `📚 **วางแผนการเรียน** - "ช่วยวางแผนอ่านหนังสือ Database"\n` +
        `📊 **วิเคราะห์ภาระงาน** - "ตรวจสอบภาระงานของฉัน"\n` +
        `📅 **ดูตารางเรียน** - "ตารางเรียนวันนี้เป็นยังไง"\n` +
        `💰 **สรุปการใช้จ่าย** - "สรุปค่าใช้จ่ายเดือนนี้"\n` +
        `👥 **ข้อมูลเพื่อน** - "ดูเวลาว่างของเพื่อน"\n\n` +
        `คุณต้องการให้ช่วยเรื่องไหนครับ?`,
      actionType: 'general',
      metadata: {},
    };
  }

  // Generate study plan with free time analysis
  async generateStudyPlan(context) {
    const { schedules, tasks, profile } = context;
    
    // Find free time slots
    const busyHours = schedules
      .filter(s => s.day_of_week === new Date().getDay())
      .map(s => ({
        start: parseInt(s.start_time?.split(':')[0]),
        end: parseInt(s.end_time?.split(':')[0]),
      }));

    const freeSlots = [];
    for (let hour = 8; hour < 22; hour += 2) {
      const isBusy = busyHours.some(h => hour >= h.start && hour < h.end);
      if (!isBusy) {
        freeSlots.push({
          start: `${hour}:00`,
          end: `${hour + 2}:00`,
        });
      }
    }

    // Find urgent tasks
    const urgentTasks = tasks
      .filter(t => new Date(t.deadline) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
      .slice(0, 3);

    let response = `📚 **แผนการอ่านหนังสือแนะนำ**\n\n`;
    
    if (urgentTasks.length > 0) {
      response += `🚨 **งานเร่งด่วนที่ควรทำก่อน:**\n`;
      urgentTasks.forEach((t, i) => {
        response += `${i + 1}. ${t.title} (deadline: ${new Date(t.deadline).toLocaleDateString('th-TH')})\n`;
      });
      response += `\n`;
    }

    if (freeSlots.length > 0) {
      response += `⏰ **ช่วงเวลาว่างที่แนะนำสำหรับการอ่านหนังสือ:**\n`;
      freeSlots.slice(0, 3).forEach((slot, i) => {
        response += `${i + 1}. ${slot.start} - ${slot.end} (2 ชั่วโมง)\n`;
      });
    } else {
      response += `⚠️ วันนี้คุณมีตารางเรียนตลอดทั้งวัน\n`;
      response += `💡 แนะนำให้อ่านหนังสือช่วงหลัง 22:00 หรือตื่นเช้ามาอ่าน\n`;
    }

    response += `\n💡 **เทคนิคการอ่านหนังสือ:**\n`;
    response += `- ใช้เทคนิค Pomodoro (25 นาทีอ่าน + 5 นาทีพัก)\n`;
    response += `- จดโน้ตสรุปเนื้อหาที่สำคัญ\n`;
    response += `- ทำแบบฝึกหัดหลังอ่านจบแต่ละบท\n`;

    return {
      message: response,
      actionType: 'study_plan',
      metadata: { freeSlots, urgentTasks },
    };
  }

  // Analyze workload and stress
  async analyzeWorkload(context) {
    const { tasks, stressHistory, studySessions } = context;
    
    const pendingCount = tasks.length;
    const urgentCount = tasks.filter(t => 
      new Date(t.deadline) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    ).length;
    
    const highPriorityCount = tasks.filter(t => 
      t.priority === 'high' || t.priority === 'urgent'
    ).length;

    // Calculate stress score
    const stressScore = (pendingCount * 10) + (urgentCount * 20);
    let stressLevel = 'normal';
    let stressEmoji = '😊';
    
    if (stressScore > 80) {
      stressLevel = 'high';
      stressEmoji = '😰';
    } else if (stressScore > 50) {
      stressLevel = 'moderate';
      stressEmoji = '😅';
    }

    let response = `${stressEmoji} **วิเคราะห์ภาระงาน**\n\n`;
    response += `📊 **สถิติปัจจุบัน:**\n`;
    response += `- งานรอทำทั้งหมด: ${pendingCount} งาน\n`;
    response += `- งานเร่งด่วน (3 วัน): ${urgentCount} งาน\n`;
    response += `- งานความสำคัญสูง: ${highPriorityCount} งาน\n`;
    response += `- คะแนนความเครียด: ${stressScore}/100\n`;
    response += `- ระดับ: ${stressLevel === 'normal' ? 'ปกติ' : stressLevel === 'moderate' ? 'เริ่มเครียด' : 'เครียดสูง'}\n\n`;

    if (stressLevel === 'high') {
      response += `⚠️ **คำแนะนำด่วน:**\n`;
      response += `1. เริ่มทำงานที่ deadline ใกล้ที่สุดทันที\n`;
      response += `2. แบ่งงานใหญ่ออกเป็นงานย่อยๆ\n`;
      response += `3. พักผ่อนอย่างน้อย 6-7 ชั่วโมง\n`;
      response += `4. หากรู้สึกท้อ ให้หยุดพักสัก 15 นาที\n`;
    } else if (stressLevel === 'moderate') {
      response += `💡 **คำแนะนำ:**\n`;
      response += `1. วางแผนทำงานตามลำดับความสำคัญ\n`;
      response += `2. ใช้เทคนิค Pomodoro (25+5 นาที)\n`;
      response += `3. หาเวลาพักผ่อนระหว่างทำงาน\n`;
    } else {
      response += `✅ **สถานะดี!** คุณบริหารงานได้ดี\n`;
      response += `💡 ใช้เวลาว่างเพิ่มทักษะใหม่ๆ หรือทำกิจกรรมที่ชอบ\n`;
    }

    return {
      message: response,
      actionType: 'stress_analysis',
      metadata: { stressScore, stressLevel, pendingCount, urgentCount },
    };
  }

  // Get schedule information
  async getScheduleInfo(context) {
    const { schedules } = context;
    const today = new Date().getDay();
    const todaySchedule = schedules.filter(s => s.day_of_week === today);

    let response = `📅 **ตารางเรียนวันนี้**\n\n`;
    
    if (todaySchedule.length === 0) {
      response += `🎉 วันนี้คุณไม่มีตารางเรียน!\n\n`;
      response += `💡 เป็นวันที่ดีสำหรับ:\n`;
      response += `- อ่านหนังสือหรือทบทวนบทเรียน\n`;
      response += `- ทำงานที่ค้างอยู่\n`;
      response += `- พักผ่อนให้เพียงพอ\n`;
    } else {
      todaySchedule.forEach((s, i) => {
        response += `${i + 1}. **${s.subject_name}**\n`;
        response += `   🕐 ${s.start_time?.slice(0, 5)} - ${s.end_time?.slice(0, 5)}\n`;
        if (s.building || s.room) {
          response += `   📍 ${s.building || ''} ${s.room || ''}\n`;
        }
        if (s.teacher) {
          response += `   👨‍🏫 ${s.teacher}\n`;
        }
        response += `\n`;
      });

      // Calculate free time
      const busySlots = todaySchedule.map(s => ({
        start: parseInt(s.start_time?.split(':')[0]) * 60 + parseInt(s.start_time?.split(':')[1]),
        end: parseInt(s.end_time?.split(':')[0]) * 60 + parseInt(s.end_time?.split(':')[1]),
      }));

      const dayStart = 8 * 60; // 8:00
      const dayEnd = 18 * 60; // 18:00
      
      let freeTime = 0;
      let currentTime = dayStart;
      
      busySlots.sort((a, b) => a.start - b.start);
      
      for (const slot of busySlots) {
        if (currentTime < slot.start) {
          freeTime += slot.start - currentTime;
        }
        currentTime = Math.max(currentTime, slot.end);
      }
      
      if (currentTime < dayEnd) {
        freeTime += dayEnd - currentTime;
      }

      response += `⏰ **สรุป:** คุณมีตารางเรียน ${todaySchedule.length} คาบ\n`;
      response += `🆓 เวลาว่างประมาณ ${Math.floor(freeTime / 60)} ชั่วโมง ${freeTime % 60} นาที\n`;
    }

    return {
      message: response,
      actionType: 'schedule_info',
      metadata: { todaySchedule },
    };
  }

  // Analyze expenses
  async analyzeExpenses(context) {
    const { expenses, profile } = context;
    
    const totalExpense = expenses
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    const totalIncome = expenses
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const budget = profile?.monthly_budget || 5000;
    const remaining = budget - totalExpense;
    const usagePercent = (totalExpense / budget) * 100;

    let response = `💰 **สรุปการใช้จ่าย**\n\n`;
    response += `📊 **เดือนนี้:**\n`;
    response += `- งบประมาณ: ฿${budget.toLocaleString()}\n`;
    response += `- รายจ่าย: ฿${totalExpense.toLocaleString()}\n`;
    response += `- คงเหลือ: ฿${remaining.toLocaleString()}\n`;
    response += `- ใช้ไป: ${usagePercent.toFixed(1)}%\n\n`;

    if (usagePercent > 100) {
      response += `⚠️ **แจ้งเตือน!** คุณใช้เงินเกินงบประมาณแล้ว\n\n`;
      response += `💡 **แนะนำ:**\n`;
      response += `- ตัดค่าใช้จ่ายที่ไม่จำเป็น\n`;
      response += `- หารายได้เสริม (พาร์ทไทม์, ฟรีแลนซ์)\n`;
      response += `- ใช้สิทธิส่วนลดนักศึกษา\n`;
    } else if (usagePercent > 80) {
      response += `⚡ ใกล้ถึงงบประมาณแล้ว (${usagePercent.toFixed(0)}%)\n\n`;
      response += `💡 **แนะนำ:** วางแผนใช้เงินให้เหลือถึงสิ้นเดือน\n`;
    } else {
      response += `✅ **ดีมาก!** คุณควบคุมการใช้จ่ายได้ดี\n`;
      response += `💡 แนะนำให้เก็บออมส่วนที่เหลือ ${remaining.toLocaleString()} บาท\n`;
    }

    // Top categories
    const categoryTotals = {};
    expenses
      .filter(e => e.type === 'expense')
      .forEach(e => {
        const cat = e.category_name || 'ไม่ระบุ';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(e.amount);
      });

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topCategories.length > 0) {
      response += `\n📈 **ค่าใช้จ่ายสูงสุด 3 อันดับ:**\n`;
      topCategories.forEach(([cat, amount], i) => {
        response += `${i + 1}. ${cat}: ฿${amount.toLocaleString()}\n`;
      });
    }

    return {
      message: response,
      actionType: 'expense_analysis',
      metadata: { totalExpense, totalIncome, remaining, usagePercent },
    };
  }

  // Get friends info
  async getFriendsInfo(context) {
    const { friends, schedules } = context;
    
    let response = `👥 **ข้อมูลเพื่อน**\n\n`;
    
    if (friends.length === 0) {
      response += `คุณยังไม่มีเพื่อนในระบบ\n\n`;
      response += `💡 ไปที่หน้า "เพื่อน" เพื่อเพิ่มเพื่อนและแชร์ตารางเรียนกัน!\n`;
    } else {
      response += `คุณมีเพื่อน ${friends.length} คนในระบบ\n\n`;
      response += `📋 **รายชื่อเพื่อน:**\n`;
      friends.slice(0, 5).forEach((f, i) => {
        const friendName = f.full_name || f.student_id;
        response += `${i + 1}. ${friendName}\n`;
      });
      
      if (friends.length > 5) {
        response += `...และอีก ${friends.length - 5} คน\n`;
      }
      
      response += `\n💡 คุณสามารถ:\n`;
      response += `- ดูตารางเรียนของเพื่อน\n`;
      response += `- เช็คเวลาว่างของกันและกัน\n`;
      response += `- นัดทำงานกลุ่มได้สะดวกขึ้น\n`;
    }

    return {
      message: response,
      actionType: 'friends_info',
      metadata: { friendCount: friends.length },
    };
  }

  // Smart recommendation engine
  async generateSmartRecommendations(userId) {
    const context = await this.getUserContext(userId);
    const recommendations = [];

    // Check for urgent tasks
    const urgentTasks = context.tasks.filter(t => 
      new Date(t.deadline) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    );
    
    if (urgentTasks.length > 0) {
      recommendations.push({
        type: 'urgent_task',
        priority: 'high',
        title: `มี ${urgentTasks.length} งานใกล้ deadline`,
        message: `งาน "${urgentTasks[0].title}" ครบกำหนดในอีกไม่กี่วัน`,
        action: 'view_tasks',
      });
    }

    // Check stress level
    const latestStress = context.stressHistory[0];
    if (latestStress?.stress_level === 'high') {
      recommendations.push({
        type: 'stress_warning',
        priority: 'high',
        title: 'ความเครียดสูง',
        message: 'คุณมีภาระงานมาก ควรพักผ่อนให้เพียงพอ',
        action: 'view_stress',
      });
    }

    // Check free time for study
    const todaySchedule = context.schedules.filter(s => 
      s.day_of_week === new Date().getDay()
    );
    
    if (todaySchedule.length > 0 && context.tasks.length > 0) {
      recommendations.push({
        type: 'study_suggestion',
        priority: 'normal',
        title: 'มีเวลาว่างหลังเรียน',
        message: 'ใช้เวลาว่างหลังตารางเรียนเพื่อทำงานที่ค้างอยู่',
        action: 'view_schedule',
      });
    }

    // Check budget
    const monthlyExpenses = context.expenses
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    const budget = context.profile?.monthly_budget || 5000;
    if (monthlyExpenses > budget * 0.8) {
      recommendations.push({
        type: 'expense_warning',
        priority: 'medium',
        title: 'ใกล้เกินงบประมาณ',
        message: `ใช้เงินไปแล้ว ${((monthlyExpenses/budget)*100).toFixed(0)}% ของงบประมาณ`,
        action: 'view_expenses',
      });
    }

    return recommendations;
  }
}

module.exports = new AdvancedAIService();
