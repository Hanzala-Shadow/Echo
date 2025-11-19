import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useGroupChat from '../../hooks/useGroupChat';
import GroupCreateModal from './Groups/GroupCreateModal';
import GroupSidebar from './GroupSidebar';
import UserSidebar from './UserSidebar';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const GroupChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, showNotification } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const {
    groups,
    activeGroup,
    messages,
    groupMembers,
    loading,
    error,
    fetchUserGroups,
    selectGroup,
    sendMessage
  } = useGroupChat(user);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check if we should open the create modal based on URL parameter
  useEffect(() => {
    if (location.search.includes('createGroup=true')) {
      setIsCreateModalOpen(true);
    }
  }, [location]);

  // Show notifications for new messages
  useEffect(() => {
    if (!activeGroup || !user) return;

    // Filter for new messages not from current user
    const newMessages = messages.filter(msg => 
      msg.groupId === activeGroup.id && 
      msg.senderId !== user.userId && 
      msg.status === 'delivered' &&
      (new Date() - new Date(msg.timestamp)) < 5000
    );

    newMessages.forEach(msg => {
      showNotification(
        `New message from ${msg.senderName || 'User'}`,
        msg.content.length > 50 
          ? msg.content.substring(0, 50) + '...' 
          : msg.content
      );
    });
  }, [messages, activeGroup, user, showNotification]);

  // Handle group creation
  const handleCreateGroup = () => {
    setIsCreateModalOpen(true);
  };

  const handleGroupCreated = async (newGroup) => {
    // Refresh groups list
    await fetchUserGroups();
    
    // Select the new group
    selectGroup(newGroup);
    
    // Close modal
    setIsCreateModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'w-0' : 'w-80'} flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden`}>
        {!sidebarCollapsed && (
          <GroupSidebar
            groups={groups}
            activeGroupId={activeGroup?.id}
            onGroupSelect={selectGroup}
            onCreateGroup={handleCreateGroup}
            isDarkMode={isDarkMode}
            colors={colors}
            loading={loading}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg mr-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {sidebarCollapsed ? '▶' : '◀'}
            </button>
            <ChatHeader 
              group={activeGroup}
              isConnected={true} // WebSocket connection is handled in the hook
              isDarkMode={isDarkMode}
              colors={colors}
            />
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {activeGroup ? (
            <>
              <MessageList 
                messages={messages} 
                currentUserId={user?.userId}
                isDarkMode={isDarkMode}
                colors={colors}
                loading={false}
              />
              <MessageInput
                onSendMessage={sendMessage}
                disabled={false}
                placeholder="Type a message..."
                isDarkMode={isDarkMode}
                colors={colors}
                activeGroupId={activeGroup?.id}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">👥</div>
                <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Welcome to Group Chat
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Select a group to start chatting or create a new one
                </p>
                <button
                  onClick={handleCreateGroup}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Create New Group
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Group Members */}
      {activeGroup && (
        <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden">
          <UserSidebar
            users={groupMembers}
            currentUserId={user?.userId}
            isDarkMode={isDarkMode}
            colors={colors}
          />
        </div>
      )}

      {/* Group Creation Modal */}
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

      {/* Error Notification */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default GroupChatPage;