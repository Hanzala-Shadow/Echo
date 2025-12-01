import { useState, useEffect, useRef, useCallback } from 'react';

import { encryptMessage, decryptMessage } from "../utils/cryptoUtils";
import { encryptFile, base64ToUint8 } from "../utils/cryptoUtils";
import * as keyCache from "../services/keyCache";
import * as groupKeyService from "../services/groupKeyService";

import ApiClient from '../services/api';

const useWebSocket = (userId, token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [fileTransfers, setFileTransfers] = useState({}); // For tracking file transfers
  const [mediaUploads, setMediaUploads] = useState({}); // For tracking media uploads
  const [typingUsers, setTypingUsers] = useState({});
  
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

  // Cleanup old typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        let hasChanges = false;
        const newState = { ...prev };
        
        Object.keys(newState).forEach(groupId => {
          const groupUsers = { ...newState[groupId] };
          let groupChanged = false;
          
          Object.keys(groupUsers).forEach(uid => {
            const entry = groupUsers[uid];
            const timestamp = typeof entry === 'object' ? entry.timestamp : entry;
            
            if (now - timestamp > 5000) { 
              delete groupUsers[uid];
              groupChanged = true;
              hasChanges = true;
            }
          });
          
          if (groupChanged) {
            if (Object.keys(groupUsers).length === 0) {
              delete newState[groupId];
            } else {
              newState[groupId] = groupUsers;
            }
          }
        });
        
        return hasChanges ? newState : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = useCallback((title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch (error) {
        console.error('❌ Error showing notification:', error);
      }
    }
  }, []);

  const sendWebSocketMessage = useCallback((messageData) => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      pendingMessages.current.push(messageData);
      return false;
    }

    try {
      const jsonMessage = JSON.stringify(messageData);
      websocketRef.current.send(jsonMessage);
      return true;
    } catch (error) {
      console.error('❌ [WEBSOCKET] Error sending WebSocket message:', error);
      pendingMessages.current.push(messageData);
      return false;
    }
  }, []);

const handleIncomingMessage = useCallback(async(data) => {
  // console.log('📩 [WEBSOCKET] RAW INCOMING MESSAGE DATA:', data);

  const messageType = data.type || data.message_type || data.messageType;

  if (messageType === 'message' || messageType === 'MESSAGE' || messageType === 'chat_message') {
    const messageId = data.message_id || data.messageId || data.id || `ws-${Date.now()}-${Math.random()}`;
    
    // Prevent duplicate processing ONLY if it's the same status
    if (processedMessageIds.current.has(messageId)) {
       return;
    }
    processedMessageIds.current.add(messageId);

    // EXTREMELY ROBUST media extraction
    let media = null;
    
    if (data.media && typeof data.media === 'object' && data.media !== null) {
      media = {
        media_id: data.media.mediaId || data.media.media_id || data.media.id,
        file_name: data.media.fileName || data.media.file_name,
        file_type: data.media.fileType || data.media.file_type,
        file_size: data.media.fileSize || data.media.file_size,
        iv: data.media.iv,
        uploaded_at: data.media.uploadedAt || data.media.uploaded_at
      };
    } else if (data.media_id || data.mediaId) {
      const mediaId = data.media_id || data.mediaId;
      if (mediaId) {
        media = {
          media_id: mediaId,
          file_name: data.file_name || data.fileName,
          file_type: data.file_type || data.fileType,
          file_size: data.file_size || data.fileSize,
          iv: data.iv
        };
      }
    }

    // Decrypt message content
    let decryptedContent = data.content || data.message || '';

    try {
      let groupKey = await keyCache.getGroupKey(data.group_id || data.groupId);

      if (!groupKey) {
        const userPrivateKey = await keyCache.getUserPrivateKey();
        if (userPrivateKey) {
          groupKey = await groupKeyService.fetchAndUnwrapGroupKey(
            data.group_id || data.groupId,
            userId,
            userPrivateKey
          );
          if (groupKey) {
            await keyCache.setGroupKey(data.group_id || data.groupId, groupKey);
          }
        }
      }

      if (groupKey && data.content) {
        // Check if content is JSON (encrypted)
        if (typeof data.content === 'string' && (data.content.startsWith('{') || data.content.includes('iv'))) {
            try {
                const encryptedPayload = JSON.parse(data.content);
                decryptedContent = await decryptMessage(encryptedPayload, groupKey);
            } catch (e) {
                // Not JSON or parse failed, assume plain text or already decrypted
            }
        }
      }
    } catch (err) {
      console.error('❌ [WEBSOCKET] Failed to decrypt message:', err);
      decryptedContent = '[Encrypted message - decryption failed]';
    }

    const newMessage = {
      id: messageId,
      content: decryptedContent,
      senderId: data.sender_id || data.senderId || data.userId,
      senderName: data.sender_name || data.senderName || data.username || `User ${data.sender_id || data.senderId}`,
      timestamp: new Date(data.created_at || data.createdAt || data.timestamp || Date.now()),
      type: 'text',
      groupId: data.group_id || data.groupId,
      status: data.status || 'sent',
      isCurrentUser: (data.sender_id || data.senderId) === userId,
      media: media
    };

    if (!newMessage.isCurrentUser) {
      showNotification(
        `New message from ${newMessage.senderName}`,
        newMessage.content.length > 50 
          ? newMessage.content.substring(0, 50) + '...' 
          : newMessage.content
      );
      
      // ✅ NEW: Automatically send read receipt for incoming messages in active chat
      // Note: This should ideally be handled by the UI component when message is visible
      // But we can emit an event or simple check here if we wanted
    }

    setMessages(prev => {
      // Try to match by client_id if available (from message_sent ACK) or fallback to content/timestamp matching
      const optimisticIndex = prev.findIndex(msg => 
        msg.isCurrentUser && 
        msg.content === newMessage.content &&
        msg.groupId === newMessage.groupId &&
        msg.status === 'pending' &&
        Math.abs(new Date(msg.timestamp) - new Date(newMessage.timestamp)) < 5000
      );
      
      if (optimisticIndex !== -1) {
        const updated = [...prev];
        updated[optimisticIndex] = newMessage;
        return updated;
      } else {
        const exists = prev.some(msg => msg.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage];
      }
    });
  }
  // ✅ NEW: Handle "Sent" ACK (Single Tick)
  else if (messageType === 'message_sent') {
      const realMessageId = data.message_id;
      const clientId = data.client_id;
      const serverTimestamp = data.created_at;

      console.log(`✅ [WEBSOCKET] Message Sent ACK: ClientID=${clientId} -> ID=${realMessageId}`);

      setMessages(prev => prev.map(msg => {
          // Match by client ID (best) or fallback logic if client_id missing
          if ((clientId && msg.id === clientId) || (msg.status === 'pending' && !clientId)) {
              return { 
                  ...msg, 
                  id: realMessageId, 
                  status: 'sent',
                  timestamp: serverTimestamp ? new Date(serverTimestamp) : msg.timestamp
              };
          }
          return msg;
      }));
  }
  // ✅ NEW: Handle Delivery & Read Status Updates
  else if (['message_read', 'message_delivered', 'message_status_update', 'read_receipt'].includes(messageType)) {
      const targetMessageId = data.message_id || data.messageId;
      const newStatus = messageType === 'message_read' || messageType === 'read_receipt' ? 'read' : 'delivered';
      
      console.log(`🔄 [WEBSOCKET] Updating message status: ${targetMessageId} -> ${newStatus}`);

      setMessages(prev => prev.map(msg => {
          if (String(msg.id) === String(targetMessageId)) {
              const statusRank = { 'pending': 0, 'sent': 1, 'delivered': 2, 'read': 3 };
              if ((statusRank[newStatus] || 0) > (statusRank[msg.status] || 0)) {
                  return { ...msg, status: newStatus };
              }
          }
          return msg;
      }));
  }
  else if (messageType === 'typing_start') {
    const groupId = data.group_id || data.groupId;
    const tUserId = data.user_id || data.userId;
    let tUsername = data.username || data.senderName || data.sender_name;
    
    if (!tUsername) {
      const knownUser = onlineUsers.find(u => String(u.userId) === String(tUserId));
      if (knownUser) tUsername = knownUser.username || knownUser.name;
    }

    if (String(tUserId) !== String(userId)) { 
      setTypingUsers(prev => ({
        ...prev,
        [groupId]: {
          ...(prev[groupId] || {}),
          [tUserId]: {
            timestamp: Date.now(),
            username: tUsername || 'Someone'
          }
        }
      }));
    }
  }
  else if (messageType === 'typing_stop') {
    const groupId = data.group_id || data.groupId;
    const tUserId = data.user_id || data.userId;
    setTypingUsers(prev => {
      if (!prev[groupId]) return prev;
      const newGroupTyping = { ...prev[groupId] };
      delete newGroupTyping[tUserId];
      return { ...prev, [groupId]: newGroupTyping };
    });
  } 
  else if (messageType === 'status_update' || messageType === 'STATUS_UPDATE') {
    const targetUserId = data.user_id || data.userId;
    const onlineStatus = data.online_status !== undefined ? 
      (typeof data.online_status === 'string' ? data.online_status === 'true' : data.online_status) :
      (data.online !== undefined ? 
        (typeof data.online === 'string' ? data.online === 'true' : data.online) : 
        false);
    
    queueMicrotask(() => {
      setOnlineUsers(prev => {
        const userIndex = prev.findIndex(u => Number(u.userId) === Number(targetUserId));
        if (userIndex > -1) {
          const updated = [...prev];
          updated[userIndex] = { 
            ...updated[userIndex], 
            status: onlineStatus ? 'online' : 'offline',
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
}, [userId, showNotification, onlineUsers]);

  const connect = useCallback(() => {
    if (!userId || !token) return;

    if (websocketRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const hostIp = import.meta.env.VITE_HOST_IP || 'localhost';
      let socketUrl;
      if (hostIp === 'localhost' || hostIp === '127.0.0.1') {
        socketUrl = `ws://localhost:8080/ws/messages?token=${token}`;
      } else {
        const cleanIp = hostIp.trim().split(/\s+/)[0];
        socketUrl = `ws://${cleanIp}:8080/ws/messages?token=${token}`;
      }
      
      console.log('🔌 [WEBSOCKET] Connecting to WebSocket:', socketUrl);

      const socket = new WebSocket(socketUrl);
      
      socket.onopen = () => {
        console.log('✅ [WEBSOCKET] Connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        if (pendingMessages.current.length > 0) {
          pendingMessages.current.forEach(msg => socket.send(JSON.stringify(msg)));
          pendingMessages.current = [];
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleIncomingMessage(data);
        } catch (error) {
          console.error('❌ [WEBSOCKET] Error parsing message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('🔌 [WEBSOCKET] Disconnected:', event.code);
        setIsConnected(false);
        websocketRef.current = null;
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          handleReconnection();
        }
      };

      socket.onerror = (error) => {
        console.error('❌ [WEBSOCKET] Error:', error);
        setIsConnected(false);
      };

      websocketRef.current = socket;
    } catch (error) {
      console.error('❌ [WEBSOCKET] Connection error:', error);
      setIsConnected(false);
      handleReconnection();
    }
  }, [userId, token, handleIncomingMessage]);

  const handleReconnection = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++;
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);
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
    setMediaUploads({});
    processedMessageIds.current.clear();
  }, []);

const sendMessage = useCallback(async (message) => {
  const hasContent = message.content && message.content.trim() !== '';
  const hasMedia = message.media && Object.keys(message.media).length > 0;

  if (!hasContent && !hasMedia) return false;

  // Extract the ID from the message object if passed (it should be there from handleSendMessage)
  // We use this ID as client_id to match the ACK later
  const clientId = message.id || `optimistic-${Date.now()}-${Math.random()}`;

  let encryptedContent = message.content;
  if (hasContent) {
    let groupKey = await keyCache.getGroupKey(message.groupId);

    if (!groupKey) {
      try {
        const userPrivateKey = await keyCache.getUserPrivateKey();
        if (!userPrivateKey) return false;

        groupKey = await groupKeyService.fetchAndUnwrapGroupKey(
          message.groupId,
          userId,
          userPrivateKey
        );

        if (groupKey) {
          await keyCache.setGroupKey(message.groupId, groupKey);
        } else {
          return false;
        }
      } catch (unwrapErr) {
        console.error("❌ Error fetching group key:", unwrapErr);
        return false;
      }
    }

    try {
      const encrypted = await encryptMessage(message.content, groupKey);
      encryptedContent = JSON.stringify(encrypted);
    } catch (encryptErr) {
      console.error("❌ [WEBSOCKET] Encryption failed:", encryptErr);
      return false;
    }
  }

  const messageData = {
    type: 'message',
    sender_id: userId,
    group_id: message.groupId,
    timestamp: new Date().toISOString(),
    content: encryptedContent,
    client_id: clientId, // ✅ Send client ID for matching
    status: 'sent' 
  };

  if (hasMedia) {
    const mediaId = message.media.media_id || message.media.id || message.media.mediaId;
    if (mediaId) messageData.media_id = mediaId;
    else messageData.media = message.media;
  }

  return sendWebSocketMessage(messageData);
}, [userId, sendWebSocketMessage]);

  const joinGroup = useCallback((groupId) => {
    if (!groupId) return false;
    const joinMessage = { type: 'user_joined', user_id: userId, group_id: groupId, timestamp: new Date().toISOString() };
    return sendWebSocketMessage(joinMessage);
  }, [userId, sendWebSocketMessage]);

  const leaveGroup = useCallback((groupId) => {
    if (!groupId) return false;
    const leaveMessage = { type: 'user_left', user_id: userId, group_id: groupId, timestamp: new Date().toISOString() };
    return sendWebSocketMessage(leaveMessage);
  }, [userId, sendWebSocketMessage]);

  const sendTypingIndicator = useCallback((groupId, isTyping, username) => {
      const payload = {
      type: isTyping ? 'typing_start' : 'typing_stop',
      user_id: userId,
      username: username, 
      group_id: groupId,
      timestamp: new Date().toISOString()
    };
    return sendWebSocketMessage(payload);
  }, [userId, sendWebSocketMessage]);

  const clearGroupMessages = useCallback((groupId) => {
    setMessages(prev => prev.filter(msg => msg.groupId !== groupId));
  }, []);

  const clearAllMessages = useCallback(() => {
    setMessages([]);
    processedMessageIds.current.clear();
  }, []);

  const sendFile = useCallback((file, groupId, onProgress) => {
    return false; 
  }, []);

  const sendFileChunk = useCallback(() => {}, []);
  const sendFileEnd = useCallback(() => {}, []);

 const uploadMedia = useCallback(async (file, groupId, onProgress) => {
  if (!file || !groupId) return false;

  const groupKey = await keyCache.getGroupKey(groupId);
  if (!groupKey) return false;

  try {
    const fileBuffer = await file.arrayBuffer();
    const { iv, ciphertext } = await encryptFile(fileBuffer, groupKey);
    const encryptedBlob = new Blob([base64ToUint8(ciphertext)], { type: file.type });
    const formData = new FormData();
    formData.append('file', encryptedBlob, file.name);
    formData.append('iv', iv);

    const hostIp = import.meta.env.VITE_HOST_IP || 'localhost';
    const uploadUrl = `http://${hostIp}:8080/media/upload/${groupId}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) { reject(e); }
        } else { reject(new Error(`Upload failed`)); }
      });
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  } catch (error) {
    return false;
  }
}, [token]);

  useEffect(() => {
    if (userId && token) connect();
    return () => disconnect();
  }, [userId, token]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return {
    isConnected,
    messages,
    onlineUsers,
    typingUsers,
    fileTransfers,
    mediaUploads,
    sendMessage,
    sendWebSocketMessage,
    sendFile,
    sendFileChunk,
    sendFileEnd,
    uploadMedia,
    joinGroup,
    leaveGroup,
    sendTypingIndicator,
    connect,
    disconnect,
    clearGroupMessages,
    clearAllMessages,
    showNotification
  };
};

export default useWebSocket;