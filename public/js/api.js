// API Client for Smart Student Life Manager

const API_BASE_URL = window.location.origin + '/api';

class API {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Dashboard
  async getDashboard() {
    return this.request('/dashboard');
  }

  // Schedules
  async getSchedules(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/schedules?${query}`);
  }

  async createSchedule(scheduleData) {
    return this.request('/schedules', {
      method: 'POST',
      body: scheduleData
    });
  }

  async updateSchedule(id, scheduleData) {
    return this.request(`/schedules/${id}`, {
      method: 'PUT',
      body: scheduleData
    });
  }

  async deleteSchedule(id) {
    return this.request(`/schedules/${id}`, {
      method: 'DELETE'
    });
  }

  // Tasks
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tasks?${query}`);
  }

  async createTask(taskData) {
    return this.request('/tasks', {
      method: 'POST',
      body: taskData
    });
  }

  async updateTask(id, taskData) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: taskData
    });
  }

  async deleteTask(id) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE'
    });
  }

  async getUpcomingTasks(days = 7) {
    return this.request(`/tasks/filter/upcoming?days=${days}`);
  }

  // Expenses
  async getExpenses(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/expenses?${query}`);
  }

  async createExpense(expenseData) {
    return this.request('/expenses', {
      method: 'POST',
      body: expenseData
    });
  }

  async getExpenseCategories() {
    return this.request('/expenses/categories');
  }

  async getMonthlySummary(year, month) {
    return this.request(`/expenses/summary/monthly?year=${year}&month=${month}`);
  }

  // Friends
  async getFriends() {
    return this.request('/friends');
  }

  async getFriendRequests() {
    return this.request('/friends/requests');
  }

  async sendFriendRequest(friendId, message) {
    return this.request('/friends/request', {
      method: 'POST',
      body: { friend_id: friendId, message }
    });
  }

  async acceptFriendRequest(id) {
    return this.request(`/friends/accept/${id}`, {
      method: 'PUT'
    });
  }

  async getFriendSchedule(friendId) {
    return this.request(`/friends/friend-schedule/${friendId}`);
  }

  // Chat/AI
  async getConversations() {
    return this.request('/chat/conversations');
  }

  async createConversation(title, contextType) {
    return this.request('/chat/conversations', {
      method: 'POST',
      body: { title, context_type: contextType }
    });
  }

  async getMessages(conversationId) {
    return this.request(`/chat/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId, message) {
    return this.request(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { message }
    });
  }

  async quickAsk(question) {
    return this.request('/chat/quick-ask', {
      method: 'POST',
      body: { question }
    });
  }

  // Stress
  async getStressAnalysis() {
    return this.request('/stress/current');
  }

  async getStressHistory(days = 30) {
    return this.request(`/stress/history?days=${days}`);
  }

  // AI
  async getStudyRecommendations() {
    return this.request('/ai/study-recommendations');
  }

  async getProductivityInsights() {
    return this.request('/ai/productivity-insights');
  }

  // Tasks - missing methods
  async deleteTask(id) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  async getTaskStats() {
    return this.request('/tasks/stats/summary');
  }

  // Expenses - missing methods
  async updateExpense(id, data) {
    return this.request(`/expenses/${id}`, { method: 'PUT', body: data });
  }

  async deleteExpense(id) {
    return this.request(`/expenses/${id}`, { method: 'DELETE' });
  }

  async getExpenseTrends() {
    return this.request('/expenses/summary/trends');
  }

  // Users
  async searchUsers(query) {
    return this.request(`/users/search?query=${encodeURIComponent(query)}`);
  }

  async getUserProfile(userId) {
    return this.request(`/users/${userId}/profile`);
  }

  // Stress
  async getWorkload() {
    return this.request('/stress/workload');
  }

  async calculateStress() {
    return this.request('/stress/calculate', { method: 'POST' });
  }

  // Notifications
  async getNotifications(limit = 20) {
    return this.request(`/notifications?limit=${limit}`);
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', { method: 'PUT' });
  }

  // Auth
  async updateProfile(data) {
    return this.request('/auth/profile', { method: 'PUT', body: data });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: { current_password: currentPassword, new_password: newPassword }
    });
  }

  // Schedule
  async getWeeklySchedule() {
    return this.request('/schedules/view/weekly');
  }

  // Logout helper
  logout() {
    localStorage.removeItem('token');
    this.token = null;
  }
}

const api = new API();
