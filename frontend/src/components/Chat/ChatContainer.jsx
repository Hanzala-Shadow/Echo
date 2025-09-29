import React, { useState, useEffect } from 'react';
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

  console.log('🔍 Auth Context Debug:', {
    user: user,
    userId: user?.userId,
    token: token ? 'present' : 'missing'
  });


  const { colors, isDarkMode } = useTheme();
  const [activeGroup, setActiveGroup] = useState(null);
  const [showGroupSidebar, setShowGroupSidebar] = useState(true);
  const [showUserSidebar, setShowUserSidebar] = useState(true);
  const [groups, setGroups] = useState([]);
  const [localMessages, setLocalMessages] = useState([]); //FIXED: Renamed for clarity
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { 
    isConnected, 
    messages: realTimeMessages, // WebSocket messages only
    onlineUsers: realTimeOnlineUsers, 
    sendMessage, 
    joinGroup, 
    leaveGroup 
  } = useWebSocket(user?.userId, token);

  // FIXED: Combine local (REST) and real-time (WebSocket) messages
  const allMessages = React.useMemo(() => {
    console.log('🔄 Combining messages:', {
      local: localMessages.length,
      realTime: realTimeMessages.length
    });
    
    // Create a map to avoid duplicates (WebSocket might re-send messages)
    const messageMap = new Map();
    
    // Add all local messages (from REST API)
    localMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });
    
    // Add/update with real-time messages (from WebSocket)
    realTimeMessages.forEach(rtMsg => {
      // If message already exists, update it (for status changes, etc.)
      // Otherwise add as new message
      messageMap.set(rtMsg.id, rtMsg);
    });
    
    // Convert back to array and sort by timestamp
    const combined = Array.from(messageMap.values()).sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    console.log('✅ Combined messages:', combined.length);
    return combined;
  }, [localMessages, realTimeMessages]);

  // Fetch user's groups from API
  useEffect(() => {
    const fetchUserGroups = async () => {
      if (!token) return;
      
      setLoading(true);
      try {
        const userGroups = await ApiClient.chat.getGroups();
        
        // Transform backend data to match frontend format
        const transformedGroups = userGroups.map(group => ({
          id: group.groupId,
          name: group.groupName || `Group ${group.groupId}`,
          description: group.description || 'No description',
          memberCount: group.memberCount || 1,
          isOnline: true,
          createdBy: group.createdBy,
          isDirect: group.isDirect || false
        }));
        
        setGroups(transformedGroups);
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserGroups();
  }, [token]);

  // FIXED: Transform WebSocket online users to match UI expectations
  useEffect(() => {
    const transformedUsers = realTimeOnlineUsers.map(wsUser => ({
      id: wsUser.user_id || wsUser.id,
      name: wsUser.user_name || `User ${wsUser.user_id || wsUser.id}`,
      username: wsUser.username || `user${wsUser.user_id || wsUser.id}`,
      status: wsUser.online_status ? 'online' : 'offline',
      role: 'member', // Default role for now
      isTyping: wsUser.isTyping || false,
      email: wsUser.email || ''
    }));
    
    console.log('👥 Transformed online users:', transformedUsers);
    setOnlineUsers(transformedUsers);
  }, [realTimeOnlineUsers]);

  const handleGroupSelect = async (group) => {
    if (!group || !group.id) return;
    
    console.log('🎯 Selecting group:', group.id, group.name);
    
    // Leave current group if any
    if (activeGroup) {
      leaveGroup(activeGroup.id);
    }
    
    setActiveGroup(group);
    
    // Join group via WebSocket
    joinGroup(group.id);
    
    // Fetch message history for the selected group
    setLoading(true);
    try {
      const messageHistory = await ApiClient.chat.getGroupMessages(group.id);
      console.log('📨 Message history:', messageHistory);
      
      // Transform backend messages to frontend format
      const transformedMessages = messageHistory.messages.map(msg => ({
        id: msg.messageId || `msg-${Date.now()}-${Math.random()}`,
        content: msg.content,
        senderId: msg.senderId,
        senderName: msg.senderName || `User ${msg.senderId}`,
        timestamp: new Date(msg.createdAt || msg.timestamp || Date.now()),
        type: 'text',
        groupId: msg.groupId,
        isCurrentUser: msg.senderId === user?.userId,
        status: 'delivered'
      }));
      
      console.log('✅ Setting local messages:', transformedMessages.length);
      setLocalMessages(transformedMessages);
    } catch (error) {
      console.error('❌ Error fetching group messages:', error);
      setLocalMessages([]); // Clear messages on error
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (content) => {
    if (!activeGroup || !content.trim()) return;

    console.log('📤 Sending message to group:', activeGroup.id);
    
    const message = {
      groupId: activeGroup.id,
      content: content.trim(),
      type: 'text'
    };

    sendMessage(message);
    
    // ✅ FIXED: Optimistically add to local messages immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      senderId: user?.userId,
      senderName: 'You',
      timestamp: new Date(),
      type: 'text',
      groupId: activeGroup.id,
      isCurrentUser: true,
      status: 'sending' // Will be updated when WebSocket confirms
    };
    
    setLocalMessages(prev => [...prev, optimisticMessage]);
  };

  const handleCreateGroup = () => {
    setIsCreateModalOpen(true);
  };

  const handleGroupCreated = (newGroup) => {
    // Add the new group to the list
    setGroups(prev => [...prev, newGroup]);
    // Select the new group automatically
    handleGroupSelect(newGroup);
  };

  // FIXED: Clear messages when no group is selected
  useEffect(() => {
    if (!activeGroup) {
      setLocalMessages([]);
    }
  }, [activeGroup]);

  return (
    <div className="flex h-full theme-bg">
      {/* Group Sidebar */}
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Toggle Buttons */}
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
          loading={loading}
        />
        
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!activeGroup || !isConnected || loading}
          placeholder={activeGroup ? "Type a message..." : "Select a group to start chatting"}
          isDarkMode={isDarkMode}
          colors={colors}
        />

        {/* <MessageInput
          onSendMessage={handleSendMessage}
          disabled={false} // ← TEMPORARILY FORCE ENABLED
          placeholder={activeGroup ? "Type a message..." : "Select a group to start chatting"}
          isDarkMode={isDarkMode}
          colors={colors}
        /> */}
      </div>

      {/* User Sidebar */}
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

      <GroupCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={handleGroupCreated}
        currentUserId={user?.userId}
      />
    </div>
  );
};

export default ChatContainer;