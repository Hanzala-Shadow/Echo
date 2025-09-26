import React from 'react';

const UserSidebar = ({ users, currentUserId, isDarkMode, colors }) => {
  const getInitials = (name) => {
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
        return '#10b981';
      case "away":
        return '#f59e0b';
      case "busy":
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const onlineUsers = users.filter(user => user.status === "online");
  const offlineUsers = users.filter(user => user.status !== "online");

  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.surface }}
    >
      <div className="p-4 border-b-2 theme-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <h3 className="font-semibold theme-text">Members</h3>
          <span 
            className="ml-auto px-2 py-1 rounded-full text-xs"
            style={{ 
              backgroundColor: colors.background,
              color: colors.textSecondary 
            }}
          >
            {users.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-4">
          {onlineUsers.length > 0 && (
            <div>
              <h4 className="text-xs font-medium theme-text-secondary uppercase tracking-wider mb-2 px-2">
                Online — {onlineUsers.length}
              </h4>
              <div className="space-y-1">
                {onlineUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-2 rounded-md hover-scale cursor-pointer ${
                      user.id === currentUserId ? 'theme-surface' : ''
                    }`}
                    style={{
                      backgroundColor: user.id === currentUserId 
                        ? (isDarkMode ? '#374151' : '#e5e7eb')
                        : 'transparent'
                    }}
                  >
                    <div className="relative">
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium"
                        style={{ 
                          backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db',
                          color: colors.text
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div 
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 rounded-full"
                        style={{ 
                          backgroundColor: getStatusColor(user.status),
                          borderColor: colors.surface
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate theme-text">{user.name}</span>
                        <span className="text-xs">{getRoleIcon(user.role)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs theme-text-secondary truncate">
                          @{user.username}
                        </span>
                        {user.isTyping && (
                          <span className="text-xs text-blue-500">typing...</span>
                        )}
                      </div>
                    </div>
                  </div>
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
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-2 rounded-md hover-scale cursor-pointer opacity-60 ${
                      user.id === currentUserId ? 'theme-surface' : ''
                    }`}
                    style={{
                      backgroundColor: user.id === currentUserId 
                        ? (isDarkMode ? '#374151' : '#e5e7eb')
                        : 'transparent'
                    }}
                  >
                    <div className="relative">
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium"
                        style={{ 
                          backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db',
                          color: colors.text
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div 
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 rounded-full"
                        style={{ 
                          backgroundColor: getStatusColor(user.status),
                          borderColor: colors.surface
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate theme-text">{user.name}</span>
                        <span className="text-xs">{getRoleIcon(user.role)}</span>
                      </div>
                      <span className="text-xs theme-text-secondary truncate">
                        @{user.username}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSidebar;