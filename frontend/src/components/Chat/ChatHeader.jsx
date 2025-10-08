import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ChatHeader = ({ group, targetUser, isConnected, isDarkMode, colors, isDM = false }) => {
  const navigate = useNavigate();
  const { onlineUsers } = useAuth();
  
  if (!group) {
    return (
      <div 
        className="h-16 border-b-2 theme-border flex items-center justify-center"
        style={{ backgroundColor: colors.surface }}
      >
        <p className="theme-text-secondary">
          {isDM ? "Select a conversation to start chatting" : "Select a group to start chatting"}
        </p>
      </div>
    );
  }

  const getInitials = (name) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isUserOnline = (userId) => {
    return onlineUsers.some(user => user.userId === userId);
  };

  const handleBackClick = () => {
    // Navigate to dashboard groups tab
    navigate('/dashboard', { state: { activeTab: 'groups' } });
  };

  return (
    <div 
      className="h-16 border-b-2 theme-border flex items-center justify-between px-4"
      style={{ backgroundColor: colors.surface }}
    >
      <div className="flex items-center gap-3">
        {/* Back button for mobile */}
        <button 
          onClick={handleBackClick}
          className="sm:hidden p-2 rounded-lg hover-scale theme-text mr-2"
          style={{ 
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`
          }}
          title="Back to Groups"
        >
          ←
        </button>
        
        <div className="relative">
          <div 
            className="h-10 w-10 rounded-full flex items-center justify-center font-medium"
            style={{ 
              backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db',
              color: isDarkMode ? '#ffffff' : '#000000'
            }}
          >
            {isDM && targetUser ? getInitials(targetUser.username) : getInitials(group.name)}
          </div>
          {isDM && targetUser && isUserOnline(targetUser.userId) && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold theme-text">
              {isDM && targetUser ? targetUser.username : group.name}
            </h3>
            {group.isOnline && !isDM && (
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            )}
            {isDM && targetUser && isUserOnline(targetUser.userId) && (
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm theme-text-secondary">
            {isDM ? (
              <>
                <span>👤</span>
                <span>Direct Message</span>
                {targetUser && isUserOnline(targetUser.userId) && (
                  <>
                    <span>•</span>
                    <span className="text-green-500">Online</span>
                  </>
                )}
                {targetUser && targetUser.email && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-40">{targetUser.email}</span>
                  </>
                )}
              </>
            ) : (
              <>
                <span>👥</span>
                <span>{group.memberCount} members</span>
                {group.description && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-40">{group.description}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 text-sm ${
          isConnected ? 'text-green-500' : 'text-red-500'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {/* Removed call buttons as per requirements - showing nothing instead */}
      </div>
    </div>
  );
};

export default ChatHeader;