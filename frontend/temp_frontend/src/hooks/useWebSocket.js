import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (userId, token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const pendingMessages = useRef([]);
  const processedMessageIds = useRef(new Set());

  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000;

  const sendWebSocketMessage = useCallback((messageData) => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket is not connected, queuing message');
      pendingMessages.current.push(messageData);
      return false;
    }

    try {
      const jsonMessage = JSON.stringify(messageData);
      websocketRef.current.send(jsonMessage);
      console.log('📤 WebSocket message sent:', messageData);
      return true;
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
      pendingMessages.current.push(messageData);
      return false;
    }
  }, []);

  const handleIncomingMessage = useCallback((data) => {
    console.log('📩 Handling incoming WebSocket message:', data);

    const messageType = data.type || data.message_type || data.messageType;
    console.log(messageType);

    if (messageType === 'message' || messageType === 'MESSAGE' || messageType === 'chat_message') {
      console.log('💬 Received chat message for group:', data.group_id || data.groupId);

      const messageId = data.message_id || data.messageId || data.id || `ws-${Date.now()}-${Math.random()}`;
      if (processedMessageIds.current.has(messageId)) {
        console.log('⚠️ Duplicate message detected (already processed), skipping:', messageId);
        return;
      }
      processedMessageIds.current.add(messageId);

      const newMessage = {
        id: messageId,
        content: data.content || data.message || '',
        senderId: data.sender_id || data.senderId || data.userId,
        senderName: data.sender_name || data.senderName || data.username || `User ${data.sender_id || data.senderId}`,
        timestamp: new Date(data.created_at || data.createdAt || data.timestamp || Date.now()),
        type: 'text',
        groupId: data.group_id || data.groupId,
        status: 'delivered',
        isCurrentUser: (data.sender_id || data.senderId) === userId
      };

      console.log('✅ Adding new message to state:', newMessage);
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === newMessage.id);
        if (exists) {
          console.log('⚠️ Message already in state, skipping');
          return prev;
        }
        return [...prev, newMessage];
      });
    } 
    else if (messageType === 'status_update' || messageType === 'STATUS_UPDATE') {
      console.log('📊 Status update:', data);
      const targetUserId = data.user_id || data.userId;
      const onlineStatus = data.online_status !== undefined ? data.online_status : data.online;
      
      setOnlineUsers(prev => {
        const userIndex = prev.findIndex(u => u.userId === targetUserId);
        if (userIndex > -1) {
          const updated = [...prev];
          updated[userIndex] = { ...updated[userIndex], status: onlineStatus ? 'online' : 'offline' };
          return updated;
        } else if (onlineStatus) {
          return [...prev, { 
            userId: targetUserId,
            name: data.user_name || data.userName || `User ${targetUserId}`,
            username: data.username || `user${targetUserId}`,
            status: 'online'
          }];
        }
        return prev;
      });
    }
    else {
      console.log('❓ Unknown message type:', messageType, data);
    }
  }, [userId]);

  const connect = useCallback(() => {
    if (!userId || !token) {
      console.log('⏸️ Missing userId or token for WebSocket connection');
      return;
    }

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket already connected');
      return;
    }

    try {
      // Use environment variable for WebSocket URL
      const hostIp = import.meta.env.VITE_HOST_IP || 'localhost';
      const socketUrl = `ws://${hostIp}:8081/ws/messages?token=${token}`;
      console.log('🔌 Connecting to WebSocket:', socketUrl);

      const socket = new WebSocket(socketUrl);
      
      socket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        if (pendingMessages.current.length > 0) {
          console.log(`📤 Sending ${pendingMessages.current.length} queued messages`);
          pendingMessages.current.forEach(msg => {
            socket.send(JSON.stringify(msg));
          });
          pendingMessages.current = [];
        }
      };

      socket.onmessage = (event) => {
        try {
          console.log('📨 Raw WebSocket message:', event.data);
          const data = JSON.parse(event.data);
          handleIncomingMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, event.data);
        }
      };

      socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        websocketRef.current = null;
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          handleReconnection();
        }
      };

      socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };

      websocketRef.current = socket;
    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      setIsConnected(false);
      handleReconnection();
    }
  }, [userId, token, handleIncomingMessage]);

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
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.close(1000, "User initiated disconnect");
      websocketRef.current = null;
    }
    setIsConnected(false);
    setMessages([]);
    setOnlineUsers([]);
    processedMessageIds.current.clear();
  }, []);

  const sendMessage = useCallback((message) => {
    if (!message.groupId || !message.content?.trim()) {
      console.error('❌ Invalid message format:', message);
      return false;
    }
    console.log('📤 Preparing to send message to group:', message.groupId);

    const messageData = {
      type: 'message',
      sender_id: userId,
      group_id: message.groupId,
      content: message.content.trim(),
      timestamp: new Date().toISOString()
    };

    // 👇 Add locally before sending
    const optimisticMessage = {
      id: `local-${Date.now()}`,
      content: messageData.content,
      senderId: userId,
      senderName: "You",
      timestamp: new Date(messageData.timestamp),
      type: 'text',
      groupId: message.groupId,
      status: 'pending',
      isCurrentUser: true
    };
    setMessages(prev => [...prev, optimisticMessage]);

    return sendWebSocketMessage(messageData);
  }, [userId, sendWebSocketMessage]);


  const joinGroup = useCallback((groupId) => {
    if (!groupId) {
      console.error('❌ Invalid group ID');
      return false;
    }
    console.log('👥 Joining group:', groupId);
    const joinMessage = {
      type: 'user_joined',
      user_id: userId,
      group_id: groupId,
      timestamp: new Date().toISOString()
    };
    return sendWebSocketMessage(joinMessage);
  }, [userId, sendWebSocketMessage]);

  const leaveGroup = useCallback((groupId) => {
    if (!groupId) return false;
    console.log('🚪 Leaving group:', groupId);
    const leaveMessage = {
      type: 'user_left',
      user_id: userId,
      group_id: groupId,
      timestamp: new Date().toISOString()
    };
    return sendWebSocketMessage(leaveMessage);
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

  const clearGroupMessages = useCallback((groupId) => {
    console.log('🧹 Clearing messages for group:', groupId);
    setMessages(prev => {
      const filtered = prev.filter(msg => msg.groupId !== groupId);
      console.log(`Removed ${prev.length - filtered.length} messages for group ${groupId}`);
      return filtered;
    });
  }, []);

  const clearAllMessages = useCallback(() => {
    console.log('🧹 Clearing all messages');
    setMessages([]);
    processedMessageIds.current.clear();
  }, []);

  useEffect(() => {
    if (userId && token) {
      console.log('🚀 Initializing WebSocket connection for user:', userId);
      connect();
    }
    return () => {
      console.log('🧹 Cleaning up WebSocket connection...');
      disconnect();
    };
  }, [userId, token]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    messages,
    onlineUsers,
    sendMessage,
    joinGroup,
    leaveGroup,
    sendTypingIndicator,
    connect,
    disconnect,
    clearGroupMessages,
    clearAllMessages
  };
};

export default useWebSocket;
