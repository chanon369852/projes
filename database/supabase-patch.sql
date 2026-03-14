-- ============================================================
-- Smart Student Life Manager - Supabase Patch SQL (v2)
-- อิงจาก Schema จริงที่มีอยู่ใน Supabase ปัจจุบัน
-- รัน script นี้ใน Supabase SQL Editor (optional — เฉพาะถ้าต้องการ feature เพิ่ม)
-- ============================================================

-- NOTE: ตอนนี้โค้ดทำงานได้แล้วโดยไม่ต้องรัน patch นี้
-- Patch นี้เป็น OPTIONAL สำหรับเพิ่ม features ในอนาคต

-- OPTIONAL 1: เพิ่ม free_time_slots (สำหรับ AI แนะนำเวลาว่าง)
CREATE TABLE IF NOT EXISTS free_time_slots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OPTIONAL 2: เพิ่ม shared_schedules (สำหรับแชร์ตารางกับเพื่อน)
CREATE TABLE IF NOT EXISTS shared_schedules (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(20) DEFAULT 'view',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, shared_with_id)
);

-- OPTIONAL 3: เพิ่ม study_sessions (สำหรับ AI วิเคราะห์เวลาเรียน)
CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  subject VARCHAR(100),
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  duration_minutes INTEGER,
  productivity_score INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OPTIONAL 5: เพิ่มตาราง user_verifications สำหรับการยืนยันอีเมล
CREATE TABLE IF NOT EXISTS user_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OPTIONAL 6: Indexes สำหรับ performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_day ON schedules(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
