import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ApiClient from '../../utils/apis'; 
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import DMSidebar from './DMSidebar';

const DMContainer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isWebSocketConnected, webSocketMessages, sendWebSocketMessage, joinGroup, leaveGroup, showNotification, onlineUsers } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [activeDM, setActiveDM] = useState(null);
  const [showDMSidebar, setShowDMSidebar] = useState(true);
  const [showUserSidebar, setShowUserSidebar] = useState(false); // Changed default to false
  const [localMessages, setLocalMessages] = useState([]);
  const [loadedDMs, setLoadedDMs] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [dms, setDMs] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [error, setError] = useState(null);
  const [lastMessageTimestamps, setLastMessageTimestamps] = useState({});
  //const [pendingDMInfo, setPendingDMInfo] = useState(null); // Store info for DM that needs to be created
  const [isSending, setIsSending] = useState(false); // Track sending state
  const [newMessageIndicator, setNewMessageIndicator] = useState({}); // Track new messages for visual indicators
  const messagesEndRef = useRef(null);

  const [pendingDMInfo, setPendingDMInfo] = useState(() => {
    // Check if we came from Dashboard with targetUserId
    if (location.state?.targetUserId) {
      return {
        targetUserId: location.state.targetUserId,
        username: location.state.username
      };
    }
    return null;
  });

  // Refs for better state management
  const activeDMRef = useRef(activeDM);
  const userRef = useRef(user);

  // Update refs when state changes
  useEffect(() => {
    activeDMRef.current = activeDM;
    userRef.current = user;
  }, [activeDM, user]);

  const realTimeMessages = webSocketMessages;
  const isConnected = isWebSocketConnected;

  const sendMessage = sendWebSocketMessage;

  // Helper function to check if user is online
  const isUserOnline = (userId) => {
    return onlineUsers.some(user => user.userId === userId);
  };

  // Filter and combine messages for the active DM ONLY with proper deduplication
  const allMessages = useMemo(() => {
    if (!activeDM && !pendingDMInfo) {
      return [];
    }
    
    const groupId = activeDM?.id;

    // Get messages from both sources for THIS DM only
    const localDMMessages = groupId ? localMessages.filter(msg => msg.groupId === groupId) : [];
    const realtimeDMMessages = groupId ? realTimeMessages.filter(msg => msg.groupId === groupId) : [];

    // Combine messages and deduplicate by ID
    const messageMap = new Map();
    
    // Add local messages first
    localDMMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });
    
    // Add real-time messages, overwriting local ones if they exist (real-time is more current)
    realtimeDMMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });

    // Convert map back to array and sort by timestamp
    const allDMMessages = Array.from(messageMap.values());
    
    // Sort by timestamp
    const sorted = allDMMessages.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    return sorted;
  }, [localMessages, realTimeMessages, activeDM, pendingDMInfo]);

  // Show notification when new messages arrive
  useEffect(() => {
    if ((!activeDM && !pendingDMInfo) || !user) return;

    const groupId = activeDM?.id;
    
    const newMessages = webSocketMessages.filter(msg => {
      // Filter for messages in DMs that are not the current active DM
      const isDMMessage = dms.some(dm => dm.id === msg.groupId);
      const isNotActiveDM = groupId !== msg.groupId;
      const isNotFromCurrentUser = msg.senderId !== user.userId;
      const isRecent = (new Date() - new Date(msg.timestamp)) < 10000; // Within last 10 seconds for better visibility
      
      return isDMMessage && isNotActiveDM && isNotFromCurrentUser && isRecent;
    });

    // Show notification for each new message
    newMessages.forEach(msg => {
      // Find the DM group for this message
      const dmGroup = dms.find(dm => dm.id === msg.groupId);
      const senderName = msg.senderName || 'User';
      
      // Show browser notification
      showNotification(
        `New message from ${senderName}`,
        msg.content.length > 50 
          ? msg.content.substring(0, 50) + '...' 
          : msg.content
      );
      
      // Update new message indicator
      setNewMessageIndicator(prev => ({
        ...prev,
        [msg.groupId]: true
      }));
      
      // Clear the indicator after 30 seconds
      setTimeout(() => {
        setNewMessageIndicator(prev => {
          const updated = { ...prev };
          delete updated[msg.groupId];
          return updated;
        });
      }, 30000);
    });
  }, [webSocketMessages, activeDM, pendingDMInfo, user, showNotification, dms]);

  // Fetch user's DMs from API (groups marked as direct)
  useEffect(() => {
    const fetchUserDMs = async () => {
      if (!token || !user?.userId) {
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        const userGroups = await ApiClient.chat.getGroups();
        
        // Filter for direct message groups (groups with exactly 2 members)
        const directGroups = userGroups.filter(group => {
          const memberCount = group.memberCount || group.member_count || 0;
          return memberCount === 2;
        });
        
        // In the fetchUserDMs useEffect, update the transformedDMs to ensure consistent IDs:
        const transformedDMs = await Promise.all(directGroups.map(async (group) => {
          // Get the actual member count from the group data
          const memberCount = group.memberCount || group.member_count || 2;
          
          // 🆕 Ensure consistent ID type (convert to number if it's a string)
          const groupId = group.groupId || group.group_id || group.id;
          const normalizedId = typeof groupId === 'string' ? parseInt(groupId, 10) : groupId;
          
          // Get the other user in this DM
          let otherUser = null;
          try {
            const membersData = await ApiClient.chat.getGroupMembers(normalizedId);
            const members = membersData?.members || [];
            const otherUserId = members.find(member => member.user_id !== user.userId)?.user_id;
            if (otherUserId) {
              otherUser = await ApiClient.users.getProfile(otherUserId);
            }
          } catch (error) {
            console.warn('Error fetching DM partner:', error);
          }
          
          return {
            id: normalizedId, // 🆕 Use normalized ID
            name: group.groupName || group.group_name || (otherUser ? `DM with ${otherUser.username}` : 'DM'),
            isDirect: true,
            memberCount: memberCount,
            otherUser: otherUser
          };
        }));
        
        setDMs(transformedDMs);
        
        // ... rest of your code
      } catch (error) {
        console.error('Error fetching DMs:', error);
        setError('Failed to load direct messages. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDMs();
  }, [token, user?.userId]);

  // Calculate unread message counts and track last message timestamps
  useEffect(() => {
    if (!webSocketMessages.length || !dms.length) return;

    const counts = {};
    const timestamps = {};
    
    dms.forEach(dm => {
      const unreadMessages = webSocketMessages.filter(msg => 
        msg.groupId === dm.id && 
        msg.senderId !== user?.userId &&
        // Only count recent messages (within last 24 hours)
        (new Date() - new Date(msg.timestamp)) < 86400000
      );
      
      counts[dm.id] = unreadMessages.length;
      
      // Track last message timestamp for each DM
      const dmMessages = webSocketMessages.filter(msg => msg.groupId === dm.id);
      if (dmMessages.length > 0) {
        const lastMessage = dmMessages.reduce((latest, msg) => 
          new Date(msg.timestamp) > new Date(latest.timestamp) ? msg : latest
        );
        timestamps[dm.id] = lastMessage.timestamp;
      }
    });
    
    setUnreadCounts(counts);
    setLastMessageTimestamps(timestamps);
  }, [webSocketMessages, dms, user?.userId]);

  // Handle typing indicators
  useEffect(() => {
    const typingMessages = webSocketMessages.filter(msg => 
      msg.type === 'typing_start' || msg.type === 'typing_stop'
    );
    
    const newTypingUsers = {};
    typingMessages.forEach(msg => {
      if (msg.type === 'typing_start') {
        newTypingUsers[msg.group_id] = msg.user_id;
      } else if (msg.type === 'typing_stop') {
        delete newTypingUsers[msg.group_id];
      }
    });
    
    setTypingUsers(newTypingUsers);
  }, [webSocketMessages]);

  // ADD THIS EFFECT - Auto-hide sidebars on mobile when DM is selected
  useEffect(() => {
    if (activeDM) {
      // On mobile, hide both sidebars when a DM is active to show message area
      if (window.innerWidth < 640) { // sm breakpoint
        setShowDMSidebar(false);
        setShowUserSidebar(false);
      }
    }
  }, [activeDM]);

  // Load messages for a DM (only once per DM)
  const loadDMMessages = useCallback(async (groupId) => {
    if (!groupId || !token) {
      return;
    }

    // Check if we already loaded this DM
    if (loadedDMs.has(groupId)) {
      return;
    }

    setLoading(true);
    try {
      const messageHistory = await ApiClient.chat.getGroupMessages(groupId);
      
      let messagesArray = [];
      
      if (Array.isArray(messageHistory)) {
        messagesArray = messageHistory;
      } else if (messageHistory && Array.isArray(messageHistory.messages)) {
        messagesArray = messageHistory.messages;
      } else {
        messagesArray = messageHistory || [];
      }

      const transformedMessages = messagesArray.map((msg, index) => {
        const transformed = {
          id: msg.messageId || msg.message_id || msg.id || `hist-${groupId}-${index}`,
          content: msg.content || msg.message || '',
          senderId: msg.senderId || msg.sender_id || msg.userId,
          senderName: msg.senderName || msg.sender_name || msg.username || msg.userName || `User ${msg.senderId || msg.sender_id || msg.userId}`,
          timestamp: new Date(msg.createdAt || msg.created_at || msg.timestamp || Date.now()),
          type: 'text',
          groupId: groupId,
          isCurrentUser: (msg.senderId || msg.sender_id || msg.userId) === user?.userId,
          status: 'delivered'
        };
        
        return transformed;
      });

      // Add to local messages
      setLocalMessages(prev => {
        const filtered = prev.filter(msg => msg.groupId !== groupId);
        const updated = [...filtered, ...transformedMessages];
        return updated;
      });

      // Mark this DM as loaded
      setLoadedDMs(prev => new Set([...prev, groupId]));

    } catch (error) {
      console.error('Error fetching DM messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [token, user?.userId, loadedDMs]);

  // Handle DM selection
  const handleDMSelect = async (dm) => {
    if (!dm || !dm.id) {
      console.error('Invalid DM object provided to handleDMSelect');
      setError('Unable to open conversation. Please try again.');
      return;
    }

    try {
      // Leave previous DM
      if (activeDM && activeDM.id !== dm.id) {
        leaveGroup(activeDM.id);
      }

      // Set new active DM
      setActiveDM(dm);

      // Join the DM via WebSocket
      joinGroup(dm.id);

      // Load message history for this DM
      await loadDMMessages(dm.id);
      
      // Get the other user in this DM
      try {
        const membersData = await ApiClient.chat.getGroupMembers(dm.id);
        // FIX: Use members array instead of member_ids
        const members = membersData?.members || [];
        const otherUserId = members.find(member => member.user_id !== user?.userId)?.user_id;
        if (otherUserId) {
          const userDetails = await ApiClient.users.getProfile(otherUserId);
          setTargetUser(userDetails);
        }
      } catch (error) {
        console.error('Error fetching DM partner:', error);
        // Don't break the flow if we can't get user details
      }
      
      // Clear pending DM info since we've selected an actual DM
      setPendingDMInfo(null);
      
      // Clear new message indicator for this DM
      setNewMessageIndicator(prev => {
        const updated = { ...prev };
        delete updated[dm.id];
        return updated;
      });
    } catch (error) {
      console.error('Error selecting DM:', error);
      setError('Failed to open conversation. Please try again.');
      // Reset active DM on error
      setActiveDM(null);
    }
  };

  // Add this function to refresh DMs list
  // Update the refreshDMs function to return the refreshed data
const refreshDMs = async () => {
    if (!token || !user?.userId) return [];
    
    try {
      const userGroups = await ApiClient.chat.getGroups();
      
      // Filter for direct message groups (groups with exactly 2 members)
      const directGroups = userGroups.filter(group => {
        const memberCount = group.memberCount || group.member_count || 0;
        return memberCount === 2;
      });
      
      const transformedDMs = await Promise.all(directGroups.map(async (group) => {
        const memberCount = group.memberCount || group.member_count || 2;
        
        let otherUser = null;
        try {
          const membersData = await ApiClient.chat.getGroupMembers(group.groupId || group.group_id || group.id);
          const members = membersData?.members || [];
          const otherUserId = members.find(member => member.user_id !== user.userId)?.user_id;
          if (otherUserId) {
            otherUser = await ApiClient.users.getProfile(otherUserId);
          }
        } catch (error) {
          console.warn('Error fetching DM partner:', error);
        }
        
        return {
          id: group.groupId || group.group_id || group.id,
          name: group.groupName || group.group_name || (otherUser ? `DM with ${otherUser.username}` : 'DM'),
          isDirect: true,
          memberCount: memberCount,
          otherUser: otherUser
        };
      }));
      
      setDMs(transformedDMs);
      return transformedDMs; // 🆕 RETURN the refreshed DMs
    } catch (error) {
      console.error('Error refreshing DMs:', error);
      return []; // 🆕 Return empty array on error
    }
  };

  // Handle sending a message
  const handleSendMessage = async (content) => {
    if (!content.trim()) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      let targetGroupId = activeDM?.id;

      // If we have pending DM info (navigated to a user but no group created yet)
      if (pendingDMInfo && !activeDM) {
        console.log('🆕 Creating new DM for user:', pendingDMInfo);
        
        try {
          // Create a new direct message group
          const newGroup = await ApiClient.chat.createGroup(
            `DM with ${pendingDMInfo.username}`, 
            [pendingDMInfo.targetUserId]
          );
          
          console.log('✅ New DM group created:', newGroup);
          
          // 🆕 FIX: Handle both response formats (group_id vs groupId)
          const newGroupId = newGroup.group_id || newGroup.groupId;
          
          if (!newGroupId) {
            throw new Error('No group ID returned from server');
          }
          
          // Create a DM object for this new group
          const newDM = {
            id: newGroupId,
            name: `DM with ${pendingDMInfo.username}`,
            isDirect: true,
            memberCount: 2,
            otherUser: {
              userId: pendingDMInfo.targetUserId,
              username: pendingDMInfo.username
            }
          };
          
          // Get the target user details
          const userDetails = await ApiClient.users.getProfile(pendingDMInfo.targetUserId);
          
          // 🆕 FIX: Update state immediately and ensure DM is added to list
          setActiveDM(newDM);
          setTargetUser(userDetails);
          setPendingDMInfo(null);
          
          // 🆕 FIX: Use functional update to ensure we have latest state
          setDMs(prev => {
            // Check if DM already exists to avoid duplicates
            const exists = prev.some(dm => dm.id === newGroupId);
            if (exists) {
              return prev;
            }
            return [...prev, newDM];
          });
          
          // Set the target group ID for the new DM
          targetGroupId = newGroupId;
          
          // Join the DM via WebSocket
          joinGroup(newGroupId);
          
          console.log('✅ New DM setup complete, group ID:', targetGroupId);
          
        } catch (error) {
          console.error('❌ Error creating DM group:', error);
          setError('Failed to create conversation. Please try again.');
          setIsSending(false);
          return;
        }
      } 
      
      // Rest of your send message logic...
      if (targetGroupId) {
        // Your existing optimistic message code...
        const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const optimisticMessage = {
          id: tempId,
          content: content.trim(),
          senderId: user.userId,
          senderName: user.username || "You",
          timestamp: new Date(),
          type: 'text',
          groupId: targetGroupId,
          status: 'pending',
          isCurrentUser: true
        };

        setLocalMessages(prev => [...prev, optimisticMessage]);

        // Send via WebSocket
        const success = sendMessage({
          groupId: targetGroupId,
          content: content.trim(),
          type: 'text'
        });

        if (!success) {
          setError('Failed to send message. Please try again.');
          setLocalMessages(prev => 
            prev.map(msg => 
              msg.id === tempId ? {...msg, status: 'failed'} : msg
            )
          );
        } else {
          console.log('✅ Message queued for sending to group:', targetGroupId);
          sendWebSocketMessage({
            type: 'typing_stop',
            group_id: targetGroupId,
            user_id: user?.userId
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing indicator with debouncing
  const handleTyping = useCallback((isTyping) => {
    // Only send typing indicators if we have an active DM
    if (!activeDM) return;
    
    // Send typing indicator via WebSocket
    sendWebSocketMessage({
      type: isTyping ? 'typing_start' : 'typing_stop',
      group_id: activeDM.id,
      user_id: user?.userId
    });
  }, [activeDM, sendWebSocketMessage, user?.userId]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (activeDM) {
        leaveGroup(activeDM.id);
      }
    };
  }, []);

  // ADDED THIS EFFECT TO REMOVE OPTIMISTIC MESSAGES WHEN CONFIRMED
  useEffect(() => {
    if (!activeDM || !user) return;

    // Find optimistic messages that have been confirmed by server
    const confirmedOptimisticIds = new Set();
    
    realTimeMessages.forEach(wsMsg => {
      // Match by content, group, and timestamp (within 3 seconds)
      localMessages.forEach(localMsg => {
        // 🆕 SAFELY CHECK IF ID IS A STRING BEFORE CALLING startsWith
        const isOptimistic = typeof localMsg.id === 'string' && localMsg.id.startsWith('optimistic-');
        
        if (isOptimistic && 
            localMsg.content === wsMsg.content && 
            localMsg.groupId === wsMsg.groupId &&
            Math.abs(new Date(localMsg.timestamp) - new Date(wsMsg.timestamp)) < 3000) {
          confirmedOptimisticIds.add(localMsg.id);
        }
      });
    });

    if (confirmedOptimisticIds.size > 0) {
      console.log('🔄 Removing confirmed optimistic messages:', Array.from(confirmedOptimisticIds));
      setLocalMessages(prev => 
        prev.filter(msg => !confirmedOptimisticIds.has(msg.id))
      );
    }
  }, [realTimeMessages, localMessages, activeDM, user]);

  // ADD THIS EFFECT - Handle navigation from dashboard with pending DM info
  // Updated this effect to handle DM creation better
  useEffect(() => {
    const handleNavigationState = async () => {
      console.log('📍 DMContainer - Navigation state received:', location.state);

      // Clear any existing state first
      setActiveDM(null);
      setPendingDMInfo(null);
      setTargetUser(null);
      
      // Handle case where we have a groupId (existing DM)
      if (location.state?.groupId && !activeDM) {
        console.log('🎯 Handling navigation with existing groupId:', location.state.groupId);
        
        // First check in current DMs
        let existingDM = dms.find(dm => dm.id == location.state.groupId); // 🆕 Use == for loose comparison
        
        if (existingDM) {
          console.log('✅ Found existing DM in current list, selecting it:', existingDM);
          await handleDMSelect(existingDM);

          // On mobile, ensure sidebars are hidden and chat is shown
          if (window.innerWidth < 640) {
            setShowDMSidebar(false);
            setShowUserSidebar(false);
          }
        } else {
          console.log('❌ Group ID not found in current DMs list, refreshing DMs...');
          
          // 🆕 Get the refreshed DMs and use them directly
          const refreshedDMs = await refreshDMs();
          console.log('🔄 Refreshed DMs:', refreshedDMs);
          
          // Try again with refreshed list
          existingDM = refreshedDMs.find(dm => dm.id == location.state.groupId); // 🆕 Use == for loose comparison
          
          if (existingDM) {
            console.log('✅ Found existing DM after refresh, selecting it:', existingDM);
            await handleDMSelect(existingDM);
          } else {
            console.error('❌ Group still not found after refresh. Looking for:', location.state.groupId);
            console.log('Available DMs after refresh:', refreshedDMs.map(dm => ({ id: dm.id, name: dm.name })));
            setError('Conversation not found. Please try again.');
          }
        }
        
        // Clear the navigation state
        window.history.replaceState({}, document.title, location.pathname);
      }
      // Handle case where we have targetUserId (new DM)
      else if (location.state?.targetUserId && !activeDM) {
        console.log('🎯 Handling navigation with new DM target:', location.state);
        
        const { targetUserId, username } = location.state;
        
        // Refresh DMs first to ensure we have the latest list
        const refreshedDMs = await refreshDMs();
        
        // Check if DM already exists with this user
        const existingDM = refreshedDMs.find(dm => {
          const otherUserId = dm.otherUser?.userId;
          return otherUserId == targetUserId; // 🆕 Use == for loose comparison
        });
        
        if (existingDM) {
          console.log('✅ Existing DM found, selecting it:', existingDM);
          await handleDMSelect(existingDM);

          // On mobile, ensure sidebars are hidden and chat is shown
          if (window.innerWidth < 640) {
            setShowDMSidebar(false);
            setShowUserSidebar(false);
          }
        } else {
          console.log('🆕 No existing DM found, setting pending info for new DM creation');
          setPendingDMInfo({
            targetUserId: targetUserId,
            username: username
          });
          
          // Set target user for display
          try {
            const userDetails = await ApiClient.users.getProfile(targetUserId);
            setTargetUser(userDetails);
          } catch (error) {
            console.error('Error fetching user details:', error);
            setTargetUser({
              userId: targetUserId,
              username: username
            });
          }

          // On mobile, ensure sidebars are hidden and chat is shown
          if (window.innerWidth < 640) {
            setShowDMSidebar(false);
            setShowUserSidebar(false);
          }
        }
        
        // Clear the navigation state
        window.history.replaceState({}, document.title, location.pathname);
      }
    };

    // Only run if we have navigation state and no active DM
    if ((location.state?.groupId || location.state?.targetUserId) && !activeDM) {
      handleNavigationState();
    }
  }, [location.state]); // 🆕 Remove dms and handleDMSelect from dependencies to prevent loops

  // ADD THIS SINGLE SCROLL EFFECT - place it with your other effects
  useEffect(() => {
    if ((!activeDM && !pendingDMInfo) || allMessages.length === 0) return;

    console.log('🔄 Auto-scrolling to bottom, messages:', allMessages.length);

    // Simple timeout to ensure DOM is updated
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto',
          block: 'end'
        });
        console.log('✅ Scrolled to bottom using ref');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [allMessages, activeDM, pendingDMInfo]);

  useEffect(() => {
    if (activeDM) {
      // On mobile, hide both sidebars when a DM is active to show message area
      if (window.innerWidth < 640) { // sm breakpoint
        setShowDMSidebar(false);
        setShowUserSidebar(false);
      }
    }
  }, [activeDM]);

  return (
    <div className="flex h-screen theme-bg flex-col sm:flex-row">
      {/* DM Sidebar - Hidden by default on mobile */}
      <div 
        className={`transition-all duration-300 ${showDMSidebar ? 'w-full sm:w-80 fixed sm:relative z-30 sm:z-auto inset-0 sm:inset-auto theme-surface' : 'w-0 fixed sm:relative'} overflow-hidden border-r theme-border sm:block`}
        style={{ 
          height: showDMSidebar ? '100vh' : '0',
          zIndex: showDMSidebar ? 30 : -1
        }}
      >
        {showDMSidebar && (
          <DMSidebar
            groups={dms}
            activeGroupId={activeDM?.id}
            onDMSelect={handleDMSelect}
            isDarkMode={isDarkMode}
            colors={colors}
            loading={loading}
            currentUserId={user?.userId}
            unreadCounts={unreadCounts}
            typingUsers={typingUsers}
            onlineUsers={onlineUsers}
            lastMessageTimestamps={lastMessageTimestamps}
            newMessageIndicator={newMessageIndicator}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        {/* 🆕 FIX: Make mobile header sticky too */}
        <div className="sticky top-0 z-20 sm:static" style={{ backgroundColor: colors.surface }}>
          {/* Mobile header with toggle buttons - UPDATED VERSION */}
          <div className="flex items-center gap-2 p-2 border-b theme-border sm:hidden">
            {activeDM ? (
              // When DM is selected - show back button to DMs
              <button
                onClick={() => {
                  setActiveDM(null); // Clear active DM
                  setTargetUser(null); // Clear target user  
                  setShowDMSidebar(true);
                  setShowUserSidebar(false);
                  // Clear messages when going back to DMs list
                  setLocalMessages([]);
                  setLoadedDMs(new Set());
                  setPendingDMInfo(null);
                }}
                className="p-2 rounded-lg theme-text hover-scale"
                style={{ backgroundColor: colors.surface }}
              >
                ← DMs
              </button>
            ) : (
              // When no DM selected - show menu buttons
              <>
                <button
                  onClick={() => {
                    setShowDMSidebar(!showDMSidebar);
                    setShowUserSidebar(false);
                  }}
                  className="p-2 rounded-lg theme-text hover-scale"
                  style={{ backgroundColor: colors.surface }}
                >
                  ☰
                </button>
                <button
                  onClick={() => {
                    setShowUserSidebar(!showUserSidebar);
                    setShowDMSidebar(false);
                  }}
                  className="p-2 rounded-lg theme-text hover-scale"
                  style={{ backgroundColor: colors.surface }}
                >
                  👥
                </button>
              </>
            )}
            
            <div className="flex-1 text-center">
              <h3 className="font-medium theme-text truncate">
                {activeDM ? activeDM.name.replace('DM with ', '') : 'Direct Messages'}
              </h3>
            </div>
            
            {/* Add user sidebar toggle when DM is active */}
            {activeDM && (
              <button
                onClick={() => {
                  setShowUserSidebar(!showUserSidebar);
                  setShowDMSidebar(false);
                }}
                className="p-2 rounded-lg theme-text hover-scale"
                style={{ backgroundColor: colors.surface }}
              >
                👥
              </button>
            )}
          </div>
        </div>

        {/* 🆕 FIX: Make ChatHeader sticky on mobile */}
        <div className="sticky top-[48px] z-10 sm:static" style={{ backgroundColor: colors.surface }}>
          <ChatHeader 
            group={activeDM}
            targetUser={targetUser}
            isConnected={isConnected}
            isDarkMode={isDarkMode}
            colors={colors}
            isDM={true}
            isPending={!!pendingDMInfo && !activeDM}
          />
        </div>
        
        {/* 🆕 FIX: Make MessageList scrollable with proper spacing */}
        <div className="flex-1 overflow-y-auto">
          <MessageList 
            messages={allMessages} 
            currentUserId={user?.userId}
            isDarkMode={isDarkMode}
            colors={colors}
            loading={loading && !loadedDMs.has(activeDM?.id)}
          />
          {/* Add this empty div for scrolling reference */}
          <div ref={messagesEndRef} />
          
          {error && (
            <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded mx-4 my-2">
              {error}
            </div>
          )}
        </div>
        
        {/* 🆕 FIX: Make MessageInput sticky at bottom on mobile */}
        <div className="sticky bottom-0 z-10 bg-inherit sm:static">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={(!activeDM && !pendingDMInfo) || isSending || !isConnected}
            placeholder={
              !activeDM && !pendingDMInfo
                ? "Select a conversation to start chatting" 
                : !isConnected 
                  ? "Connecting..." 
                  : isSending
                    ? "Sending..."
                    : "Type a message..."
            }
            isDarkMode={isDarkMode}
            colors={colors}
            activeGroupId={activeDM?.id}
            onTyping={handleTyping}
          />
        </div>
      </div>

      {/* User Sidebar - Hidden by default on mobile and now shows nothing */}
      <div 
        className={`transition-all duration-300 ${showUserSidebar ? 'w-full sm:w-64 fixed sm:relative z-30 sm:z-auto inset-0 sm:inset-auto theme-surface' : 'w-0 fixed sm:relative'} overflow-hidden border-l theme-border sm:block`}
        style={{ 
          height: showUserSidebar ? '100vh' : '0',
          zIndex: showUserSidebar ? 30 : -1
        }}
      >
        {showUserSidebar && activeDM && targetUser && (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-lg text-white">
                  {targetUser.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                {isUserOnline(targetUser.userId) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold theme-text">{targetUser.username || 'Unknown User'}</h3>
                <p className="text-xs theme-text-secondary">
                  {isUserOnline(targetUser.userId) ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DMContainer;