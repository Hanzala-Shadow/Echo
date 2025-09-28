import React from 'react';

const GroupList = ({ groups, onGroupSelect, activeGroupId }) => {
  if (!groups || groups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No groups available</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Create a group to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map(group => (
        <div
          key={group.id}
          onClick={() => onGroupSelect(group)}
          className={`p-3 rounded-lg cursor-pointer transition-colors ${
            activeGroupId === group.id
              ? 'bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700'
              : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center mr-3">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {group.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {group.name}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {group.memberCount} members
              </p>
            </div>
            {group.isDirect && (
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                1:1
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupList;