import React, { useState, useEffect } from 'react';
import ApiClient from '../../utils/apis'; // Import API client to fetch user details
import Skeleton from '../Common/Skeleton';

const UserSidebar = ({ users, currentUserId, isDarkMode, colors, onClose }) => { // ADD onClose prop
  const [userDetails, setUserDetails] = useState({}); // Cache for user details
  const [loadingDetails, setLoadingDetails] = useState(false); // Start as false since we might not need to load

  // Fetch user details for users we don't have info for
  useEffect(() => {
    const fetchUserDetails = async () => {
      const usersToFetch = users.filter(user => 
        !userDetails[user.userId] && typeof user.userId === 'number'
      );
      
      if (usersToFetch.length === 0) {
        setLoadingDetails(false);
        return;
      }

      console.log('🔍 Fetching details for users:', usersToFetch.map(u => u.userId));
      setLoadingDetails(true);
      
      try {
        const newDetails = { ...userDetails };
        
        // Fetch details for each user
        for (const user of usersToFetch) {
          try {
            const userData = await ApiClient.users.getProfile(user.userId);
            newDetails[user.userId] = {
              name: userData.username || `User ${user.userId}`,
              username: userData.username || `user${user.userId}`,
              email: userData.email || '',
              avatar: userData.avatar || null
            };
          } catch (error) {
            console.warn(`❌ Could not fetch details for user ${user.userId}:`, error);
            // Fallback data
            newDetails[user.userId] = {
              name: `User ${user.userId}`,
              username: `user${user.userId}`,
              email: '',
              avatar: null
            };
          }
        }
        
        setUserDetails(newDetails);
      } catch (error) {
        console.error('❌ Error fetching user details:', error);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchUserDetails();
  }, [users, userDetails]);

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return '👑';
      case "moderator":
        return '🛡️';
      default:
        return '👤';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return '#10b981'; // green-500
      case "away":
        return '#f59e0b'; // yellow-500
      case "busy":
        return '#ef4444'; // red-500
      case "offline":
      default:
        return '#6b7280'; // gray-500
    }
  };

  // ✅ FIXED: Transform users with proper fallbacks and cached details
  const transformedUsers = users.map(user => {
    const details = userDetails[user.userId] || {};
    
    // Ensure we have a proper status
    let status = 'offline';
    if (user.status) {
      status = user.status;
    } else if (user.online_status !== undefined) {
      status = user.online_status ? 'online' : 'offline';
    } else if (user.online !== undefined) {
      status = user.online ? 'online' : 'offline';
    }
    
    return {
      userId: user.userId || user.user_id,
      name: user.name || details.name || `User ${user.userId || user.user_id}`,
      username: user.username || details.username || `user${user.userId || user.user_id}`,
      status: status,
      role: user.role || 'member',
      isTyping: user.isTyping || false,
      email: user.email || details.email || '',
    };
  });

  console.log('👥 UserSidebar:', { 
    loadingDetails, 
    totalUsers: users.length, 
    transformedUsers: transformedUsers.length 
  });

  // Sort users: online first, then by name
  const sortedUsers = [...transformedUsers].sort((a, b) => {
    // Online users first
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (b.status === 'online' && a.status !== 'online') return 1;
    
    // Then alphabetically by name
    return (a.name || '').localeCompare(b.name || '');
  });

  const onlineUsers = sortedUsers.filter(user => user.status === "online");
  const offlineUsers = sortedUsers.filter(user => user.status !== "online");

  // Skeleton for user loading - only show when actively loading details
  const renderUserSkeletons = () => {
    return (
      <div className="space-y-4 p-2">
        {/* Online section skeleton */}
        <div>
          <Skeleton width="6rem" height="1rem" className="mb-2" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-2">
              <Skeleton type="circle" width="2rem" height="2rem" />
              <div className="flex-1 space-y-1">
                <Skeleton width="8rem" height="0.875rem" />
                <Skeleton width="6rem" height="0.75rem" />
              </div>
            </div>
          ))}
        </div>

        {/* Offline section skeleton */}
        <div>
          <Skeleton width="6rem" height="1rem" className="mb-2" />
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-2 opacity-60">
              <Skeleton type="circle" width="2rem" height="2rem" />
              <div className="flex-1 space-y-1">
                <Skeleton width="8rem" height="0.875rem" />
                <Skeleton width="6rem" height="0.75rem" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.surface }}
    >
      {/* UPDATED HEADER WITH CLOSE BUTTON */}
      <div className="p-4 border-b-2 theme-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">👥</span>
            <h3 className="font-semibold theme-text">Members</h3>
            <span 
              className="ml-2 px-2 py-1 rounded-full text-xs"
              style={{ 
                backgroundColor: colors.background,
                color: colors.textSecondary,
                border: `1px solid ${colors.border}`
              }}
            >
              {transformedUsers.length}
            </span>
          </div>
          
          {/* CLOSE BUTTON FOR MOBILE */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover-scale theme-text sm:hidden"
              style={{ 
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`
              }}
              title="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Connection Status */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            onlineUsers.length > 0 ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
          <span className="theme-text-secondary">
            {onlineUsers.length} online, {offlineUsers.length} offline
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingDetails ? (
          renderUserSkeletons()
        ) : (
          <div className="p-2 space-y-4">
            {onlineUsers.length > 0 && (
              <div>
                <h4 className="text-xs font-medium theme-text-secondary uppercase tracking-wider mb-2 px-2">
                  Online — {onlineUsers.length}
                </h4>
                <div className="space-y-1">
                  {onlineUsers.map((user) => (
                    <UserItem 
                      key={user.userId}
                      user={user}
                      currentUserId={currentUserId}
                      isDarkMode={isDarkMode}
                      colors={colors}
                      getInitials={getInitials}
                      getRoleIcon={getRoleIcon}
                      getStatusColor={getStatusColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {offlineUsers.length > 0 && (
              <div>
                <h4 className="text-xs font-medium theme-text-secondary uppercase tracking-wider mb-2 px-2">
                  Offline — {offlineUsers.length}
                </h4>
                <div className="space-y-1">
                  {offlineUsers.map((user) => (
                    <UserItem 
                      key={user.userId}
                      user={user}
                      currentUserId={currentUserId}
                      isDarkMode={isDarkMode}
                      colors={colors}
                      getInitials={getInitials}
                      getRoleIcon={getRoleIcon}
                      getStatusColor={getStatusColor}
                      isOffline={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {transformedUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="theme-text-secondary text-sm">No members found</p>
                <p className="theme-text-secondary text-xs mt-1">
                  Users will appear here when they join
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ✅ EXTRACTED: User item component for better organization
const UserItem = ({ 
  user, 
  currentUserId, 
  isDarkMode, 
  colors, 
  getInitials, 
  getRoleIcon, 
  getStatusColor,
  isOffline = false 
}) => {
  const [showProfile, setShowProfile] = useState(false);

  // Determine if user is online
  const isUserOnline = user.status === 'online';

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-md hover:scale-[1.02] cursor-pointer transition-all ${
        user.userId === currentUserId ? 'theme-surface' : ''
      } ${isOffline ? 'opacity-60' : ''}`}
      style={{
        backgroundColor: user.userId === currentUserId 
          ? (isDarkMode ? '#374151' : '#e5e7eb')
          : 'transparent',
        border: user.userId === currentUserId 
          ? `1px solid ${colors.border}` 
          : '1px solid transparent'
      }}
      onClick={() => setShowProfile(true)}
      title={`Click to view ${user.name}'s profile`}
    >
      <div className="relative">
        <div 
          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium"
          style={{ 
            backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db',
            color: isDarkMode ? '#ffffff' : '#000000'
          }}
        >
          {getInitials(user.name)}
        </div>
        {/* Online status indicator - always show for online users, show muted for offline */}
        <div 
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 rounded-full ${
            isUserOnline ? 'animate-pulse' : ''
          }`}
          style={{ 
            backgroundColor: getStatusColor(user.status),
            borderColor: 'white',
            boxShadow: '0 0 0 1px white'
          }}
          title={user.status}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium truncate theme-text">
            {user.name}
            {user.userId === currentUserId && (
              <span className="text-xs ml-1 theme-text-secondary">(You)</span>
            )}
          </span>
          <span className="text-xs">{getRoleIcon(user.role)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs theme-text-secondary truncate">
            @{user.username}
          </span>
          {user.isTyping && (
            <span className="text-xs text-blue-500 animate-pulse">typing...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSidebar;