import { useState, useEffect, useRef, useCallback } from 'react';

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

  const handleIncomingMessage = useCallback((data) => {
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

      // CRITICAL DEBUG: Check for any media-related properties in the entire data object
      console.log('🔍 [WEBSOCKET] Checking for ALL media-related properties in data:');
      const allProperties = Object.keys(data);
      const mediaRelatedProps = allProperties.filter(key => 
        key.toLowerCase().includes('media') || 
        key.toLowerCase().includes('file') ||
        key.toLowerCase().includes('upload')
      );
      console.log('🔍 [WEBSOCKET] Media-related properties found:', mediaRelatedProps);
      mediaRelatedProps.forEach(prop => {
        console.log(`🔍 [WEBSOCKET] Property ${prop}:`, data[prop]);
      });

      // EXTREMELY ROBUST media extraction - handle ANY possible format
      let media = null;
      
      // Method 1: Check if data has a direct media object from backend
      if (data.media && typeof data.media === 'object' && data.media !== null) {
        console.log('📂 [WEBSOCKET] Found nested media object from backend:', data.media);
        // Use the media object directly as it comes from the backend
        media = data.media;
      } 
      // Method 2: Flat media properties (legacy support)
      else if (data.media_id || data.mediaId) {
        console.log('📄 [WEBSOCKET] Found flat media properties');
        const mediaId = data.media_id || data.mediaId;
        if (mediaId) {
          media = {
            media_id: mediaId,
            id: mediaId,
            mediaId: mediaId,
            file_name: data.file_name || data.fileName,
            fileName: data.file_name || data.fileName,
            file_type: data.file_type || data.fileType,
            fileType: data.file_type || data.fileType,
            file_size: data.file_size || data.fileSize,
            fileSize: data.file_size || data.fileSize
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
        
        // Search for media-related properties
        const possibleMediaIds = [
          'media_id', 'mediaid', 'mediaId', 'mediaID', 'id'
        ];
        
        const possibleFileNames = [
          'file_name', 'filename', 'fileName', 'fileName'
        ];
        
        const possibleFileTypes = [
          'file_type', 'filetype', 'fileType', 'mimetype', 'mimeType'
        ];
        
        const possibleFileSizes = [
          'file_size', 'filesize', 'fileSize'
        ];
        
        let foundMediaId = null;
        let foundFileName = null;
        let foundFileType = null;
        let foundFileSize = null;
        
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
        
        // If we found a media ID, create a media object
        if (foundMediaId) {
          media = {
            media_id: foundMediaId,
            id: foundMediaId,
            mediaId: foundMediaId,
            file_name: foundFileName,
            fileName: foundFileName,
            file_type: foundFileType,
            fileType: foundFileType,
            file_size: foundFileSize,
            fileSize: foundFileSize
          };
          console.log('✅ [WEBSOCKET] Created media object from alternative format:', media);
        } else {
          console.log('📝 [WEBSOCKET] No media properties found in any format, treating as text message');
        }
      }

      const newMessage = {
        id: messageId,
        content: data.content || data.message || '',
        senderId: data.sender_id || data.senderId || data.userId,
        senderName: data.sender_name || data.senderName || data.username || `User ${data.sender_id || data.senderId}`,
        timestamp: new Date(data.created_at || data.createdAt || data.timestamp || Date.now()),
        type: 'text',
        groupId: data.group_id || data.groupId,
        status: 'delivered',
        isCurrentUser: (data.sender_id || data.senderId) === userId,
        // Add media if present
        media: media
      };

      console.log('📤 [WEBSOCKET] Final message object to be added:', newMessage);
      console.log('📊 [WEBSOCKET] Message has media:', !!newMessage.media);
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
          Math.abs(new Date(msg.timestamp) - new Date(newMessage.timestamp)) < 5000 // Within 5 seconds
        );
        
        if (optimisticIndex !== -1) {
          // Replace the optimistic message with the server-confirmed one
          const updated = [...prev];
          updated[optimisticIndex] = newMessage;
          console.log('🔄 [WEBSOCKET] Replacing optimistic message with server-confirmed message');
          return updated;
        } else {
          // Add as a new message
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
    // Media upload messages
    else if (messageType === 'media_upload_start') {
      console.log('📤 Media upload started:', data);
      setMediaUploads(prev => ({
        ...prev,
        [data.upload_id]: {
          ...data,
          status: 'started',
          progress: 0
        }
      }));
    }
    else if (messageType === 'media_upload_progress') {
      console.log('📊 Media upload progress:', data.progress);
      setMediaUploads(prev => {
        const upload = prev[data.upload_id];
        if (upload) {
          return {
            ...prev,
            [data.upload_id]: {
              ...upload,
              progress: data.progress,
              status: 'uploading'
            }
          };
        }
        return prev;
      });
    }
    else if (messageType === 'media_upload_complete') {
      console.log('✅ Media upload completed:', data);
      setMediaUploads(prev => {
        const upload = prev[data.upload_id];
        if (upload) {
          return {
            ...prev,
            [data.upload_id]: {
              ...upload,
              status: 'completed',
              progress: 100,
              media: data.media
            }
          };
        }
        return prev;
      });
    }
    else if (messageType === 'media_upload_error') {
      console.log('❌ Media upload error:', data.error);
      setMediaUploads(prev => {
        const upload = prev[data.upload_id];
        if (upload) {
          return {
            ...prev,
            [data.upload_id]: {
              ...upload,
              status: 'error',
              error: data.error
            }
          };
        }
        return prev;
      });
    }
    // Typing indicators
    else if (messageType === 'typing_start' || messageType === 'typing_stop') {
      // These are handled by the ChatContainer and DMContainer components directly
      // No state update needed here, just acknowledge the message type
      console.log('⌨️ Typing indicator received:', messageType, data);
    }
    else {
      console.log('❓ Unknown message type:', messageType, data);
    }
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

  const sendMessage = useCallback((message) => {
    console.log('📤 [WEBSOCKET] Preparing to send message:', message);
    
    // Allow typing indicators without content
    if (message.type === 'typing_start' || message.type === 'typing_stop') {
      console.log('📤 [WEBSOCKET] Preparing to send typing indicator to group:', message.group_id);
      return sendWebSocketMessage(message);
    }

    // Check if we have either content or media (or both)
    const hasContent = message.content && message.content.trim() !== '';
    const hasMedia = message.media && Object.keys(message.media).length > 0;
    
    // Prevent sending if both content and media are empty
    if (!hasContent && !hasMedia) {
      console.error('❌ [WEBSOCKET] Cannot send empty message (both content and media are empty)');
      return false;
    }

    if (!message.groupId) {
      console.error('❌ [WEBSOCKET] Invalid message format:', message);
      return false;
    }
    console.log('📤 [WEBSOCKET] Preparing to send message to group:', message.groupId);

    const messageData = {
      type: 'message',
      sender_id: userId,
      group_id: message.groupId,
      timestamp: new Date().toISOString()
    };

    // Add content if present
    if (hasContent) {
      messageData.content = message.content.trim();
    }

    // Add media_id if present (ensuring compatibility with backend)
    if (hasMedia) {
      console.log('📎 [WEBSOCKET] Adding media to message:', message.media);
      // Extract media_id from various possible formats to ensure backend compatibility
      const mediaId = message.media.media_id || message.media.id || message.media.mediaId;
      if (mediaId) {
        messageData.media_id = mediaId;
        console.log('📎 [WEBSOCKET] Added media_id for backend:', messageData.media_id);
      } else {
        // If we have a media object but no recognizable ID, send the whole object
        messageData.media = message.media;
        console.log('📎 [WEBSOCKET] Added media object:', messageData.media);
      }
    }

    console.log('📤 [WEBSOCKET] Final message data to send:', messageData);
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
    console.log('📤 [WEBSOCKET] Starting media upload:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type, 
      groupId: groupId 
    });

    if (!file || !groupId) {
      console.error('❌ [WEBSOCKET] Invalid file or group ID for media upload');
      return false;
    }

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Get host IP from environment or default to localhost
      const hostIp = import.meta.env.VITE_HOST_IP || 'localhost';
      const uploadUrl = `http://${hostIp}:8080/media/upload/${groupId}`;

      console.log('🌐 [WEBSOCKET] Media upload URL:', uploadUrl);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Return a promise that resolves when upload is complete
      return new Promise((resolve, reject) => {
        // Track progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            console.log('📊 [WEBSOCKET] Upload progress:', progress + '%');
            onProgress(progress);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          console.log('✅ [WEBSOCKET] Upload request completed with status:', xhr.status);
          console.log('✅ [WEBSOCKET] Upload response headers:', xhr.getAllResponseHeaders());
          
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('✅ [WEBSOCKET] Media upload successful, response:', response);
              resolve(response);
            } catch (e) {
              console.error('❌ [WEBSOCKET] Error parsing media upload response:', e);
              console.error('❌ [WEBSOCKET] Raw response:', xhr.responseText);
              reject(e);
            }
          } else {
            console.error('❌ [WEBSOCKET] Media upload failed with status:', xhr.status);
            console.error('❌ [WEBSOCKET] Response text:', xhr.responseText);
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        // Handle errors
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
        // Add authentication header
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