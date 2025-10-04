// Chat API Service
const getApiBaseUrl = () => {
  try {
    const hostIp = import.meta.env.VITE_HOST_IP || window.location.hostname;
    const cleanIp = hostIp.trim().split(/\s+/)[0];
    return `http://${cleanIp}:8080/api`;
  } catch {
    return 'http://localhost:8080/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

class ChatService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` })
    };
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Group Management
  async getGroups() {
    return this.makeRequest('/chat/groups');
  }

  async createGroup(groupData) {
    return this.makeRequest('/chat/groups', {
      method: 'POST',
      body: JSON.stringify(groupData)
    });
  }

  async getGroup(groupId) {
    return this.makeRequest(`/chat/groups/${groupId}`);
  }

  async updateGroup(groupId, groupData) {
    return this.makeRequest(`/chat/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(groupData)
    });
  }

  async deleteGroup(groupId) {
    return this.makeRequest(`/chat/groups/${groupId}`, {
      method: 'DELETE'
    });
  }

  // Group Membership
  async joinGroup(groupId) {
    return this.makeRequest(`/chat/groups/${groupId}/join`, {
      method: 'POST'
    });
  }

  async leaveGroup(groupId) {
    return this.makeRequest(`/chat/groups/${groupId}/leave`, {
      method: 'POST'
    });
  }

  async getGroupMembers(groupId) {
    return this.makeRequest(`/chat/groups/${groupId}/members`);
  }

  async inviteToGroup(groupId, userIds) {
    return this.makeRequest(`/chat/groups/${groupId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userIds })
    });
  }

  async removeFromGroup(groupId, userId) {
    return this.makeRequest(`/chat/groups/${groupId}/members/${userId}`, {
      method: 'DELETE'
    });
  }

  // Message Management
  async getMessages(groupId, page = 0, size = 50) {
    return this.makeRequest(`/chat/groups/${groupId}/messages?page=${page}&size=${size}`);
  }

  async sendMessage(groupId, messageData) {
    return this.makeRequest(`/chat/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
  }

  async getMessage(messageId) {
    return this.makeRequest(`/chat/messages/${messageId}`);
  }

  async deleteMessage(messageId) {
    return this.makeRequest(`/chat/messages/${messageId}`, {
      method: 'DELETE'
    });
  }

  async markMessageAsRead(messageId) {
    return this.makeRequest(`/chat/messages/${messageId}/read`, {
      method: 'POST'
    });
  }

  async getMessageDeliveryStatus(messageId) {
    return this.makeRequest(`/chat/messages/${messageId}/delivery`);
  }

  // Network Discovery
  async getNetworkUsers() {
    return this.makeRequest('/network/users');
  }

  async discoverLocalInstances() {
    return this.makeRequest('/network/discover');
  }

  // QR Code Generation
  async generateGroupInviteQR(groupId) {
    return this.makeRequest(`/chat/groups/${groupId}/qr`, {
      method: 'POST'
    });
  }

  async joinGroupByQR(qrData) {
    return this.makeRequest('/chat/groups/join-by-qr', {
      method: 'POST',
      body: JSON.stringify({ qrData })
    });
  }

  // User Management
  async getUser(userId) {
    return this.makeRequest(`/users/${userId}`);
  }

  async updateUserProfile(userData) {
    return this.makeRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async getUsersBySearch(query) {
    return this.makeRequest(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // File Upload (for future implementation)
  async uploadFile(file, groupId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', groupId);

    return this.makeRequest('/chat/upload', {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` })
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData
    });
  }

  // Connection Status
  async getConnectionStatus() {
    return this.makeRequest('/status');
  }

  // Health Check
  async healthCheck() {
    return this.makeRequest('/health');
  }
}

// Create and export a singleton instance
const chatService = new ChatService();

export default chatService;