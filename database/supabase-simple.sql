-- สร้างตารางสำหรับ Smart Student Life Manager (Supabase)
-- รันทีละตารางใน Supabase SQL Editor

-- 1. USERS (สร้างก่อนเพราะตารางอื่นอ้างอิง)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  nickname VARCHAR(50),
  faculty VARCHAR(100),
  major VARCHAR(100),
  year INTEGER DEFAULT 1,
  university VARCHAR(100) DEFAULT 'มหาวิทยาลัยราชภัฏบุรีรัมย์',
  phone VARCHAR(20),
  avatar_url VARCHAR(255),
  monthly_budget DECIMAL(10,2) DEFAULT 5000.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SCHEDULES
CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_code VARCHAR(20),
  subject_name VARCHAR(100) NOT NULL,
  teacher VARCHAR(100),
  building VARCHAR(50),
  room VARCHAR(20),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TASKS
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  subject VARCHAR(100),
  deadline TIMESTAMP NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. EXPENSE CATEGORIES
CREATE TABLE expense_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  color VARCHAR(7) DEFAULT '#6B7280',
  icon VARCHAR(50) DEFAULT 'wallet',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. EXPENSES
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. FRIENDS
CREATE TABLE friends (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  message VARCHAR(255),
  accepted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(requester_id, addressee_id)
);

-- 7. CHAT CONVERSATIONS
CREATE TABLE chat_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) DEFAULT 'New Chat',
  context_type VARCHAR(20) DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. CHAT MESSAGES
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  action_type VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. STRESS ANALYSIS
CREATE TABLE stress_analysis (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  task_count INTEGER DEFAULT 0,
  urgent_task_count INTEGER DEFAULT 0,
  stress_score INTEGER DEFAULT 0,
  stress_level VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, analysis_date)
);

-- 10. NOTIFICATIONS
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. UNIVERSITY SUPPORTED
CREATE TABLE university_supported (
  code VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(50),
  type VARCHAR(20),
  base_url VARCHAR(255),
  auth_type VARCHAR(20) DEFAULT 'oauth2',
  features JSONB DEFAULT '[]',
  logo_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. UNIVERSITY CONNECTIONS
CREATE TABLE university_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  university_code VARCHAR(20) NOT NULL REFERENCES university_supported(code) ON DELETE CASCADE,
  student_id VARCHAR(20) NOT NULL,
  access_token TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, university_code)
);

-- 13. USER DEVICES
CREATE TABLE user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_token VARCHAR(255) NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, device_id)
);

-- INSERT DEFAULT DATA
INSERT INTO expense_categories (name, type, color, icon, is_default) VALUES
('เงินเดือน/เงินอุดหนุน', 'income', '#10B981', 'banknote', TRUE),
('ค่าอาหาร', 'expense', '#EF4444', 'utensils', TRUE),
('ค่าเดินทาง', 'expense', '#F59E0B', 'bus', TRUE),
('ค่าหอพัก', 'expense', '#8B5CF6', 'home', TRUE),
('ค่าอุปกรณ์การเรียน', 'expense', '#3B82F6', 'book', TRUE),
('ค่าหนังสือ', 'expense', '#06B6D4', 'bookmark', TRUE),
('ค่าใช้จ่ายส่วนตัว', 'expense', '#EC4899', 'shopping-bag', TRUE),
('ค่าโทรศัพท์/อินเทอร์เน็ต', 'expense', '#6366F1', 'wifi', TRUE),
('ความบันเทิง', 'expense', '#84CC16', 'gamepad', TRUE),
('อื่นๆ', 'expense', '#6B7280', 'more-horizontal', TRUE);

INSERT INTO university_supported (code, name, short_name, type, base_url, auth_type, features) VALUES
('bru', 'มหาวิทยาลัยราชภัฏบุรีรัมย์', 'มรภ.บุรีรัมย์', 'ราชภัฏ', 'https://api.bru.ac.th', 'oauth2', '["courses", "grades", "schedule"]'),
('mju', 'มหาวิทยาลัยแม่โจ้', 'มมจ.', 'ราชภัฏ', 'https://api.mju.ac.th', 'apikey', '["courses", "grades"]'),
('cmu', 'มหาวิทยาลัยเชียงใหม่', 'มช.', 'รัฐบาล', 'https://api.cmu.ac.th', 'oauth2', '["courses", "grades", "schedule"]'),
('ku', 'มหาวิทยาลัยเกษตรศาสตร์', 'มก.', 'รัฐบาล', 'https://api.ku.ac.th', 'oauth2', '["courses", "grades", "schedule"]'),
('tu', 'มหาวิทยาลัยธรรมศาสตร์', 'มธ.', 'รัฐบาล', 'https://api.tu.ac.th', 'oauth2', '["courses", "grades"]'),
('mu', 'มหาวิทยาลัยมหิดล', 'มม.', 'รัฐบาล', 'https://api.mahidol.ac.th', 'oauth2', '["courses", "grades", "schedule"]'),
('kmitl', 'สถาบันเทคโนโลยีพระจอมเกล้าฯ', 'สจล.', 'รัฐบาล', 'https://api.kmitl.ac.th', 'oauth2', '["courses", "grades"]'),
('bu', 'มหาวิทยาลัยกรุงเทพ', 'มกท.', 'เอกชน', 'https://api.bu.ac.th', 'apikey', '["courses", "grades"]'),
('stu', 'มหาวิทยาลัยสงขลานครินทร์', 'ม.อ.', 'รัฐบาล', 'https://api.psu.ac.th', 'oauth2', '["courses", "grades", "schedule"]');
