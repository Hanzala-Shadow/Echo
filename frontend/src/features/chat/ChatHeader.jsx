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
  onAddMember,
  onLeaveGroup,
  enableAI,
  onAiAction,
  onToggleUserSidebar,
  typingStatus
}) => {
  const navigate = useNavigate();
  const { user } = useAuth(); 

  const [showAiTools, setShowAiTools] = useState(false);

  // Ensure enableAI is a boolean
  const isAiEnabled = !!enableAI;

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
    <div 
      className={`h-16 border-b-2 flex items-center justify-between px-4 transition-all duration-500 z-10
        ${isAiEnabled 
          ? 'shadow-[0_4px_20px_-5px_rgba(168,85,247,0.4)] border-purple-500/30' 
          : 'theme-border'}
      `}
      style={{ 
        backgroundColor: colors.surface,
        // Add a subtle gradient overlay if AI is on
        backgroundImage: isAiEnabled 
          ? `linear-gradient(to right, ${isDarkMode ? 'rgba(88, 28, 135, 0.2)' : 'rgba(233, 213, 255, 0.4)'}, transparent)` 
          : 'none'
      }}
    >

      {/* Left side - Back button, avatar, group info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Back button for mobile */}
        <button
          onClick={handleBackClick}
          className="sm:hidden p-2 rounded-lg hover-scale theme-text mr-2 shrink-0"
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
              {/* FIXED: Removed flex-1 to keep crown next to name, added truncate to handle long names */}
              <h3 className="font-semibold theme-text truncate min-w-0">
                {displayName}
              </h3>
              {/* Show admin crown if current user is the group admin */}
              {group && group.createdBy === user?.userId && !isDM && !isPending && (
                <span className="text-amber-500 text-sm shrink-0" title="You are the admin">👑</span>
              )}
            </div>
            {/* ✅ UPDATED: Show Typing Status OR Group Info WITH AI LABEL */}
            <div className="flex items-center gap-2 text-sm theme-text-secondary truncate min-w-0">
              {typingStatus ? (
                <span className="text-blue-500 italic animate-pulse font-medium">{typingStatus}</span>
              ) : isPending ? (
                <><span>🆕</span><span className="truncate">Start a new conversation</span></>
              ) : isDM ? (
                <><span>👤</span><span className="truncate">Direct Message</span></>
              ) : (
                <div className="flex items-center gap-2 min-w-0 overflow-hidden w-full">
                  {/* Member count - allow shrinking/truncating */}
                  <span className="flex items-center gap-1 min-w-0 truncate">
                    <span>👥</span>
                    <span className="truncate">{group?.memberCount} members</span>
                  </span>
                  
                  {/* AI Enabled Label - Prioritize visibility */}
                  {isAiEnabled && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600 shrink-0">•</span>
                      <div 
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs border border-purple-200 dark:border-purple-700 shrink-0 cursor-help hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors"
                        title="AI is enabled in this chat. Your messages are shared with Echo AI."
                      >
                        <span className="text-[10px]">✨</span>
                        {/* FIXED: Replaced xs: with sm: for standard breakpoints */}
                        <span className="font-medium hidden sm:inline">AI Enabled</span>
                        <span className="font-medium sm:hidden">AI</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Connection status and Group Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Leave Group Button - Available to all users in group chats EXCEPT admin */}
        {group && !isDM && !isPending && onLeaveGroup && group.createdBy !== user?.userId && (
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

        {/* Only show if AI is enabled for this group */}
        {isAiEnabled && (
          <div className="relative">
            <button
              onClick={() => setShowAiTools(!showAiTools)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-purple-500"
              title="AI Tools"
            >
              ✨
            </button>

            {showAiTools && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border theme-border z-50 p-1 animate-fade-in-up">
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
          className="p-2 rounded-lg hover-scale theme-text lg:hidden"
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