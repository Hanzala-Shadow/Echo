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
  const [pendingDMInfo, setPendingDMInfo] = useState(null); // Store info for DM that needs to be created
  const [isSending, setIsSending] = useState(false); // Track sending state
  const [newMessageIndicator, setNewMessageIndicator] = useState({}); // Track new messages for visual indicators

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
        // ABANDON isDirect logic - use member count instead
        const directGroups = userGroups.filter(group => {
          const memberCount = group.memberCount || group.member_count || 0;
          return memberCount === 2;
        });
        
        const transformedDMs = await Promise.all(directGroups.map(async (group) => {
          // Get the actual member count from the group data
          const memberCount = group.memberCount || group.member_count || 2;
          
          // Get the other user in this DM
          let otherUser = null;
          try {
            const membersData = await ApiClient.chat.getGroupMembers(group.groupId || group.group_id || group.id);
            const otherUserId = membersData.member_ids.find(id => id !== user.userId);
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
        
        // If there's a group ID in the navigation state, select it
        if (location.state?.groupId) {
          const dmToSelect = transformedDMs.find(dm => dm.id === location.state.groupId);
          if (dmToSelect) {
            // Small delay to ensure UI is ready
            setTimeout(() => {
              handleDMSelect(dmToSelect);
            }, 100);
          }
          // Clear the state so it doesn't persist on refresh
          window.history.replaceState({}, document.title, location.pathname);
        } 
        // If there's a target user in the navigation state, store it for later use
        else if (location.state?.targetUserId) {
          setPendingDMInfo({
            targetUserId: location.state.targetUserId,
            username: location.state.username
          });
          // Clear the state so it doesn't persist on refresh
          window.history.replaceState({}, document.title, location.pathname);
        }
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
        const otherUserId = membersData.member_ids.find(id => id !== user?.userId);
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

  // Handle sending a message
  const handleSendMessage = async (content) => {
    if (!content.trim()) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // If we have pending DM info (navigated to a user but no group created yet)
      if (pendingDMInfo && !activeDM) {
        // Create a new direct message group
        const newGroup = await ApiClient.chat.createGroup(
          `DM with ${pendingDMInfo.username}`, 
          [pendingDMInfo.targetUserId]
        );
        
        // Create a DM object for this new group
        const newDM = {
          id: newGroup.group_id,
          name: `DM with ${pendingDMInfo.username}`,
          isDirect: true,
          memberCount: 2
        };
        
        // Get the target user details
        const userDetails = await ApiClient.users.getProfile(pendingDMInfo.targetUserId);
        
        // Update all states synchronously and wait for completion
        await new Promise((resolve) => {
          // Batch all state updates together
          setActiveDM(newDM);
          setTargetUser(userDetails);
          setPendingDMInfo(null);
          setDMs(prev => [...prev, newDM]);
          
          // Use a small delay to ensure React processes the state updates
          setTimeout(() => {
            // Verify that the state has been updated
            if (activeDMRef.current?.id === newDM.id) {
              resolve();
            } else {
              // If not updated yet, wait a bit more
              setTimeout(resolve, 50);
            }
          }, 10);
        });
        
        // Join the DM via WebSocket
        joinGroup(newDM.id);
        
        // Small delay to ensure WebSocket connection is established
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Send the message
        const success = sendMessage({
          groupId: newDM.id,
          content: content.trim(),
          type: 'text'
        });
        
        if (!success) {
          // If sending failed, show error but don't break the flow
          console.error('Failed to send message through WebSocket');
          setError('Failed to send message. Please try again.');
        } else {
          // Clear any typing indicator after sending
          sendWebSocketMessage({
            type: 'typing_stop',
            group_id: newDM.id,
            user_id: user?.userId
          });
        }
      } 
      // If we have an active DM, send the message normally
      else if (activeDM) {
        // Send via WebSocket
        const success = sendMessage({
          groupId: activeDM.id,
          content: content.trim(),
          type: 'text'
        });

        if (!success) {
          // If sending failed, show error but don't break the flow
          console.error('Failed to send message through WebSocket');
          setError('Failed to send message. Please try again.');
        } else {
          // Clear any typing indicator after sending
          sendWebSocketMessage({
            type: 'typing_stop',
            group_id: activeDM.id,
            user_id: user?.userId
          });
        }
      } else {
        // This shouldn't happen, but just in case
        console.warn('No valid DM context to send message');
        setError('Unable to send message. Please refresh the page and try again.');
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

  return (
    <div className="flex h-screen theme-bg flex-col sm:flex-row">
      {/* DM Sidebar - Hidden by default on mobile */}
      <div className={`transition-all duration-300 ${showDMSidebar ? 'w-full sm:w-80 absolute sm:relative z-20 sm:z-auto inset-0 sm:inset-auto theme-surface' : 'w-0 absolute sm:relative'} overflow-hidden border-r theme-border sm:block`}>
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
        {/* Mobile header with toggle button */}
        <div className="flex items-center gap-2 p-2 border-b theme-border sm:hidden">
          <button
            onClick={() => setShowDMSidebar(!showDMSidebar)}
            className="p-2 rounded-lg theme-text hover-scale"
            style={{ backgroundColor: colors.surface }}
          >
            ☰
          </button>
          <button
            onClick={() => setShowUserSidebar(!showUserSidebar)}
            className="p-2 rounded-lg theme-text hover-scale"
            style={{ backgroundColor: colors.surface }}
          >
            👥
          </button>
          <div className="flex-1 text-center">
            <h3 className="font-medium theme-text truncate">
              {activeDM ? activeDM.name.replace('DM with ', '') : 'Direct Messages'}
            </h3>
          </div>
        </div>

        <ChatHeader 
          group={activeDM}
          targetUser={targetUser}
          isConnected={isConnected}
          isDarkMode={isDarkMode}
          colors={colors}
          isDM={true}
        />
        
        <MessageList 
          messages={allMessages} 
          currentUserId={user?.userId}
          isDarkMode={isDarkMode}
          colors={colors}
          loading={loading && !loadedDMs.has(activeDM?.id)}
        />
        
        {error && (
          <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
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

      {/* User Sidebar - Hidden by default on mobile and now shows nothing */}
      <div className={`transition-all duration-300 ${showUserSidebar ? 'w-full sm:w-64 absolute sm:relative z-20 sm:z-auto inset-0 sm:inset-auto theme-surface mt-16 sm:mt-0' : 'w-0 absolute sm:relative'} overflow-hidden border-l theme-border sm:block`}>
        {showUserSidebar && activeDM && targetUser && (
          // Removed the call buttons and show nothing instead
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
            
            {/* Removed call buttons - showing nothing instead as requested */}
          </div>
        )}
      </div>
    </div>
  );
};

export default DMContainer;