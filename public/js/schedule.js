// Schedule Page Logic

async function loadSchedulePage() {
  const contentArea = document.getElementById('contentArea');
  
  contentArea.innerHTML = `
    <div class="page-header">
      <div class="page-actions">
        <button class="btn btn-primary" onclick="showAddScheduleModal()">
          <i class="fas fa-plus"></i> เพิ่มวิชา
        </button>
      </div>
    </div>
    <div class="schedule-view">
      <div class="schedule-grid-container">
        <div class="schedule-header">
          <div class="day-header-cell">เวลา</div>
          <div class="day-header-cell">จันทร์</div>
          <div class="day-header-cell">อังคาร</div>
          <div class="day-header-cell">พุธ</div>
          <div class="day-header-cell">พฤหัสบดี</div>
          <div class="day-header-cell">ศุกร์</div>
          <div class="day-header-cell">เสาร์</div>
          <div class="day-header-cell">อาทิตย์</div>
        </div>
        <div class="schedule-body" id="scheduleBody">
          <div class="loading">กำลังโหลดตารางเรียน...</div>
        </div>
      </div>
    </div>
  `;

  try {
    const data = await api.getSchedules();
    renderScheduleGrid(data.schedules || []);
  } catch (error) {
    console.error('Failed to load schedule:', error);
    document.getElementById('scheduleBody').innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <p>ไม่สามารถโหลดตารางเรียนได้</p>
      </div>
    `;
  }
}

function renderScheduleGrid(schedules) {
  const scheduleBody = document.getElementById('scheduleBody');
  
  // Group by day
  const byDay = [[], [], [], [], [], [], []]; // Mon-Sun
  schedules.forEach(s => {
    const dayIndex = (s.day_of_week + 6) % 7; // Convert to Mon=0, Sun=6
    byDay[dayIndex].push(s);
  });

  // Time slots (8:00 - 20:00)
  const timeSlots = [];
  for (let i = 8; i <= 20; i++) {
    timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
  }

  let html = '';
  
  timeSlots.forEach(time => {
    html += `
      <div class="time-slot-row">
        <div class="time-label">${time}</div>
        ${byDay.map((classes, dayIndex) => {
          const matching = classes.filter(c => {
            const startHour = parseInt(c.start_time?.split(':')[0] || 0);
            const slotHour = parseInt(time.split(':')[0]);
            return startHour === slotHour;
          });
          
          return `<div class="day-slot">
            ${matching.map(c => `
              <div class="class-block" style="background: ${c.color || '#6366F1'}20; border-left: 4px solid ${c.color || '#6366F1'}; height: ${getDuration(c)}px;" onclick="showEditScheduleModal(${c.id})">
                <div class="class-block-title">${c.subject_name}</div>
                <div class="class-block-room">${c.building || ''} ${c.room || ''}</div>
              </div>
            `).join('')}
          </div>`;
        }).join('')}
      </div>
    `;
  });

  scheduleBody.innerHTML = html;
}

function getDuration(schedule) {
  const start = schedule.start_time?.split(':');
  const end = schedule.end_time?.split(':');
  if (!start || !end) return 60;
  
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  return Math.max(60, endMinutes - startMinutes);
}

function showAddScheduleModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'addScheduleModal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3><i class="fas fa-plus"></i> เพิ่มวิชา</h3>
        <button class="btn-close" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <form id="addScheduleForm" class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label>รหัสวิชา</label>
            <input type="text" name="subject_code" placeholder="CS101">
          </div>
          <div class="form-group">
            <label>ชื่อวิชา *</label>
            <input type="text" name="subject_name" placeholder="ชื่อวิชา" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>อาจารย์ผู้สอน</label>
            <input type="text" name="teacher" placeholder="ชื่ออาจารย์">
          </div>
          <div class="form-group">
            <label>สีบนตาราง</label>
            <input type="color" name="color" value="#6366F1">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>อาคาร</label>
            <input type="text" name="building" placeholder="เช่น วิทย์">
          </div>
          <div class="form-group">
            <label>ห้อง</label>
            <input type="text" name="room" placeholder="เช่น 301">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>วัน *</label>
            <select name="day_of_week" required>
              <option value="">เลือกวัน</option>
              <option value="1">จันทร์</option>
              <option value="2">อังคาร</option>
              <option value="3">พุธ</option>
              <option value="4">พฤหัสบดี</option>
              <option value="5">ศุกร์</option>
              <option value="6">เสาร์</option>
              <option value="0">อาทิตย์</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>เวลาเริ่ม *</label>
            <input type="time" name="start_time" required>
          </div>
          <div class="form-group">
            <label>เวลาจบ *</label>
            <input type="time" name="end_time" required>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">
          <i class="fas fa-save"></i> บันทึก
        </button>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('addScheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
      await api.createSchedule(data);
      modal.remove();
      loadSchedulePage();
    } catch (error) {
      alert(error.message || 'Failed to add schedule');
    }
  });
}

async function showEditScheduleModal(id) {
  try {
    const { schedules } = await api.getSchedules();
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'editScheduleModal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-edit"></i> แก้ไขวิชา</h3>
          <button class="btn-close" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form id="editScheduleForm" class="modal-form">
          <input type="hidden" name="id" value="${schedule.id}">
          <div class="form-row">
            <div class="form-group">
              <label>รหัสวิชา</label>
              <input type="text" name="subject_code" value="${schedule.subject_code || ''}">
            </div>
            <div class="form-group">
              <label>ชื่อวิชา *</label>
              <input type="text" name="subject_name" value="${schedule.subject_name}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>อาจารย์ผู้สอน</label>
              <input type="text" name="teacher" value="${schedule.teacher || ''}">
            </div>
            <div class="form-group">
              <label>สีบนตาราง</label>
              <input type="color" name="color" value="${schedule.color || '#6366F1'}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>อาคาร</label>
              <input type="text" name="building" value="${schedule.building || ''}">
            </div>
            <div class="form-group">
              <label>ห้อง</label>
              <input type="text" name="room" value="${schedule.room || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>วัน *</label>
              <select name="day_of_week" required>
                <option value="">เลือกวัน</option>
                ${['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((day, i) => 
                  `<option value="${i}" ${schedule.day_of_week == i ? 'selected' : ''}>${day}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>เวลาเริ่ม *</label>
              <input type="time" name="start_time" value="${schedule.start_time?.substring(0, 5)}" required>
            </div>
            <div class="form-group">
              <label>เวลาจบ *</label>
              <input type="time" name="end_time" value="${schedule.end_time?.substring(0, 5)}" required>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-danger" onclick="deleteSchedule(${schedule.id})">
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
    
    document.getElementById('editScheduleForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const id = data.id;
      delete data.id;
      
      try {
        await api.updateSchedule(id, data);
        modal.remove();
        loadSchedulePage();
      } catch (error) {
        alert(error.message || 'Failed to update schedule');
      }
    });
  } catch (error) {
    console.error('Failed to load schedule:', error);
  }
}

async function deleteSchedule(id) {
  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบวิชานี้?')) return;
  
  try {
    await api.deleteSchedule(id);
    document.getElementById('editScheduleModal')?.remove();
    loadSchedulePage();
  } catch (error) {
    alert(error.message || 'Failed to delete schedule');
  }
}
