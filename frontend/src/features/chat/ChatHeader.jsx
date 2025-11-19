import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ChatHeader = ({ 
  group, 
  targetUser, 
  isConnected, 
  isDarkMode, 
  colors, 
  isDM = false, 
  isPending = false,
  onAddMember // ADD THIS PROP - function to open add member modal
}) => {
  const navigate = useNavigate();
  const { user } = useAuth(); // ADD THIS - get current user
  
  if (!group && !isPending) {
    return (
      <div className="h-16 border-b-2 theme-border flex items-center justify-center"
        style={{ backgroundColor: colors.surface }}>
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

  const handleBackClick = () => {
    navigate('/dashboard', { state: { activeTab: 'groups' } });
  };

  // Determine display name based on state
  const displayName = isPending 
    ? `New chat with ${targetUser?.username || 'user'}`
    : (isDM && targetUser ? targetUser.username : group?.name);

  return (
    <div className="h-16 border-b-2 theme-border flex items-center justify-between px-4"
      style={{ backgroundColor: colors.surface }}>
      
      {/* Left side - Back button, avatar, group info */}
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
        
        {/* Avatar and group info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div 
              className="h-10 w-10 rounded-full flex items-center justify-center font-medium"
              style={{ 
                backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db',
                color: isDarkMode ? '#ffffff' : '#000000'
              }}
            >
              {isPending && targetUser ? getInitials(targetUser.username) : 
               isDM && targetUser ? getInitials(targetUser.username) : 
               group ? getInitials(group.name) : '?'}
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold theme-text">
                {displayName}
              </h3>
              {/* Show admin crown if current user is the group admin */}
              {group && group.createdBy === user?.userId && !isDM && !isPending && (
                <span className="text-amber-500 text-sm" title="You are the admin">👑</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm theme-text-secondary">
              {isPending ? (
                <>
                  <span>🆕</span>
                  <span>Start a new conversation</span>
                </>
              ) : isDM ? (
                <>
                  <span>👤</span>
                  <span>Direct Message</span>
                </>
              ) : (
                <>
                  <span>👥</span>
                  <span>{group?.memberCount} members</span>
                  {group?.description && (
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
      </div>

      {/* Right side - Connection status and Add Member button */}
      <div className="flex items-center gap-3">
        {/* Add Member Button - Only show for group admins in group chats */}
        {group && group.createdBy === user?.userId && !isDM && !isPending && onAddMember && (
          <button
            onClick={onAddMember}
            className="p-2 rounded-lg hover-scale theme-text flex items-center gap-1"
            style={{ 
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`
            }}
            title="Add members to group"
          >
            <span className="text-sm">+ Add Member</span>
          </button>
        )}

        {/* Connection status */}
        <div className={`flex items-center gap-1 text-sm ${
          isConnected ? 'text-green-500' : 'text-red-500'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;