import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useWebSocket from '../../hooks/useWebSocket';
import ApiClient from '../../utils/apis'; 
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import GroupSidebar from './GroupSidebar';
import UserSidebar from './UserSidebar';
import ChatHeader from './ChatHeader';
import GroupCreateModal from './Groups/GroupCreateModal';

const ChatContainer = () => {
  const { user, token } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [activeGroup, setActiveGroup] = useState(null);
  const [showGroupSidebar, setShowGroupSidebar] = useState(true);
  const [showUserSidebar, setShowUserSidebar] = useState(true);
  const [groups, setGroups] = useState([]);
  const [localMessages, setLocalMessages] = useState([]);
  const [loadedGroups, setLoadedGroups] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { 
    isConnected, 
    messages: realTimeMessages,
    onlineUsers: realTimeOnlineUsers, 
    sendMessage, 
    joinGroup, 
    leaveGroup,
    clearGroupMessages,
    clearAllMessages
  } = useWebSocket(user?.userId, token);

  // Filter and combine messages for the active group ONLY
  const allMessages = useMemo(() => {
    if (!activeGroup || !activeGroup.id) {
      console.log("⚠️ No active group selected, returning empty messages");
      return [];
    }
    const groupId = activeGroup.id;
    console.log('🔍 Filtering messages for active group:', groupId);
    console.log('📦 Total localMessages in state:', localMessages.length);
    console.log('📦 Total realTimeMessages in state:', realTimeMessages.length);

    // Debug: Log all unique groupIds in localMessages
    const localGroupIds = [...new Set(localMessages.map(m => m.groupId))];
    console.log('📦 Unique groupIds in localMessages:', localGroupIds);

    // Debug: Log all unique groupIds in realTimeMessages
    const rtGroupIds = [...new Set(realTimeMessages.map(m => m.groupId))];
    console.log('📦 Unique groupIds in realTimeMessages:', rtGroupIds);

    // Get messages from both sources for THIS group only
    const localGroupMessages = localMessages.filter(msg => msg.groupId === groupId);
    const realtimeGroupMessages = realTimeMessages.filter(msg => msg.groupId === groupId);

    console.log(`📊 Local messages for group ${groupId}:`, localGroupMessages.length);
    if (localGroupMessages.length > 0) {
      console.log('📋 Sample local message:', localGroupMessages[0]);
    }
    
    console.log(`📊 Real-time messages for group ${groupId}:`, realtimeGroupMessages.length);
    if (realtimeGroupMessages.length > 0) {
      console.log('📋 Sample real-time message:', realtimeGroupMessages[0]);
    }

    // Combine using a Map to avoid duplicates by ID
    const messageMap = new Map();

    // Add local messages first
    localGroupMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });

    // Add real-time messages (will override if same ID)
    realtimeGroupMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });

    // Convert to array and sort by timestamp
    const combined = Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    console.log(`✅ Total combined messages for group ${groupId}:`, combined.length);
    if (combined.length > 0) {
      console.log('✅ First message:', combined[0]);
    }
    
    return combined;
  }, [localMessages, realTimeMessages, activeGroup]);

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
        console.log('✅ Fetched groups:', userGroups);
        
        const transformedGroups = userGroups.map(group => ({
          id: group.groupId || group.group_id || group.id,
          name: group.groupName || group.group_name || `Group ${group.groupId || group.group_id || group.id}`,
          description: group.description || 'No description',
          memberCount: group.memberCount || group.member_count || 1,
          isOnline: true,
          createdBy: group.createdBy || group.created_by,
          isDirect: group.isDirect || group.is_direct || false
        }));
        
        setGroups(transformedGroups);
      } catch (error) {
        console.error('❌ Error fetching groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserGroups();
  }, [token, user?.userId]);

  // Transform WebSocket online users
  useEffect(() => {
    if (realTimeOnlineUsers.length === 0) return;

    const transformedUsers = realTimeOnlineUsers.map(wsUser => ({
      userId: wsUser.userId || wsUser.user_id || wsUser.id,
      name: wsUser.name || wsUser.user_name || wsUser.userName || `User ${wsUser.userId || wsUser.user_id || wsUser.id}`,
      username: wsUser.username || `user${wsUser.userId || wsUser.user_id || wsUser.id}`,
      status: wsUser.status || (wsUser.online ? 'online' : 'offline'),
      role: 'member',
      isTyping: wsUser.isTyping || false,
      email: wsUser.email || ''
    }));

    const uniqueUsers = transformedUsers.filter(
      (user, index, self) => index === self.findIndex(u => u.userId === user.userId)
    );

    console.log('👥 Transformed online users:', uniqueUsers.length);
    setOnlineUsers(uniqueUsers);
  }, [realTimeOnlineUsers]);

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
      console.log('✅ Raw messages array:', messageHistory.messages);

      // Mark as loaded
      setLoadedGroups(prev => new Set([...prev, groupId]));

      if (!messageHistory || !messageHistory.messages || messageHistory.messages.length === 0) {
        console.log('ℹ️ No message history for group:', groupId);
        return;
      }

      // Log first raw message to see structure
      console.log('🔍 First raw message from API:', messageHistory.messages[0]);

      const transformedMessages = messageHistory.messages.map((msg, index) => {
        const transformed = {
          id: msg.messageId || msg.message_id || msg.id || `hist-${groupId}-${index}`,
          content: msg.content || msg.message || '',
          senderId: msg.senderId || msg.sender_id,
          senderName: msg.senderName || msg.sender_name || msg.username || `User ${msg.senderId || msg.sender_id}`,
          timestamp: new Date(msg.createdAt || msg.created_at || msg.timestamp || Date.now()),
          type: 'text',
          groupId: groupId, // ALWAYS use the groupId parameter - most reliable!
          isCurrentUser: (msg.senderId || msg.sender_id) === user?.userId,
          status: 'delivered'
        };
        console.log(`🔄 Transformed message ${index + 1}:`, transformed);
        return transformed;
      });

      console.log(`✅ Transformed ${transformedMessages.length} historical messages for group ${groupId}`);
      console.log('✅ Sample transformed message:', transformedMessages[0]);

      // Add to local messages
      setLocalMessages(prev => {
        const filtered = prev.filter(msg => msg.groupId !== groupId);
        const updated = [...filtered, ...transformedMessages];
        console.log(`💾 Updated localMessages: ${prev.length} → ${updated.length}`);
        console.log(`💾 Messages for group ${groupId} in state:`, updated.filter(m => m.groupId === groupId).length);
        return updated;
      });

    } catch (error) {
      console.error('❌ Error fetching group messages:', error);
      // Mark as loaded to prevent infinite retry
      setLoadedGroups(prev => new Set([...prev, groupId]));
    } finally {
      setLoading(false);
    }
  }, [token, user?.userId, loadedGroups]);

  // Handle group selection
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
  const handleSendMessage = (content) => {
    if (!activeGroup || !content.trim()) {
      console.log('⚠️ Cannot send message: no active group or empty content');
      return;
    }

    console.log('📤 Sending message to group:', activeGroup.id);
    console.log('📤 Message content:', content);

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
    }
  };

  const handleCreateGroup = () => {
    setIsCreateModalOpen(true);
  };

  const handleGroupCreated = (newGroup) => {
    console.log('✅ New group created:', newGroup);
    setGroups(prev => [...prev, newGroup]);
    handleGroupSelect(newGroup);
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (activeGroup) {
        leaveGroup(activeGroup.id);
      }
    };
  }, []);

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔄 State updated - localMessages count:', localMessages.length);
  }, [localMessages]);

  useEffect(() => {
    console.log('🔄 State updated - realTimeMessages count:', realTimeMessages.length);
  }, [realTimeMessages]);

  return (
    <div className="flex h-full theme-bg">
      <div className={`transition-all duration-300 ${showGroupSidebar ? 'w-80' : 'w-0'} overflow-hidden border-r-2 theme-border`}>
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

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 p-2 border-b-2 theme-border md:hidden">
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
        />
      </div>

      <div className={`transition-all duration-300 ${showUserSidebar ? 'w-64' : 'w-0'} overflow-hidden border-l-2 theme-border`}>
        {showUserSidebar && activeGroup && (
          <UserSidebar
            users={onlineUsers}
            currentUserId={user?.userId}
            isDarkMode={isDarkMode}
            colors={colors}
          />
        )}
      </div>

      {isCreateModalOpen && (
        <GroupCreateModal
          onClose={() => setIsCreateModalOpen(false)}
          onGroupCreated={handleGroupCreated}
          isDarkMode={isDarkMode}
          colors={colors}
        />
      )}
    </div>
  );
};

export default ChatContainer;
