import React, { useState } from 'react';
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
  onAddMember, // ADD THIS PROP - function to open add member modal
  onLeaveGroup, // Function to leave group (available to all users)
  enableAI,
  onAiAction,
  onToggleUserSidebar // ADD THIS PROP
}) => {
  const navigate = useNavigate();
  const { user } = useAuth(); // ADD THIS - get current user

  const [showAiTools, setShowAiTools] = useState(false);

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

  const handleSummarize = async () => {
    // You typically need the last ~50 messages. 
    // Ideally, ChatContainer should handle this logic via a callback 
    // like `onAiAction('summarize')` because ChatHeader doesn't have the messages.
    if (onAiAction) onAiAction('summarize');
    setShowAiTools(false);
  };

  const handleDeadlines = async () => {
    if (onAiAction) onAiAction('deadlines');
    setShowAiTools(false);
  };

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
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          <div className="relative shrink-0">
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

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold theme-text truncate flex-1 min-w-0">
                {displayName}
              </h3>
              {/* Show admin crown if current user is the group admin */}
              {group && group.createdBy === user?.userId && !isDM && !isPending && (
                <span className="text-amber-500 text-sm shrink-0" title="You are the admin">👑</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm theme-text-secondary truncate min-w-0">
              {isPending ? (
                <>
                  <span>🆕</span>
                  <span className="truncate">Start a new conversation</span>
                </>
              ) : isDM ? (
                <>
                  <span>👤</span>
                  <span className="truncate">Direct Message</span>
                </>
              ) : (
                <>
                  <span>👥</span>
                  <span className="truncate">{group?.memberCount} members</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Connection status and Group Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Leave Group Button - Available to all users in group chats */}
        {group && !isDM && !isPending && onLeaveGroup && (
          <button
            onClick={onLeaveGroup}
            className="p-2 rounded-lg hover-scale theme-text flex items-center gap-1"
            style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`
            }}
            title="Leave group"
          >
            <span className="text-sm hidden sm:inline">🚪 Leave Group</span>
            <span className="text-sm sm:hidden">🚪</span>
          </button>
        )}

        {/* Connection status */}
        <div className={`flex items-center gap-1 text-sm ${isConnected ? 'text-green-500' : 'text-red-500'
          }`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
          <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {/* ✅ FIX: Only show if AI is enabled for this group */}
        {enableAI && (
          <div className="relative">
            <button
              onClick={() => setShowAiTools(!showAiTools)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-purple-500"
              title="AI Tools"
            >
              ✨
            </button>

            {showAiTools && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border theme-border z-50 p-1">
                <button onClick={handleSummarize} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex gap-2">
                  📝 <span>Summarize Chat</span>
                </button>
                <button onClick={handleDeadlines} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex gap-2">
                  📅 <span>Extract Deadlines</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* User Sidebar Toggle (Mobile/Desktop) */}
        <button
          onClick={onToggleUserSidebar}
          className="p-2 rounded-lg hover-scale theme-text lg:hidden" // Show on mobile/tablet, hide on large screens if sidebar is persistent
          style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`
          }}
          title="View Members & Settings"
        >
          👥
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;