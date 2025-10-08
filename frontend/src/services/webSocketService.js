// WebSocket Service for Group Chat - Handles all WebSocket operations
class WebSocketService {
  constructor() {
    this.websocket = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.reconnectTimeout = null;
  }

  /**
   * Connect to WebSocket server
   * @param {string} token - Authentication token
   */
  connect(token) {
    if (!token) {
      console.error('WebSocket connection failed: No token provided');
      return;
    }

    if (this.websocket && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      // Use environment variable for WebSocket URL
      const hostIp = import.meta.env.VITE_HOST_IP || 'localhost';
      const socketUrl = `ws://${hostIp}:8080/ws/messages?token=${token}`;
      console.log('Connecting to WebSocket:', socketUrl);

      this.websocket = new WebSocket(socketUrl);

      this.websocket.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.handleEvent('connection', { status: 'connected' });
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnection();
        }
        
        this.handleEvent('connection', { status: 'disconnected' });
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
        this.handleEvent('error', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnected = false;
      this.handleReconnection();
    }
  }

  /**
   * Handle reconnection attempts
   */
  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      this.reconnectTimeout = setTimeout(() => {
        // Reconnect logic would go here if we had access to the token
        console.log('Reconnection attempt would happen here');
      }, this.reconnectInterval);
    } else {
      console.log('Max reconnection attempts reached');
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.websocket && this.isConnected) {
      this.websocket.close(1000, "User initiated disconnect");
    }
    
    this.websocket = null;
    this.isConnected = false;
    this.messageHandlers.clear();
  }

  /**
   * Send a message through WebSocket
   * @param {Object} message - Message to send
   * @returns {boolean} Success status
   */
  sendMessage(message) {
    if (!this.websocket || !this.isConnected) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      const jsonMessage = JSON.stringify(message);
      this.websocket.send(jsonMessage);
      console.log('Message sent:', message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Handle incoming messages
   * @param {Object} data - Message data
   */
  handleMessage(data) {
    console.log('Handling incoming message:', data);
    
    const messageType = data.type || data.message_type || data.messageType;
    
    switch (messageType) {
      case 'message':
      case 'MESSAGE':
      case 'chat_message':
        this.handleEvent('message', data);
        break;
        
      case 'status_update':
      case 'STATUS_UPDATE':
        this.handleEvent('statusUpdate', data);
        break;
        
      case 'user_joined':
        this.handleEvent('userJoined', data);
        break;
        
      case 'user_left':
        this.handleEvent('userLeft', data);
        break;
        
      case 'typing_start':
      case 'typing_stop':
        this.handleEvent('typing', data);
        break;
        
      default:
        console.log('Unknown message type:', messageType, data);
        this.handleEvent('unknown', data);
    }
  }

  /**
   * Register a message handler
   * @param {string} eventType - Type of event
   * @param {Function} handler - Handler function
   */
  on(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType).push(handler);
  }

  /**
   * Remove a message handler
   * @param {string} eventType - Type of event
   * @param {Function} handler - Handler function to remove
   */
  off(eventType, handler) {
    if (this.messageHandlers.has(eventType)) {
      const handlers = this.messageHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle internal events
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  handleEvent(eventType, data) {
    if (this.messageHandlers.has(eventType)) {
      this.messageHandlers.get(eventType).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${eventType} handler:`, error);
        }
      });
    }
  }

  /**
   * Send a chat message
   * @param {number} groupId - Group ID
   * @param {string} content - Message content
   * @param {number} userId - Sender user ID
   * @returns {boolean} Success status
   */
  sendChatMessage(groupId, content, userId) {
    if (!groupId || !content?.trim()) {
      console.error('Invalid message parameters');
      return false;
    }

    const message = {
      type: 'message',
      group_id: groupId,
      sender_id: userId,
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    return this.sendMessage(message);
  }

  /**
   * Join a group
   * @param {number} groupId - Group ID
   * @param {number} userId - User ID
   * @returns {boolean} Success status
   */
  joinGroup(groupId, userId) {
    if (!groupId) {
      console.error('Invalid group ID');
      return false;
    }

    const message = {
      type: 'user_joined',
      group_id: groupId,
      user_id: userId,
      timestamp: new Date().toISOString()
    };

    return this.sendMessage(message);
  }

  /**
   * Leave a group
   * @param {number} groupId - Group ID
   * @param {number} userId - User ID
   * @returns {boolean} Success status
   */
  leaveGroup(groupId, userId) {
    if (!groupId) {
      console.error('Invalid group ID');
      return false;
    }

    const message = {
      type: 'user_left',
      group_id: groupId,
      user_id: userId,
      timestamp: new Date().toISOString()
    };

    return this.sendMessage(message);
  }

  /**
   * Send typing indicator
   * @param {number} groupId - Group ID
   * @param {number} userId - User ID
   * @param {boolean} isTyping - Typing status
   * @returns {boolean} Success status
   */
  sendTypingIndicator(groupId, userId, isTyping) {
    if (!groupId) {
      console.error('Invalid group ID');
      return false;
    }

    const message = {
      type: isTyping ? 'typing_start' : 'typing_stop',
      group_id: groupId,
      user_id: userId,
      timestamp: new Date().toISOString()
    };

    return this.sendMessage(message);
  }
}

// Export a singleton instance
export default new WebSocketService();