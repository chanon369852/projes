const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const config = require('../config/config');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');
const { sendVerificationEmail } = require('../services/emailService');

const router = express.Router();

// Register
router.post('/register', [
  body('student_id').notEmpty().withMessage('Student ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').notEmpty().withMessage('Full name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { student_id, email, password, full_name, nickname, faculty, major, year, university, phone } = req.body;

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = ? OR student_id = ?',
      [email, student_id]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email or student ID' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create user (Set is_active to FALSE initially)
    const result = await db.query(
      `INSERT INTO users (student_id, email, password, full_name, nickname, faculty, major, year, university, phone, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, email, hashedPassword, full_name, nickname || null, faculty || null, major || null, year || 1, university || null, phone || null, false]
    );

    const userId = result.insertId;

    // 2. Generate Verification Token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token หมดอายุใน 24 ชั่วโมง

    try {
      // 3. Save specific token to database
      await db.query(
        `INSERT INTO user_verifications (user_id, token, expires_at) VALUES (?, ?, ?)`,
        [userId, token, expiresAt]
      );
      
      // 4. Send email (fire-and-forget or await depending on preference)
      await sendVerificationEmail(email, token);
    } catch (e) {
      console.warn("Failed to create verification record/email, continuing...", e.message);
    }

    // ตอนนี้ไม่คืน JWT token จนกว่าจะยืนยันอีเมล
    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      requires_verification: true,
      user_id: userId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').notEmpty().withMessage('Email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user (allow finding inactive to give specific message)
    const users = await db.query(
      'SELECT * FROM users WHERE email = ? OR student_id = ?',
      [email, email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password early
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is verified
    if (!user.is_active) {
       return res.status(403).json({ 
         error: 'Account not verified. Please check your email.',
         requires_verification: true
       });
    }

    // Login successful - no last_login column in schema

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        student_id: user.student_id,
        email: user.email,
        full_name: user.full_name,
        nickname: user.nickname,
        faculty: user.faculty,
        major: user.major,
        year: user.year,
        university: user.university,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify Email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // หา token ว่ามีไหมและยังไม่หมดอายุ
    const verifications = await db.query(
      'SELECT * FROM user_verifications WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (verifications.length === 0) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="th">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ลิงก์ไม่ถูกต้อง</title>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;background:linear-gradient(135deg,#1e1e2e 0%,#2d1b69 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Kanit',sans-serif;">
          <div style="background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:48px 56px;text-align:center;max-width:440px;">
            <div style="font-size:72px;margin-bottom:16px">❌</div>
            <h2 style="color:#fff;font-size:24px;margin:0 0 12px">ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว</h2>
            <p style="color:rgba(255,255,255,0.65);font-size:15px;margin:0 0 28px">ลิงก์ยืนยันนี้ไม่ถูกต้องหรือหมดอายุ 24 ชั่วโมงแล้ว<br>กรุณาสมัครใหม่หรือติดต่อผู้ดูแลระบบ</p>
            <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}" style="display:inline-block;padding:14px 32px;background:#ef4444;color:white;text-decoration:none;border-radius:50px;font-size:15px;font-weight:600">
              ⟵ กลับหน้าหลัก
            </a>
          </div>
        </body></html>
      `);
    }

    const userId = verifications[0].user_id;

    // อัปเดต user ให้ is_active = TRUE
    await db.query('UPDATE users SET is_active = TRUE WHERE id = ?', [userId]);

    // ลบ token ทิ้งเพื่อให้ใช้ซ้ำไม่ได้
    await db.query('DELETE FROM user_verifications WHERE token = ?', [token]);

    res.send(`
      <!DOCTYPE html>
      <html lang="th">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ยืนยันอีเมลสำเร็จ!</title>
      <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap" rel="stylesheet">
      <style>
        body{margin:0;background:linear-gradient(135deg,#1e1e2e 0%,#0f4c81 50%,#1a6b3c 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Kanit',sans-serif;}
        .card{background:rgba(255,255,255,0.06);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:48px 56px;text-align:center;max-width:440px;animation:pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275);}
        @keyframes pop{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}
        .icon{font-size:80px;margin-bottom:16px;animation:bounce 1s ease infinite alternate;}
        @keyframes bounce{from{transform:translateY(0)}to{transform:translateY(-10px)}}
        h2{color:#fff;font-size:26px;margin:0 0 12px}
        p{color:rgba(255,255,255,0.7);font-size:15px;margin:0 0 12px;line-height:1.6}
        .progress{width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:4px;margin:24px 0;overflow:hidden;}
        .progress-bar{height:100%;width:100%;background:linear-gradient(90deg,#10b981,#3b82f6);animation:shrink 4s linear forwards;}
        @keyframes shrink{from{width:100%}to{width:0%}}
        .btn{display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#10b981,#3b82f6);color:white;text-decoration:none;border-radius:50px;font-size:15px;font-weight:600;margin-top:8px;box-shadow:0 4px 20px rgba(16,185,129,0.4);}
      </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🎉</div>
          <h2>ยืนยันอีเมลสำเร็จ!</h2>
          <p>บัญชีของคุณได้รับการเปิดใช้งานแล้วครับ คุณสามารถเข้าใช้งานได้เลย ไม่ต้องรอ!</p>
          <p style="color:rgba(255,255,255,0.45);font-size:13px">ระบบกำลังพาคุณไปหน้าหลักโดยอัตโนมัติ...</p>
          <div class="progress"><div class="progress-bar"></div></div>
          <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}" class="btn">
            ➡ ไปหน้าเข้าสู่ระบบ
          </a>
        </div>
        <script>
          setTimeout(() => { window.location.href = '${process.env.CORS_ORIGIN || 'http://localhost:3000'}'; }, 4500);
        </script>
      </body></html>
    `);
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).send('ระบบมีปัญหาในการยืนยันอีเมล กรุณาลองใหม่ภายหลัง');
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const users = await db.query(
      `SELECT id, student_id, email, full_name, nickname, faculty, major, year, university, 
              phone, avatar_url, monthly_budget, is_active, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update profile
router.put('/profile', authMiddleware, [
  body('full_name').optional().notEmpty(),
  body('email').optional().isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = [];
    const values = [];
    const allowedFields = ['full_name', 'nickname', 'faculty', 'major', 'year', 'phone', 'monthly_budget'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.user.id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authMiddleware, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    // Get user with password
    const users = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, users[0].password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
