import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useWebSocket from '../../hooks/useWebSocket';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import GroupSidebar from './GroupSidebar';
import UserSidebar from './UserSidebar';
import ChatHeader from './ChatHeader';

const ChatContainer = () => {
  const { user, token } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [activeGroup, setActiveGroup] = useState(null);
  const [showGroupSidebar, setShowGroupSidebar] = useState(true);
  const [showUserSidebar, setShowUserSidebar] = useState(true);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const { 
    isConnected, 
    sendMessage, 
    joinGroup, 
    leaveGroup 
  } = useWebSocket(user?.id, token);

  // Sample data - replace with real API calls
  useEffect(() => {
    // TODO: Fetch user's groups from API
    setGroups([
      {
        id: '1',
        name: 'General',
        description: 'Main discussion channel',
        memberCount: 12,
        isOnline: true
      },
      {
        id: '2', 
        name: 'Development Team',
        description: 'Dev team discussions',
        memberCount: 5,
        isOnline: true
      }
    ]);

    setOnlineUsers([
      {
        id: '1',
        name: 'Alice Johnson',
        username: 'alice.j',
        status: 'online',
        role: 'admin'
      },
      {
        id: '2',
        name: 'Bob Smith', 
        username: 'bob.smith',
        status: 'online',
        role: 'moderator'
      }
    ]);
  }, []);

  const handleGroupSelect = (group) => {
    setActiveGroup(group);
    joinGroup(group.id);
    // TODO: Fetch group messages
    setMessages([
      {
        id: '1',
        content: 'Welcome to the team! 🎉',
        timestamp: new Date(Date.now() - 3600000),
        senderId: '1',
        senderName: 'Alice Johnson',
        type: 'text',
        isCurrentUser: false
      },
      {
        id: '2',
        content: 'Thanks for the warm welcome!',
        timestamp: new Date(Date.now() - 1800000),
        senderId: user?.id,
        senderName: user?.username,
        type: 'text',
        isCurrentUser: true
      }
    ]);
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
    console.log('Create group clicked');
    // TODO: Open create group modal
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
        />
        
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!activeGroup || !isConnected}
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
    </div>
  );
};

export default ChatContainer;