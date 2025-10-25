import * as keyCache from "../services/keyCache";
import { decryptMessage } from "../utils/cryptoUtils";
import * as groupKeyService from "../services/groupKeyService";

const getApiBaseUrl = () => {
  try {
    // When running in browser (which is the case for Vite dev server),
    // we need to connect to the backend through the host machine
    // The backend is mapped to port 8080 on the host
    const hostIp = import.meta.env.VITE_HOST_IP || window.location.hostname;
    
    // For Docker environment or local development, use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8080/api';
    }
    
    // For other cases, construct URL with host IP
    const cleanIp = hostIp.trim().split(/\s+/)[0];
    
    // Validate IP format
    if (!cleanIp || cleanIp.includes(' ')) {
      console.warn('Invalid host IP, falling back to localhost');
      return 'http://localhost:8080/api';
    }
    
    const url = `http://${cleanIp}:8080/api`;
    
    // Test if URL is valid
    new URL(url);
    return url;
  } catch (error) {
    console.warn('Error constructing API URL, falling back to localhost:', error);
    return 'http://localhost:8080/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

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

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

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
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Please check your network connection');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network error - Unable to connect to server. Please check if the backend is running.');
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
    // getGroupMessages: (groupId, limit = 50, offset = 0) => 
    //   ApiClient.request(`/groups/${groupId}/messages?limit=${limit}&offset=${offset}`),
  getGroupMessages: async (groupId) => {
    // 1️⃣ Fetch messages from backend
    const resp = await ApiClient.request(`/groups/${groupId}/messages`);
    console.log("🧩 [DEBUG] getGroupMessages raw response:", resp);

    const messages = resp.messages || [];

    // 2️⃣ Check if group key is already cached
    let groupKey = await keyCache.getGroupKey(groupId);
    console.warn(`Group Key for group ${groupId}:`, groupKey);

    // 3️⃣ If not cached, fetch & unwrap group key
    if (!groupKey) {
      console.warn(`⚠️ No group key in cache for group ${groupId}, fetching...`);

      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (!currentUser) {
      console.warn("⚠️ No logged-in user available for group key fetch");
      return messages; // fallback
      }

      let userPrivateKey = await keyCache.getUserPrivateKey();

      console.warn(`⚠️ User Private Key : ${userPrivateKey}`);

if (!(userPrivateKey instanceof Uint8Array)) {
    // If stored as Base64 or ArrayBuffer, convert:
    if (typeof userPrivateKey === "string") {
        userPrivateKey = base64ToUint8(userPrivateKey);
    } else if (userPrivateKey instanceof ArrayBuffer) {
        userPrivateKey = new Uint8Array(userPrivateKey);
    } else {
        throw new Error("User private key is not a valid Uint8Array");
    }
}
        groupKey = await groupKeyService.fetchAndUnwrapGroupKey(
        groupId,
        currentUser.userId,      // logged-in user id
        userPrivateKey // user's private key
      );

      if (groupKey) {
        // Cache for later use
        await keyCache.setGroupKey(groupId, groupKey, false);
      } else {
        console.warn(`⚠️ Could not fetch/unpack group key for group ${groupId}`);
      }
    }

    // 4️⃣ Decrypt messages using the group key
    const decryptedMessages = await Promise.all(messages.map(async (msg) => {
      let decryptedContent = msg.content;

      try {
        if (msg.content && groupKey) {
          // Parse the JSON string stored in DB: { iv, ciphertext }
          const encrypted = JSON.parse(msg.content);
          decryptedContent = await decryptMessage(encrypted, groupKey);
        }
      } catch (e) {
        console.error('❌ Message decryption failed for', msg.messageId, e);
      }

      return {
        ...msg,
        content: decryptedContent
      };
    }));

    return decryptedMessages;
},

    // Get members of a specific group
    getGroupMembers: (groupId) => 
      ApiClient.request(`/groups/${groupId}/members`),

    // Get dashboard statistics
    getDashboardStats: () => 
      ApiClient.request('/dashboard/stats')
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
  // FRIEND ENDPOINTS
  // ======================
  static friends = {
    // Send a friend request
    sendRequest: (receiverId) => 
      ApiClient.request('/friends/request', {
        method: 'POST',
        body: { receiverId }
      }),

    // Get pending friend requests
    getPendingRequests: () => 
      ApiClient.request('/friends/requests'),

    // Accept a friend request
    acceptRequest: (requestId) => 
      ApiClient.request(`/friends/accept/${requestId}`, {
        method: 'POST'
      }),

    // Reject a friend request
    rejectRequest: (requestId) => 
      ApiClient.request(`/friends/reject/${requestId}`, {
        method: 'POST'
      }),

    // Get all friend requests
    getAllRequests: () => 
      ApiClient.request('/friends/all')
  }

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


  // ======================
  // KEY MANAGEMENT ENDPOINTS
  // ======================
  static keys = {
    // Upload user’s generated public key + encrypted private key
    uploadUserKeys: (payload) => 
      ApiClient.request('/keys/user', {
        method: 'POST',
        body: payload
      }),

    // Get user’s stored keys (public + encrypted private)
    getUserKeys: (userId, token) =>
      ApiClient.request(`/keys/user/${userId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      }),

    // Optional: group key management
    uploadGroupPublicKey: (payload) =>
      ApiClient.request('/keys/group-public', {
        method: 'POST',
        body: payload
      }),

    getGroupPublicKey: (groupId) =>
      ApiClient.request(`/keys/group-public/${groupId}`),

    uploadGroupMemberKey: (payload) =>
      ApiClient.request('/keys/group-member', {
        method: 'POST',
        body: payload
      }),

    getGroupMemberKey: (groupId, userId) =>
      ApiClient.request(`/keys/group-member/${groupId}/${userId}`)
  };

}
export default ApiClient;