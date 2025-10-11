  import React, { useState, useEffect, useMemo, useCallback } from 'react';
  import { useLocation, useNavigate } from 'react-router-dom';
  import { useAuth } from '../../context/AuthContext';
  import { useTheme } from '../../context/ThemeContext';
  import ApiClient from '../../utils/apis'; 
  import MessageList from './MessageList';
  import MessageInput from './MessageInput';
  import GroupSidebar from './GroupSidebar';
  import UserSidebar from './UserSidebar';
  import ChatHeader from './ChatHeader';
  import GroupCreateModal from './Groups/GroupCreateModal';
  import useRealTimeUserStatus from '../../hooks/useRealTimeUserStatus';

  const ChatContainer = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, token, isWebSocketConnected, webSocketMessages, sendWebSocketMessage, joinGroup, leaveGroup, showNotification } = useAuth();
    const { colors, isDarkMode } = useTheme();
    const [activeGroup, setActiveGroup] = useState(null);
    const [showGroupSidebar, setShowGroupSidebar] = useState(true);
    const [showUserSidebar, setShowUserSidebar] = useState(true);
    const [groups, setGroups] = useState([]);
    const [localMessages, setLocalMessages] = useState([]);
    const [loadedGroups, setLoadedGroups] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]); // Track members of active group

    // ADDED THIS - Get group member usernames for the hook
    const groupMemberUsernames = useMemo(() => 
      groupMembers.map(member => member.username).filter(Boolean), 
      [groupMembers]
    );

    // ADDED THIS - Use the optimized real-time status hook
    const { getUserStatus } = useRealTimeUserStatus(groupMemberUsernames);

    // ADDED THIS - Update group members with optimized status(WITH DEBOUNCE)
    useEffect(() => {
      if (groupMembers.length === 0) return;

      console.log('🔄 Updating group members with optimized online status');
      
      setGroupMembers(prevMembers => {
        let hasChanges = false;
        const updatedMembers = prevMembers.map(member => {
          // 🆕 SPECIAL HANDLING FOR CURRENT USER - Always mark as online
          if (member.userId === user?.userId) {
            if (member.status !== 'online') {
              console.log(`🔄 Current user ${member.username} is always online`);
              hasChanges = true;
              return {
                ...member,
                status: 'online'
              };
            }
            return member;
          }
          
          // For other users, use the real-time status
          const { isOnline } = getUserStatus(member.username);
          const newStatus = isOnline ? 'online' : 'offline';
          
          // Only update if status changed
          if (member.status !== newStatus) {
            console.log(`🔄 Updated ${member.username} status: ${member.status} → ${newStatus}`);
            hasChanges = true;
            return {
              ...member,
              status: newStatus
            };
          }
          return member;
        });
        
        // Only return new array if there were actual changes
        return hasChanges ? updatedMembers : prevMembers;
      });
    }, [groupMembers, getUserStatus, user?.userId]); // Add user?.userId to dependencies

    // ADDED THIS - Update groups list with online status (WITH DEBOUNCE)
    useEffect(() => {
      if (groupMembers.length === 0) return;
      
      const onlineCount = groupMembers.filter(member => 
        member.status === 'online'
      ).length;

      setGroups(prevGroups => {
        // Check if online status actually changed for any group
        const needsUpdate = prevGroups.some(group => 
          group.isOnline !== (onlineCount > 0)
        );
        
        return needsUpdate ? prevGroups.map(group => ({
          ...group,
          isOnline: onlineCount > 0,
          onlineCount: onlineCount
        })) : prevGroups;
      });
    }, [groupMembers, user?.userId]);

    // Debug effect to track the loop
    useEffect(() => {
      console.log('🔍 DEBUG: Group members updated', {
        count: groupMembers.length,
        members: groupMembers.map(m => ({ username: m.username, status: m.status })),
        onlineCount: groupMembers.filter(m => m.status === 'online').length
      });
    }, [groupMembers]);

    const realTimeMessages = webSocketMessages;
    const isConnected = isWebSocketConnected;

    const sendMessage = sendWebSocketMessage;

    // Filter and combine messages for the active group ONLY with proper deduplication
    const allMessages = useMemo(() => {
      if (!activeGroup || !activeGroup.id) {
        console.log("⚠️ No active group selected, returning empty messages");
        return [];
      }
      const groupId = activeGroup.id;
      console.log('🔍 Filtering messages for active group:', groupId);

      // Get messages from both sources for THIS group only
      const localGroupMessages = localMessages.filter(msg => msg.groupId === groupId);
      const realtimeGroupMessages = realTimeMessages.filter(msg => msg.groupId === groupId);

      console.log(`📊 Local messages for group ${groupId}:`, localGroupMessages.length);
      console.log(`📊 Real-time messages for group ${groupId}:`, realtimeGroupMessages.length);

      // The WebSocket hook now handles optimistic message replacement, so we can simply merge
      // and deduplicate based on message ID
      const messageMap = new Map();
      
      // Add local messages first (these include optimistic messages)
      localGroupMessages.forEach(msg => {
        // 🆕 SAFELY HANDLE ID - ensure it's a string for Map keys
        const safeId = String(msg.id || '');
        messageMap.set(safeId, msg);
      });
      
      // Add real-time messages, overwriting any duplicates
      realtimeGroupMessages.forEach(msg => {
        // 🆕 SAFELY HANDLE ID - ensure it's a string for Map keys
        const safeId = String(msg.id || '');
        messageMap.set(safeId, msg);
      });

      // Convert map back to array and sort by timestamp
      const allGroupMessages = Array.from(messageMap.values());
      
      console.log('🔍 All deduplicated messages before sorting:', allGroupMessages);

      // Sort by timestamp
      const sorted = allGroupMessages.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      console.log(`✅ Total sorted messages for group ${groupId}:`, sorted.length);
      
      return sorted;
    }, [localMessages, realTimeMessages, activeGroup]);

    // Show notification when new messages arrive
    useEffect(() => {
      if (!activeGroup || !user) return;

      const newMessages = webSocketMessages.filter(msg => {
        // Filter for messages in the current group that are not from the current user
        return msg.groupId === activeGroup.id && 
              msg.senderId !== user.userId && 
              // Only show notification for recent messages (within last 5 seconds)
              (new Date() - new Date(msg.timestamp)) < 5000;
      });

      // Show notification for each new message
      newMessages.forEach(msg => {
        showNotification(
          `New message from ${msg.senderName || 'User'}`,
          msg.content.length > 50 
            ? msg.content.substring(0, 50) + '...' 
            : msg.content
        );
      });
    }, [webSocketMessages, activeGroup, user, showNotification]);

    // Fetch user's groups from API
    useEffect(() => {
      const fetchUserGroups = async () => {
        if (!token || !user?.userId) {
          console.log('⏸️ Skipping group fetch: missing token or userId');
          return;
        }
        
        setLoading(true);
        try {
          console.log('📥 Fetching groups for user:', user.userId);
          const userGroups = await ApiClient.chat.getGroups();
          console.log('✅ Raw groups data from API:', JSON.stringify(userGroups, null, 2));
          
          // Filter out groups with 2 or fewer members (only show groups with 3 or more members)
          const groupChats = userGroups.filter(group => {
            // Only check member count, ignore isDirect flag
            const memberCount = group.memberCount || group.member_count || 0;
            // Explicitly exclude groups with 2 or fewer members
            const shouldInclude = memberCount > 2;
            console.log(`🔍 Group Filter - Name: ${group.groupName || group.name || 'Unknown'}, ID: ${group.groupId || group.id}, memberCount: ${memberCount}, shouldInclude: ${shouldInclude}`);
            return shouldInclude;
          });
          
          console.log('✅ Groups that passed filter (>2 members):', JSON.stringify(groupChats, null, 2));
          
          const transformedGroups = groupChats.map(group => {
            const groupId = group.groupId || group.group_id || group.id;
            const groupName = group.groupName || group.group_name || group.name || `Group ${groupId}`;
            // Use the memberCount directly since it should already be >= 3
            const memberCount = group.memberCount;
            
            console.log(`🔄 Transforming group: ${groupName}, memberCount: ${memberCount}`);
            
            return {
              id: groupId,
              name: groupName,
              description: group.description || 'No description',
              memberCount: memberCount,
              isOnline: false, // Will be updated when group members are loaded
              createdBy: group.createdBy || group.created_by,
              isDirect: group.isDirect || group.is_direct || false
            };
          });
          
          console.log('✅ Final transformed groups to display:', JSON.stringify(transformedGroups, null, 2));
          
          setGroups(transformedGroups);
          
          // If there's a group ID in the navigation state, select it
          if (location.state?.groupId) {
            const groupToSelect = transformedGroups.find(g => g.id === location.state.groupId);
            if (groupToSelect) {
              console.log('🎯 Auto-selecting group from navigation state:', groupToSelect);
              handleGroupSelect(groupToSelect);
            }
            // Clear the state so it doesn't persist on refresh
            window.history.replaceState({}, document.title, location.pathname);
          }
          
          // If createGroup is in the navigation state, open the modal
          if (location.state?.createGroup) {
            console.log('🎯 Opening group creation modal from navigation state');
            setIsCreateModalOpen(true);
            // Clear the state so it doesn't persist on refresh
            window.history.replaceState({}, document.title, location.pathname);
          }
        } catch (error) {
          console.error('❌ Error fetching groups:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserGroups();
    }, [token, user?.userId]);

    // Fetch group members when active group changes
    useEffect(() => {
      const fetchGroupMembers = async () => {
        if (!activeGroup || !activeGroup.id || !token) {
          setGroupMembers([]);
          return;
        }

        try {
          console.log('📥 Fetching members for group:', activeGroup.id);
          const membersData = await ApiClient.chat.getGroupMembers(activeGroup.id);
          console.log('✅ Fetched group members:', membersData);
          
          const members = membersData?.members || [];

          // Fetch user details for each member
          const memberDetails = [];
          for (const member of members) {
            try {
              const memberId = member.user_id;
              const userDetails = await ApiClient.users.getProfile(memberId);
              memberDetails.push({
                userId: memberId,
                name: userDetails.username || `User ${memberId}`,
                username: userDetails.username || `user${memberId}`,
                email: userDetails.email || '',
                status: memberId === user?.userId ? 'online' : 'offline' // 🆕 Current user starts as online
              });
            } catch (error) {
              console.warn(`❌ Could not fetch details for user ${member.user_id}:`, error);
              memberDetails.push({
                userId: member.user_id,
                name: `User ${member.user_id}`,
                username: `user${member.user_id}`,
                email: '',
                status: 'offline'
              });
            }
          }
          
          setGroupMembers(memberDetails);
        } catch (error) {
          console.error('❌ Error fetching group members:', error);
          setGroupMembers([]);
        }
      };

      fetchGroupMembers();
    }, [activeGroup, token]);

    //removed webSocket onlineUsers dependency

    // Load messages for a group (only once per group)
    const loadGroupMessages = useCallback(async (groupId) => {
      if (!groupId || !token) {
        console.log('⏸️ Cannot load messages: missing groupId or token');
        return;
      }

      // Check if we already loaded this group
      if (loadedGroups.has(groupId)) {
        console.log('✅ Messages already loaded for group:', groupId);
        return;
      }

      setLoading(true);
      try {
        console.log('📥 Fetching message history for group:', groupId);
        const messageHistory = await ApiClient.chat.getGroupMessages(groupId);
        console.log('✅ Fetched message history:', messageHistory);
        
        let messagesArray = [];
        
        if (Array.isArray(messageHistory)) {
          messagesArray = messageHistory;
          console.log('📦 Response is direct array');
        } else if (messageHistory && Array.isArray(messageHistory.messages)) {
          messagesArray = messageHistory.messages;
          console.log('📦 Response has messages property');
        } else if (messageHistory && messageHistory.content) {
          // If response uses content property (common in paginated responses)
          messagesArray = messageHistory.content;
          console.log('📦 Response has content property');
        } else {
          console.log('❓ Unknown response structure, trying to extract messages');
          messagesArray = messageHistory || [];
        }

        console.log('✅ Raw messages array length:', messagesArray.length);

        const transformedMessages = messagesArray.map((msg, index) => {
          const transformed = {
            id: msg.messageId || msg.message_id || msg.id || `hist-${groupId}-${index}`,
            content: msg.content || msg.message || '',
            senderId: msg.senderId || msg.sender_id || msg.userId,
            senderName: msg.senderName || msg.sender_name || msg.username || msg.userName || `User ${msg.senderId || msg.sender_id || msg.userId}`,
            timestamp: new Date(msg.createdAt || msg.created_at || msg.timestamp || Date.now()),
            type: 'text',
            groupId: groupId, // ALWAYS use the groupId parameter
            isCurrentUser: (msg.senderId || msg.sender_id || msg.userId) === user?.userId,
            status: 'delivered'
          };
          
          console.log(`🔄 Transformed message ${index + 1}:`, transformed);
          return transformed;
        });

        console.log(`✅ Transformed ${transformedMessages.length} historical messages for group ${groupId}`);

        // Add to local messages
        setLocalMessages(prev => {
          const filtered = prev.filter(msg => msg.groupId !== groupId);
          const updated = [...filtered, ...transformedMessages];
          console.log(`💾 Updated localMessages: ${prev.length} → ${updated.length}`);
          console.log(`💾 Messages for group ${groupId} in state:`, updated.filter(m => m.groupId === groupId).length);
          return updated;
        });

        // Mark this group as loaded
        setLoadedGroups(prev => new Set([...prev, groupId]));

      } catch (error) {
        console.error('❌ Error fetching group messages:', error);
      } finally {
        setLoading(false);
      }
    }, [token, user?.userId, loadedGroups]);

    // Handle group selection
    // Handle group selection - MODIFY EXISTING FUNCTION
  const handleGroupSelect = async (group) => {
      if (!group || !group.id) {
        console.log('⚠️ Invalid group selected');
        return;
      }

      console.log('🎯 Selecting group:', group.id, group.name);

      // Leave previous group
      if (activeGroup && activeGroup.id !== group.id) {
        console.log('🚪 Leaving previous group:', activeGroup.id);
        leaveGroup(activeGroup.id);
        // ADDED THESE TWO LINES - Clear messages when switching groups
        setLocalMessages([]);
        setLoadedGroups(new Set());
      }

      // Set new active group
      setActiveGroup(group);

      // Join the group via WebSocket
      console.log('👥 Joining group via WebSocket:', group.id);
      joinGroup(group.id);

      // Load message history for this group
      await loadGroupMessages(group.id);
    };

    // Handle sending a message
    // Handle sending a message
    const handleSendMessage = (content) => {
      if (!activeGroup || !content.trim()) {
        console.log('⚠️ Cannot send message: no active group or empty content');
        return;
      }

      console.log('📤 Sending message to group:', activeGroup.id);
      console.log('📤 Message content:', content);

      // 🆕 ADD OPTIMISTIC MESSAGE TO LOCAL STATE
      const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const optimisticMessage = {
        id: tempId,
        content: content.trim(),
        senderId: user.userId,
        senderName: user.username || "You",
        timestamp: new Date(),
        type: 'text',
        groupId: activeGroup.id,
        status: 'pending',
        isCurrentUser: true
      };

      setLocalMessages(prev => [...prev, optimisticMessage]);

      // Send via WebSocket
      const success = sendMessage({
        groupId: activeGroup.id,
        content: content.trim(),
        type: 'text'
      });

      if (success) {
        console.log('✅ Message queued for sending to group:', activeGroup.id);
      } else {
        console.error('❌ Failed to send message to group:', activeGroup.id);
        // 🆕 Mark as failed if WebSocket send fails
        setLocalMessages(prev => 
          prev.map(msg => 
            msg.id === tempId ? {...msg, status: 'failed'} : msg
          )
        );
      }
    };

    const handleCreateGroup = () => {
      console.log('🎯 handleCreateGroup called - Function is working!');
      console.log('Current isCreateModalOpen state:', isCreateModalOpen);
      setIsCreateModalOpen(true);
      console.log('Set isCreateModalOpen to true');
    };

    const handleGroupCreated = async (newGroup) => {
      console.log('✅ New group created:', newGroup);
      
      // Add the new group to the list
      setGroups(prev => [...prev, newGroup]);
      
      // Select the new group
      handleGroupSelect(newGroup);
      
      // Close the modal
      setIsCreateModalOpen(false);
    };

    // Cleanup when component unmounts
    useEffect(() => {
      return () => {
        if (activeGroup) {
          leaveGroup(activeGroup.id);
        }
        console.log('🧹 ChatContainer unmounted, left group and cleaned up');
        // Clear local messages when component unmounts
        setLocalMessages([]);
        setLoadedGroups(new Set());
      };
    }, [activeGroup]); // Add activeGroup to dependencies

    // ADDED THIS EFFECT TO REMOVE OPTIMISTIC MESSAGES WHEN CONFIRMED
    useEffect(() => {
      if (!activeGroup || !user) return;

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
    }, [realTimeMessages, localMessages, activeGroup, user]);

    // ADD THIS EFFECT - Auto-hide sidebars on mobile when group is selected
    useEffect(() => {
      if (activeGroup) {
        // On mobile, hide both sidebars when a group is active to show message area
        if (window.innerWidth < 640) { // sm breakpoint
          setShowGroupSidebar(false);
          setShowUserSidebar(false);
        }
      }
    }, [activeGroup]);

    console.log('ChatContainer state:', {
      activeGroup: activeGroup?.id,
      showGroupSidebar,
      showUserSidebar,
      groups: groups?.length,
      isCreateModalOpen,
      isConnected
    });

    return (
      <div className="flex h-screen theme-bg flex-col sm:flex-row">
        {/* Group Sidebar - Hidden by default on mobile */}
        <div 
          className={`transition-all duration-300 ${showGroupSidebar ? 'w-full sm:w-80 absolute sm:relative z-20 sm:z-auto inset-0 sm:inset-auto theme-surface' : 'w-0 absolute sm:relative'} overflow-hidden border-r theme-border sm:block`}
        >
          {showGroupSidebar && (
            <GroupSidebar
              groups={groups}
              activeGroupId={activeGroup?.id}
              onGroupSelect={handleGroupSelect}
              onCreateGroup={handleCreateGroup}
              isDarkMode={isDarkMode}
              colors={colors}
              loading={loading}
            />
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
          {/* Mobile header with toggle buttons - UPDATED VERSION */}
          <div className="flex items-center gap-2 p-2 border-b theme-border sm:hidden">
            {activeGroup ? (
              // When group is selected - show back button to groups
              <button
                onClick={() => {
                  setShowGroupSidebar(true);
                  setShowUserSidebar(false);
                }}
                className="p-2 rounded-lg theme-text hover-scale"
                style={{ backgroundColor: colors.surface }}
              >
                ← Groups
              </button>
            ) : (
              // When no group selected - show menu buttons
              <>
                <button
                  onClick={() => setShowGroupSidebar(!showGroupSidebar)}
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
              </>
            )}
            
            <div className="flex-1 text-center">
              <h3 className="font-medium theme-text truncate">
                {activeGroup ? activeGroup.name : 'Select a group'}
              </h3>
            </div>
            
            {/* Add user sidebar toggle when group is active */}
            {activeGroup && (
              <button
                onClick={() => setShowUserSidebar(!showUserSidebar)}
                className="p-2 rounded-lg theme-text hover-scale"
                style={{ backgroundColor: colors.surface }}
              >
                👥
              </button>
            )}
          </div>

          <ChatHeader 
            group={activeGroup}
            isConnected={isConnected}
            isDarkMode={isDarkMode}
            colors={colors}
          />
          
          <MessageList 
            messages={allMessages} 
            currentUserId={user?.userId}
            isDarkMode={isDarkMode}
            colors={colors}
            loading={loading && !loadedGroups.has(activeGroup?.id)}
          />
          
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={!activeGroup || !isConnected}
            placeholder={
              !activeGroup 
                ? "Select a group to start chatting" 
                : !isConnected 
                  ? "Connecting..." 
                  : "Type a message..."
            }
            isDarkMode={isDarkMode}
            colors={colors}
            activeGroupId={activeGroup?.id}
          />
        </div>

        {/* User Sidebar - Hidden by default on mobile */}
        <div className={`transition-all duration-300 ${showUserSidebar ? 'w-full sm:w-64 absolute sm:relative z-20 sm:z-auto inset-0 sm:inset-auto theme-surface mt-16 sm:mt-0' : 'w-0 absolute sm:relative'} overflow-hidden border-l theme-border sm:block`}>
          {showUserSidebar && activeGroup && (
            <UserSidebar
              users={groupMembers}
              currentUserId={user?.userId}
              isDarkMode={isDarkMode}
              colors={colors}
            />
          )}
        </div>

        {isCreateModalOpen && (
          <GroupCreateModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onGroupCreated={handleGroupCreated}
            currentUserId={user?.userId}
            isDarkMode={isDarkMode}
            colors={colors}
          />
        )}
      </div>
    );
  };

  export default ChatContainer;