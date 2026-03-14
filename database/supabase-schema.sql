-- Supabase PostgreSQL Schema for Smart Student Life Manager
-- คัดลอก SQL นี้ไปรันใน Supabase SQL Editor

-- Enable RLS (Row Level Security)
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
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
    study_start_time TIME DEFAULT '08:00:00',
    study_end_time TIME DEFAULT '18:00:00',
    daily_study_goal INTEGER DEFAULT 4,
    monthly_budget DECIMAL(10,2) DEFAULT 5000.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- 2. SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS schedules (
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
    semester INTEGER DEFAULT 1,
    academic_year INTEGER DEFAULT 2024,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedules_user_day ON schedules(user_id, day_of_week);
CREATE INDEX idx_schedules_user_time ON schedules(user_id, start_time, end_time);

-- 3. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    deadline TIMESTAMP NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    estimated_hours DECIMAL(4,1) DEFAULT 1.0,
    actual_hours DECIMAL(4,1) DEFAULT 0,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    tags JSONB DEFAULT '[]',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_user_deadline ON tasks(user_id, deadline);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- 4. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    color VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50) DEFAULT 'wallet',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description VARCHAR(255),
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'mobile_payment', 'other')),
    is_recurring BOOLEAN DEFAULT FALSE,
    receipt_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX idx_expenses_user_type ON expenses(user_id, type);

-- 6. FRIENDS
CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    message VARCHAR(255),
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, addressee_id)
);

CREATE INDEX idx_friends_requester ON friends(requester_id);
CREATE INDEX idx_friends_addressee ON friends(addressee_id);

-- 7. CHAT CONVERSATIONS
CREATE TABLE IF NOT EXISTS chat_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) DEFAULT 'New Chat',
    context_type VARCHAR(20) DEFAULT 'general' CHECK (context_type IN ('general', 'schedule', 'task', 'expense', 'stress')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_conv_user_active ON chat_conversations(user_id, is_active);

-- 8. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'ai', 'system')),
    message TEXT NOT NULL,
    action_type VARCHAR(50) DEFAULT 'general' CHECK (action_type IN ('general', 'schedule_suggestion', 'task_recommendation', 'expense_advice', 'stress_alert', 'study_plan')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_msg_conversation ON chat_messages(conversation_id, created_at);

-- 9. STRESS ANALYSIS
CREATE TABLE IF NOT EXISTS stress_analysis (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL,
    task_count INTEGER DEFAULT 0,
    urgent_task_count INTEGER DEFAULT 0,
    total_estimated_hours DECIMAL(6,1) DEFAULT 0,
    free_hours DECIMAL(6,1) DEFAULT 0,
    busy_days_count INTEGER DEFAULT 0,
    deadline_pressure_score INTEGER DEFAULT 0,
    workload_score INTEGER DEFAULT 0,
    time_pressure_score INTEGER DEFAULT 0,
    stress_score INTEGER DEFAULT 0,
    stress_level VARCHAR(20) DEFAULT 'normal' CHECK (stress_level IN ('normal', 'moderate', 'high', 'critical')),
    recommendations JSONB DEFAULT '[]',
    ai_advice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, analysis_date)
);

CREATE INDEX idx_stress_user_date ON stress_analysis(user_id, analysis_date);

-- 10. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('task_deadline', 'schedule_reminder', 'expense_alert', 'stress_warning', 'friend_request', 'system', 'ai_suggestion')),
    title VARCHAR(100) NOT NULL,
    message TEXT,
    related_id INTEGER,
    related_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(255),
    scheduled_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at);

-- 11. STUDY SESSIONS
CREATE TABLE IF NOT EXISTS study_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    subject VARCHAR(100),
    session_type VARCHAR(20) DEFAULT 'actual' CHECK (session_type IN ('scheduled', 'actual')),
    planned_start TIMESTAMP,
    planned_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    duration_minutes INTEGER,
    productivity_score INTEGER CHECK (productivity_score BETWEEN 1 AND 10),
    notes TEXT,
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_study_user_date ON study_sessions(user_id, actual_start);

-- 12. AI RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('study_schedule', 'task_priority', 'expense_budget', 'stress_management', 'break_reminder')),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    action_items JSONB DEFAULT '[]',
    scheduled_for TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_rec_user_scheduled ON ai_recommendations(user_id, scheduled_for);

-- 13. UNIVERSITY SUPPORTED
CREATE TABLE IF NOT EXISTS university_supported (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(50),
    type VARCHAR(20) NOT NULL CHECK (type IN ('รัฐบาล', 'ราชภัฏ', 'เอกชน')),
    base_url VARCHAR(255),
    auth_type VARCHAR(20) NOT NULL DEFAULT 'oauth2' CHECK (auth_type IN ('oauth2', 'apikey', 'cas')),
    features JSONB DEFAULT '[]',
    logo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. UNIVERSITY CONNECTIONS
CREATE TABLE IF NOT EXISTS university_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    university_code VARCHAR(20) NOT NULL REFERENCES university_supported(code) ON DELETE CASCADE,
    student_id VARCHAR(20) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP NULL,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, university_code)
);

CREATE INDEX idx_uni_conn_university ON university_connections(university_code, is_active);

-- 15. USER DEVICES
CREATE TABLE IF NOT EXISTS user_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_token VARCHAR(255) NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_model VARCHAR(100),
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_user_devices_token ON user_devices(push_token);

-- Insert Default Expense Categories
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
('อื่นๆ', 'expense', '#6B7280', 'more-horizontal', TRUE)
ON CONFLICT DO NOTHING;

-- Insert Supported Universities
INSERT INTO university_supported (code, name, short_name, type, base_url, auth_type, features, logo_url) VALUES
('bru', 'มหาวิทยาลัยราชภัฏบุรีรัมย์', 'มรภ.บุรีรัมย์', 'ราชภัฏ', 'https://api.bru.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript", "tuition"]', 'https://www.bru.ac.th/logo.png'),
('mju', 'มหาวิทยาลัยแม่โจ้', 'มมจ.', 'ราชภัฏ', 'https://api.mju.ac.th', 'apikey', '["courses", "grades", "schedule"]', 'https://www.mju.ac.th/logo.png'),
('cmu', 'มหาวิทยาลัยเชียงใหม่', 'มช.', 'รัฐบาล', 'https://api.cmu.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript", "scholarships"]', 'https://www.cmu.ac.th/logo.png'),
('ku', 'มหาวิทยาลัยเกษตรศาสตร์', 'มก.', 'รัฐบาล', 'https://api.ku.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript", "tuition"]', 'https://www.ku.ac.th/logo.png'),
('tu', 'มหาวิทยาลัยธรรมศาสตร์', 'มธ.', 'รัฐบาล', 'https://api.tu.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript"]', 'https://www.tu.ac.th/logo.png'),
('mu', 'มหาวิทยาลัยมหิดล', 'มม.', 'รัฐบาล', 'https://api.mahidol.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript", "scholarships"]', 'https://www.mahidol.ac.th/logo.png'),
('kmitl', 'สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง', 'สจล.', 'รัฐบาล', 'https://api.kmitl.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript"]', 'https://www.kmitl.ac.th/logo.png'),
('bu', 'มหาวิทยาลัยกรุงเทพ', 'มกท.', 'เอกชน', 'https://api.bu.ac.th', 'apikey', '["courses", "grades", "schedule", "tuition"]', 'https://www.bu.ac.th/logo.png'),
('stu', 'มหาวิทยาลัยสงขลานครินทร์', 'ม.อ.', 'รัฐบาล', 'https://api.psu.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript"]', 'https://www.psu.ac.th/logo.png')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can only see their own data" ON users
    FOR ALL USING (auth.uid()::text = id::text);

CREATE POLICY "Users can only see their own schedules" ON schedules
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can only see their own tasks" ON tasks
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can only see their own expenses" ON expenses
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can see accepted friends" ON friends
    FOR ALL USING (
        auth.uid()::text = requester_id::text OR 
        auth.uid()::text = addressee_id::text
    );

-- Function to calculate stress score (PostgreSQL version)
CREATE OR REPLACE FUNCTION calculate_stress_score(p_user_id INTEGER, p_date DATE)
RETURNS TABLE(stress_score INTEGER, stress_level VARCHAR) AS $$
DECLARE
    v_task_count INTEGER := 0;
    v_urgent_count INTEGER := 0;
    v_stress_score INTEGER := 0;
    v_stress_level VARCHAR(20);
BEGIN
    -- Count pending tasks
    SELECT COUNT(*), 
           COUNT(CASE WHEN deadline <= p_date + INTERVAL '3 days' THEN 1 END)
    INTO v_task_count, v_urgent_count
    FROM tasks 
    WHERE user_id = p_user_id 
    AND status != 'completed' 
    AND DATE(deadline) >= p_date;
    
    -- Calculate stress score
    v_stress_score := (v_task_count * 10) + (v_urgent_count * 20);
    v_stress_score := GREATEST(0, LEAST(100, v_stress_score));
    
    -- Determine stress level
    v_stress_level := CASE
        WHEN v_stress_score <= 30 THEN 'normal'
        WHEN v_stress_score <= 60 THEN 'moderate'
        WHEN v_stress_score <= 100 THEN 'high'
        ELSE 'critical'
    END;
    
    -- Insert or update stress analysis
    INSERT INTO stress_analysis (user_id, analysis_date, task_count, urgent_task_count, stress_score, stress_level)
    VALUES (p_user_id, p_date, v_task_count, v_urgent_count, v_stress_score, v_stress_level)
    ON CONFLICT (user_id, analysis_date) 
    DO UPDATE SET 
        task_count = v_task_count,
        urgent_task_count = v_urgent_count,
        stress_score = v_stress_score,
        stress_level = v_stress_level;
    
    RETURN QUERY SELECT v_stress_score, v_stress_level;
END;
$$ LANGUAGE plpgsql;
