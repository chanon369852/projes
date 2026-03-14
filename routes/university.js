const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// University Integration Service
class UniversityIntegrationService {
  constructor() {
    // Mock university API endpoints - replace with actual university APIs
    this.universityAPIs = {
      'bru': {
        name: 'มหาวิทยาลัยราชภัฏบุรีรัมย์',
        baseURL: process.env.BRU_API_URL || 'https://api.bru.ac.th',
        authType: 'apikey',
      },
      'reg': {
        name: 'ระบบสารสนเทศทะเบียน',
        baseURL: process.env.REG_API_URL,
        authType: 'oauth',
      }
    };
  }

  // Fetch course catalog from university
  async fetchCourseCatalog(universityCode, faculty, major) {
    try {
      const uni = this.universityAPIs[universityCode];
      if (!uni) throw new Error('University not supported');

      // Mock API call - replace with actual implementation
      // const response = await axios.get(`${uni.baseURL}/courses`, {
      //   params: { faculty, major },
      //   headers: { 'Authorization': `Bearer ${process.env.UNI_API_KEY}` }
      // });

      // Return mock data for now
      return [
        { code: 'CS101', name: 'Introduction to Computer Science', credits: 3 },
        { code: 'CS201', name: 'Data Structures', credits: 3 },
        { code: 'CS301', name: 'Database Systems', credits: 3 },
        { code: 'CS401', name: 'Software Engineering', credits: 3 },
      ];
    } catch (error) {
      console.error('Fetch course catalog error:', error);
      return null;
    }
  }

  // Fetch student academic records
  async fetchAcademicRecords(studentId, universityCode) {
    try {
      // Mock academic records
      return {
        studentId,
        gpa: 3.45,
        credits: 86,
        status: 'กำลังศึกษา',
        courses: [
          { code: 'CS101', name: 'Computer Science', grade: 'A', semester: '1/2023' },
          { code: 'CS201', name: 'Data Structures', grade: 'B+', semester: '1/2023' },
          { code: 'CS301', name: 'Database', grade: 'A-', semester: '2/2023' },
        ]
      };
    } catch (error) {
      console.error('Fetch academic records error:', error);
      return null;
    }
  }

  // Fetch exam schedule
  async fetchExamSchedule(faculty, year, semester) {
    try {
      // Mock exam schedule
      return [
        { date: '2024-01-15', time: '09:00-12:00', subject: 'CS101', room: 'B301' },
        { date: '2024-01-18', time: '13:00-16:00', subject: 'CS201', room: 'B302' },
        { date: '2024-01-22', time: '09:00-12:00', subject: 'CS301', room: 'B303' },
      ];
    } catch (error) {
      console.error('Fetch exam schedule error:', error);
      return null;
    }
  }

  // Import schedule to user's calendar
  async importScheduleToUser(userId, scheduleData) {
    try {
      const imported = [];
      
      for (const item of scheduleData) {
        const result = await db.query(
          `INSERT INTO schedules 
           (user_id, subject_code, subject_name, day_of_week, start_time, end_time, room, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            userId,
            item.code,
            item.name,
            item.dayOfWeek,
            item.startTime,
            item.endTime,
            item.room,
          ]
        );
        imported.push(result.insertId);
      }

      return { success: true, importedCount: imported.length, ids: imported };
    } catch (error) {
      console.error('Import schedule error:', error);
      return { success: false, error: error.message };
    }
  }

  // Scrape university announcement (if API not available)
  async scrapeAnnouncements(universityUrl) {
    try {
      // This is a placeholder for web scraping
      // In production, use proper scraping with permission
      const response = await axios.get(universityUrl);
      const $ = cheerio.load(response.data);
      
      const announcements = [];
      $('.announcement-item').each((i, el) => {
        announcements.push({
          title: $(el).find('.title').text(),
          date: $(el).find('.date').text(),
          link: $(el).find('a').attr('href'),
        });
      });

      return announcements;
    } catch (error) {
      console.error('Scrape announcements error:', error);
      return [];
    }
  }

  // Sync with university registration system
  async syncWithRegistrationSystem(userId) {
    try {
      const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user[0]) throw new Error('User not found');

      // Fetch from university system
      const courses = await this.fetchCourseCatalog(
        'bru',
        user[0].faculty,
        user[0].major
      );

      // Check for existing schedules
      const existing = await db.query(
        'SELECT subject_code FROM schedules WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );
      const existingCodes = existing.map(e => e.subject_code);

      // Find new courses
      const newCourses = courses.filter(c => !existingCodes.includes(c.code));

      return {
        success: true,
        totalCourses: courses.length,
        existingCourses: existing.length,
        newCourses: newCourses.length,
        newCourseList: newCourses,
      };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error: error.message };
    }
  }
}

const uniService = new UniversityIntegrationService();

// Routes

// Get supported universities
router.get('/universities', authMiddleware, async (req, res) => {
  const universities = Object.entries(uniService.universityAPIs).map(([code, data]) => ({
    code,
    name: data.name,
  }));
  
  res.json({ universities });
});

// Get course catalog
router.get('/courses/:universityCode', authMiddleware, async (req, res) => {
  try {
    const { universityCode } = req.params;
    const { faculty, major } = req.query;
    
    const courses = await uniService.fetchCourseCatalog(universityCode, faculty, major);
    
    if (!courses) {
      return res.status(404).json({ error: 'Courses not found' });
    }

    res.json({ courses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get academic records
router.get('/academic-records', authMiddleware, async (req, res) => {
  try {
    const user = await db.query(
      'SELECT student_id FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user[0]?.student_id) {
      return res.status(400).json({ error: 'Student ID not found' });
    }

    const records = await uniService.fetchAcademicRecords(user[0].student_id, 'bru');
    
    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get exam schedule
router.get('/exam-schedule', authMiddleware, async (req, res) => {
  try {
    const user = await db.query(
      'SELECT faculty, year FROM users WHERE id = ?',
      [req.user.id]
    );

    const schedule = await uniService.fetchExamSchedule(
      user[0]?.faculty,
      user[0]?.year,
      '2/2024'
    );

    res.json({ schedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import university schedule
router.post('/import-schedule', authMiddleware, async (req, res) => {
  try {
    const { courses } = req.body;
    
    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ error: 'No courses provided' });
    }

    const result = await uniService.importScheduleToUser(req.user.id, courses);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync with registration system
router.post('/sync-registration', authMiddleware, async (req, res) => {
  try {
    const result = await uniService.syncWithRegistrationSystem(req.user.id);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get university announcements
router.get('/announcements/:universityCode', authMiddleware, async (req, res) => {
  try {
    const { universityCode } = req.params;
    
    // Mock announcements
    const announcements = [
      {
        id: 1,
        title: 'ประกาศ กำหนดการสอบปลายภาค 2/2024',
        date: '2024-01-10',
        category: 'การศึกษา',
        isImportant: true,
      },
      {
        id: 2,
        title: 'เปิดรับสมัครทุนการศึกษาประจำปี 2567',
        date: '2024-01-08',
        category: 'ทุนการศึกษา',
        isImportant: false,
      },
      {
        id: 3,
        title: 'แจ้งเลื่อนการเปิดภาคเรียนที่ 1/2024',
        date: '2024-01-05',
        category: 'ประกาศทั่วไป',
        isImportant: true,
      },
    ];

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-schedule generator based on university data
router.post('/auto-schedule', authMiddleware, async (req, res) => {
  try {
    const user = await db.query(
      'SELECT faculty, major, year FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch recommended courses for the year/major
    const courses = await uniService.fetchCourseCatalog(
      'bru',
      user[0].faculty,
      user[0].major
    );

    // Generate suggested schedule
    const suggestedSchedule = courses.map((course, index) => ({
      ...course,
      dayOfWeek: (index % 5) + 1, // Mon-Fri
      startTime: `${8 + (index % 4) * 3}:00`,
      endTime: `${11 + (index % 4) * 3}:00`,
      room: `B${301 + index}`,
    }));

    res.json({
      message: 'Generated suggested schedule',
      forYear: user[0].year,
      forMajor: user[0].major,
      suggestedSchedule,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
