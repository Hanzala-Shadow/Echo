import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (userId, token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [fileTransfers, setFileTransfers] = useState({}); // For tracking file transfers
  
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const pendingMessages = useRef([]);
  const processedMessageIds = useRef(new Set());

  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000;

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = useCallback((title, body) => {
    // Check if browser supports notifications and permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
        console.log('🔔 Notification shown:', title, body);
      } catch (error) {
        console.error('❌ Error showing notification:', error);
      }
    } else {
      console.log('🔕 Notification permission not granted or not supported');
    }
  }, []);

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
    console.log('Message type:', messageType);

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
      
      // Show notification for new messages (not from current user)
      if (!newMessage.isCurrentUser) {
        showNotification(
          `New message from ${newMessage.senderName}`,
          newMessage.content.length > 50 
            ? newMessage.content.substring(0, 50) + '...' 
            : newMessage.content
        );
      }

      // Use batch update for better performance and handle optimistic message replacement
      setMessages(prev => {
        // Check if this is a server-confirmed version of an optimistic message
        const optimisticIndex = prev.findIndex(msg => 
          msg.isCurrentUser && 
          msg.content === newMessage.content &&
          msg.groupId === newMessage.groupId &&
          msg.status === 'pending' &&
          Math.abs(new Date(msg.timestamp) - new Date(newMessage.timestamp)) < 5000 // Within 5 seconds
        );
        
        if (optimisticIndex !== -1) {
          // Replace the optimistic message with the server-confirmed one
          const updated = [...prev];
          updated[optimisticIndex] = newMessage;
          console.log('🔄 Replacing optimistic message with server-confirmed message');
          return updated;
        } else {
          // Add as a new message
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) {
            console.log('⚠️ Message already in state, skipping');
            return prev;
          }
          return [...prev, newMessage];
        }
      });
    } 
    else if (messageType === 'status_update' || messageType === 'STATUS_UPDATE') {
      console.log('📊 Status update:', data);
      const targetUserId = data.user_id || data.userId;
      // Handle both boolean and string representations of online status
      const onlineStatus = data.online_status !== undefined ? 
        (typeof data.online_status === 'string' ? data.online_status === 'true' : data.online_status) :
        (data.online !== undefined ? 
          (typeof data.online === 'string' ? data.online === 'true' : data.online) : 
          false);
      
      // Use microtask for immediate update
      queueMicrotask(() => {
        setOnlineUsers(prev => {
          const userIndex = prev.findIndex(u => Number(u.userId) === Number(targetUserId));
          if (userIndex > -1) {
            const updated = [...prev];
            updated[userIndex] = { 
              ...updated[userIndex], 
              status: onlineStatus ? 'online' : 'offline',
              // Update user details if provided
              name: data.user_name || data.userName || updated[userIndex].name || `User ${targetUserId}`,
              username: data.username || updated[userIndex].username || `user${targetUserId}`
            };
            return updated;
          } else if (onlineStatus) {
            return [...prev, { 
              userId: Number(targetUserId),
              name: data.user_name || data.userName || `User ${targetUserId}`,
              username: data.username || `user${targetUserId}`,
              status: 'online'
            }];
          }
          return prev;
        });
      });
    }
    // File transfer messages
    else if (messageType === 'file_start') {
      console.log('📁 File transfer started:', data);
      setFileTransfers(prev => ({
        ...prev,
        [data.uploadId]: {
          ...data,
          status: 'started',
          progress: 0
        }
      }));
    }
    else if (messageType === 'file_chunk') {
      console.log('📦 File chunk received:', data.chunkIndex);
      setFileTransfers(prev => {
        const transfer = prev[data.uploadId];
        if (transfer) {
          const progress = Math.round(((data.chunkIndex + 1) / data.totalChunks) * 100);
          return {
            ...prev,
            [data.uploadId]: {
              ...transfer,
              progress,
              status: 'transferring'
            }
          };
        }
        return prev;
      });
    }
    else if (messageType === 'file_end') {
      console.log('✅ File transfer completed:', data);
      setFileTransfers(prev => {
        const transfer = prev[data.uploadId];
        if (transfer) {
          return {
            ...prev,
            [data.uploadId]: {
              ...transfer,
              status: 'completed',
              progress: 100
            }
          };
        }
        return prev;
      });
    }
    else if (messageType === 'file_cancel') {
      console.log('⏹️ File transfer cancelled:', data);
      setFileTransfers(prev => {
        const transfer = prev[data.uploadId];
        if (transfer) {
          return {
            ...prev,
            [data.uploadId]: {
              ...transfer,
              status: 'cancelled'
            }
          };
        }
        return prev;
      });
    }
    else {
      console.log('❓ Unknown message type:', messageType, data);
    }
  }, [userId, showNotification]);

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
      
      // For Docker environment or local development, use localhost
      let socketUrl;
      if (hostIp === 'localhost' || hostIp === '127.0.0.1') {
        socketUrl = `ws://localhost:8080/ws/messages?token=${token}`;
      } else {
        // Use the provided host IP
        const cleanIp = hostIp.trim().split(/\s+/)[0];
        socketUrl = `ws://${cleanIp}:8080/ws/messages?token=${token}`;
      }
      
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
    setFileTransfers({});
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

    // 👇 Add locally before sending with a unique temporary ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage = {
      id: tempId,
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

  // File transfer functions
  const sendFile = useCallback((file, groupId, onProgress) => {
    if (!file || !groupId) {
      console.error('❌ Invalid file or group ID');
      return false;
    }

    console.log('📤 Preparing to send file:', file.name);

    // Send file start message
    const fileStartMessage = {
      type: 'file_start',
      sender_id: userId,
      group_id: groupId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      timestamp: new Date().toISOString()
    };

    return sendWebSocketMessage(fileStartMessage);
  }, [userId, sendWebSocketMessage]);

  const sendFileChunk = useCallback((uploadId, chunkData, chunkIndex, totalChunks) => {
    const chunkMessage = {
      type: 'file_chunk',
      upload_id: uploadId,
      chunk_data: chunkData,
      chunk_index: chunkIndex,
      total_chunks: totalChunks,
      timestamp: new Date().toISOString()
    };

    return sendWebSocketMessage(chunkMessage);
  }, [sendWebSocketMessage]);

  const sendFileEnd = useCallback((uploadId, fileName, fileSize) => {
    const fileEndMessage = {
      type: 'file_end',
      upload_id: uploadId,
      file_name: fileName,
      file_size: fileSize,
      timestamp: new Date().toISOString()
    };

    return sendWebSocketMessage(fileEndMessage);
  }, [sendWebSocketMessage]);

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
    fileTransfers,
    sendMessage,
    sendFile,
    sendFileChunk,
    sendFileEnd,
    joinGroup,
    leaveGroup,
    sendTypingIndicator,
    connect,
    disconnect,
    clearGroupMessages,
    clearAllMessages,
    showNotification // Export the notification function
  };
};

export default useWebSocket;