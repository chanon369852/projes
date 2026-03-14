// Tasks Page Logic

async function loadTasksPage() {
  const contentArea = document.getElementById('contentArea');
  
  contentArea.innerHTML = `
    <div class="page-header">
      <div class="page-filters">
        <select id="taskFilter" onchange="filterTasks()">
          <option value="all">ทั้งหมด</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="completed">เสร็จสิ้น</option>
          <option value="high">ความสำคัญสูง</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="showAddTaskModal()">
        <i class="fas fa-plus"></i> เพิ่มงาน
      </button>
    </div>
    <div class="tasks-container">
      <div id="tasksList" class="tasks-list">
        <div class="loading">กำลังโหลดงาน...</div>
      </div>
    </div>
  `;

  await loadTasks();
}

async function loadTasks(filter = 'all') {
  try {
    let tasks;
    if (filter === 'high') {
      const data = await api.getTasks({ priority: 'high' });
      tasks = data.tasks;
    } else if (filter === 'completed') {
      const data = await api.getTasks({ status: 'completed' });
      tasks = data.tasks;
    } else if (filter === 'pending') {
      const data = await api.getTasks({ status: 'pending' });
      tasks = data.tasks;
    } else {
      const data = await api.getTasks();
      tasks = data.tasks;
    }
    renderTasks(tasks);
  } catch (error) {
    console.error('Failed to load tasks:', error);
    document.getElementById('tasksList').innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <p>ไม่สามารถโหลดงานได้</p>
      </div>
    `;
  }
}

function renderTasks(tasks) {
  const container = document.getElementById('tasksList');
  
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state large">
        <i class="fas fa-clipboard-check"></i>
        <h3>ไม่มีงาน</h3>
        <p>คุณยังไม่มีงานในระบบ เพิ่มงานใหม่ได้เลย!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const deadline = new Date(task.deadline);
    const now = new Date();
    const isOverdue = deadline < now && task.status !== 'completed';
    const isUrgent = deadline - now < 3 * 24 * 60 * 60 * 1000 && task.status !== 'completed';
    
    return `
      <div class="task-card ${task.status} ${isOverdue ? 'overdue' : ''} ${isUrgent ? 'urgent' : ''}" onclick="showEditTaskModal(${task.id})">
        <div class="task-status-indicator">
          <div class="checkbox ${task.status === 'completed' ? 'checked' : ''}" onclick="event.stopPropagation(); toggleTaskStatus(${task.id}, '${task.status}')">
            ${task.status === 'completed' ? '<i class="fas fa-check"></i>' : ''}
          </div>
        </div>
        <div class="task-main">
          <h4 class="task-title ${task.status === 'completed' ? 'completed' : ''}">${task.title}</h4>
          ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
          ${task.subject ? `<span class="task-tag"><i class="fas fa-book"></i> ${task.subject}</span>` : ''}
        </div>
        <div class="task-meta">
          <div class="task-deadline ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}">
            <i class="fas fa-clock"></i>
            ${deadline.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
          </div>
          <span class="priority-badge ${task.priority}">${task.priority}</span>
        </div>
      </div>
    `;
  }).join('');
}

function filterTasks() {
  const filter = document.getElementById('taskFilter').value;
  loadTasks(filter);
}

async function toggleTaskStatus(id, currentStatus) {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  
  try {
    await api.updateTask(id, { status: newStatus });
    loadTasks();
  } catch (error) {
    alert(error.message || 'Failed to update task');
  }
}

function showAddTaskModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'addTaskModal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3><i class="fas fa-plus"></i> เพิ่มงานใหม่</h3>
        <button class="btn-close" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <form id="addTaskForm" class="modal-form">
        <div class="form-group">
          <label>ชื่องาน *</label>
          <input type="text" name="title" placeholder="เช่น ทำการบ้าน Database" required>
        </div>
        <div class="form-group">
          <label>รายละเอียด</label>
          <textarea name="description" rows="3" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>วิชา</label>
            <input type="text" name="subject" placeholder="เช่น Database">
          </div>
          <div class="form-group">
            <label>ความสำคัญ</label>
            <select name="priority">
              <option value="low">ต่ำ</option>
              <option value="medium" selected>ปานกลาง</option>
              <option value="high">สูง</option>
              <option value="urgent">เร่งด่วน</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Deadline *</label>
            <input type="datetime-local" name="deadline" required>
          </div>
          <div class="form-group">
            <label>ระยะเวลาที่คาดการณ์ (ชั่วโมง)</label>
            <input type="number" name="estimated_hours" value="2" min="0.5" step="0.5">
          </div>
        </div>
        <div class="form-group">
          <label>ความยาก</label>
          <select name="difficulty">
            <option value="easy">ง่าย</option>
            <option value="medium" selected>ปานกลาง</option>
            <option value="hard">ยาก</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">
          <i class="fas fa-save"></i> บันทึก
        </button>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('addTaskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.estimated_hours = parseFloat(data.estimated_hours);
    
    try {
      await api.createTask(data);
      modal.remove();
      loadTasks();
    } catch (error) {
      alert(error.message || 'Failed to add task');
    }
  });
}

async function showEditTaskModal(id) {
  try {
    const { tasks } = await api.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const deadline = new Date(task.deadline);
    const deadlineStr = deadline.toISOString().slice(0, 16);

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'editTaskModal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-edit"></i> แก้ไขงาน</h3>
          <button class="btn-close" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form id="editTaskForm" class="modal-form">
          <input type="hidden" name="id" value="${task.id}">
          <div class="form-group">
            <label>ชื่องาน *</label>
            <input type="text" name="title" value="${task.title}" required>
          </div>
          <div class="form-group">
            <label>รายละเอียด</label>
            <textarea name="description" rows="3">${task.description || ''}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>วิชา</label>
              <input type="text" name="subject" value="${task.subject || ''}">
            </div>
            <div class="form-group">
              <label>ความสำคัญ</label>
              <select name="priority">
                ${['low', 'medium', 'high', 'urgent'].map(p => 
                  `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Deadline *</label>
              <input type="datetime-local" name="deadline" value="${deadlineStr}" required>
            </div>
            <div class="form-group">
              <label>ระยะเวลาที่คาดการณ์ (ชั่วโมง)</label>
              <input type="number" name="estimated_hours" value="${task.estimated_hours || 2}" min="0.5" step="0.5">
            </div>
          </div>
          <div class="form-group">
            <label>สถานะ</label>
            <select name="status">
              ${['pending', 'in_progress', 'completed', 'cancelled'].map(s => 
                `<option value="${s}" ${task.status === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-danger" onclick="deleteTask(${task.id})">
              <i class="fas fa-trash"></i> ลบ
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> บันทึก
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('editTaskForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const id = data.id;
      delete data.id;
      data.estimated_hours = parseFloat(data.estimated_hours);
      
      try {
        await api.updateTask(id, data);
        modal.remove();
        loadTasks();
      } catch (error) {
        alert(error.message || 'Failed to update task');
      }
    });
  } catch (error) {
    console.error('Failed to load task:', error);
  }
}

async function deleteTask(id) {
  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?')) return;
  
  try {
    await api.deleteTask(id);
    document.getElementById('editTaskModal')?.remove();
    loadTasks();
  } catch (error) {
    alert(error.message || 'Failed to delete task');
  }
}
