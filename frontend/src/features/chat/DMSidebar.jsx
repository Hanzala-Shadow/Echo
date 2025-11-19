import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import Skeleton from '../../components/ui/Skeleton';    // UPDATED
import ApiClient from '../../services/api';             // UPDATED

const DMSidebar = ({ 
  groups, 
  activeGroupId, 
  onDMSelect, 
  isDarkMode, 
  colors,
  loading = false,
  currentUserId,
  unreadCounts = {},
  typingUsers = {},
  onlineUsers = [],
  lastMessageTimestamps = {},
  newMessageIndicator = {} // Add this prop for new message indicators
}) => {
  const [userDetails, setUserDetails] = useState({});
  const navigate = useNavigate(); 

  const getInitials = (name) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Fetch user details for DMs
  useEffect(() => {
    const fetchUserDetails = async () => {
      const details = {};
      for (const group of groups) {
        if (group.otherUser) {
          details[group.id] = group.otherUser;
        } else if (group.id && !userDetails[group.id]) {
          try {
            const membersData = await ApiClient.chat.getGroupMembers(group.id);
            const members = membersData?.members || [];
            const otherUserId = members.find(member => member.user_id !== currentUserId)?.user_id;
            
            if (otherUserId) {
              const otherUserDetails = await ApiClient.users.getProfile(otherUserId);
              details[group.id] = otherUserDetails;
            }
          } catch (error) {
            console.warn('Error fetching user details for DM:', error);
          }
        }
      }
      if (Object.keys(details).length > 0) {
        setUserDetails(prev => ({ ...prev, ...details }));
      }
    };

    if (groups.length > 0) {
      fetchUserDetails();
    }
  }, [groups, currentUserId]);

  // Format timestamp for last message
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Check if user is online
  const isUserOnline = (userId) => {
    return onlineUsers.some(user => user.userId === userId);
  };

  // Skeleton for DM loading
  const renderDMSkeletons = () => {
    return (
      <div className="space-y-3 p-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-3 rounded-lg">
            <Skeleton type="circle" width="3rem" height="3rem" />
            <div className="flex-1 space-y-2">
              <Skeleton width="70%" height="1rem" />
              <Skeleton width="90%" height="0.75rem" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Sort DMs by last message timestamp (newest first)
  const sortedGroups = [...groups].sort((a, b) => {
    const timeA = lastMessageTimestamps[a.id] || '';
    const timeB = lastMessageTimestamps[b.id] || '';
    return new Date(timeB) - new Date(timeA);
  });

  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.surface }}
    >
      {/* UPDATED HEADER WITH DASHBOARD BUTTON */}
      <div className="p-3 border-b theme-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold theme-text">Direct Messages</h2>
            {/* Dashboard button - visible on mobile */}
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg hover-scale theme-text sm:hidden"
              style={{ 
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`
              }}
              title="Back to Dashboard"
            >
              🏠
            </button>
          </div>
        </div>
        
        {/* Dashboard link for desktop */}
        <div className="hidden sm:block">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full p-2 rounded-lg text-left theme-text hover-scale flex items-center gap-2"
            style={{ 
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`
            }}
          >
            <span>🏠</span>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          renderDMSkeletons()
        ) : sortedGroups.length === 0 ? (
          <div className="text-center py-6">
            <p className="theme-text-secondary text-sm">No direct messages yet</p>
            <p className="text-xs theme-text-secondary">Start a conversation!</p>
          </div>
        ) : (
          sortedGroups.map((group) => {
            const currentUserDetails = group.otherUser || userDetails[group.id];
            const username = currentUserDetails?.username || group.name.replace('DM with ', '');
            const userId = currentUserDetails?.userId;
            const isOnline = userId ? isUserOnline(userId) : false;
            const unreadCount = unreadCounts[group.id] || 0;
            const isTyping = typingUsers[group.id] && typingUsers[group.id] !== currentUserId;
            const lastMessageTime = lastMessageTimestamps[group.id];
            const hasNewMessage = newMessageIndicator[group.id]; // Check if there's a new message indicator
            
            return (
              <div
                key={group.id}
                onClick={() => onDMSelect(group)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                  activeGroupId === group.id ? 'theme-surface' : ''
                } ${hasNewMessage ? 'ring-2 ring-blue-500' : ''}`} // Add ring for new messages
                style={{
                  backgroundColor: activeGroupId === group.id 
                    ? (isDarkMode ? '#374151' : '#e5e7eb')
                    : 'transparent',
                  border: activeGroupId === group.id 
                    ? `1px solid ${colors.border}` 
                    : '1px solid transparent'
                }}
              >
                <div className="relative">
                  <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center font-medium text-sm"
                    style={{ 
                      backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  >
                    {getInitials(username)}
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                  )}
                  {/* Unread message indicator */}
                  {unreadCount > 0 && activeGroupId !== group.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                  )}
                  {/* New message indicator */}
                  {hasNewMessage && activeGroupId !== group.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-medium truncate theme-text text-sm">{username}</h3>
                    <div className="flex items-center gap-1">
                      {lastMessageTime && (
                        <span className="text-xs theme-text-secondary">
                          {formatLastMessageTime(lastMessageTime)}
                        </span>
                      )}
                      {unreadCount > 0 && (
                        <span className="flex items-center justify-center w-5 h-5 text-xs rounded-full bg-blue-500 text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isTyping ? (
                      <p className="text-xs theme-text-secondary truncate italic">
                        typing...
                      </p>
                    ) : (
                      <p className={`text-xs truncate ${unreadCount > 0 && activeGroupId !== group.id ? 'font-bold text-blue-600 dark:text-blue-400' : 'theme-text-secondary'}`}>
                        Direct message
                      </p>
                    )}
                    {isOnline && (
                      <span className="text-green-500 text-xs">●</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DMSidebar;