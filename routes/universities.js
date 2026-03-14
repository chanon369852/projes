const express = require('express');
const universityAdapter = require('../services/universityAdapter');
const authMiddleware = require('../middleware/auth');
const db = require('../database/connection');

const router = express.Router();

// Get all supported universities
router.get('/list', (req, res) => {
  const universities = universityAdapter.getAllUniversities();
  
  // Group by type
  const grouped = {
    รัฐบาล: universities.filter(u => u.type === 'รัฐบาล'),
    ราชภัฏ: universities.filter(u => u.type === 'ราชภัฏ'),
    เอกชน: universities.filter(u => u.type === 'เอกชน'),
  };

  res.json({
    total: universities.length,
    universities,
    byType: grouped,
  });
});

// Get university details
router.get('/:code', (req, res) => {
  const { code } = req.params;
  const university = universityAdapter.getUniversity(code);
  
  if (!university) {
    return res.status(404).json({ error: 'University not found' });
  }

  res.json({
    code,
    name: university.name,
    shortName: university.shortName,
    type: university.type,
    features: university.features,
    authType: university.authType,
    logo: university.logo,
  });
});

// Authenticate with university
router.post('/:code/auth', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const { studentId, password } = req.body;

    if (!universityAdapter.isSupported(code)) {
      return res.status(400).json({ error: 'University not supported' });
    }

    const result = await universityAdapter.authenticate(code, { studentId, password });

    if (result.success) {
      // Save university connection to user
      await db.query(
        `INSERT INTO university_connections (user_id, university_code, student_id, access_token, is_active, connected_at)
         VALUES (?, ?, ?, ?, TRUE, NOW())
         ON DUPLICATE KEY UPDATE 
         access_token = VALUES(access_token), 
         is_active = TRUE, 
         connected_at = NOW(),
         updated_at = NOW()`,
        [req.user.id, code, studentId, result.accessToken]
      );

      res.json({
        success: true,
        message: `Connected to ${universityAdapter.getUniversity(code).name}`,
        university: code,
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error || 'Authentication failed',
      });
    }
  } catch (error) {
    console.error('University auth error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get student's university connections
router.get('/my-connections', authMiddleware, async (req, res) => {
  try {
    const connections = await db.query(
      `SELECT uc.*, u.name as university_name, u.short_name 
       FROM university_connections uc
       JOIN university_supported u ON uc.university_code = u.code
       WHERE uc.user_id = ? AND uc.is_active = TRUE`,
      [req.user.id]
    );

    res.json({ connections });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch student profile from university
router.get('/:code/profile', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    
    const connection = await db.query(
      'SELECT * FROM university_connections WHERE user_id = ? AND university_code = ? AND is_active = TRUE',
      [req.user.id, code]
    );

    if (connection.length === 0) {
      return res.status(401).json({ error: 'Not connected to this university' });
    }

    const profile = await universityAdapter.fetchStudentProfile(
      code,
      connection[0].student_id,
      connection[0].access_token
    );

    res.json({ profile });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch course catalog
router.get('/:code/courses', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const { faculty, major, year } = req.query;

    const connection = await db.query(
      'SELECT * FROM university_connections WHERE user_id = ? AND university_code = ? AND is_active = TRUE',
      [req.user.id, code]
    );

    const result = await universityAdapter.fetchCourseCatalog(
      code,
      faculty,
      major,
      year,
      connection[0]?.access_token
    );

    res.json(result);
  } catch (error) {
    console.error('Fetch courses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch grades/academic records
router.get('/:code/grades', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;

    const connection = await db.query(
      'SELECT * FROM university_connections WHERE user_id = ? AND university_code = ? AND is_active = TRUE',
      [req.user.id, code]
    );

    if (connection.length === 0) {
      return res.status(401).json({ error: 'Not connected to this university' });
    }

    const records = await universityAdapter.fetchAcademicRecords(
      code,
      connection[0].student_id,
      connection[0].access_token
    );

    res.json(records);
  } catch (error) {
    console.error('Fetch grades error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch class schedule
router.get('/:code/schedule', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const { semester, year } = req.query;

    const connection = await db.query(
      'SELECT * FROM university_connections WHERE user_id = ? AND university_code = ? AND is_active = TRUE',
      [req.user.id, code]
    );

    if (connection.length === 0) {
      return res.status(401).json({ error: 'Not connected to this university' });
    }

    const result = await universityAdapter.fetchClassSchedule(
      code,
      connection[0].student_id,
      semester,
      year,
      connection[0].access_token
    );

    res.json(result);
  } catch (error) {
    console.error('Fetch schedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch exam schedule
router.get('/:code/exams', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const { semester, year } = req.query;

    const connection = await db.query(
      'SELECT * FROM university_connections WHERE user_id = ? AND university_code = ? AND is_active = TRUE',
      [req.user.id, code]
    );

    if (connection.length === 0) {
      return res.status(401).json({ error: 'Not connected to this university' });
    }

    const result = await universityAdapter.fetchExamSchedule(
      code,
      connection[0].student_id,
      semester,
      year,
      connection[0].access_token
    );

    res.json(result);
  } catch (error) {
    console.error('Fetch exam schedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch tuition fees
router.get('/:code/tuition', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const { semester, year } = req.query;

    const connection = await db.query(
      'SELECT * FROM university_connections WHERE user_id = ? AND university_code = ? AND is_active = TRUE',
      [req.user.id, code]
    );

    if (connection.length === 0) {
      return res.status(401).json({ error: 'Not connected to this university' });
    }

    const result = await universityAdapter.fetchTuitionFees(
      code,
      connection[0].student_id,
      semester,
      year,
      connection[0].access_token
    );

    res.json(result);
  } catch (error) {
    console.error('Fetch tuition error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch scholarships
router.get('/:code/scholarships', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;

    const connection = await db.query(
      'SELECT * FROM university_connections WHERE user_id = ? AND university_code = ? AND is_active = TRUE',
      [req.user.id, code]
    );

    const result = await universityAdapter.fetchScholarships(
      code,
      connection[0]?.access_token
    );

    res.json(result);
  } catch (error) {
    console.error('Fetch scholarships error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import university schedule to user account
router.post('/:code/import-schedule', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;

    const connection = await db.query(
      'SELECT * FROM university_connections WHERE user_id = ? AND university_code = ? AND is_active = TRUE',
      [req.user.id, code]
    );

    if (connection.length === 0) {
      return res.status(401).json({ error: 'Not connected to this university' });
    }

    // Fetch schedule from university
    const scheduleData = await universityAdapter.fetchClassSchedule(
      code,
      connection[0].student_id,
      null,
      null,
      connection[0].access_token
    );

    if (!scheduleData?.schedules) {
      return res.status(400).json({ error: 'No schedule available' });
    }

    // Import to user system
    const result = await universityAdapter.importScheduleToSystem(
      req.user.id,
      code,
      scheduleData.schedules
    );

    res.json({
      success: true,
      message: `Imported ${result.imported} classes (${result.conflicts} conflicts)`,
      details: result,
    });
  } catch (error) {
    console.error('Import schedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Full sync with university
router.post('/:code/sync', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;

    const connection = await db.query(
      'SELECT * FROM university_connections WHERE user_id = ? AND university_code = ? AND is_active = TRUE',
      [req.user.id, code]
    );

    if (connection.length === 0) {
      return res.status(401).json({ error: 'Not connected to this university' });
    }

    const result = await universityAdapter.syncAllData(
      req.user.id,
      code,
      connection[0].student_id,
      connection[0].access_token
    );

    res.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect from university
router.delete('/:code/disconnect', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;

    await db.query(
      'UPDATE university_connections SET is_active = FALSE WHERE user_id = ? AND university_code = ?',
      [req.user.id, code]
    );

    res.json({
      success: true,
      message: `Disconnected from ${universityAdapter.getUniversity(code)?.name || code}`,
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compare schedules with friends from same university
router.get('/:code/friend-schedules', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;

    // Get friends from same university
    const friends = await db.query(
      `SELECT DISTINCT u.id, u.full_name, u.student_id
       FROM friends f
       JOIN users u ON (f.requester_id = u.id OR f.addressee_id = u.id)
       JOIN university_connections uc ON u.id = uc.user_id
       WHERE (f.requester_id = ? OR f.addressee_id = ?)
       AND f.status = 'accepted'
       AND u.id != ?
       AND uc.university_code = ?
       AND uc.is_active = TRUE`,
      [req.user.id, req.user.id, req.user.id, code]
    );

    // Get their schedules
    const friendSchedules = await Promise.all(
      friends.map(async (friend) => {
        const schedules = await db.query(
          `SELECT s.* FROM schedules s
           WHERE s.user_id = ? AND s.is_active = TRUE`,
          [friend.id]
        );
        return {
          friend: {
            id: friend.id,
            name: friend.full_name,
            studentId: friend.student_id,
          },
          schedules,
        };
      })
    );

    res.json({
      university: code,
      friends: friendSchedules,
    });
  } catch (error) {
    console.error('Friend schedules error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
