// useGroupChat Hook - Custom hook for managing group chat functionality
import { useState, useEffect, useCallback, useRef } from 'react';
import GroupChatService from '../services/groupChatService';
import WebSocketService from '../services/webSocketService';

const useGroupChat = (currentUser) => {
  // State management
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs for tracking state
  const processedMessageIds = useRef(new Set());
  const messageHandlers = useRef(new Map());

  // Fetch user's groups
  const fetchUserGroups = useCallback(async () => {
    if (!currentUser?.token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userGroups = await GroupChatService.fetchUserGroups();
      
      // Filter for groups with 3+ members (as per requirement)
      const validGroups = userGroups.filter(group => 
        (group.memberCount || 0) >= 3
      );
      
      const transformedGroups = validGroups.map(group => 
        GroupChatService.transformGroupData(group)
      );
      
      setGroups(transformedGroups);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token]);

  // Fetch group members
  const fetchGroupMembers = useCallback(async (groupId) => {
    if (!groupId || !currentUser?.token) {
      setGroupMembers([]);
      return;
    }

    try {
      const membersData = await GroupChatService.fetchGroupMembers(groupId);
      
      const memberDetails = await Promise.all(
        membersData.member_ids.map(async (memberId) => {
          try {
            const userDetails = await GroupChatService.getUserProfile(memberId);
            return GroupChatService.transformUserData(userDetails);
          } catch (error) {
            return {
              userId: memberId,
              name: `User ${memberId}`,
              username: `user${memberId}`,
              email: '',
              status: 'offline'
            };
          }
        })
      );
      
      setGroupMembers(memberDetails);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching group members:', err);
      setGroupMembers([]);
    }
  }, [currentUser?.token]);

  // Fetch group messages
  const fetchGroupMessages = useCallback(async (groupId) => {
    if (!groupId || !currentUser?.token) return;

    try {
      const messagesData = await GroupChatService.fetchGroupMessages(groupId);
      
      // Transform messages for consistent structure
      const transformedMessages = Array.isArray(messagesData) 
        ? messagesData.map(msg => ({
            id: msg.messageId || msg.id,
            content: msg.content || msg.message || '',
            senderId: msg.senderId || msg.userId,
            senderName: msg.senderName || msg.username || `User ${msg.senderId || msg.userId}`,
            timestamp: new Date(msg.createdAt || msg.timestamp || Date.now()),
            type: 'text',
            groupId: groupId,
            isCurrentUser: (msg.senderId || msg.userId) === currentUser?.userId,
            status: 'delivered'
          }))
        : [];
      
      setMessages(transformedMessages);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching group messages:', err);
      setMessages([]);
    }
  }, [currentUser?.token, currentUser?.userId]);

  // Handle group selection
  const selectGroup = useCallback(async (group) => {
    if (!group || !group.id) return;

    // Leave previous group
    if (activeGroup && activeGroup.id !== group.id) {
      WebSocketService.leaveGroup(activeGroup.id, currentUser?.userId);
    }

    // Set new active group
    setActiveGroup(group);

    // Join the group via WebSocket
    WebSocketService.joinGroup(group.id, currentUser?.userId);

    // Fetch group data
    await Promise.all([
      fetchGroupMembers(group.id),
      fetchGroupMessages(group.id)
    ]);
  }, [activeGroup, currentUser?.userId, fetchGroupMembers, fetchGroupMessages]);

  // Send a message
  const sendMessage = useCallback((content) => {
    if (!activeGroup || !content.trim() || !currentUser?.userId) return false;

    const success = WebSocketService.sendChatMessage(
      activeGroup.id, 
      content.trim(), 
      currentUser.userId
    );

    if (success) {
      // Add optimistic update
      const optimisticMessage = {
        id: `local-${Date.now()}-${Math.random()}`,
        content: content.trim(),
        senderId: currentUser.userId,
        senderName: "You",
        timestamp: new Date(),
        type: 'text',
        groupId: activeGroup.id,
        isCurrentUser: true,
        status: 'sending'
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
    }

    return success;
  }, [activeGroup, currentUser?.userId]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((data) => {
    const messageId = data.message_id || data.id || `ws-${Date.now()}-${Math.random()}`;
    
    // Prevent duplicate processing
    if (processedMessageIds.current.has(messageId)) {
      return;
    }
    processedMessageIds.current.add(messageId);

    const newMessage = {
      id: messageId,
      content: data.content || data.message || '',
      senderId: data.sender_id || data.userId,
      senderName: data.sender_name || data.username || `User ${data.sender_id || data.userId}`,
      timestamp: new Date(data.created_at || data.timestamp || Date.now()),
      type: 'text',
      groupId: data.group_id,
      isCurrentUser: (data.sender_id || data.userId) === currentUser?.userId,
      status: 'delivered'
    };

    // Only add messages for the active group
    if (newMessage.groupId === activeGroup?.id) {
      setMessages(prev => {
        // Remove optimistic message if it exists
        const filtered = prev.filter(msg => 
          !(msg.id.startsWith('local-') && msg.content === newMessage.content)
        );
        return [...filtered, newMessage];
      });
    }
  }, [activeGroup?.id, currentUser?.userId]);

  // Handle status updates
  const handleStatusUpdate = useCallback((data) => {
    const targetUserId = data.user_id || data.userId;
    const onlineStatus = data.online_status !== undefined 
      ? (typeof data.online_status === 'string' ? data.online_status === 'true' : data.online_status)
      : (data.online !== undefined 
        ? (typeof data.online === 'string' ? data.online === 'true' : data.online) 
        : false);
    
    // Update online users
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

    // Update group members if they're in the current group
    setGroupMembers(prev => {
      return prev.map(member => {
        if (Number(member.userId) === Number(targetUserId)) {
          return {
            ...member,
            status: onlineStatus ? 'online' : 'offline'
          };
        }
        return member;
      });
    });
  }, []);

  // Initialize WebSocket handlers
  useEffect(() => {
    // Register message handlers
    WebSocketService.on('message', handleMessage);
    WebSocketService.on('statusUpdate', handleStatusUpdate);
    
    // Store handlers for cleanup
    messageHandlers.current.set('message', handleMessage);
    messageHandlers.current.set('statusUpdate', handleStatusUpdate);

    return () => {
      // Remove message handlers
      WebSocketService.off('message', handleMessage);
      WebSocketService.off('statusUpdate', handleStatusUpdate);
    };
  }, [handleMessage, handleStatusUpdate]);

  // Initial load
  useEffect(() => {
    if (currentUser?.token) {
      fetchUserGroups();
    }
  }, [currentUser?.token, fetchUserGroups]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeGroup) {
        WebSocketService.leaveGroup(activeGroup.id, currentUser?.userId);
      }
      processedMessageIds.current.clear();
    };
  }, [activeGroup, currentUser?.userId]);

  return {
    // State
    groups,
    activeGroup,
    messages,
    groupMembers,
    onlineUsers,
    loading,
    error,
    
    // Actions
    fetchUserGroups,
    selectGroup,
    sendMessage,
    fetchGroupMembers,
    fetchGroupMessages,
    
    // Helpers
    isConnected: WebSocketService.isConnected
  };
};

export default useGroupChat;