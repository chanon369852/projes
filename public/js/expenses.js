// Expenses Page Logic

let currentExpenseMonth = new Date().getMonth() + 1;
let currentExpenseYear = new Date().getFullYear();

async function loadExpensesPage() {
  const contentArea = document.getElementById('contentArea');
  
  contentArea.innerHTML = `
    <div class="page-header">
      <div class="month-navigation">
        <button class="btn btn-icon" onclick="changeMonth(-1)">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="current-month" id="currentMonthDisplay"></span>
        <button class="btn btn-icon" onclick="changeMonth(1)">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
      <button class="btn btn-primary" onclick="showAddExpenseModal()">
        <i class="fas fa-plus"></i> เพิ่มรายการ
      </button>
    </div>
    <div class="expenses-dashboard">
      <div class="expenses-summary-row">
        <div class="summary-card income">
          <div class="summary-icon"><i class="fas fa-arrow-down"></i></div>
          <div class="summary-info">
            <span class="label">รายรับ</span>
            <span class="amount" id="totalIncome">฿0</span>
          </div>
        </div>
        <div class="summary-card expense">
          <div class="summary-icon"><i class="fas fa-arrow-up"></i></div>
          <div class="summary-info">
            <span class="label">รายจ่าย</span>
            <span class="amount" id="totalExpense">฿0</span>
          </div>
        </div>
        <div class="summary-card balance">
          <div class="summary-icon"><i class="fas fa-wallet"></i></div>
          <div class="summary-info">
            <span class="label">คงเหลือ</span>
            <span class="amount" id="totalBalance">฿0</span>
          </div>
        </div>
      </div>
      <div class="expenses-grid">
        <div class="card expenses-chart-card">
          <div class="card-header">
            <div class="card-title">
              <i class="fas fa-chart-pie"></i>
              <span>สัดส่วนรายจ่าย</span>
            </div>
          </div>
          <div class="card-body">
            <canvas id="expenseChart" width="300" height="300"></canvas>
          </div>
        </div>
        <div class="card expenses-list-card">
          <div class="card-header">
            <div class="card-title">
              <i class="fas fa-list"></i>
              <span>รายการล่าสุด</span>
            </div>
          </div>
          <div class="card-body" id="expensesList">
            <div class="loading">กำลังโหลด...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadExpensesData();
}

async function loadExpensesData() {
  try {
    const [summaryData, expensesData, categoriesData] = await Promise.all([
      api.getMonthlySummary(currentExpenseYear, currentExpenseMonth),
      api.getExpenses({ 
        start_date: `${currentExpenseYear}-${String(currentExpenseMonth).padStart(2, '0')}-01`,
        end_date: `${currentExpenseYear}-${String(currentExpenseMonth).padStart(2, '0')}-31`
      }),
      api.getExpenseCategories()
    ]);

    // Update month display
    const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    document.getElementById('currentMonthDisplay').textContent = 
      `${monthNames[currentExpenseMonth - 1]} ${currentExpenseYear}`;

    // Update summary
    const summary = summaryData.summary || {};
    document.getElementById('totalIncome').textContent = `฿${(summary.total_income || 0).toLocaleString()}`;
    document.getElementById('totalExpense').textContent = `฿${(summary.total_expense || 0).toLocaleString()}`;
    const balance = (summary.total_income || 0) - (summary.total_expense || 0);
    document.getElementById('totalBalance').textContent = `฿${balance.toLocaleString()}`;
    document.getElementById('totalBalance').className = balance >= 0 ? 'amount positive' : 'amount negative';

    // Render chart
    renderExpenseChart(summaryData.by_category || []);

    // Render expenses list
    renderExpensesList(expensesData.expenses || []);

  } catch (error) {
    console.error('Failed to load expenses:', error);
  }
}

function changeMonth(direction) {
  currentExpenseMonth += direction;
  if (currentExpenseMonth > 12) {
    currentExpenseMonth = 1;
    currentExpenseYear++;
  } else if (currentExpenseMonth < 1) {
    currentExpenseMonth = 12;
    currentExpenseYear--;
  }
  loadExpensesData();
}

function renderExpenseChart(categories) {
  const canvas = document.getElementById('expenseChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (categories.length === 0) {
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '14px Kanit';
    ctx.textAlign = 'center';
    ctx.fillText('ไม่มีข้อมูล', centerX, centerY);
    return;
  }

  const total = categories.reduce((sum, c) => sum + (c.total || 0), 0);
  let currentAngle = -Math.PI / 2;

  categories.forEach(cat => {
    const value = cat.total || 0;
    const angle = (value / total) * 2 * Math.PI;
    
    // Draw slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
    ctx.closePath();
    ctx.fillStyle = cat.color || '#6366F1';
    ctx.fill();

    currentAngle += angle;
  });

  // Draw center hole for donut chart
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Draw total in center
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px Kanit';
  ctx.textAlign = 'center';
  ctx.fillText(`฿${total.toLocaleString()}`, centerX, centerY);
  ctx.font = '12px Kanit';
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText('รวม', centerX, centerY + 20);
}

function renderExpensesList(expenses) {
  const container = document.getElementById('expensesList');
  
  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-receipt"></i>
        <p>ไม่มีรายการในเดือนนี้</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="expense-list">
      ${expenses.map(e => `
        <div class="expense-item" onclick="showEditExpenseModal(${e.id})">
          <div class="expense-icon" style="background: ${e.category_color || '#6366F1'}20; color: ${e.category_color || '#6366F1'}">
            <i class="fas fa-${e.category_icon || 'tag'}"></i>
          </div>
          <div class="expense-info">
            <h4>${e.description || e.category_name || 'ไม่ระบุ'}</h4>
            <p>${new Date(e.date).toLocaleDateString('th-TH')} • ${e.category_name || 'ไม่ระบุ'}</p>
          </div>
          <div class="expense-amount ${e.type}">
            ${e.type === 'income' ? '+' : '-'}฿${parseFloat(e.amount).toLocaleString()}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function showAddExpenseModal() {
  try {
    const { categories } = await api.getExpenseCategories();
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'addExpenseModal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-plus"></i> เพิ่มรายการ</h3>
          <button class="btn-close" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form id="addExpenseForm" class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label>ประเภท *</label>
              <select name="type" required onchange="updateCategoryOptions()">
                <option value="expense">รายจ่าย</option>
                <option value="income">รายรับ</option>
              </select>
            </div>
            <div class="form-group">
              <label>จำนวนเงิน *</label>
              <input type="number" name="amount" step="0.01" min="0" placeholder="0.00" required>
            </div>
          </div>
          <div class="form-group">
            <label>หมวดหมู่</label>
            <select name="category_id" id="categorySelect">
              <option value="">เลือกหมวดหมู่</option>
              ${categories.filter(c => c.type === 'expense').map(c => 
                `<option value="${c.id}">${c.name}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>รายละเอียด</label>
            <input type="text" name="description" placeholder="เช่น ค่าข้าวมันไก่">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>วันที่ *</label>
              <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
              <label>วิธีการชำระเงิน</label>
              <select name="payment_method">
                <option value="cash">เงินสด</option>
                <option value="bank_transfer">โอนเงิน</option>
                <option value="credit_card">บัตรเครดิต</option>
                <option value="mobile_payment">จ่ายผ่านมือถือ</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">
            <i class="fas fa-save"></i> บันทึก
          </button>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    window.updateCategoryOptions = async () => {
      const type = document.querySelector('[name="type"]').value;
      const { categories } = await api.getExpenseCategories();
      const select = document.getElementById('categorySelect');
      select.innerHTML = '<option value="">เลือกหมวดหมู่</option>' +
        categories.filter(c => c.type === type).map(c => 
          `<option value="${c.id}">${c.name}</option>`
        ).join('');
    };
    
    document.getElementById('addExpenseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      data.amount = parseFloat(data.amount);
      if (!data.category_id) delete data.category_id;
      
      try {
        await api.createExpense(data);
        modal.remove();
        loadExpensesData();
      } catch (error) {
        alert(error.message || 'Failed to add expense');
      }
    });
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

async function showEditExpenseModal(id) {
  // Similar to add but with delete option
  alert('Edit expense: ' + id);
}
