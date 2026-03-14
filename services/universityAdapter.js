// Multi-University Integration Adapter
// รองรับหลายมหาวิทยาลัยในไทย

const axios = require('axios');
const db = require('../database/connection');

class UniversityAdapter {
  constructor() {
    // Registry of supported universities
    this.universities = {
      // มหาวิทยาลัยราชภัฏ
      'bru': {
        name: 'มหาวิทยาลัยราชภัฏบุรีรัมย์',
        shortName: 'มรภ.บุรีรัมย์',
        type: 'ราชภัฏ',
        baseURL: process.env.BRU_API_URL || 'https://api.bru.ac.th',
        authType: 'oauth2',
        features: ['courses', 'grades', 'schedule', 'transcript', 'tuition'],
        logo: 'https://www.bru.ac.th/logo.png',
      },
      'mju': {
        name: 'มหาวิทยาลัยแม่โจ้',
        shortName: 'มมจ.',
        type: 'ราชภัฏ',
        baseURL: process.env.MJU_API_URL || 'https://api.mju.ac.th',
        authType: 'apikey',
        features: ['courses', 'grades', 'schedule'],
        logo: 'https://www.mju.ac.th/logo.png',
      },
      'cmu': {
        name: 'มหาวิทยาลัยเชียงใหม่',
        shortName: 'มช.',
        type: 'รัฐบาล',
        baseURL: process.env.CMU_API_URL || 'https://api.cmu.ac.th',
        authType: 'oauth2',
        features: ['courses', 'grades', 'schedule', 'transcript', 'scholarships'],
        logo: 'https://www.cmu.ac.th/logo.png',
      },
      'ku': {
        name: 'มหาวิทยาลัยเกษตรศาสตร์',
        shortName: 'มก.',
        type: 'รัฐบาล',
        baseURL: process.env.KU_API_URL || 'https://api.ku.ac.th',
        authType: 'oauth2',
        features: ['courses', 'grades', 'schedule', 'transcript', 'tuition'],
        logo: 'https://www.ku.ac.th/logo.png',
      },
      'tu': {
        name: 'มหาวิทยาลัยธรรมศาสตร์',
        shortName: 'มธ.',
        type: 'รัฐบาล',
        baseURL: process.env.TU_API_URL || 'https://api.tu.ac.th',
        authType: 'oauth2',
        features: ['courses', 'grades', 'schedule', 'transcript'],
        logo: 'https://www.tu.ac.th/logo.png',
      },
      'mu': {
        name: 'มหาวิทยาลัยมหิดล',
        shortName: 'มม.',
        type: 'รัฐบาล',
        baseURL: process.env.MU_API_URL || 'https://api.mahidol.ac.th',
        authType: 'oauth2',
        features: ['courses', 'grades', 'schedule', 'transcript', 'scholarships'],
        logo: 'https://www.mahidol.ac.th/logo.png',
      },
      // มหาวิทยาลัยเอกชน
      'kmitl': {
        name: 'สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง',
        shortName: 'สจล.',
        type: 'รัฐบาล',
        baseURL: process.env.KMITL_API_URL || 'https://api.kmitl.ac.th',
        authType: 'oauth2',
        features: ['courses', 'grades', 'schedule', 'transcript'],
        logo: 'https://www.kmitl.ac.th/logo.png',
      },
      'bu': {
        name: 'มหาวิทยาลัยกรุงเทพ',
        shortName: 'มกท.',
        type: 'เอกชน',
        baseURL: process.env.BU_API_URL || 'https://api.bu.ac.th',
        authType: 'apikey',
        features: ['courses', 'grades', 'schedule', 'tuition'],
        logo: 'https://www.bu.ac.th/logo.png',
      },
      'stu': {
        name: 'มหาวิทยาลัยสงขลานครินทร์',
        shortName: 'ม.อ.',
        type: 'รัฐบาล',
        baseURL: process.env.STU_API_URL || 'https://api.psu.ac.th',
        authType: 'oauth2',
        features: ['courses', 'grades', 'schedule', 'transcript'],
        logo: 'https://www.psu.ac.th/logo.png',
      },
    };
  }

  // Get all supported universities
  getAllUniversities() {
    return Object.entries(this.universities).map(([code, data]) => ({
      code,
      name: data.name,
      shortName: data.shortName,
      type: data.type,
      features: data.features,
      logo: data.logo,
    }));
  }

  // Get university by code
  getUniversity(code) {
    return this.universities[code] || null;
  }

  // Check if university is supported
  isSupported(code) {
    return !!this.universities[code];
  }

  // Authenticate with university system
  async authenticate(universityCode, credentials) {
    const uni = this.getUniversity(universityCode);
    if (!uni) throw new Error('University not supported');

    try {
      switch (uni.authType) {
        case 'oauth2':
          return await this.oauth2Auth(uni, credentials);
        case 'apikey':
          return await this.apiKeyAuth(uni, credentials);
        case 'cas':
          return await this.casAuth(uni, credentials);
        default:
          throw new Error('Unknown auth type');
      }
    } catch (error) {
      console.error(`Authentication error for ${uni.name}:`, error);
      return { success: false, error: error.message };
    }
  }

  // OAuth2 authentication flow
  async oauth2Auth(uni, credentials) {
    // Mock OAuth2 flow - replace with actual implementation
    const response = await axios.post(`${uni.baseURL}/oauth/token`, {
      grant_type: 'password',
      username: credentials.studentId,
      password: credentials.password,
      client_id: process.env[`${uni.code.toUpperCase()}_CLIENT_ID`],
      client_secret: process.env[`${uni.code.toUpperCase()}_CLIENT_SECRET`],
    });

    return {
      success: true,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  }

  // API Key authentication
  async apiKeyAuth(uni, credentials) {
    // Mock API key auth - replace with actual implementation
    return {
      success: true,
      apiKey: process.env[`${uni.code.toUpperCase()}_API_KEY`],
    };
  }

  // CAS authentication (Central Authentication Service)
  async casAuth(uni, credentials) {
    // CAS implementation for universities using CAS
    return {
      success: true,
      ticket: 'mock-ticket',
    };
  }

  // Fetch student profile from university
  async fetchStudentProfile(universityCode, studentId, authToken) {
    const uni = this.getUniversity(universityCode);
    if (!uni) throw new Error('University not supported');

    try {
      // Mock API call - replace with actual implementation
      // const response = await axios.get(`${uni.baseURL}/students/${studentId}`, {
      //   headers: { 'Authorization': `Bearer ${authToken}` }
      // });

      // Return mock data
      return {
        studentId,
        fullName: 'นักศึกษา ตัวอย่าง',
        faculty: 'คณะวิทยาศาสตร์',
        major: 'วิทยาการคอมพิวเตอร์',
        year: 3,
        gpa: 3.45,
        credits: 86,
        status: 'กำลังศึกษา',
        email: `${studentId}@${uni.code}.ac.th`,
        advisor: 'ผศ.ดร. อาจารย์ ที่ปรึกษา',
      };
    } catch (error) {
      console.error(`Fetch profile error for ${uni.name}:`, error);
      return null;
    }
  }

  // Fetch course catalog
  async fetchCourseCatalog(universityCode, faculty, major, year, authToken) {
    const uni = this.getUniversity(universityCode);
    if (!uni) throw new Error('University not supported');

    try {
      // Check if feature is supported
      if (!uni.features.includes('courses')) {
        return { error: 'Course catalog not available for this university' };
      }

      // Mock course catalog - replace with actual API
      const courses = [
        { code: `${uni.code.toUpperCase()}101`, name: 'Introduction to Programming', credits: 3, semester: 1, year: 1 },
        { code: `${uni.code.toUpperCase()}201`, name: 'Data Structures', credits: 3, semester: 2, year: 2 },
        { code: `${uni.code.toUpperCase()}301`, name: 'Database Systems', credits: 3, semester: 1, year: 3 },
        { code: `${uni.code.toUpperCase()}401`, name: 'Software Engineering', credits: 3, semester: 2, year: 4 },
        { code: `${uni.code.toUpperCase()}302`, name: 'Artificial Intelligence', credits: 3, semester: 1, year: 3 },
        { code: `${uni.code.toUpperCase()}202`, name: 'Web Development', credits: 3, semester: 2, year: 2 },
      ];

      return { courses };
    } catch (error) {
      console.error(`Fetch courses error for ${uni.name}:`, error);
      return null;
    }
  }

  // Fetch academic records (grades)
  async fetchAcademicRecords(universityCode, studentId, authToken) {
    const uni = this.getUniversity(universityCode);
    if (!uni) throw new Error('University not supported');

    try {
      if (!uni.features.includes('grades')) {
        return { error: 'Grades not available for this university' };
      }

      // Mock academic records
      return {
        gpa: 3.45,
        cgpa: 3.38,
        credits: 86,
        totalCredits: 135,
        semesters: [
          {
            year: 2566,
            semester: 1,
            gpa: 3.50,
            credits: 18,
            courses: [
              { code: 'CS301', name: 'Database Systems', credits: 3, grade: 'A', points: 4.0 },
              { code: 'CS302', name: 'AI Fundamentals', credits: 3, grade: 'B+', points: 3.5 },
              { code: 'CS303', name: 'Web Dev', credits: 3, grade: 'A-', points: 3.75 },
            ],
          },
          {
            year: 2565,
            semester: 2,
            gpa: 3.25,
            credits: 18,
            courses: [
              { code: 'CS201', name: 'Data Structures', credits: 3, grade: 'B', points: 3.0 },
              { code: 'CS202', name: 'Algorithms', credits: 3, grade: 'B+', points: 3.5 },
            ],
          },
        ],
      };
    } catch (error) {
      console.error(`Fetch grades error for ${uni.name}:`, error);
      return null;
    }
  }

  // Fetch class schedule
  async fetchClassSchedule(universityCode, studentId, semester, year, authToken) {
    const uni = this.getUniversity(universityCode);
    if (!uni) throw new Error('University not supported');

    try {
      if (!uni.features.includes('schedule')) {
        return { error: 'Schedule not available for this university' };
      }

      // Mock class schedule
      const schedules = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', subject: 'CS301', room: 'B-301', building: 'อาคารวิทย์' },
        { dayOfWeek: 1, startTime: '13:00', endTime: '16:00', subject: 'CS302', room: 'B-302', building: 'อาคารวิทย์' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '12:00', subject: 'CS303', room: 'B-303', building: 'อาคารวิทย์' },
        { dayOfWeek: 3, startTime: '13:00', endTime: '16:00', subject: 'GEN101', room: 'C-101', building: 'อาคารศิลป์' },
        { dayOfWeek: 5, startTime: '09:00', endTime: '12:00', subject: 'CS304', room: 'B-304', building: 'อาคารวิทย์' },
      ];

      return { schedules };
    } catch (error) {
      console.error(`Fetch schedule error for ${uni.name}:`, error);
      return null;
    }
  }

  // Fetch exam schedule
  async fetchExamSchedule(universityCode, studentId, semester, year, authToken) {
    const uni = this.getUniversity(universityCode);
    if (!uni) throw new Error('University not supported');

    try {
      // Mock exam schedule
      const exams = [
        { date: '2024-01-15', time: '09:00-12:00', subject: 'CS301', room: 'EX-101', type: 'กลางภาค' },
        { date: '2024-01-18', time: '13:00-16:00', subject: 'CS302', room: 'EX-102', type: 'กลางภาค' },
        { date: '2024-01-22', time: '09:00-12:00', subject: 'CS303', room: 'EX-103', type: 'กลางภาค' },
        { date: '2024-05-10', time: '09:00-12:00', subject: 'CS301', room: 'EX-201', type: 'ปลายภาค' },
        { date: '2024-05-13', time: '13:00-16:00', subject: 'CS302', room: 'EX-202', type: 'ปลายภาค' },
      ];

      return { exams };
    } catch (error) {
      console.error(`Fetch exam schedule error for ${uni.name}:`, error);
      return null;
    }
  }

  // Fetch tuition fees
  async fetchTuitionFees(universityCode, studentId, semester, year, authToken) {
    const uni = this.getUniversity(universityCode);
    if (!uni) throw new Error('University not supported');

    try {
      if (!uni.features.includes('tuition')) {
        return { error: 'Tuition info not available for this university' };
      }

      // Mock tuition data
      return {
        semester: '1/2566',
        total: 25000,
        breakdown: [
          { item: 'ค่าลงทะเบียน', amount: 15000 },
          { item: 'ค่าหน่วยกิต (15 หน่วย)', amount: 7500 },
          { item: 'ค่าประกัน', amount: 1000 },
          { item: 'ค่ากิจกรรม', amount: 1500 },
        ],
        paid: 20000,
        remaining: 5000,
        dueDate: '2024-02-15',
      };
    } catch (error) {
      console.error(`Fetch tuition error for ${uni.name}:`, error);
      return null;
    }
  }

  // Fetch scholarships
  async fetchScholarships(universityCode, authToken) {
    const uni = this.getUniversity(universityCode);
    if (!uni) throw new Error('University not supported');

    try {
      if (!uni.features.includes('scholarships')) {
        return { error: 'Scholarships not available for this university' };
      }

      // Mock scholarships
      const scholarships = [
        { name: 'ทุนเรียนดี', type: 'เกรด', amount: 20000, criteria: 'GPA >= 3.50', deadline: '2024-02-28' },
        { name: 'ทุนขยัน', type: 'ความประพฤติ', amount: 15000, criteria: 'ไม่มี disciplinary record', deadline: '2024-02-28' },
        { name: 'ทุนทุพพลภาพ', type: 'ทุนกู้ยืม', amount: 50000, criteria: 'รายได้ครอบครัว < 300,000/ปี', deadline: '2024-03-15' },
      ];

      return { scholarships };
    } catch (error) {
      console.error(`Fetch scholarships error for ${uni.name}:`, error);
      return null;
    }
  }

  // Import university schedule to user account
  async importScheduleToSystem(userId, universityCode, schedules) {
    try {
      const imported = [];
      
      for (const schedule of schedules) {
        // Check for conflicts
        const conflicts = await db.query(
          `SELECT * FROM schedules 
           WHERE user_id = ? AND day_of_week = ? AND is_active = TRUE
           AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))`,
          [
            userId,
            schedule.dayOfWeek,
            schedule.startTime,
            schedule.startTime,
            schedule.endTime,
            schedule.endTime,
          ]
        );

        if (conflicts.length === 0) {
          const result = await db.query(
            `INSERT INTO schedules 
             (user_id, subject_code, subject_name, day_of_week, start_time, end_time, building, room, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [
              userId,
              schedule.subject,
              schedule.subject,
              schedule.dayOfWeek,
              schedule.startTime,
              schedule.endTime,
              schedule.building,
              schedule.room,
            ]
          );
          imported.push(result.insertId);
        }
      }

      return {
        success: true,
        imported: imported.length,
        total: schedules.length,
        conflicts: schedules.length - imported.length,
      };
    } catch (error) {
      console.error('Import schedule error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync all data from university
  async syncAllData(userId, universityCode, studentId, authToken) {
    try {
      const results = {};

      // Fetch profile
      results.profile = await this.fetchStudentProfile(universityCode, studentId, authToken);

      // Fetch courses
      results.courses = await this.fetchCourseCatalog(universityCode, null, null, null, authToken);

      // Fetch grades
      results.grades = await this.fetchAcademicRecords(universityCode, studentId, authToken);

      // Fetch schedule
      results.schedule = await this.fetchClassSchedule(universityCode, studentId, null, null, authToken);

      // Import schedule if available
      if (results.schedule?.schedules) {
        results.import = await this.importScheduleToSystem(userId, universityCode, results.schedule.schedules);
      }

      // Update user profile
      if (results.profile) {
        await db.query(
          `UPDATE users SET 
           full_name = ?, 
           faculty = ?, 
           major = ?, 
           year = ?, 
           university = ?
           WHERE id = ?`,
          [
            results.profile.fullName,
            results.profile.faculty,
            results.profile.major,
            results.profile.year,
            this.getUniversity(universityCode).name,
            userId,
          ]
        );
      }

      return {
        success: true,
        university: this.getUniversity(universityCode).name,
        syncedAt: new Date().toISOString(),
        results,
      };
    } catch (error) {
      console.error('Sync all data error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new UniversityAdapter();
