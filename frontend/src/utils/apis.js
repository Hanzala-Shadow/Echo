const API_BASE_URL = 'http://localhost:8080/api';

class ApiClient {
  static async request(endpoint, options = {}) {
    try {
      // Get token from localStorage
      let token = null;
      let userData = null;
      try {
        userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          token = user?.token || null;
          console.log('🔐 Token found:', token ? 'Yes' : 'No');
          console.log('👤 User data:', user);
        } else {
          console.log('🔐 No user data found in localStorage');
        }
      } catch (e) {
        console.warn('❌ Error parsing user data from localStorage:', e);
      }

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('📤 Sending Authorization header with token');
      } else {
        console.log('❌ No token available, skipping Authorization header');
      }

      console.log(`🌐 API Call: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}`);
      console.log('📋 Request headers:', headers);

      // Prepare config
      const config = {
        method: options.method || 'GET',
        headers,
        ...options,
      };

      // Stringify body if it's an object and method is not GET/HEAD
      if (config.body && typeof config.body === 'object' && 
          config.method !== 'GET' && config.method !== 'HEAD') {
        config.body = JSON.stringify(config.body);
        console.log('📦 Request body:', config.body);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      console.log('📥 Response status:', response.status, response.statusText);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData = null;
        
        try {
          errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.log('❌ Error response data:', errorData);
        } catch (e) {
          console.log('❌ Error response is not JSON');
          // If response isn't JSON, use status text
          if (response.status === 401) {
            errorMessage = 'Unauthorized - Please login again';
          } else if (response.status === 404) {
            errorMessage = 'Endpoint not found';
          } else if (response.status === 403) {
            errorMessage = 'Access forbidden';
          }
        }
        
        throw new Error(errorMessage);
      }

      // Handle empty responses for 204 No Content
      if (response.status === 204) {
        console.log('✅ 204 No Content response');
        return null;
      }

      // Handle JSON responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('✅ Success response data:', data);
        return data;
      }
      
      // For non-JSON responses (like QR code image)
      const blob = await response.blob();
      console.log('✅ Success response (blob):', blob);
      return blob;
      
    } catch (error) {
      console.error(`💥 API Error (${endpoint}):`, error);
      
      // Handle network errors specifically
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network error - Unable to connect to server');
      }
      
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
  // CHAT ENDPOINTS
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
  // USER ENDPOINTS
  // ======================
  static users = {
    // Get user by email  
    getUserByEmail: (email) => 
      ApiClient.request(`/users/email/${encodeURIComponent(email)}`),

    // Search users by username
    search: (query) => 
      ApiClient.request(`/users/search?query=${encodeURIComponent(query)}`),

    // Get user profile
    getProfile: (userId) => 
      ApiClient.request(`/users/${userId}`),

    // Get all usernames
    getAllUsernames: () =>
      ApiClient.request('/users/usernames'),

    // Get current user
    getCurrentUser: () =>
      ApiClient.request('/users/me')

  };

  // ======================
  // NETWORK ENDPOINTS
  // ======================
  static network = {
    getServerIP: () => 
      ApiClient.request('/network/ip'),

    getQRCode: () => 
      ApiClient.request('/network/qr')
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