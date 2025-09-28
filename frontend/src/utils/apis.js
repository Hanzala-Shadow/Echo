// frontend/src/utils/api.js - Centralized API client for Echo Chat

const API_BASE_URL = 'http://localhost:8080/api';

class ApiClient {
  static async request(endpoint, options = {}) {
    try {
      // Get token from localStorage
      const userData = localStorage.getItem('user');
      const token = userData ? JSON.parse(userData).token : null;

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      };

      // Prepare config
      const config = {
        method: options.method || 'GET',
        headers,
        ...options,
      };

      // Stringify body if it's an object
      if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
      }

      console.log(`API Call: ${config.method} ${API_BASE_URL}${endpoint}`);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If response isn't JSON, use status text
        }
        
        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      // For non-JSON responses (like QR code image)
      return await response.blob();
      
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // ======================
  // AUTHENTICATION ENDPOINTS
  // ======================
  static auth = {
    login: (email, password) => 
      ApiClient.request('/auth/login', { 
        method: 'POST', 
        body: { email, password } 
      }),

    register: (username, email, password) => 
      ApiClient.request('/auth/register', { 
        method: 'POST', 
        body: { username, email, password } 
      }),

    logout: () => 
      ApiClient.request('/auth/logout', { method: 'POST' })
  };

  // ======================
  // CHAT ENDPOINTS (Matches your ChatController.java)
  // ======================
  static chat = {
    // Get all groups for the current user
    getGroups: () => 
      ApiClient.request('/groups'),

    // Create a new group
    createGroup: (groupName, memberIds = []) => 
      ApiClient.request('/group/create', {
        method: 'POST',
        body: {
          group_name: groupName,
          member_ids: memberIds
        }
      }),

    // Get message history for a group
    getGroupMessages: (groupId, limit = 50, offset = 0) => 
      ApiClient.request(`/groups/${groupId}/messages?limit=${limit}&offset=${offset}`),

    // Get members of a specific group
    getGroupMembers: (groupId) => 
      ApiClient.request(`/groups/${groupId}/members`)
  };

  // ======================
  // NETWORK ENDPOINTS (Matches your NetworkController.java)
  // ======================
  static network = {
    // Get server LAN IP address
    getServerIP: () => 
      ApiClient.request('/network/ip'),

    // Get QR code image for server URL
    getQRCode: () => 
      ApiClient.request('/network/qr')
  };

  // ======================
  // USER ENDPOINTS (For future expansion)
  // ======================
  static users = {
    // Search users by username/email
    search: (query) => 
      ApiClient.request(`/users/search?q=${encodeURIComponent(query)}`),

    // Get user profile
    getProfile: (userId) => 
      ApiClient.request(`/users/${userId}`)
  };

  // ======================
  // HEALTH CHECK
  // ======================
  static health = {
    check: () => 
      ApiClient.request('/health')
  };
}

export default ApiClient;