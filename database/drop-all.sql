-- Drop all tables (ใช้เมื่อต้องการลบทั้งหมด)
-- รันใน Supabase SQL Editor

DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;
DROP TABLE IF EXISTS user_devices CASCADE;
DROP TABLE IF EXISTS university_connections CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS stress_analysis CASCADE;
DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS university_supported CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- หรือลบทีละตารางใน Supabase Table Editor:
-- 1. ไปที่ Table Editor
-- 2. คลิกตาราง → Delete table
-- 3. ทำซ้ำทุกตาราง
