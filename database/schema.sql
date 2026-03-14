-- Smart Student Life Manager - Complete Database Schema
-- ฐานข้อมูลระบบจัดการชีวิตนักศึกษาอัจฉริยะ

CREATE DATABASE IF NOT EXISTS smart_student_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_student_db;

-- ============================================
-- 1. USERS TABLE - ตารางผู้ใช้
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    faculty VARCHAR(100),
    major VARCHAR(100),
    year INT DEFAULT 1,
    university VARCHAR(100) DEFAULT 'มหาวิทยาลัยราชภัฏบุรีรัมย์',
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    study_start_time TIME DEFAULT '08:00:00',
    study_end_time TIME DEFAULT '18:00:00',
    daily_study_goal INT DEFAULT 4,
    monthly_budget DECIMAL(10,2) DEFAULT 5000.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. SCHEDULES TABLE - ตารางเรียน
-- ============================================
CREATE TABLE schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_code VARCHAR(20),
    subject_name VARCHAR(100) NOT NULL,
    teacher VARCHAR(100),
    building VARCHAR(50),
    room VARCHAR(20),
    day_of_week INT NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    semester INT DEFAULT 1,
    academic_year INT DEFAULT 2024,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_day (user_id, day_of_week),
    INDEX idx_user_time (user_id, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. TASKS TABLE - ตารางงาน/การบ้าน
-- ============================================
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    deadline DATETIME NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    estimated_hours DECIMAL(4,1) DEFAULT 1.0,
    actual_hours DECIMAL(4,1) DEFAULT 0,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    tags JSON,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_deadline (user_id, deadline),
    INDEX idx_user_status (user_id, status),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. EXPENSES TABLE - ตารางรายรับรายจ่าย
-- ============================================
CREATE TABLE expense_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(50) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50) DEFAULT 'wallet',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description VARCHAR(255),
    payment_method ENUM('cash', 'bank_transfer', 'credit_card', 'mobile_payment', 'other') DEFAULT 'cash',
    is_recurring BOOLEAN DEFAULT FALSE,
    receipt_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, date),
    INDEX idx_user_type (user_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. FRIENDS TABLE - ตารางเพื่อน
-- ============================================
CREATE TABLE friends (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    addressee_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
    message VARCHAR(255),
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_friendship (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id)),
    INDEX idx_requester (requester_id),
    INDEX idx_addressee (addressee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. SHARED_SCHEDULES TABLE - ตารางแชร์ตาราง
-- ============================================
CREATE TABLE shared_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    shared_with_id INT NOT NULL,
    permission ENUM('view', 'edit') DEFAULT 'view',
    share_type ENUM('full', 'specific') DEFAULT 'full',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_share (owner_id, shared_with_id),
    INDEX idx_shared_with (shared_with_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. CHAT_MESSAGES TABLE - ตารางแชท AI
-- ============================================
CREATE TABLE chat_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) DEFAULT 'New Chat',
    context_type ENUM('general', 'schedule', 'task', 'expense', 'stress') DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    role ENUM('user', 'ai', 'system') NOT NULL,
    message TEXT NOT NULL,
    action_type ENUM('general', 'schedule_suggestion', 'task_recommendation', 'expense_advice', 'stress_alert', 'study_plan') DEFAULT 'general',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. STRESS_ANALYSIS TABLE - ตารางวิเคราะห์ความเครียด
-- ============================================
CREATE TABLE stress_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    analysis_date DATE NOT NULL,
    task_count INT DEFAULT 0,
    urgent_task_count INT DEFAULT 0,
    total_estimated_hours DECIMAL(6,1) DEFAULT 0,
    free_hours DECIMAL(6,1) DEFAULT 0,
    busy_days_count INT DEFAULT 0,
    deadline_pressure_score INT DEFAULT 0,
    workload_score INT DEFAULT 0,
    time_pressure_score INT DEFAULT 0,
    stress_score INT DEFAULT 0,
    stress_level ENUM('normal', 'moderate', 'high', 'critical') DEFAULT 'normal',
    recommendations JSON,
    ai_advice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_analysis (user_id, analysis_date),
    INDEX idx_user_date (user_id, analysis_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. NOTIFICATIONS TABLE - ตารางการแจ้งเตือน
-- ============================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('task_deadline', 'schedule_reminder', 'expense_alert', 'stress_warning', 'friend_request', 'system', 'ai_suggestion') NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT,
    related_id INT,
    related_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(255),
    scheduled_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_scheduled (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. STUDY_SESSIONS TABLE - ตารางเวลาเรียน/อ่านหนังสือ
-- ============================================
CREATE TABLE study_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT,
    subject VARCHAR(100),
    session_type ENUM('scheduled', 'actual') DEFAULT 'actual',
    planned_start DATETIME,
    planned_end DATETIME,
    actual_start DATETIME,
    actual_end DATETIME,
    duration_minutes INT,
    productivity_score INT CHECK (productivity_score BETWEEN 1 AND 10),
    notes TEXT,
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, actual_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. AI_RECOMMENDATIONS TABLE - ตารางคำแนะนำ AI
-- ============================================
CREATE TABLE ai_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('study_schedule', 'task_priority', 'expense_budget', 'stress_management', 'break_reminder') NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    action_items JSON,
    scheduled_for DATETIME,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    effectiveness_rating INT CHECK (effectiveness_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_scheduled (user_id, scheduled_for)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 12. FREE_TIME_SLOTS TABLE - ตารางเวลาว่าง
-- ============================================
CREATE TABLE free_time_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    suggested_activity VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insert Default Expense Categories
-- ============================================
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

-- ============================================
-- Create Views for Dashboard
-- ============================================

-- View: สรุปภาระงานรายวัน
CREATE VIEW v_daily_workload AS
SELECT 
    t.user_id,
    DATE(t.deadline) as date,
    COUNT(*) as task_count,
    SUM(CASE WHEN t.deadline <= DATE_ADD(NOW(), INTERVAL 3 DAY) THEN 1 ELSE 0 END) as urgent_count,
    SUM(t.estimated_hours) as total_hours
FROM tasks t
WHERE t.status != 'completed'
GROUP BY t.user_id, DATE(t.deadline);

-- View: สรุปรายจ่ายรายเดือน
CREATE VIEW v_monthly_expenses AS
SELECT 
    user_id,
    YEAR(date) as year,
    MONTH(date) as month,
    type,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count
FROM expenses
GROUP BY user_id, YEAR(date), MONTH(date), type;

-- View: เวลาว่างรายวัน
CREATE VIEW v_daily_free_time AS
SELECT 
    user_id,
    date,
    SUM(duration_minutes) / 60.0 as free_hours
FROM free_time_slots
WHERE is_available = TRUE
GROUP BY user_id, date;

-- ============================================
-- Stored Procedures
-- ============================================

DELIMITER //

-- Procedure: คำนวณความเครียด
CREATE PROCEDURE CalculateStressScore(IN p_user_id INT, IN p_date DATE)
BEGIN
    DECLARE v_task_count INT DEFAULT 0;
    DECLARE v_urgent_count INT DEFAULT 0;
    DECLARE v_free_hours DECIMAL(6,1) DEFAULT 0;
    DECLARE v_stress_score INT DEFAULT 0;
    DECLARE v_stress_level VARCHAR(20);
    
    -- นับจำนวนงานที่ยังไม่เสร็จ
    SELECT COUNT(*), 
           SUM(CASE WHEN deadline <= DATE_ADD(p_date, INTERVAL 3 DAY) THEN 1 ELSE 0 END)
    INTO v_task_count, v_urgent_count
    FROM tasks 
    WHERE user_id = p_user_id 
    AND status != 'completed' 
    AND DATE(deadline) >= p_date;
    
    -- คำนวณเวลาว่าง
    SELECT COALESCE(SUM(duration_minutes) / 60.0, 0)
    INTO v_free_hours
    FROM free_time_slots
    WHERE user_id = p_user_id AND date = p_date AND is_available = TRUE;
    
    -- คำนวณ Stress Score
    SET v_stress_score = (v_task_count * 10) + (v_urgent_count * 20) - (v_free_hours * 5);
    SET v_stress_score = GREATEST(0, LEAST(100, v_stress_score));
    
    -- กำหนดระดับความเครียด
    SET v_stress_level = CASE
        WHEN v_stress_score <= 30 THEN 'normal'
        WHEN v_stress_score <= 60 THEN 'moderate'
        WHEN v_stress_score <= 100 THEN 'high'
        ELSE 'critical'
    END;
    
    -- บันทึกผล
    INSERT INTO stress_analysis 
        (user_id, analysis_date, task_count, urgent_task_count, free_hours, stress_score, stress_level)
    VALUES 
        (p_user_id, p_date, v_task_count, v_urgent_count, v_free_hours, v_stress_score, v_stress_level)
    ON DUPLICATE KEY UPDATE
        task_count = v_task_count,
        urgent_task_count = v_urgent_count,
        free_hours = v_free_hours,
        stress_score = v_stress_score,
        stress_level = v_stress_level;
    
    SELECT v_stress_score as stress_score, v_stress_level as stress_level;
END //

-- Procedure: หาเวลาว่างของเพื่อน
CREATE PROCEDURE GetFriendFreeTime(IN p_user_id INT, IN p_friend_id INT, IN p_date DATE)
BEGIN
    SELECT 
        f.user_id,
        f.date,
        f.start_time,
        f.end_time,
        f.duration_minutes
    FROM free_time_slots f
    WHERE f.user_id = p_friend_id 
    AND f.date = p_date 
    AND f.is_available = TRUE
    AND EXISTS (
        SELECT 1 FROM friends fr 
        WHERE fr.status = 'accepted'
        AND ((fr.requester_id = p_user_id AND fr.addressee_id = p_friend_id)
             OR (fr.requester_id = p_friend_id AND fr.addressee_id = p_user_id))
    )
    ORDER BY f.start_time;
END //

DELIMITER ;

-- ============================================
-- Triggers
-- ============================================

DELIMITER //

-- Trigger: สร้างการแจ้งเตือนเมื่อมี deadline ใกล้เข้ามา
CREATE TRIGGER after_task_insert AFTER INSERT ON tasks
FOR EACH ROW
BEGIN
    IF NEW.deadline <= DATE_ADD(NOW(), INTERVAL 1 DAY) THEN
        INSERT INTO notifications 
            (user_id, type, title, message, related_id, related_type, scheduled_at)
        VALUES 
            (NEW.user_id, 'task_deadline', 'งานใกล้ครบกำหนด!', 
             CONCAT('งาน "', NEW.title, '" ครบกำหนดในอีกไม่กี่ชั่วโมง'),
             NEW.id, 'task', NEW.deadline);
    END IF;
END //

-- Trigger: อัพเดท stress analysis เมื่อ task เปลี่ยนแปลง
CREATE TRIGGER after_task_update AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status AND NEW.status = 'completed' THEN
        CALL CalculateStressScore(NEW.user_id, CURDATE());
    END IF;
END //

DELIMITER ;

-- ============================================
-- 13. UNIVERSITY_SUPPORTED TABLE - ตารางมหาวิทยาลัยที่รองรับ
-- ============================================
CREATE TABLE university_supported (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(50),
    type ENUM('รัฐบาล', 'ราชภัฏ', 'เอกชน') NOT NULL,
    base_url VARCHAR(255),
    auth_type ENUM('oauth2', 'apikey', 'cas') NOT NULL DEFAULT 'oauth2',
    features JSON,
    logo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 14. UNIVERSITY_CONNECTIONS TABLE - ตารางการเชื่อมต่อมหาวิทยาลัย
-- ============================================
CREATE TABLE university_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    university_code VARCHAR(20) NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP NULL,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (university_code) REFERENCES university_supported(code) ON DELETE CASCADE,
    UNIQUE KEY unique_user_university (user_id, university_code),
    INDEX idx_university (university_code, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 15. USER_DEVICES TABLE - ตารางอุปกรณ์ผู้ใช้
-- ============================================
CREATE TABLE user_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    push_token VARCHAR(255) NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    platform ENUM('ios', 'android', 'web') NOT NULL,
    device_model VARCHAR(100),
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_device (user_id, device_id),
    INDEX idx_push_token (push_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insert Supported Universities
-- ============================================
INSERT INTO university_supported (code, name, short_name, type, base_url, auth_type, features, logo_url) VALUES
('bru', 'มหาวิทยาลัยราชภัฏบุรีรัมย์', 'มรภ.บุรีรัมย์', 'ราชภัฏ', 'https://api.bru.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript", "tuition"]', 'https://www.bru.ac.th/logo.png'),
('mju', 'มหาวิทยาลัยแม่โจ้', 'มมจ.', 'ราชภัฏ', 'https://api.mju.ac.th', 'apikey', '["courses", "grades", "schedule"]', 'https://www.mju.ac.th/logo.png'),
('cmu', 'มหาวิทยาลัยเชียงใหม่', 'มช.', 'รัฐบาล', 'https://api.cmu.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript", "scholarships"]', 'https://www.cmu.ac.th/logo.png'),
('ku', 'มหาวิทยาลัยเกษตรศาสตร์', 'มก.', 'รัฐบาล', 'https://api.ku.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript", "tuition"]', 'https://www.ku.ac.th/logo.png'),
('tu', 'มหาวิทยาลัยธรรมศาสตร์', 'มธ.', 'รัฐบาล', 'https://api.tu.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript"]', 'https://www.tu.ac.th/logo.png'),
('mu', 'มหาวิทยาลัยมหิดล', 'มม.', 'รัฐบาล', 'https://api.mahidol.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript", "scholarships"]', 'https://www.mahidol.ac.th/logo.png'),
('kmitl', 'สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง', 'สจล.', 'รัฐบาล', 'https://api.kmitl.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript"]', 'https://www.kmitl.ac.th/logo.png'),
('bu', 'มหาวิทยาลัยกรุงเทพ', 'มกท.', 'เอกชน', 'https://api.bu.ac.th', 'apikey', '["courses", "grades", "schedule", "tuition"]', 'https://www.bu.ac.th/logo.png'),
('stu', 'มหาวิทยาลัยสงขลานครินทร์', 'ม.อ.', 'รัฐบาล', 'https://api.psu.ac.th', 'oauth2', '["courses", "grades", "schedule", "transcript"]', 'https://www.psu.ac.th/logo.png');
