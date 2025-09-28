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
  const { colors, isDarkMode } = useTheme();
  const [activeGroup, setActiveGroup] = useState(null);
  const [showGroupSidebar, setShowGroupSidebar] = useState(true);
  const [showUserSidebar, setShowUserSidebar] = useState(true);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { 
    isConnected, 
    messages: realTimeMessages, // Use real WebSocket messages
    onlineUsers: realTimeOnlineUsers, // Use real online users from WebSocket
    sendMessage, 
    joinGroup, 
    leaveGroup 
  } = useWebSocket(user?.id, token);

  //Fetch user's groups from API
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
          isOnline: true, // might want to calculate this based on online members
          createdBy: group.createdBy,
          isDirect: group.isDirect || false
        }));
        
        setGroups(transformedGroups);
      } catch (error) {
        console.error('Error fetching groups:', error);
        // You could show an error message to the user ?
      } finally {
        setLoading(false);
      }
    };

    fetchUserGroups();
  }, [token]); // Re-fetch when token changes

  useEffect(() => {
    setMessages(realTimeMessages);
  }, [realTimeMessages]);

  useEffect(() => {
    setOnlineUsers(realTimeOnlineUsers);
  }, [realTimeOnlineUsers]);

  const handleGroupSelect = async (group) => {
    if (!group || !group.id) return;
    
    // Leave current group if any
    if (activeGroup) {
      leaveGroup(activeGroup.id);
    }
    
    setActiveGroup(group);
    
    joinGroup(group.id);
    
    // Fetch message history for the selected group
    setLoading(true);
    try {
      const messageHistory = await ApiClient.chat.getGroupMessages(group.id);
      
      // Transform backend messages to frontend format
      const transformedMessages = messageHistory.messages.map(msg => ({
        id: msg.messageId,
        content: msg.content,
        senderId: msg.senderId,
        senderName: `User ${msg.senderId}`, // might want to fetch actual usernames
        timestamp: new Date(msg.createdAt),
        type: 'text',
        groupId: msg.groupId,
        isCurrentUser: msg.senderId === user?.id
      }));
      
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching group messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (content) => {
    if (!activeGroup || !content.trim()) return;

    const message = {
      groupId: activeGroup.id,
      content: content.trim(),
      type: 'text'
    };

    sendMessage(message);
  };

  const handleCreateGroup = () => {
    setIsCreateModalOpen(true);
  };

  const handleGroupCreated = (newGroup) => {
    // Add the new group to the list
    setGroups(prev => [...prev, newGroup]);
    // Optionally select the new group automatically
    handleGroupSelect(newGroup);
  };

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
          messages={messages}
          currentUserId={user?.id}
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
      </div>

      {/* User Sidebar */}
      <div className={`transition-all duration-300 ${showUserSidebar ? 'w-64' : 'w-0'} overflow-hidden border-l-2 theme-border`}>
        {showUserSidebar && activeGroup && (
          <UserSidebar
            users={onlineUsers}
            currentUserId={user?.id}
            isDarkMode={isDarkMode}
            colors={colors}
          />
        )}
      </div>

      <GroupCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={handleGroupCreated}
        currentUserId={user?.id}
      />
    </div>
  );
};

export default ChatContainer;