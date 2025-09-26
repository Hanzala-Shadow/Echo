import React from 'react';

const GroupSidebar = ({ 
  groups, 
  activeGroupId, 
  onGroupSelect, 
  onCreateGroup, 
  isDarkMode, 
  colors 
}) => {
  const getInitials = (name) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.surface }}
    >
      <div className="p-4 border-b-2 theme-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold theme-text">Groups</h2>
          <button
            onClick={onCreateGroup}
            className="p-2 rounded-lg hover-scale theme-text"
            style={{ backgroundColor: colors.background }}
            title="Create group"
          >
            ➕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <p className="theme-text-secondary">No groups yet</p>
              <p className="text-sm theme-text-secondary">Create your first group!</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                onClick={() => onGroupSelect(group)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 hover-scale ${
                  activeGroupId === group.id ? 'theme-surface' : ''
                }`}
                style={{
                  backgroundColor: activeGroupId === group.id 
                    ? (isDarkMode ? '#374151' : '#e5e7eb')
                    : 'transparent'
                }}
              >
                <div className="relative">
                  <div 
                    className="h-12 w-12 rounded-full flex items-center justify-center font-medium"
                    style={{ 
                      backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db',
                      color: colors.text
                    }}
                  >
                    {getInitials(group.name)}
                  </div>
                  {group.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate theme-text">{group.name}</h3>
                    <div className="flex items-center gap-1">
                      {group.memberCount > 2 ? (
                        <span className="text-xs theme-text-secondary">#</span>
                      ) : (
                        <span className="text-xs theme-text-secondary">🔒</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm theme-text-secondary truncate">
                    {group.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs theme-text-secondary">
                      {group.memberCount} members
                    </span>
                    <span className="text-xs theme-text-secondary">
                      2m ago
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupSidebar;