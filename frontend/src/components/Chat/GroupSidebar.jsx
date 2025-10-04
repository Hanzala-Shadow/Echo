import React from 'react';
import Skeleton from '../Common/Skeleton';

const GroupSidebar = ({ 
  groups, 
  activeGroupId, 
  onGroupSelect, 
  onCreateGroup, 
  isDarkMode, 
  colors,
  loading = false 
}) => {
  const getInitials = (name) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Skeleton for group loading
  const renderGroupSkeletons = () => {
    return (
      <div className="space-y-3 p-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-3 rounded-lg">
            <Skeleton type="circle" width="3rem" height="3rem" />
            <div className="flex-1 space-y-2">
              <Skeleton width="70%" height="1rem" />
              <Skeleton width="90%" height="0.75rem" />
              <div className="flex justify-between">
                <Skeleton width="4rem" height="0.75rem" />
                <Skeleton width="3rem" height="0.75rem" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
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
        {loading ? (
          renderGroupSkeletons()
        ) : groups.length === 0 ? (
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
  );
};

export default GroupSidebar;