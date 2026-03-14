# Smart Student Life Manager
## ระบบจัดการชีวิตนักศึกษาอัจฉริยะ

---

## 📋 สารบัญ

1. [ภาพรวมโครงการ](#1-ภาพรวมโครงการ)
2. [ER Diagram](#2-er-diagram)
3. [โครงสร้างฐานข้อมูล](#3-โครงสร้างฐานข้อมูล)
4. [API Documentation](#4-api-documentation)
5. [คู่มือการติดตั้ง](#5-คู่มือการติดตั้ง)
6. [โครงสร้างโปรเจค](#6-โครงสร้างโปรเจค)

---

## 1. ภาพรวมโครงการ

### ชื่อโครงการ
**Smart Student Life Manager: ระบบจัดการชีวิตนักศึกษาอัจฉริยะ**

### หลักการและเหตุผล
นักศึกษามหาวิทยาลัยมักประสบปัญหา:
- ตารางเรียนไม่เป็นระบบ
- งานและ deadline จำนวนมาก
- การบริหารเวลาไม่ดี
- การใช้เงินเกินงบประมาณ

ปัจจุบันมีแอปจัดการงาน เช่น Notion หรือ Todoist แต่ยังไม่มีระบบที่ออกแบบมาเฉพาะสำหรับชีวิตนักศึกษาที่รวมตารางเรียน งาน/deadline การเงิน และการวิเคราะห์ข้อมูล

### วัตถุประสงค์
1. พัฒนาระบบจัดการตารางเรียนและงานของนักศึกษา
2. ช่วยนักศึกษาวางแผนการใช้เวลาในการเรียน
3. พัฒนาระบบบันทึกรายรับรายจ่ายสำหรับนักศึกษา
4. วิเคราะห์พฤติกรรมการใช้เวลาและการใช้เงิน
5. พัฒนา AI Chat ช่วยวางแผนการเรียนและชีวิตประจำวัน

---

## 2. ER Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           SMART STUDENT LIFE MANAGER                                  │
│                              Entity Relationship Diagram                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│       users          │
├──────────────────────┤
│ PK id (INT)          │
│ student_id (VARCHAR) │
│ email (VARCHAR)      │
│ password (VARCHAR)   │
│ full_name (VARCHAR)  │
│ nickname (VARCHAR)   │
│ faculty (VARCHAR)    │
│ major (VARCHAR)      │
│ year (INT)           │
│ university (VARCHAR)  │
│ phone (VARCHAR)      │
│ avatar_url (VARCHAR) │
│ monthly_budget (DEC) │
│ is_active (BOOLEAN)   │
│ created_at (TS)      │
└──────────┬───────────┘
           │
           │ 1:N
           ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│     schedules        │    │       tasks          │    │     expenses         │
├──────────────────────┤    ├──────────────────────┤    ├──────────────────────┤
│ PK id (INT)          │    │ PK id (INT)          │    │ PK id (INT)          │
│ FK user_id (INT)     │    │ FK user_id (INT)     │    │ FK user_id (INT)     │
│ subject_code (VARCHAR)│   │ title (VARCHAR)      │    │ FK category_id (INT) │
│ subject_name (VARCHAR)│   │ description (TEXT)   │    │ type (ENUM)          │
│ teacher (VARCHAR)    │    │ subject (VARCHAR)    │    │ amount (DECIMAL)     │
│ building (VARCHAR)   │    │ deadline (DATETIME)  │    │ date (DATE)          │
│ room (VARCHAR)      │    │ priority (ENUM)      │    │ description (VARCHAR)│
│ day_of_week (INT)   │    │ status (ENUM)        │    │ payment_method (ENUM)│
│ start_time (TIME)   │    │ estimated_hours (DEC)│    │ created_at (TS)      │
│ end_time (TIME)     │    │ difficulty (ENUM)    │    └──────────┬───────────┘
│ color (VARCHAR)     │    │ tags (JSON)          │               │
│ is_active (BOOLEAN) │    │ created_at (TS)      │               │ N:1
└──────────────────────┘    └──────────────────────┘               ▼
                                                                     ┌──────────────────────┐
                                                                     │ expense_categories   │
                                                                     ├──────────────────────┤
                                                                     │ PK id (INT)          │
                                                                     │ FK user_id (INT)     │
                                                                     │ name (VARCHAR)       │
                                                                     │ type (ENUM)          │
                                                                     │ color (VARCHAR)      │
                                                                     │ icon (VARCHAR)       │
                                                                     │ is_default (BOOLEAN) │
                                                                     └──────────────────────┘

           │ 1:N
           ▼
┌──────────────────────┐    ┌──────────────────────┐
│   chat_conversations │    │  chat_messages       │
├──────────────────────┤    ├──────────────────────┤
│ PK id (INT)          │    │ PK id (INT)          │
│ FK user_id (INT)     │───>│ FK conversation_id   │
│ title (VARCHAR)      │ 1:N│ role (ENUM)          │
│ context_type (ENUM)  │    │ message (TEXT)       │
│ is_active (BOOLEAN) │    │ action_type (ENUM)   │
│ created_at (TS)      │    │ metadata (JSON)      │
└──────────────────────┘    │ created_at (TS)      │
                            └──────────────────────┘

           │ 1:N
           ▼
┌──────────────────────┐
│  stress_analysis     │
├──────────────────────┤
│ PK id (INT)          │
│ FK user_id (INT)     │
│ analysis_date (DATE) │
│ task_count (INT)     │
│ urgent_task_count (INT)│
│ free_hours (DECIMAL) │
│ stress_score (INT)   │
│ stress_level (ENUM)  │
│ recommendations (JSON)│
│ created_at (TS)      │
└──────────────────────┘

           │ 1:N                                       ┌──────────────────────┐
           ▼                                           │  shared_schedules    │
┌──────────────────────┐    ┌──────────────────────┐  ├──────────────────────┤
│      friends         │    │   notifications      │  │ PK id (INT)          │
├──────────────────────┤    ├──────────────────────┤  │ FK owner_id (INT)    │
│ PK id (INT)          │    │ PK id (INT)          │  │ FK shared_with_id    │
│ FK requester_id (INT)│    │ FK user_id (INT)     │  │ permission (ENUM)    │
│ FK addressee_id (INT)│    │ type (ENUM)          │  │ is_active (BOOLEAN) │
│ status (ENUM)        │    │ title (VARCHAR)      │  │ created_at (TS)      │
│ message (VARCHAR)    │    │ message (TEXT)       │  └──────────────────────┘
│ accepted_at (TS)     │    │ is_read (BOOLEAN)   │
│ created_at (TS)      │    │ created_at (TS)      │
└──────────────────────┘    └──────────────────────┘

           │ 1:N
           ▼
┌──────────────────────┐
│  study_sessions      │
├──────────────────────┤
│ PK id (INT)          │
│ FK user_id (INT)     │
│ FK task_id (INT)     │
│ subject (VARCHAR)    │
│ actual_start (TS)    │
│ actual_end (TS)      │
│ duration_minutes (INT)│
│ productivity_score (INT)│
│ created_at (TS)      │
└──────────────────────┘

           │ 1:N
           ▼
┌──────────────────────┐
│ ai_recommendations   │
├──────────────────────┤
│ PK id (INT)          │
│ FK user_id (INT)     │
│ type (ENUM)          │
│ title (VARCHAR)      │
│ description (TEXT)   │
│ action_items (JSON)  │
│ is_completed (BOOLEAN)│
│ created_at (TS)      │
└──────────────────────┘
```

---

## 3. โครงสร้างฐานข้อมูล

### ตารางหลักทั้งหมด (12 ตาราง)

| ลำดับ | ชื่อตาราง | คำอธิบาย | จำนวนฟิลด์ |
|-------|-----------|---------|------------|
| 1 | users | ข้อมูลผู้ใช้ | 16 |
| 2 | schedules | ตารางเรียน | 13 |
| 3 | tasks | งาน/deadline | 14 |
| 4 | expenses | รายรับรายจ่าย | 11 |
| 5 | expense_categories | หมวดหมู่ค่าใช้จ่าย | 7 |
| 6 | friends | ระบบเพื่อน | 6 |
| 7 | shared_schedules | การแชร์ตาราง | 6 |
| 8 | chat_conversations | บทสนทนา AI | 6 |
| 9 | chat_messages | ข้อความแชท | 6 |
| 10 | stress_analysis | วิเคราะห์ความเครียด | 9 |
| 11 | study_sessions | เวลาเรียน/อ่านหนังสือ | 9 |
| 12 | ai_recommendations | คำแนะนำ AI | 8 |

---

## 4. API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | สมัครสมาชิก |
| POST | /api/auth/login | เข้าสู่ระบบ |
| GET | /api/auth/me | ข้อมูลผู้ใช้ปัจจุบัน |
| PUT | /api/auth/profile | แก้ไขโปรไฟล์ |

### Schedule Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/schedules | ดูตารางเรียนทั้งหมด |
| POST | /api/schedules | เพิ่มวิชา |
| PUT | /api/schedules/:id | แก้ไขวิชา |
| DELETE | /api/schedules/:id | ลบวิชา |
| GET | /api/schedules/view/weekly | ดูตารางรายสัปดาห์ |

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | ดูงานทั้งหมด |
| POST | /api/tasks | เพิ่มงาน |
| PUT | /api/tasks/:id | แก้ไขงาน |
| DELETE | /api/tasks/:id | ลบงาน |
| GET | /api/tasks/filter/upcoming | ดูงานที่กำลังจะมาถึง |
| GET | /api/tasks/stats/summary | สถิติงาน |

### Expense Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/expenses | ดูรายการทั้งหมด |
| POST | /api/expenses | เพิ่มรายการ |
| PUT | /api/expenses/:id | แก้ไขรายการ |
| DELETE | /api/expenses/:id | ลบรายการ |
| GET | /api/expenses/categories | ดูหมวดหมู่ |
| GET | /api/expenses/summary/monthly | สรุปรายเดือน |
| GET | /api/expenses/summary/trends | แนวโน้ม |

### AI Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chat/conversations | ดูบทสนทนาทั้งหมด |
| POST | /api/chat/conversations | สร้างบทสนทนาใหม่ |
| GET | /api/chat/conversations/:id/messages | ดูข้อความ |
| POST | /api/chat/conversations/:id/messages | ส่งข้อความ |
| POST | /api/chat/quick-ask | ถาม AI ด่วน |

### Stress Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/stress/current | ดูความเครียดปัจจุบัน |
| GET | /api/stress/history | ประวัติความเครียด |
| POST | /api/stress/calculate | คำนวณความเครียด |
| GET | /api/stress/workload | รายละเอียดภาระงาน |

### Friends Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/friends | ดูเพื่อนทั้งหมด |
| GET | /api/friends/requests | ดูคำขอเป็นเพื่อน |
| POST | /api/friends/request | ส่งคำขอเป็นเพื่อน |
| PUT | /api/friends/accept/:id | ยอมรับคำขอ |
| DELETE | /api/friends/:id | ลบเพื่อน |
| GET | /api/friends/friend-schedule/:id | ดูตารางเพื่อน |

### Dashboard Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | ข้อมูล Dashboard ทั้งหมด |

---

## 5. คู่มือการติดตั้ง

### ความต้องการระบบ

- Node.js 18+ 
- MySQL 8.0+
- npm หรือ yarn

### ขั้นตอนการติดตั้ง

```bash
# 1. Clone โปรเจค (หรือใช้โฟลเดอร์ที่มีโค้ด)
cd smart-student-life-manager

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_student_db
JWT_SECRET=your-secret-key-2024

# 4. สร้างฐานข้อมูลและตาราง
mysql -u root -p < database/schema.sql

# 5. เริ่มต้นเซิร์ฟเวอร์
npm start

# หรือใช้ nodemon สำหรับ development
npm run dev
```

### การเข้าใช้งาน

เปิด browser ที่ `http://localhost:3000`

---

## 6. โครงสร้างโปรเจค

```
smart-student-life-manager/
├── config/
│   └── config.js           # การตั้งค่าแอป
├── database/
│   ├── connection.js       # การเชื่อมต่อ MySQL
│   └── schema.sql          # สคริปต์สร้างฐานข้อมูล
├── middleware/
│   └── auth.js             # JWT Authentication
├── routes/
│   ├── auth.js             # Auth endpoints
│   ├── users.js            # User endpoints
│   ├── schedules.js        # Schedule endpoints
│   ├── tasks.js            # Task endpoints
│   ├── expenses.js         # Expense endpoints
│   ├── friends.js          # Friend endpoints
│   ├── chat.js             # AI Chat endpoints
│   ├── stress.js           # Stress analysis endpoints
│   ├── dashboard.js        # Dashboard endpoint
│   └── ai.js               # AI recommendations
├── public/                 # Frontend files
│   ├── index.html          # Main HTML
│   ├── css/
│   │   └── style.css       # Stylesheet
│   └── js/
│       ├── api.js          # API client
│       ├── app.js          # Main app logic
│       ├── dashboard.js    # Dashboard JS
│       ├── schedule.js     # Schedule JS
│       ├── tasks.js        # Tasks JS
│       ├── expenses.js     # Expenses JS
│       ├── ai-planner.js   # AI Planner JS
│       ├── friends.js      # Friends JS
│       └── stress.js       # Stress JS
├── server.js               # Entry point
├── package.json            # Dependencies
└── README.md               # เอกสารนี้
```

---

## ฟีเจอร์หลักของระบบ

### 🤖 AI Life Planner
- วิเคราะห์ตารางเรียนและเวลาว่าง
- แนะนำเวลาอ่านหนังสือที่เหมาะสม
- ตอบคำถามเกี่ยวกับการจัดการเวลา

### 📅 Schedule Manager
- เพิ่ม/แก้ไข/ลบ ตารางเรียน
- แสดงตารางรายสัปดาห์
- ตรวจจับช่วงเวลาชน

### ✅ Task Manager
- จัดการงานและ deadline
- ระบบ priority (low, medium, high, urgent)
- แจ้งเตือนงานใกล้ครบกำหนด

### 💰 Expense Tracker
- บันทึกรายรับรายจ่าย
- หมวดหมู่ค่าใช้จ่าย
- กราฟสรุปรายเดือน

### 👥 Friend Sharing
- เพิ่มเพื่อนในระบบ
- แชร์ตารางเรียน
- ดูเวลาว่างของเพื่อน

### 😵‍💫 Stress Analyzer
- คำนวณความเครียดจากสูตร:
  ```
  Stress Score = (จำนวนงาน × 10) + (deadline ภายใน 3 วัน × 20) - (เวลาว่าง × 5)
  ```
- ระดับความเครียด: 0-30 ปกติ, 31-60 เริ่มเครียด, 61-100 เครียดสูง
- คำแนะนำอัตโนมัติ

### 📊 Dashboard
- สรุปภาพรวมทั้งหมด
- งานเร่งด่วน
- สถานะความเครียด
- คำแนะนำจาก AI

---

## เทคโนโลยีที่ใช้

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL2** - Database driver
- **bcryptjs** - Password hashing
- **jsonwebtoken** - Authentication
- **express-validator** - Input validation

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling with CSS Variables
- **Vanilla JavaScript** - No framework
- **Font Awesome** - Icons
- **Google Fonts** - Typography (Kanit, Inter)

### Database
- **MySQL 8.0** - Relational database
- Stored Procedures
- Triggers
- Views

---

## ผู้พัฒนา

**Smart Student Life Manager**  
พัฒนาโดย: ทีมพัฒนาระบบ  
มหาวิทยาลัยราชภัฏบุรีรัมย์

---

**Version:** 1.0.0  
**Last Updated:** มีนาคม 2026
