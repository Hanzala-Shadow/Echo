import React, { useState, useEffect } from 'react';
import GroupChatService from '../../services/groupChatService';

const GroupCreateModal = ({ isOpen, onClose, onGroupCreated, currentUserId, isDarkMode, colors }) => {
  console.log('GroupCreateModal rendered with props:', {
    isOpen,
    onClose: typeof onClose,
    onGroupCreated: typeof onGroupCreated,
    currentUserId,
    isDarkMode,
    colors: !!colors
  });

  const [step, setStep] = useState(1); // 1: Group details, 2: Add members
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    console.log('GroupCreateModal useEffect - isOpen changed:', isOpen);
    if (isOpen) {
      setStep(1);
      setGroupName('');
      setSearchQuery('');
      setAvailableUsers([]);
      setSelectedUsers([]);
      setAiEnabled(false); // Reset AI flag
      setError('');
    }
  }, [isOpen]);

  const handleNext = () => {
    if (groupName.trim()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  // Search for users using the group chat service
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setAvailableUsers([]);
      return;
    }

    setSearchLoading(true);
    try {
      const users = await GroupChatService.searchUsers(query);

      // Filter out current user from search results
      const filteredUsers = users.filter(user => user.userId !== currentUserId);
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      setAvailableUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setAvailableUsers([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.userId === user.userId);
      if (isSelected) {
        return prev.filter(u => u.userId !== user.userId);
      } else {
        // Allow selecting 2 or more users (no upper limit)
        return [...prev, user];
      }
    });
  };

  const handleCreateGroup = async () => {
    // Validate input - now require at least 2 users
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedUsers.length < 2) {
      setError('Please select at least 2 other users for the group');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare member IDs (include current user automatically)
      const memberIds = [...selectedUsers.map(user => user.userId), currentUserId];


      // Create the group via service
      const newGroup = await GroupChatService.createGroup(groupName.trim(), memberIds, aiEnabled);

      // Transform the response for consistency
      const transformedGroup = {
        id: newGroup.group_id,
        name: groupName.trim(),
        memberCount: memberIds.length + 1, // Include creator
        isOnline: true,
        createdBy: currentUserId,
        isDirect: false, // Groups are never direct
        aiEnabled: newGroup.ai_enabled || aiEnabled
      };

      // Notify parent component
      onGroupCreated(transformedGroup);

      // Close modal
      onClose();

    } catch (error) {
      setError(error.message || 'Failed to create group. Please try again.');
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {step === 1 ? 'Create New Group' : 'Add Members'}
            </h2>
            <button
              onClick={onClose}
              className={`text-2xl ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ×
            </button>
          </div>
          <div className="flex mt-4 space-x-2">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-blue-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-blue-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className={`mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-red-900 border-red-700' : 'bg-red-100 border-red-300'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-900 border-gray-300'
                    } border`}
                  autoFocus
                />
              </div>

              {/* NEW: AI Toggle */}
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      ✨ Enable AI Features
                    </h4>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Smart Replies, Translations, Summaries, and Toxicity Checks.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={aiEnabled}
                      onChange={(e) => setAiEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Search Users
                </label>
                <p className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select at least 2 other users for the group
                </p>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by username"
                  className={`w-full px-3 py-1.5 sm:px-3 sm:py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${isDarkMode
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-900 border-gray-300'
                    } border`}
                  autoFocus
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Selected Members ({selectedUsers.length} selected)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div
                        key={`selected-${user.userId}`}
                        className={`flex items-center rounded-full px-3 py-1 ${isDarkMode ? 'bg-blue-900' : 'bg-blue-100'
                          }`}
                      >
                        <span className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                          {user.username}
                        </span>
                        <button
                          onClick={() => toggleUserSelection(user)}
                          className={`ml-2 ${isDarkMode ? 'text-blue-300 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Users */}
              <div>
                <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Available Users
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchQuery ? 'No users found' : 'Start typing to search users'}
                    </p>
                  ) : (
                    availableUsers.map(user => {
                      const isSelected = selectedUsers.find(u => u.userId === user.userId);
                      return (
                        <div
                          key={user.userId}
                          onClick={() => toggleUserSelection(user)}
                          className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${isSelected
                            ? (isDarkMode ? 'bg-blue-900 border border-blue-700' : 'bg-blue-50 border border-blue-200')
                            : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100')
                            }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                            }`}>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {user.username}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {user.email}
                            </p>
                          </div>
                          <div className={`w-4 h-4 rounded border ${isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : isDarkMode ? 'border-gray-600' : 'border-gray-300'
                            }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between space-x-3">
            {step === 1 ? (
              <button
                onClick={onClose}
                className={`px-4 py-2 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={handleBack}
                className={`px-4 py-2 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Back
              </button>
            )}

            <div className="flex space-x-3">
              {step === 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!groupName.trim()}
                  className={`px-4 py-2 rounded-lg transition-colors ${groupName.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : isDarkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleCreateGroup}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center ${loading
                    ? isDarkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Group'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCreateModal;