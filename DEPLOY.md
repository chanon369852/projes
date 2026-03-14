# 🚀 คู่มือการ Deploy Smart Student Life Manager

## ขั้นตอนการติดตั้งและ Deploy

### 1. ความต้องการระบบ

- **Node.js** v18+ 
- **MySQL** 8.0+
- **npm** หรือ **yarn**
- **Docker** (optional สำหรับ containerized deployment)

### 2. การติดตั้งแบบ Manual

```bash
# 1. Clone หรือดาวน์โหลดโปรเจค
cd smart-student-life-manager

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env
cp .env.example .env

# 4. แก้ไขไฟล์ .env ด้วยค่าที่ถูกต้อง
```

### 3. การตั้งค่า .env

```env
# Application
NODE_ENV=production
PORT=3000

# Database (MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=smart_student_db

# JWT Secret (สร้าง random string ยาวๆ)
JWT_SECRET=your-super-secret-key-change-this-in-production-123456789

# Optional: OpenAI API (สำหรับ AI ขั้นสูง)
OPENAI_API_KEY=sk-your-openai-api-key

# Optional: Redis (สำหรับ caching)
REDIS_URL=redis://localhost:6379
```

### 4. การสร้าง Database

```bash
# 1. เข้า MySQL
mysql -u root -p

# 2. รัน SQL script
mysql -u root -p smart_student_db < database/schema.sql

# หรือใช้ npm script
npm run setup-db
```

### 5. การรันระบบ

```bash
# Development mode
npm run dev

# Production mode
npm start
```

เซิร์ฟเวอร์จะรันที่ `http://localhost:3000`

### 6. การ Deploy ด้วย Docker (แนะนำ)

```bash
# 1. สร้าง Docker images
docker-compose build

# 2. รันระบบทั้งหมด
docker-compose up -d

# 3. ตรวจสอบสถานะ
docker-compose ps

# 4. ดู logs
docker-compose logs -f app
```

**Services ที่รันใน Docker:**
- **app**: Node.js API (port 3000)
- **mysql**: Database (port 3306)
- **redis**: Cache (port 6379)
- **nginx**: Reverse proxy (port 80, 443)
- **phpmyadmin**: Database admin (port 8080)

### 7. การ Deploy บน VPS/Cloud

#### 7.1 เตรียม Server

```bash
# อัพเดทระบบ
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Docker
sudo apt install docker.io docker-compose -y

# ติดตั้ง Nginx
sudo apt install nginx -y
```

#### 7.2 ตั้งค่า Nginx

```nginx
# /etc/nginx/sites-available/smart-student
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

```bash
# เปิดใช้งาน
sudo ln -s /etc/nginx/sites-available/smart-student /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7.3 ตั้งค่า SSL (Let's Encrypt)

```bash
# ติดตั้ง certbot
sudo apt install certbot python3-certbot-nginx -y

# สร้าง SSL certificate
sudo certbot --nginx -d your-domain.com
```

#### 7.4 Deploy ด้วย GitHub Actions (CI/CD)

1. Fork โปรเจคไปยัง GitHub ของคุณ
2. ตั้งค่า Secrets ใน GitHub:
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`
   - `VPS_HOST`
   - `VPS_USER`
   - `VPS_SSH_KEY`

3. Push code ไปยัง `main` branch จะ trigger auto-deploy

### 8. การตั้งค่า Mobile App

```bash
cd mobile

# ติดตั้ง dependencies
npm install

# รันใน development mode
npx expo start

# Build สำหรับ production
npx expo build:android
npx expo build:ios
```

### 9. การ Backup และ Maintenance

#### 9.1 Backup Database

```bash
# สร้าง backup
mysqldump -u root -p smart_student_db > backup-$(date +%Y%m%d).sql

# กู้คืน
mysql -u root -p smart_student_db < backup-20240101.sql
```

#### 9.2 ดู Logs

```bash
# ดู logs ของ application
tail -f logs/app-$(date +%Y-%m-%d).log

# ดู logs ของ Docker
docker-compose logs -f app

# ดู error logs
tail -f logs/error-$(date +%Y-%m-%d).log
```

#### 9.3 Restart Services

```bash
# Restart application
npm restart

# Restart with Docker
docker-compose restart

# หรือ rebuild ทั้งหมด
docker-compose down
docker-compose up -d --build
```

### 10. Troubleshooting

#### 10.1 Database Connection Error

```bash
# ตรวจสอบ MySQL รันหรือไม่
sudo systemctl status mysql

# Restart MySQL
sudo systemctl restart mysql

# ตรวจสอบ port
sudo netstat -tlnp | grep 3306
```

#### 10.2 Port 3000 Already in Use

```bash
# หา process ที่ใช้ port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

#### 10.3 Permission Denied

```bash
# Fix permissions
sudo chown -R $USER:$USER /path/to/project
chmod -R 755 /path/to/project
```

### 11. Security Checklist

- [ ] เปลี่ยน JWT_SECRET เป็น random string ยาวๆ
- [ ] ตั้งรหัสผ่าน MySQL ที่แข็งแกร่ง
- [ ] เปิดใช้งาน SSL (HTTPS)
- [ ] ตั้งค่า Firewall (ufw/iptables)
- [ ] ปิด port ที่ไม่จำเป็น
- [ ] อัพเดท dependencies อย่างสม่ำเสมอ
- [ ] ตั้งค่า Rate Limiting
- [ ] เปิดใช้งาน Helmet security headers

### 12. Performance Tuning

#### 12.1 MySQL Optimization

```sql
-- เพิ่ม performance
SET GLOBAL max_connections = 200;
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
```

#### 12.2 Node.js Optimization

```bash
# ใช้ PM2 สำหรับ process management
npm install -g pm2

# รันด้วย PM2
pm2 start server.js --name "smart-student"
pm2 save
pm2 startup
```

### 13. Monitoring

```bash
# ติดตั้ง PM2
npm install -g pm2

# ดู status
pm2 status

# ดู logs
pm2 logs

# Monitor
pm2 monit
```

### 14. Support

หากมีปัญหาในการ deploy:
1. ตรวจสอบ logs ใน `logs/` directory
2. ตรวจสอบว่า services ทั้งหมดรันถูกต้อง
3. ตรวจสอบ firewall และ network settings
4. ดู README.md สำหรับข้อมูลเพิ่มเติม

---

**เสร็จสมบูรณ์!** 🎓 ระบบพร้อมใช้งานแล้ว!
