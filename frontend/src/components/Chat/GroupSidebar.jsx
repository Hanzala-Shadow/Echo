import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../Common/Skeleton';
import { useGroups } from '../../hooks/useGroups';

const GroupSidebar = ({ 
  groups, 
  activeGroupId, 
  onGroupSelect, 
  onCreateGroup, 
  isDarkMode, 
  colors,
  loading = false,
  currentUserId, // Add this prop from ChatContainer
  onGroupLeft // Add this callback
}) => {
  const navigate = useNavigate();
  const { leaveGroup, loading: leaveLoading } = useGroups();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(null);
  
  console.log('GroupSidebar rendered with props:', {
    groups: groups?.length,
    activeGroupId,
    currentUserId
  });

  const handleLeaveGroup = async (group) => {
    setLeavingGroup(group.id);
    setShowLeaveConfirm(false);
    
    const result = await leaveGroup(group.id);
    
    if (result.success) {
      console.log(`✅ Successfully left group ${group.id}`);
      // Notify parent component
      if (onGroupLeft) {
        onGroupLeft(group.id);
      }
      
      // If the active group was left, clear it
      if (activeGroupId === group.id) {
        onGroupSelect(null);
      }
    } else {
      console.error(`❌ Failed to leave group: ${result.error}`);
      // You might want to show an error toast here
    }
    
    setLeavingGroup(null);
  };

  const openLeaveConfirm = (group, e) => {
    e.stopPropagation(); // Prevent group selection
    setLeavingGroup(group.id);
    setShowLeaveConfirm(true);
  };

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
      {/* Leave Group Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl max-w-sm w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Leave Group
              </h3>
              <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Are you sure you want to leave this group? You won't be able to see group messages anymore.
              </p>
            </div>
            <div className={`p-6 flex justify-end space-x-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                disabled={leaveLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const group = groups.find(g => g.id === leavingGroup);
                  if (group) handleLeaveGroup(group);
                }}
                disabled={leaveLoading}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  leaveLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {leaveLoading ? 'Leaving...' : 'Leave Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 border-b theme-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold theme-text">Groups</h2>
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
          <button
            onClick={(e) => {
              console.log('🎯 Create group button clicked - PLUS SIGN');
              if (onCreateGroup && typeof onCreateGroup === 'function') {
                onCreateGroup();
              }
            }}
            className="p-2 rounded-lg hover-scale theme-text flex items-center justify-center cursor-pointer z-50 relative"
            style={{ 
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`
            }}
            title="Create group"
          >
            <span className="text-xl font-bold">+</span>
          </button>
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
          renderGroupSkeletons()
        ) : groups.length === 0 ? (
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
              <span className="text-2xl">👥</span>
            </div>
            <p className="theme-text-secondary text-sm">No groups yet</p>
            <p className="text-xs theme-text-secondary mt-1">Create your first group!</p>
            <button
              onClick={(e) => {
                if (onCreateGroup && typeof onCreateGroup === 'function') {
                  onCreateGroup();
                }
              }}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer z-50 relative"
              style={{ 
                backgroundColor: colors.primary,
                color: 'white'
              }}
            >
              Create Group
            </button>
          </div>
        ) : (
          groups.map((group) => {
            const isAdmin = group.createdBy === currentUserId;
            const isLeaving = leavingGroup === group.id;
            
            return (
              <div
                key={group.id}
                onClick={() => onGroupSelect(group)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 hover:scale-[1.02] group relative ${
                  activeGroupId === group.id ? 'theme-surface' : ''
                }`}
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
                    {getInitials(group.name)}
                  </div>
                  {/* Show admin crown for group creator */}
                  {isAdmin && (
                    <div 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: '#f59e0b', // amber-500
                        border: '2px solid white'
                      }}
                      title="Group Admin"
                    >
                      <span className="text-xs">👑</span>
                    </div>
                  )}
                  {/* Show online indicator if any members are online */}
                  {group.isOnline && (
                    <div 
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor: '#10b981', // green-500
                        borderColor: 'white',
                        boxShadow: '0 0 0 1px white'
                      }}
                      title="Group has online members"
                    ></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <h3 className="font-medium truncate theme-text text-sm">{group.name}</h3>
                    <div className="flex items-center gap-1">
                      <span className="text-xs theme-text-secondary">👥</span>
                      {isAdmin && (
                        <span className="text-xs text-amber-500" title="You are the admin">👑</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs theme-text-secondary truncate">
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

                {/* Leave Group Button (only for non-admin members) */}
                {!isAdmin && (
                  <button
                    onClick={(e) => openLeaveConfirm(group, e)}
                    disabled={isLeaving}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded ${
                      isLeaving 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900'
                    }`}
                    title="Leave group"
                  >
                    {isLeaving ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GroupSidebar;