import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (userId, token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000;

  const connect = useCallback(() => {
    if (!userId || !token) {
      console.log('Missing userId or token for WebSocket connection');
      return;
    }

    try {
      // Use the correct WebSocket URL for your Spring Boot backend
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NODE_ENV === 'production' 
        ? window.location.host 
        : 'localhost:8080';
      
      //const wsUrl = `${protocol}//${host}/ws?token=${token}`;
      // In useWebSocket.js, simplify the URL logic:
      const wsUrl = `ws://localhost:8080/ws?token=${token}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Send initial connection message
        const connectMessage = {
          type: 'CONNECT',
          userId: userId,
          timestamp: new Date().toISOString()
        };
        
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(connectMessage));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          switch (data.type) {
            case 'MESSAGE':
              setMessages(prev => [...prev, {
                id: data.id || Date.now().toString(),
                content: data.content,
                senderId: data.senderId,
                senderName: data.senderName,
                timestamp: new Date(data.timestamp),
                type: 'text',
                groupId: data.groupId
              }]);
              break;
              
            case 'USER_JOINED':
            case 'USER_LEFT':
              setOnlineUsers(prev => {
                if (data.type === 'USER_JOINED') {
                  return [...prev.filter(u => u.id !== data.user.id), data.user];
                } else {
                  return prev.filter(u => u.id !== data.user.id);
                }
              });
              break;
              
            case 'TYPING_START':
            case 'TYPING_STOP':
              setOnlineUsers(prev => prev.map(user => 
                user.id === data.userId 
                  ? { ...user, isTyping: data.type === 'TYPING_START' }
                  : user
              ));
              break;
              
            case 'ONLINE_USERS':
              setOnlineUsers(data.users || []);
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [userId, token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setMessages([]);
    setOnlineUsers([]);
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const messageData = {
        type: 'MESSAGE',
        ...message,
        senderId: userId,
        timestamp: new Date().toISOString()
      };
      
      wsRef.current.send(JSON.stringify(messageData));
      console.log('Message sent:', messageData);
    } else {
      console.error('WebSocket is not connected');
    }
  }, [userId]);

  const joinGroup = useCallback((groupId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const joinMessage = {
        type: 'JOIN_GROUP',
        groupId: groupId,
        userId: userId,
        timestamp: new Date().toISOString()
      };
      
      wsRef.current.send(JSON.stringify(joinMessage));
      console.log('Joined group:', groupId);
    }
  }, [userId]);

  const leaveGroup = useCallback((groupId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const leaveMessage = {
        type: 'LEAVE_GROUP',
        groupId: groupId,
        userId: userId,
        timestamp: new Date().toISOString()
      };
      
      wsRef.current.send(JSON.stringify(leaveMessage));
      console.log('Left group:', groupId);
    }
  }, [userId]);

  const sendTypingIndicator = useCallback((groupId, isTyping) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const typingMessage = {
        type: isTyping ? 'TYPING_START' : 'TYPING_STOP',
        groupId: groupId,
        userId: userId,
        timestamp: new Date().toISOString()
      };
      
      wsRef.current.send(JSON.stringify(typingMessage));
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
    sendMessage,
    joinGroup,
    leaveGroup,
    sendTypingIndicator,
    connect,
    disconnect
  };
};

export default useWebSocket;