// Friends Page Logic

async function loadFriendsPage() {
  const contentArea = document.getElementById('contentArea');
  
  contentArea.innerHTML = `
    <div class="page-header">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input type="text" id="friendSearch" placeholder="ค้นหาเพื่อน..." onkeypress="if(event.key==='Enter') searchFriends()">
      </div>
      <button class="btn btn-primary" onclick="showAddFriendModal()">
        <i class="fas fa-user-plus"></i> เพิ่มเพื่อน
      </button>
    </div>
    <div class="friends-tabs">
      <button class="tab-btn active" onclick="switchFriendsTab('friends')">เพื่อน</button>
      <button class="tab-btn" onclick="switchFriendsTab('requests')">คำขอเป็นเพื่อน</button>
    </div>
    <div id="friendsContent">
      <div class="loading">กำลังโหลด...</div>
    </div>
  `;

  await loadFriendsList();
}

function switchFriendsTab(tab) {
  document.querySelectorAll('.friends-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  
  if (tab === 'friends') {
    loadFriendsList();
  } else {
    loadFriendRequests();
  }
}

async function loadFriendsList() {
  try {
    const { friends } = await api.getFriends();
    const container = document.getElementById('friendsContent');
    
    if (friends.length === 0) {
      container.innerHTML = `
        <div class="empty-state large">
          <i class="fas fa-users"></i>
          <h3>ยังไม่มีเพื่อน</h3>
          <p>เพิ่มเพื่อนเพื่อแชร์ตารางเรียนและดูเวลาว่างของกันและกัน</p>
          <button class="btn btn-primary" onclick="showAddFriendModal()">
            <i class="fas fa-user-plus"></i> เพิ่มเพื่อน
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="friends-grid">
        ${friends.map(f => `
          <div class="friend-card" onclick="viewFriendDetail(${f.friend_id})">
            <img src="${f.friend_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.friend_name)}&background=6366F1&color=fff`}" 
                 alt="${f.friend_name}" class="friend-avatar">
            <div class="friend-info">
              <h4>${f.friend_name}</h4>
              <p>${f.friend_student_id}</p>
              <span class="faculty-tag">${f.friend_faculty || 'ไม่ระบุ'}</span>
            </div>
            <div class="friend-actions">
              <button class="btn-icon" onclick="event.stopPropagation(); viewFriendSchedule(${f.friend_id})" title="ดูตาราง">
                <i class="fas fa-calendar"></i>
              </button>
              <button class="btn-icon" onclick="event.stopPropagation(); removeFriend(${f.friendship_id})" title="ลบ">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Failed to load friends:', error);
    document.getElementById('friendsContent').innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <p>ไม่สามารถโหลดรายชื่อเพื่อนได้</p>
      </div>
    `;
  }
}

async function loadFriendRequests() {
  try {
    const { requests } = await api.getFriendRequests();
    const container = document.getElementById('friendsContent');
    
    if (requests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>ไม่มีคำขอเป็นเพื่อน</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="requests-list">
        ${requests.map(r => `
          <div class="request-card">
            <img src="${r.requester_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.requester_name)}&background=6366F1&color=fff`}" 
                 alt="${r.requester_name}" class="friend-avatar">
            <div class="request-info">
              <h4>${r.requester_name}</h4>
              <p>${r.requester_student_id}</p>
              <span class="faculty-tag">${r.requester_faculty || 'ไม่ระบุ'}</span>
              ${r.message ? `<p class="request-message">"${r.message}"</p>` : ''}
            </div>
            <div class="request-actions">
              <button class="btn btn-success" onclick="acceptFriendRequest(${r.id})">
                <i class="fas fa-check"></i> ยอมรับ
              </button>
              <button class="btn btn-secondary" onclick="rejectFriendRequest(${r.id})">
                <i class="fas fa-times"></i> ปฏิเสธ
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Failed to load requests:', error);
  }
}

async function searchFriends() {
  const query = document.getElementById('friendSearch').value.trim();
  if (!query) return;
  
  try {
    const { users } = await api.request(`/users/search?query=${encodeURIComponent(query)}`);
    const container = document.getElementById('friendsContent');
    
    if (users.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <p>ไม่พบผู้ใช้ที่ตรงกับ "${query}"</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="search-results">
        <h4>ผลการค้นหา</h4>
        <div class="friends-grid">
          ${users.map(u => `
            <div class="friend-card">
              <img src="${u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=6366F1&color=fff`}" 
                   alt="${u.full_name}" class="friend-avatar">
              <div class="friend-info">
                <h4>${u.full_name}</h4>
                <p>${u.student_id}</p>
                <span class="faculty-tag">${u.faculty || 'ไม่ระบุ'}</span>
              </div>
              <button class="btn btn-primary" onclick="sendFriendRequest(${u.id})">
                <i class="fas fa-user-plus"></i> เพิ่ม
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    alert('ค้นหาไม่สำเร็จ');
  }
}

function showAddFriendModal() {
  document.getElementById('friendSearch').focus();
  alert('พิมพ์รหัสนักศึกษาหรือชื่อในช่องค้นหาเพื่อหาเพื่อน');
}

async function sendFriendRequest(friendId) {
  try {
    await api.sendFriendRequest(friendId, 'ขอเป็นเพื่อนกับคุณครับ');
    alert('ส่งคำขอเป็นเพื่อนเรียบร้อย');
    loadFriendsList();
  } catch (error) {
    alert(error.message || 'Failed to send friend request');
  }
}

async function acceptFriendRequest(requestId) {
  try {
    await api.acceptFriendRequest(requestId);
    loadFriendRequests();
  } catch (error) {
    alert('Failed to accept request');
  }
}

async function rejectFriendRequest(requestId) {
  if (!confirm('ปฏิเสธคำขอนี้?')) return;
  
  try {
    await api.request(`/friends/${requestId}`, { method: 'DELETE' });
    loadFriendRequests();
  } catch (error) {
    alert('Failed to reject request');
  }
}

async function removeFriend(friendshipId) {
  if (!confirm('ลบเพื่อนนี้ออกจากรายชื่อ?')) return;
  
  try {
    await api.request(`/friends/${friendshipId}`, { method: 'DELETE' });
    loadFriendsList();
  } catch (error) {
    alert('Failed to remove friend');
  }
}

async function viewFriendSchedule(friendId) {
  try {
    const data = await api.getFriendSchedule(friendId);
    
    // Show schedule modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content large">
        <div class="modal-header">
          <h3><i class="fas fa-calendar"></i> ตารางเรียนเพื่อน</h3>
          <button class="btn-close" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="friend-schedule-view">
            ${data.schedules.length > 0 ? `
              <div class="mini-schedule">
                ${data.schedules.map(s => `
                  <div class="schedule-item" style="border-left-color: ${s.color}">
                    <div class="day-badge">${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][s.day_of_week]}</div>
                    <div class="schedule-info">
                      <h4>${s.subject_name}</h4>
                      <p>${s.start_time?.substring(0, 5)} - ${s.end_time?.substring(0, 5)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<p>เพื่อนยังไม่ได้แชร์ตารางเรียน</p>'}
          </div>
          
          <h4>เวลาว่างที่แนะนำ</h4>
          ${data.free_time.length > 0 ? `
            <div class="free-time-list">
              ${data.free_time.slice(0, 5).map(f => `
                <div class="free-time-item">
                  <i class="fas fa-clock"></i>
                  <span>${f.date} ${f.start_time?.substring(0, 5)} - ${f.end_time?.substring(0, 5)}</span>
                </div>
              `).join('')}
            </div>
          ` : '<p>ไม่มีข้อมูลเวลาว่าง</p>'}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    alert('ไม่สามารถดูตารางเพื่อนได้');
  }
}

function viewFriendDetail(friendId) {
  // Could navigate to profile page
  viewFriendSchedule(friendId);
}
