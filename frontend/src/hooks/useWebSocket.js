import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (userId, token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000;

  // WebSocket message types matching your backend
  const MESSAGE_TYPES = {
    MESSAGE: 'message',
    STATUS_UPDATE: 'status_update',
    USER_JOINED: 'user_joined',
    USER_LEFT: 'user_left'
  };

  const connect = useCallback(() => {
    if (!userId || !token) {
      console.log('Missing userId or token for WebSocket connection');
      return;
    }

    try {
      // ✅ FIXED: Include token in URL as backend expects
      const socketUrl = `http://localhost:8080/ws/messages?token=${token}`;
      console.log('🔌 Connecting to WebSocket:', socketUrl);

      // Create WebSocket directly 
      const socket = new WebSocket(socketUrl);
      
      socket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Broadcast that user is online
        sendStatusUpdate(true);
      };

      socket.onmessage = (event) => {
        try {
          console.log('📨 WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          handleIncomingMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Only attempt reconnect if not a normal closure
        if (event.code !== 1000) {
          handleReconnection();
        }
      };

      socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };

      // Store socket reference
      websocketRef.current = socket;

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      setIsConnected(false);
      handleReconnection();
    }
  }, [userId, token]);

  const handleReconnection = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++;
      console.log(`🔄 Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);
    } else {
      console.log('❌ Max reconnection attempts reached');
    }
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (websocketRef.current) {
      // Send offline status before closing
      sendStatusUpdate(false);
      
      // Close with normal status code
      websocketRef.current.close(1000, "User initiated disconnect");
      websocketRef.current = null;
    }
    
    setIsConnected(false);
    setMessages([]);
    setOnlineUsers([]);
    setActiveGroup(null);
  }, []);

  const handleIncomingMessage = useCallback((data) => {
    console.log('📩 Handling incoming message:', data);
    
    // Handle different message types based on your backend
    switch (data.type) {
      case 'message': // Match your backend's message type
        // ✅ FIXED: Only add message if it belongs to active group
        if (data.group_id === activeGroup) {
          setMessages(prev => [...prev, {
            id: data.message_id || Date.now().toString(),
            content: data.content,
            senderId: data.sender_id,
            senderName: data.sender_name || `User ${data.sender_id}`,
            timestamp: new Date(data.created_at || Date.now()),
            type: 'text',
            groupId: data.group_id,
            status: 'delivered'
          }]);
        } else {
          console.log('📨 Message received for different group:', data.group_id, 'Active:', activeGroup);
        }
        break;
        
      // Update all user references to use userId consistently
      case MESSAGE_TYPES.STATUS_UPDATE:
        setOnlineUsers(prev => {
          const userIndex = prev.findIndex(u => u.userId === data.user_id);
          if (userIndex > -1) {
            const updated = [...prev];
            updated[userIndex] = { ...updated[userIndex], online: data.online_status };
            return updated;
          } else if (data.online_status) {
            return [...prev, { 
              userId: data.user_id,  // ✅ Consistent field name
              name: data.user_name || `User ${data.user_id}`,
              online: true,
              username: `user${data.user_id}`,
              status: 'online'
            }];
          }
          return prev;
        });
        break;
        
      case MESSAGE_TYPES.USER_JOINED:
        setOnlineUsers(prev => [
          ...prev.filter(u => u.userId !== data.user_id),
          {
            userId: data.user_id,  // ✅ FIXED: Use userId consistently
            name: data.user_name || `User ${data.user_id}`,
            online: true
          }
        ]);
        break;
        
      case MESSAGE_TYPES.USER_LEFT:
        setOnlineUsers(prev => prev.map(user => 
          user.userId === data.user_id ? { ...user, online: false } : user
        ));
        break;
        
      default:
        console.log('❓ Unknown message type:', data.type, data);
    }
  }, [activeGroup]); // Add activeGroup dependency

  const sendWebSocketMessage = useCallback((messageData) => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket is not connected');
      return false;
    }

    try {
      websocketRef.current.send(JSON.stringify(messageData));
      console.log('📤 WebSocket message sent:', messageData);
      return true;
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
      return false;
    }
  }, []);

  const sendMessage = useCallback((message) => {
    if (!message.groupId || !message.content?.trim()) {
      console.error('❌ Invalid message format');
      return false;
    }

    // Format message to match your Spring backend expectation
    const messageData = {
      type: 'message', // ✅ Match backend expected type
      sender_id: userId,
      group_id: message.groupId,
      content: message.content.trim(),
      timestamp: new Date().toISOString()
    };

    const sent = sendWebSocketMessage(messageData);

    if (sent) {
      // Optimistically add to local messages
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: message.content.trim(),
        senderId: userId,
        senderName: 'You',
        timestamp: new Date(),
        type: 'text',
        groupId: message.groupId,
        status: 'sending'
      };

      setMessages(prev => [...prev, optimisticMessage]);
    }

    return sent;
  }, [userId, sendWebSocketMessage]);

  const joinGroup = useCallback((groupId) => {
    if (!groupId) {
      console.error('❌ Invalid group ID');
      return false;
    }

    setActiveGroup(groupId);
    
    // Notify group of join
    const joinMessage = {
      type: MESSAGE_TYPES.USER_JOINED,
      user_id: userId,
      group_id: groupId,
      timestamp: new Date().toISOString()
    };

    console.log('👥 Joining group:', groupId);
    return sendWebSocketMessage(joinMessage);
  }, [userId, sendWebSocketMessage]);

  const leaveGroup = useCallback((groupId) => {
    if (!groupId) {
      return false;
    }

    // Notify group of leave
    const leaveMessage = {
      type: MESSAGE_TYPES.USER_LEFT,
      user_id: userId,
      group_id: groupId,
      timestamp: new Date().toISOString()
    };

    const sent = sendWebSocketMessage(leaveMessage);
    
    if (sent) {
      setActiveGroup(null);
      console.log('🚪 Left group:', groupId);
    }

    return sent;
  }, [userId, sendWebSocketMessage]);

  const sendTypingIndicator = useCallback((groupId, isTyping) => {
    const typingMessage = {
      type: isTyping ? 'typing_start' : 'typing_stop',
      user_id: userId,
      group_id: groupId,
      timestamp: new Date().toISOString()
    };

    return sendWebSocketMessage(typingMessage);
  }, [userId, sendWebSocketMessage]);

  const sendStatusUpdate = useCallback((isOnline) => {
    const statusMessage = {
      type: MESSAGE_TYPES.STATUS_UPDATE,
      user_id: userId,
      online_status: isOnline,
      timestamp: new Date().toISOString()
    };

    console.log('📊 Sending status update:', isOnline ? 'online' : 'offline');
    return sendWebSocketMessage(statusMessage);
  }, [userId, sendWebSocketMessage]);

  // Connect when hook is mounted and dependencies change
  useEffect(() => {
    if (userId && token) {
      console.log('🚀 Initializing WebSocket connection...');
      connect();
    } else {
      console.log('⏸️  Skipping WebSocket connection: missing userId or token');
    }

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket connection...');
      disconnect();
    };
  }, [connect, disconnect, userId, token]);

  return {
    isConnected,
    messages,
    onlineUsers,
    activeGroup,
    sendMessage,
    joinGroup,
    leaveGroup,
    sendTypingIndicator,
    connect,
    disconnect
  };
};

export default useWebSocket;