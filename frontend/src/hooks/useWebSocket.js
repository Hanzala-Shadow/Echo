import { useState, useEffect, useRef, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client } from 'stompjs';

const useWebSocket = (userId, token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  
  const stompClientRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000;

  // Spring WebSocket message types matching your backend
  const MESSAGE_TYPES = {
    MESSAGE: 'message',
    USER_JOINED: 'user_joined',
    USER_LEFT: 'user_left',
    STATUS_UPDATE: 'status_update',
    TYPING_START: 'typing_start',
    TYPING_STOP: 'typing_stop'
  };

  const connect = useCallback(() => {
    if (!userId || !token) {
      console.log('Missing userId or token for WebSocket connection');
      return;
    }

    try {
      // Use SockJS for Spring WebSocket compatibility
      const socketUrl = 'http://localhost:8080/ws/messages';
      console.log('Connecting to WebSocket:', socketUrl);

      // Create STOMP client over SockJS
      stompClientRef.current = new Client({
        webSocketFactory: () => new SockJS(socketUrl),
        connectHeaders: {
          'Authorization': `Bearer ${token}`
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        
        onConnect: (frame) => {
          console.log('WebSocket connected successfully', frame);
          setIsConnected(true);
          reconnectAttempts.current = 0;

          // Subscribe to user-specific topic for private messages
          stompClientRef.current.subscribe(`/user/${userId}/queue/messages`, (message) => {
            handleIncomingMessage(JSON.parse(message.body));
          });

          // Subscribe to group topics if we have an active group
          if (activeGroup) {
            joinGroup(activeGroup);
          }

          // Broadcast that user is online
          sendStatusUpdate(true);
        },

        onStompError: (frame) => {
          console.error('STOMP error:', frame);
          setIsConnected(false);
        },

        onWebSocketClose: (event) => {
          console.log('WebSocket disconnected:', event);
          setIsConnected(false);
          handleReconnection();
        },

        onDisconnect: () => {
          console.log('STOMP client disconnected');
          setIsConnected(false);
        }
      });

      // Activate the connection
      stompClientRef.current.activate();

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
      handleReconnection();
    }
  }, [userId, token, activeGroup]);

  const handleReconnection = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++;
      console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);
    } else {
      console.log('Max reconnection attempts reached');
    }
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (stompClientRef.current) {
      sendStatusUpdate(false); // Notify others we're leaving
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }
    
    setIsConnected(false);
    setMessages([]);
    setOnlineUsers([]);
  }, []);

  const handleIncomingMessage = useCallback((data) => {
    console.log('WebSocket message received:', data);
    
    // Handle different message types based on your backend
    switch (data.type) {
      case MESSAGE_TYPES.MESSAGE:
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
        break;
        
      case MESSAGE_TYPES.STATUS_UPDATE:
        setOnlineUsers(prev => {
          const userIndex = prev.findIndex(u => u.id === data.user_id);
          if (userIndex > -1) {
            // Update existing user
            const updated = [...prev];
            updated[userIndex] = { ...updated[userIndex], online: data.online_status };
            return updated;
          } else if (data.online_status) {
            // Add new online user
            return [...prev, { 
              id: data.user_id, 
              name: `User ${data.user_id}`,
              online: true 
            }];
          }
          return prev;
        });
        break;
        
      case MESSAGE_TYPES.USER_JOINED:
        setOnlineUsers(prev => [...prev.filter(u => u.id !== data.user_id), {
          id: data.user_id,
          name: data.user_name || `User ${data.user_id}`,
          online: true
        }]);
        break;
        
      case MESSAGE_TYPES.USER_LEFT:
        setOnlineUsers(prev => prev.map(user => 
          user.id === data.user_id ? { ...user, online: false } : user
        ));
        break;
        
      case MESSAGE_TYPES.TYPING_START:
      case MESSAGE_TYPES.TYPING_STOP:
        setOnlineUsers(prev => prev.map(user => 
          user.id === data.user_id 
            ? { ...user, isTyping: data.type === MESSAGE_TYPES.TYPING_START }
            : user
        ));
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }, []);

  const sendMessage = useCallback((message) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) {
      console.error('WebSocket is not connected');
      return false;
    }

    if (!message.groupId || !message.content?.trim()) {
      console.error('Invalid message format');
      return false;
    }

    try {
      // Format message to match your Spring backend expectation
      const messageData = {
        type: MESSAGE_TYPES.MESSAGE,
        sender_id: userId,
        group_id: message.groupId,
        content: message.content.trim(),
        timestamp: new Date().toISOString()
      };

      // Send to your backend's message handling endpoint
      stompClientRef.current.publish({
        destination: '/app/chat.sendMessage', // This should match your @MessageMapping
        body: JSON.stringify(messageData)
      });

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
      console.log('Message sent:', messageData);
      return true;

    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [userId]);

  const joinGroup = useCallback((groupId) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      setActiveGroup(groupId);
      
      // Subscribe to group messages
      stompClientRef.current.subscribe(`/topic/group.${groupId}`, (message) => {
        handleIncomingMessage(JSON.parse(message.body));
      });

      // Notify group of join
      const joinMessage = {
        type: MESSAGE_TYPES.USER_JOINED,
        user_id: userId,
        group_id: groupId,
        timestamp: new Date().toISOString()
      };

      stompClientRef.current.publish({
        destination: '/app/group.join',
        body: JSON.stringify(joinMessage)
      });

      console.log('Joined group:', groupId);
      return true;

    } catch (error) {
      console.error('Error joining group:', error);
      return false;
    }
  }, [userId, handleIncomingMessage]);

  const leaveGroup = useCallback((groupId) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) {
      return false;
    }

    try {
      // Notify group of leave
      const leaveMessage = {
        type: MESSAGE_TYPES.USER_LEFT,
        user_id: userId,
        group_id: groupId,
        timestamp: new Date().toISOString()
      };

      stompClientRef.current.publish({
        destination: '/app/group.leave',
        body: JSON.stringify(leaveMessage)
      });

      setActiveGroup(null);
      console.log('Left group:', groupId);
      return true;

    } catch (error) {
      console.error('Error leaving group:', error);
      return false;
    }
  }, [userId]);

  const sendTypingIndicator = useCallback((groupId, isTyping) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) {
      return false;
    }

    try {
      const typingMessage = {
        type: isTyping ? MESSAGE_TYPES.TYPING_START : MESSAGE_TYPES.TYPING_STOP,
        user_id: userId,
        group_id: groupId,
        timestamp: new Date().toISOString()
      };

      stompClientRef.current.publish({
        destination: '/app/typing.indicator',
        body: JSON.stringify(typingMessage)
      });

      return true;

    } catch (error) {
      console.error('Error sending typing indicator:', error);
      return false;
    }
  }, [userId]);

  const sendStatusUpdate = useCallback((isOnline) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) {
      return false;
    }

    try {
      const statusMessage = {
        type: MESSAGE_TYPES.STATUS_UPDATE,
        user_id: userId,
        online_status: isOnline,
        timestamp: new Date().toISOString()
      };

      stompClientRef.current.publish({
        destination: '/app/user.status',
        body: JSON.stringify(statusMessage)
      });

      return true;

    } catch (error) {
      console.error('Error sending status update:', error);
      return false;
    }
  }, [userId]);

  // Connect when hook is mounted and dependencies change
  useEffect(() => {
    if (userId && token) {
      connect();
    }

    // Cleanup on unmount
    return () => {
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