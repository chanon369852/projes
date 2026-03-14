// AI Planner Page Logic

async function loadAIPlannerPage() {
  const contentArea = document.getElementById('contentArea');
  
  contentArea.innerHTML = `
    <div class="ai-planner-container">
      <div class="ai-sidebar">
        <div class="ai-sidebar-header">
          <h3><i class="fas fa-comments"></i> บทสนทนา</h3>
          <button class="btn btn-primary btn-sm" onclick="createNewConversation()">
            <i class="fas fa-plus"></i> ใหม่
          </button>
        </div>
        <div class="conversations-list" id="conversationsList">
          <div class="loading">กำลังโหลด...</div>
        </div>
      </div>
      <div class="ai-chat-area">
        <div class="ai-chat-header">
          <div class="ai-avatar">
            <i class="fas fa-robot"></i>
          </div>
          <div class="ai-info">
            <h4>AI Life Planner</h4>
            <span class="status"><i class="fas fa-circle"></i> พร้อมช่วยเหลือ</span>
          </div>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="welcome-message">
            <div class="message ai">
              <div class="message-avatar">
                <i class="fas fa-robot"></i>
              </div>
              <div class="message-content">
                <p>สวัสดี! ฉันเป็น AI Assistant ที่จะช่วยคุณวางแผนการเรียนและชีวิตประจำวัน 🎓</p>
                <p>คุณสามารถถามฉันได้ เช่น:</p>
                <ul>
                  <li>"ช่วยวางแผนอ่านหนังสือ Database"</li>
                  <li>"วันนี้ตารางเรียนเป็นยังไง?"</li>
                  <li>"ฉันมีภาระงานเยอะไหม?"</li>
                  <li>"สรุปการใช้จ่ายเดือนนี้"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <div class="quick-actions">
            <button class="quick-btn" onclick="sendQuickMessage('ช่วยวางแผนอ่านหนังสือ')">
              <i class="fas fa-book"></i> วางแผนอ่านหนังสือ
            </button>
            <button class="quick-btn" onclick="sendQuickMessage('ตรวจสอบภาระงาน')">
              <i class="fas fa-tasks"></i> ตรวจสอบภาระงาน
            </button>
            <button class="quick-btn" onclick="sendQuickMessage('ดูตารางเรียนวันนี้')">
              <i class="fas fa-calendar"></i> ตารางเรียนวันนี้
            </button>
          </div>
          <div class="input-wrapper">
            <input type="text" id="chatInput" placeholder="พิมพ์ข้อความถาม AI..." 
                   onkeypress="if(event.key==='Enter') sendChatMessage()">
            <button class="btn btn-primary" onclick="sendChatMessage()">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadConversations();
}

async function loadConversations() {
  try {
    const { conversations } = await api.getConversations();
    const list = document.getElementById('conversationsList');
    
    if (conversations.length === 0) {
      list.innerHTML = '<div class="empty-conversations">เริ่มบทสนทนาใหม่</div>';
      return;
    }

    list.innerHTML = conversations.map(c => `
      <div class="conversation-item ${c.id === currentConversationId ? 'active' : ''}" 
           onclick="loadConversation(${c.id})">
        <i class="fas fa-comment"></i>
        <div class="conversation-info">
          <span class="title">${c.title}</span>
          <span class="date">${new Date(c.updated_at).toLocaleDateString('th-TH')}</span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load conversations:', error);
  }
}

let currentConversationId = null;

async function createNewConversation() {
  try {
    const data = await api.createConversation('New Chat', 'general');
    currentConversationId = data.conversation_id;
    await loadConversations();
    
    // Clear chat and show welcome
    document.getElementById('chatMessages').innerHTML = `
      <div class="welcome-message">
        <div class="message ai">
          <div class="message-avatar">
            <i class="fas fa-robot"></i>
          </div>
          <div class="message-content">
            <p>สวัสดี! มีอะไรให้ฉันช่วยเหลือครับ? 😊</p>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    alert('Failed to create conversation');
  }
}

async function loadConversation(id) {
  currentConversationId = id;
  
  try {
    const { messages } = await api.getMessages(id);
    const container = document.getElementById('chatMessages');
    
    container.innerHTML = messages.map(m => `
      <div class="message ${m.role}">
        <div class="message-avatar">
          <i class="fas fa-${m.role === 'ai' ? 'robot' : 'user'}"></i>
        </div>
        <div class="message-content">
          <p>${formatMessage(m.message)}</p>
        </div>
      </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
    await loadConversations();
  } catch (error) {
    console.error('Failed to load conversation:', error);
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Create conversation if none exists
  if (!currentConversationId) {
    await createNewConversation();
  }
  
  // Add user message to UI
  addMessageToUI('user', message);
  input.value = '';
  
  try {
    // Show typing indicator
    const container = document.getElementById('chatMessages');
    const typingId = 'typing-' + Date.now();
    container.innerHTML += `
      <div class="message ai typing" id="${typingId}">
        <div class="message-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
          <span class="typing-indicator">
            <span></span><span></span><span></span>
          </span>
        </div>
      </div>
    `;
    container.scrollTop = container.scrollHeight;
    
    // Send to API
    const response = await api.sendMessage(currentConversationId, message);
    
    // Remove typing and add response
    document.getElementById(typingId)?.remove();
    addMessageToUI('ai', response.message);
    
  } catch (error) {
    console.error('Failed to send message:', error);
    addMessageToUI('ai', 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่');
  }
}

function addMessageToUI(role, message) {
  const container = document.getElementById('chatMessages');
  container.innerHTML += `
    <div class="message ${role}">
      <div class="message-avatar">
        <i class="fas fa-${role === 'ai' ? 'robot' : 'user'}"></i>
      </div>
      <div class="message-content">
        <p>${formatMessage(message)}</p>
      </div>
    </div>
  `;
  container.scrollTop = container.scrollHeight;
}

function sendQuickMessage(text) {
  document.getElementById('chatInput').value = text;
  sendChatMessage();
}

function formatMessage(message) {
  // Convert newlines to <br>
  return message.replace(/\n/g, '<br>');
}

// Quick Ask Modal Functions
async function sendQuickAsk() {
  const input = document.getElementById('quickAskInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  const messagesContainer = document.getElementById('quickAskMessages');
  
  // Add user message
  messagesContainer.innerHTML += `
    <div class="message user">
      <div class="message-content">${message}</div>
    </div>
  `;
  
  input.value = '';
  
  try {
    const response = await api.quickAsk(message);
    
    messagesContainer.innerHTML += `
      <div class="message ai">
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">${formatMessage(response.response)}</div>
      </div>
    `;
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } catch (error) {
    messagesContainer.innerHTML += `
      <div class="message ai error">
        <div class="message-content">ขออภัย เกิดข้อผิดพลาด</div>
      </div>
    `;
  }
}
