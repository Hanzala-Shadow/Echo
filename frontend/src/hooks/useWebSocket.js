import { useState, useEffect, useRef, useCallback } from 'react';

import { encryptMessage, decryptMessage } from "../utils/cryptoUtils";
import { encryptFile, base64ToUint8 } from "../utils/cryptoUtils";
import * as keyCache from "../services/keyCache";
import * as groupKeyService from "../services/groupKeyService";

const useWebSocket = (userId, token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [fileTransfers, setFileTransfers] = useState({}); // For tracking file transfers
  const [mediaUploads, setMediaUploads] = useState({}); // For tracking media uploads
  
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
    console.log('📤 [WEBSOCKET] SENDING MESSAGE DATA:', JSON.stringify(messageData, null, 2));
    
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ [WEBSOCKET] WebSocket is not connected, queuing message');
      pendingMessages.current.push(messageData);
      return false;
    }

    try {
      const jsonMessage = JSON.stringify(messageData);
      console.log('📤 [WEBSOCKET] Sending JSON message:', jsonMessage);
      websocketRef.current.send(jsonMessage);
      console.log('📤 [WEBSOCKET] WebSocket message sent successfully:', messageData);
      return true;
    } catch (error) {
      console.error('❌ [WEBSOCKET] Error sending WebSocket message:', error);
      pendingMessages.current.push(messageData);
      return false;
    }
  }, []);
const handleIncomingMessage = useCallback(async(data) => {
  console.log('📩 [WEBSOCKET] RAW INCOMING MESSAGE DATA:', data);
  console.log('📩 [WEBSOCKET] Handling incoming WebSocket message:', JSON.stringify(data, null, 2));

  const messageType = data.type || data.message_type || data.messageType;
  console.log('💬 [WEBSOCKET] Message type:', messageType);

  if (messageType === 'message' || messageType === 'MESSAGE' || messageType === 'chat_message') {
    console.log('💬 [WEBSOCKET] Processing chat message for group:', data.group_id || data.groupId);

    const messageId = data.message_id || data.messageId || data.id || `ws-${Date.now()}-${Math.random()}`;
    if (processedMessageIds.current.has(messageId)) {
      console.log('⚠️ [WEBSOCKET] Duplicate message detected (already processed), skipping:', messageId);
      return;
    }
    processedMessageIds.current.add(messageId);

    // Debug: Log the raw data structure
    console.log('🔍 [WEBSOCKET] Raw message data structure:', {
      hasMediaProperty: !!data.media,
      mediaType: data.media ? typeof data.media : 'none',
      mediaKeys: data.media ? Object.keys(data.media) : [],
      hasMediaId: !!(data.media_id || data.mediaId),
      flatMediaId: data.media_id || data.mediaId,
      contentLength: data.content ? data.content.length : 0,
      allKeys: Object.keys(data)
    });

    // EXTREMELY ROBUST media extraction - handle ANY possible format
    let media = null;
    
    // Method 1: Check if data has a direct media object from backend
    if (data.media && typeof data.media === 'object' && data.media !== null) {
      console.log('📂 [WEBSOCKET] Found nested media object from backend:', data.media);
      // ✅ Extract all properties including IV
      media = {
        media_id: data.media.mediaId || data.media.media_id || data.media.id,
        file_name: data.media.fileName || data.media.file_name,
        file_type: data.media.fileType || data.media.file_type,
        file_size: data.media.fileSize || data.media.file_size,
        iv: data.media.iv,  // ✅ CRITICAL: Extract IV from backend
        uploaded_at: data.media.uploadedAt || data.media.uploaded_at
      };
      console.log('✅ [WEBSOCKET] Extracted media with IV:', media);
    } 
    // Method 2: Flat media properties (legacy support)
    else if (data.media_id || data.mediaId) {
      console.log('📄 [WEBSOCKET] Found flat media properties');
      const mediaId = data.media_id || data.mediaId;
      if (mediaId) {
        media = {
          media_id: mediaId,
          file_name: data.file_name || data.fileName,
          file_type: data.file_type || data.fileType,
          file_size: data.file_size || data.fileSize,
          iv: data.iv  // ✅ CRITICAL: Extract IV from flat format
        };
        console.log('✅ [WEBSOCKET] Created media object from flat format:', media);
      }
    }
    // Method 3: Alternative property names (case insensitive search)
    else {
      console.log('🔍 [WEBSOCKET] No standard media format found, searching for alternative property names');
      
      // Create a lowercase map of all properties for case-insensitive search
      const lowerCaseData = {};
      const propMap = {}; // Map lowercase keys to original keys
      Object.keys(data).forEach(key => {
        lowerCaseData[key.toLowerCase()] = data[key];
        propMap[key.toLowerCase()] = key;
      });
      
      // Search for media-related properties including IV
      const possibleMediaIds = ['media_id', 'mediaid', 'mediaId', 'mediaID', 'id'];
      const possibleFileNames = ['file_name', 'filename', 'fileName'];
      const possibleFileTypes = ['file_type', 'filetype', 'fileType', 'mimetype', 'mimeType'];
      const possibleFileSizes = ['file_size', 'filesize', 'fileSize'];
      const possibleIVs = ['iv', 'IV', 'initializationVector'];  // ✅ Look for IV
      
      let foundMediaId = null;
      let foundFileName = null;
      let foundFileType = null;
      let foundFileSize = null;
      let foundIV = null;  // ✅ Track IV
      
      // Look for media ID
      for (const key of possibleMediaIds) {
        if (lowerCaseData[key] && lowerCaseData[key] !== '') {
          foundMediaId = lowerCaseData[key];
          console.log(`🆔 [WEBSOCKET] Found media ID with key '${propMap[key]}':`, foundMediaId);
          break;
        }
      }
      
      // Look for file name
      for (const key of possibleFileNames) {
        if (lowerCaseData[key]) {
          foundFileName = lowerCaseData[key];
          console.log(`📄 [WEBSOCKET] Found file name with key '${propMap[key]}':`, foundFileName);
          break;
        }
      }
      
      // Look for file type
      for (const key of possibleFileTypes) {
        if (lowerCaseData[key]) {
          foundFileType = lowerCaseData[key];
          console.log(`📦 [WEBSOCKET] Found file type with key '${propMap[key]}':`, foundFileType);
          break;
        }
      }
      
      // Look for file size
      for (const key of possibleFileSizes) {
        if (lowerCaseData[key]) {
          foundFileSize = lowerCaseData[key];
          console.log(`⚖️ [WEBSOCKET] Found file size with key '${propMap[key]}':`, foundFileSize);
          break;
        }
      }

      // ✅ Look for IV
      for (const key of possibleIVs) {
        if (lowerCaseData[key]) {
          foundIV = lowerCaseData[key];
          console.log(`🔑 [WEBSOCKET] Found IV with key '${propMap[key]}':`, foundIV);
          break;
        }
      }
      
      // If we found a media ID, create a media object
      if (foundMediaId) {
        media = {
          media_id: foundMediaId,
          file_name: foundFileName,
          file_type: foundFileType,
          file_size: foundFileSize,
          iv: foundIV  // ✅ Include IV
        };
        console.log('✅ [WEBSOCKET] Created media object from alternative format:', media);
      } else {
        console.log('📝 [WEBSOCKET] No media properties found in any format, treating as text message');
      }
    }

    // Decrypt message content
    let decryptedContent = data.content || data.message || '';

    try {
      // 1️⃣ Get group key (await it)
      let groupKey = await keyCache.getGroupKey(data.group_id || data.groupId);

      // 2️⃣ If not cached, fetch & unwrap using CURRENT user's private key
      if (!groupKey) {
        console.log(`⚠️ Group key not found in cache for group ${data.group_id || data.groupId}`);
        const userPrivateKey = await keyCache.getUserPrivateKey();
        
        if (userPrivateKey) {
          console.log(`🔑 Fetching group key for current user (${userId})`);
          groupKey = await groupKeyService.fetchAndUnwrapGroupKey(
            data.group_id || data.groupId,
            userId,  // ✅ ALWAYS use current user's ID
            userPrivateKey
          );
          
          if (groupKey) {
            await keyCache.setGroupKey(data.group_id || data.groupId, groupKey);
            console.log(`✅ Group key cached for group ${data.group_id || data.groupId}`);
          }
        }
      }

      // 3️⃣ Decrypt if group key exists and message has content
      if (groupKey && data.content) {
        const encryptedPayload = JSON.parse(data.content); // { iv, ciphertext }
        decryptedContent = await decryptMessage(encryptedPayload, groupKey);
        console.log('✅ Message decrypted successfully');
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
      status: 'delivered',
      isCurrentUser: (data.sender_id || data.senderId) === userId,
      media: media  // ✅ Includes IV if media exists
    };

    console.log('📤 [WEBSOCKET] Final message object to be added:', newMessage);
    console.log('📊 [WEBSOCKET] Message has media:', !!newMessage.media);
    console.log('📊 [WEBSOCKET] Message has IV:', !!newMessage.media?.iv);
    console.log('📊 [WEBSOCKET] Message has content:', !!newMessage.content && newMessage.content.length > 0);
    
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
        Math.abs(new Date(msg.timestamp) - new Date(newMessage.timestamp)) < 5000
      );
      
      if (optimisticIndex !== -1) {
        const updated = [...prev];
        updated[optimisticIndex] = newMessage;
        console.log('🔄 [WEBSOCKET] Replacing optimistic message with server-confirmed message');
        return updated;
      } else {
        const exists = prev.some(msg => msg.id === newMessage.id);
        if (exists) {
          console.log('⚠️ [WEBSOCKET] Message already in state, skipping');
          return prev;
        }
        console.log('➕ [WEBSOCKET] Adding new message to state');
        return [...prev, newMessage];
      }
    });
  } 
  else if (messageType === 'status_update' || messageType === 'STATUS_UPDATE') {
    console.log('📊 Status update:', data);
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
  // ... rest of message type handlers (file_start, file_chunk, etc.)
}, [userId, showNotification]);

  const connect = useCallback(() => {
    if (!userId || !token) {
      console.log('⏸️ [WEBSOCKET] Missing userId or token for WebSocket connection');
      return;
    }

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ [WEBSOCKET] WebSocket already connected');
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
      
      console.log('🔌 [WEBSOCKET] Connecting to WebSocket:', socketUrl);

      const socket = new WebSocket(socketUrl);
      
      socket.onopen = () => {
        console.log('✅ [WEBSOCKET] WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        if (pendingMessages.current.length > 0) {
          console.log(`📤 [WEBSOCKET] Sending ${pendingMessages.current.length} queued messages`);
          pendingMessages.current.forEach(msg => {
            socket.send(JSON.stringify(msg));
          });
          pendingMessages.current = [];
        }
      };

      socket.onmessage = (event) => {
        console.log('📨 [WEBSOCKET] RAW WebSocket message event:', event);
        console.log('📨 [WEBSOCKET] RAW WebSocket message data type:', typeof event.data);
        console.log('📨 [WEBSOCKET] RAW WebSocket message data:', event.data);
        
        try {
          const data = JSON.parse(event.data);
          console.log('✅ [WEBSOCKET] Parsed WebSocket message:', data);
          console.log('✅ [WEBSOCKET] Parsed message keys:', Object.keys(data));
          handleIncomingMessage(data);
        } catch (error) {
          console.error('❌ [WEBSOCKET] Error parsing WebSocket message:', error);
          console.error('❌ [WEBSOCKET] Raw message data that failed to parse:', event.data);
        }
      };

      socket.onclose = (event) => {
        console.log('🔌 [WEBSOCKET] WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        websocketRef.current = null;
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          handleReconnection();
        }
      };

      socket.onerror = (error) => {
        console.error('❌ [WEBSOCKET] WebSocket error:', error);
        setIsConnected(false);
      };

      websocketRef.current = socket;
    } catch (error) {
      console.error('❌ [WEBSOCKET] Error creating WebSocket connection:', error);
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
    setMediaUploads({});
    processedMessageIds.current.clear();
  }, []);

const sendMessage = useCallback(async (message) => {
  console.log('📤 [WEBSOCKET] Preparing to send message:', message);

  const hasContent = message.content && message.content.trim() !== '';
  const hasMedia = message.media && Object.keys(message.media).length > 0;

  if (!hasContent && !hasMedia) {
    console.error('❌ [WEBSOCKET] Cannot send empty message');
    return false;
  }

  /// 🔐 Encrypt message content if present
let encryptedContent = message.content;
if (hasContent) {
  let groupKey = await keyCache.getGroupKey(message.groupId);

  if (!groupKey) {
    console.warn(`⚠️ Group key not found in cache. Fetching from server for group ${message.groupId}...`);
    try {
      const userPrivateKey = await keyCache.getUserPrivateKey();
      if (!userPrivateKey) {
        console.error("❌ Missing user private key – cannot unwrap group key");
        return false;
      }

      // 🧠 Fetch and unwrap from backend
      groupKey = await groupKeyService.fetchAndUnwrapGroupKey(
        message.groupId,
        userId,
        userPrivateKey
      );

      // 🧱 Cache it for later use
      if (groupKey) {
        await keyCache.setGroupKey(message.groupId, groupKey);
        console.log(`✅ Cached group key for group ${message.groupId}`);
      } else {
        console.error("❌ Failed to unwrap group key – empty key returned");
        return false;
      }
    } catch (unwrapErr) {
      console.error("❌ Error fetching/unwrapping group key:", unwrapErr);
      return false;
    }
  }

  // 🔒 Proceed with encryption
  const encrypted = await encryptMessage(message.content, groupKey);
  encryptedContent = JSON.stringify(encrypted);
}


  const messageData = {
    type: 'message',
    sender_id: userId,
    group_id: message.groupId,
    timestamp: new Date().toISOString(),
    content: encryptedContent
  };

  if (hasMedia) {
    const mediaId = message.media.media_id || message.media.id || message.media.mediaId;
    if (mediaId) messageData.media_id = mediaId;
    else messageData.media = message.media;
  }

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

  // Media upload functions
 const uploadMedia = useCallback(async (file, groupId, onProgress) => {
  if (!file || !groupId) {
    console.error('❌ [WEBSOCKET] Invalid file or group ID for media upload');
    return false;
  }

  const groupKey = await keyCache.getGroupKey(groupId);
  if (!groupKey) {
    console.error('❌ [WEBSOCKET] Group key not found, cannot encrypt file');
    return false;
  }

  try {
    const fileBuffer = await file.arrayBuffer();
    const { iv, ciphertext } = await encryptFile(fileBuffer, groupKey);

    // Convert ciphertext to Blob
    const encryptedBlob = new Blob([base64ToUint8(ciphertext)], { type: file.type });

    const formData = new FormData();
    formData.append('file', encryptedBlob, file.name);
    formData.append('iv', iv); // ✅ Send IV to backend

    const hostIp = import.meta.env.VITE_HOST_IP || 'localhost';
    const uploadUrl = `http://${hostIp}:8080/media/upload/${groupId}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        console.log('✅ [WEBSOCKET] Upload request completed with status:', xhr.status);
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('✅ [WEBSOCKET] Media upload successful, response:', response);
            
            // ✅ Response now includes: { mediaId, fileName, fileType, fileSize, iv, uploadedAt, groupId }
            resolve(response);
          } catch (e) {
            console.error('❌ [WEBSOCKET] Error parsing response:', e);
            reject(e);
          }
        } else {
          console.error('❌ [WEBSOCKET] Media upload failed with status:', xhr.status);
          console.error('❌ [WEBSOCKET] Response text:', xhr.responseText);
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        console.error('❌ [WEBSOCKET] Media upload network error');
        reject(new Error('Upload failed'));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        console.error('❌ [WEBSOCKET] Media upload aborted');
        reject(new Error('Upload aborted'));
      });

      // Send the request
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      console.log('📤 [WEBSOCKET] Sending media upload request with token');
      xhr.send(formData);
    });
  } catch (error) {
    console.error('❌ [WEBSOCKET] Error during media upload:', error);
    return false;
  }
}, [token]);


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
    mediaUploads,
    sendMessage,
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
    showNotification // Export the notification function
  };
};

export default useWebSocket;