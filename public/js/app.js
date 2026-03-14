// Main Application Logic for Smart Student Life Manager

// Global state
let currentUser = null;
let currentPage = 'dashboard';
let dashboardData = null;

// ============ Toast Notification System ============
function showNotification(message, type = 'info', duration = 5000) {
  // Remove existing notification
  const existing = document.getElementById('toastNotification');
  if (existing) existing.remove();

  const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle', email: 'envelope' };
  const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', email: '#8b5cf6' };

  const toast = document.createElement('div');
  toast.id = 'toastNotification';
  toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <i class="fas fa-${icons[type] || icons.info}" style="font-size:22px;color:${colors[type] || colors.info};margin-top:2px;flex-shrink:0;"></i>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:14px;color:#1e293b;margin-bottom:4px;">${type === 'email' ? '📧 ตรวจสอบอีเมลของคุณ!' : type === 'success' ? '✅ สำเร็จ!' : type === 'error' ? '❌ เกิดข้อผิดพลาด' : type === 'warning' ? '⚠️ คำเตือน' : 'ℹ️ แจ้งเตือน'}</div>
        <div style="font-size:13px;color:#475569;line-height:1.5;">${message}</div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;padding:0;margin-top:-2px;">&times;</button>
    </div>
    <div id="toastProgress" style="position:absolute;bottom:0;left:0;height:3px;background:${colors[type] || colors.info};border-radius:0 0 12px 12px;width:100%;transition:width linear ${duration}ms;"></div>
  `;
  toast.style.cssText = `
    position:fixed;top:20px;right:20px;z-index:99999;
    background:white;border-radius:12px;padding:16px 20px 20px;
    box-shadow:0 10px 40px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.1);
    max-width:380px;min-width:300px;overflow:hidden;
    animation:slideInRight 0.3s cubic-bezier(0.175,0.885,0.32,1.275);
    border-left:4px solid ${colors[type] || colors.info};
  `;

  // Add animation keyframes if not already added
  if (!document.getElementById('toastStyle')) {
    const style = document.createElement('style');
    style.id = 'toastStyle';
    style.textContent = `@keyframes slideInRight { from { transform:translateX(120%);opacity:0; } to { transform:translateX(0);opacity:1; } }`;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Progress bar animation
  requestAnimationFrame(() => {
    const bar = document.getElementById('toastProgress');
    if (bar) bar.style.width = '0%';
  });

  // Auto remove
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'slideInRight 0.3s reverse';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}
// ============================================================

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Check for existing token
  const token = localStorage.getItem('token');
  
  if (token) {
    api.token = token;
    loadUserAndDashboard();
  } else {
    showLandingPage();
  }

  // Setup event listeners
  setupEventListeners();
  updateCurrentDate();
}

// Landing Page & Auth Functions
function showLandingPage() {
  const lp = document.getElementById('landingPage');
  if(lp) lp.classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showAuthModal() {
  document.getElementById('authModal').classList.add('active');
}

function hideAuthModal() {
  document.getElementById('authModal').classList.remove('active');
  const lp = document.getElementById('landingPage');
  if(lp) lp.classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tab = btn.dataset.tab;
      document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
      document.getElementById(`${tab}Form`).classList.remove('hidden');
    });
  });

  // Login form
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  
  // Register form
  document.getElementById('registerForm').addEventListener('submit', handleRegister);

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });

  // Quick Ask
  document.getElementById('quickAskBtn').addEventListener('click', () => {
    document.getElementById('quickAskModal').classList.add('active');
  });

  // Notifications
  document.getElementById('notificationBtn').addEventListener('click', () => {
    document.getElementById('notificationModal').classList.add('active');
  });

  // CSP Replacements for onclick
  const navAuthBtn = document.getElementById('navAuthBtn');
  if (navAuthBtn) navAuthBtn.addEventListener('click', (e) => { e.preventDefault(); showAuthModal(); });

  const heroAuthBtn = document.getElementById('heroAuthBtn');
  if (heroAuthBtn) heroAuthBtn.addEventListener('click', showAuthModal);
  
  const ctaAuthBtn = document.getElementById('ctaAuthBtn');
  if (ctaAuthBtn) ctaAuthBtn.addEventListener('click', showAuthModal);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  const closeQuickAskBtn = document.getElementById('closeQuickAskBtn');
  if (closeQuickAskBtn) closeQuickAskBtn.addEventListener('click', () => closeModal('quickAskModal'));

  const sendQuickAskBtn = document.getElementById('sendQuickAskBtn');
  if (sendQuickAskBtn) sendQuickAskBtn.addEventListener('click', () => {
    if(typeof sendQuickAsk === 'function') sendQuickAsk();
  });

  const closeNotificationBtn = document.getElementById('closeNotificationBtn');
  if (closeNotificationBtn) closeNotificationBtn.addEventListener('click', () => closeModal('notificationModal'));
}

async function handleLogin(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const btn = e.target.querySelector('button[type="submit"]');

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเข้าสู่ระบบ...'; }

  try {
    const data = await api.login(formData.get('email'), formData.get('password'));

    localStorage.setItem('token', data.token);
    api.token = data.token;
    currentUser = data.user;

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ'; }
    hideAuthModal();
    loadDashboard();
  } catch (error) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ'; }
    if (error.message && error.message.includes('verified')) {
      showNotification('บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาตรวจผลอื่นที่อีเมลของคุณและคลิกลิงก์ยืนยัน', 'warning', 7000);
    } else {
      showNotification(error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
    }
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const btn = document.getElementById('registerSubmitBtn');

  // Loading state
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังดำเนินการ...'; }

  const userData = {
    student_id: formData.get('student_id'),
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
    nickname: formData.get('nickname'),
    faculty: formData.get('faculty'),
    major: formData.get('major'),
    university: formData.get('university'),
    year: formData.get('year') || 1,
    phone: formData.get('phone')
  };

  try {
    const data = await api.register(userData);

    // Reset button
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> สมัครสมาชิก'; }

    // Check if verification is required
    if (data.requires_verification) {
      const email = userData.email;
      showNotification(
        `สมัครสำเร็จ! ผมส่งลิงก์ยืนยันตัวตนไปยัง <strong>${email}</strong> แล้วครับ<br>กรุณาคลิกลิงก์ในอีเมลเพื่อเปิดใช้งานบัญชีของคุณ`,
        'email', 8000
      );
      // Switch tab to login
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="login"]').classList.add('active');
      document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
      document.getElementById('loginForm').classList.remove('hidden');
      // Pre-fill email in login form
      const loginEmailInput = document.querySelector('#loginForm input[name="email"]');
      if (loginEmailInput) loginEmailInput.value = email;
      return;
    }

    localStorage.setItem('token', data.token);
    api.token = data.token;
    currentUser = data.user;

    hideAuthModal();
    loadDashboard();
  } catch (error) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> สมัครสมาชิก'; }
    showNotification(error.message || 'Registration failed', 'error');
  }
}

async function loadUserAndDashboard() {
  try {
    const data = await api.getCurrentUser();
    currentUser = data.user;
    
    document.getElementById('userName').textContent = currentUser.full_name;
    
    hideAuthModal();
    loadDashboard();
  } catch (error) {
    console.error('Failed to load user:', error);
    logout();
  }
}

function logout() {
  localStorage.removeItem('token');
  api.token = null;
  currentUser = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('landingPage').classList.remove('hidden');
  showAuthModal(); // Optionally show modal on logout, or just show landing
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('authModal');
  if (event.target === modal) {
    modal.classList.remove('active');
  }
}


// Navigation
function navigateTo(page) {
  currentPage = page;
  
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });

  // Update page title
  const titles = {
    'dashboard': 'Dashboard',
    'schedule': 'ตารางเรียน',
    'tasks': 'งาน / Deadline',
    'expenses': 'รายรับรายจ่าย',
    'ai-planner': 'AI Life Planner',
    'friends': 'เพื่อน',
    'stress': 'วิเคราะห์ความเครียด'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  // Load page content
  switch(page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'schedule':
      loadSchedulePage();
      break;
    case 'tasks':
      loadTasksPage();
      break;
    case 'expenses':
      loadExpensesPage();
      break;
    case 'ai-planner':
      loadAIPlannerPage();
      break;
    case 'friends':
      loadFriendsPage();
      break;
    case 'stress':
      loadStressPage();
      break;
  }
}

// Dashboard
async function loadDashboard() {
  const contentArea = document.getElementById('contentArea');
  
  try {
    dashboardData = await api.getDashboard();
    renderDashboard(contentArea, dashboardData);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    contentArea.innerHTML = '<div class="error">Failed to load dashboard data</div>';
  }
}

function renderDashboard(container, data) {
  const todaySchedule = data.today.schedule || [];
  const upcomingTasks = data.tasks.upcoming || [];
  const urgentCount = data.tasks.urgent_count || 0;
  const stress = data.stress || { score: 0, level: 'normal' };
  const expenses = data.expenses || { summary: {}, by_category: [] };
  const suggestions = data.ai_suggestions || [];
  
  let suggestionsHTML = suggestions.slice(0, 3).map(s => `
    <div class="suggestion-card ${s.priority}">
      <div class="suggestion-icon">
        <i class="fas fa-${s.type === 'urgent_task' ? 'exclamation-circle' : 
                          s.type === 'stress_warning' ? 'brain' : 
                          s.type === 'expense_warning' ? 'wallet' : 'lightbulb'}"></i>
      </div>
      <div class="suggestion-content">
        <h4>${s.title}</h4>
        <p>${s.message}</p>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- Welcome Card -->
      <div class="card welcome-card">
        <h3>${data.greeting}, ${data.user.name}!</h3>
        <p>วันนี้วัน${data.today.day_name}ที่ ${data.today.date} คุณมี ${todaySchedule.length} คาบเรียน</p>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon primary">
            <i class="fas fa-tasks"></i>
          </div>
          <div class="stat-info">
            <h4>${urgentCount}</h4>
            <span>งานเร่งด่วน</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning">
            <i class="fas fa-calendar"></i>
          </div>
          <div class="stat-info">
            <h4>${todaySchedule.length}</h4>
            <span>คาบเรียนวันนี้</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success">
            <i class="fas fa-wallet"></i>
          </div>
          <div class="stat-info">
            <h4>฿${(expenses.summary.total_expense || 0).toFixed(0)}</h4>
            <span>ใช้จ่ายเดือนนี้</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon ${stress.level === 'high' ? 'danger' : 'success'}">
            <i class="fas fa-brain"></i>
          </div>
          <div class="stat-info">
            <h4>${stress.score}</h4>
            <span>คะแนนความเครียด</span>
          </div>
        </div>
      </div>

      <!-- Today's Schedule -->
      <div class="card schedule-section">
        <div class="card-header">
          <div class="card-title">
            <i class="fas fa-calendar-day"></i>
            <span>ตารางเรียนวันนี้</span>
          </div>
          <button class="btn btn-secondary" onclick="navigateTo('schedule')">
            <i class="fas fa-plus"></i> เพิ่มวิชา
          </button>
        </div>
        <div class="card-body">
          ${todaySchedule.length > 0 ? `
            <div class="today-schedule">
              ${todaySchedule.map(s => `
                <div class="schedule-item" style="border-left-color: ${s.color}">
                  <div class="schedule-time">${s.start_time?.substring(0, 5)} - ${s.end_time?.substring(0, 5)}</div>
                  <div class="schedule-details">
                    <h4>${s.subject_name}</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${s.building || '-'} ${s.room || ''}</p>
                    ${s.teacher ? `<p><i class="fas fa-chalkboard-teacher"></i> ${s.teacher}</p>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-state">
              <i class="fas fa-coffee"></i>
              <p>วันนี้ไม่มีตารางเรียน เป็นวันที่ดีสำหรับการอ่านหนังสือ!</p>
            </div>
          `}
        </div>
      </div>

      <!-- Upcoming Tasks -->
      <div class="card" style="grid-column: span 4;">
        <div class="card-header">
          <div class="card-title">
            <i class="fas fa-clock"></i>
            <span>งานที่กำลังจะมาถึง</span>
          </div>
          <button class="btn btn-secondary" onclick="navigateTo('tasks')">
            <i class="fas fa-plus"></i> เพิ่มงาน
          </button>
        </div>
        <div class="card-body">
          ${upcomingTasks.length > 0 ? `
            <div class="task-list compact">
              ${upcomingTasks.slice(0, 5).map(t => `
                <div class="task-item">
                  <div class="task-content">
                    <h4>${t.title}</h4>
                    <p><i class="fas fa-calendar"></i> ${new Date(t.deadline).toLocaleDateString('th-TH')}</p>
                  </div>
                  <span class="priority-badge ${t.priority}">${t.priority}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-state">
              <i class="fas fa-check-circle"></i>
              <p>ไม่มีงานเร่งด่วน! คุณทำได้ดีมาก</p>
            </div>
          `}
        </div>
      </div>

      <!-- AI Suggestions -->
      <div class="card" style="grid-column: span 4;">
        <div class="card-header">
          <div class="card-title">
            <i class="fas fa-robot"></i>
            <span>คำแนะนำจาก AI</span>
          </div>
        </div>
        <div class="card-body">
          ${suggestionsHTML || `
            <div class="empty-state">
              <i class="fas fa-smile"></i>
              <p>ทุกอย่างดูดี! ไม่มีคำแนะนำพิเศษ</p>
            </div>
          `}
        </div>
      </div>

      <!-- Expense Summary -->
      <div class="card" style="grid-column: span 4;">
        <div class="card-header">
          <div class="card-title">
            <i class="fas fa-chart-pie"></i>
            <span>สรุปรายจ่าย</span>
          </div>
        </div>
        <div class="card-body">
          ${expenses.by_category.length > 0 ? `
            <div class="expense-chart">
              ${expenses.by_category.slice(0, 5).map(c => `
                <div class="chart-bar">
                  <div class="bar" style="height: ${(c.total / (expenses.summary.total_expense || 1) * 150)}px; background: ${c.color || '#6366F1'}"></div>
                  <span class="bar-label">${c.name}</span>
                  <span class="bar-value">฿${(c.total || 0).toFixed(0)}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-state">
              <i class="fas fa-receipt"></i>
              <p>ยังไม่มีรายจ่ายในเดือนนี้</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

// Utility Functions
function updateCurrentDate() {
  const now = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('th-TH', options);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Close modal when clicking outside
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('active');
  }
};
