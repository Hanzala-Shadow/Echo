import React, { useState, useEffect } from 'react';
import ApiClient from '../../../utils/apis';

const GroupCreateModal = ({ isOpen, onClose, onGroupCreated, currentUserId }) => {
  const [step, setStep] = useState(1); // 1: Group details, 2: Add members
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setGroupName('');
      setDescription('');
      setSearchQuery('');
      setAvailableUsers([]);
      setSelectedUsers([]);
      setError('');
    }
  }, [isOpen]);

  // Search for users using the actual backend endpoint
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setAvailableUsers([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Use the actual search endpoint from UserController
      const response = await ApiClient.request(`/users/search?query=${encodeURIComponent(query)}`);
      setAvailableUsers(response);
    } catch (error) {
      console.error('Error searching users:', error);
      setAvailableUsers([]);
      // Don't show error to user for search, just log it
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
      const isSelected = prev.find(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleNext = () => {
    if (step === 1 && !groupName.trim()) {
      setError('Group name is required');
      return;
    }
    setStep(2);
    setError('');
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare member IDs (include current user automatically)
      const memberIds = selectedUsers.map(user => user.id);
      if (currentUserId && !memberIds.includes(currentUserId)) {
        memberIds.push(currentUserId);
      }

      // Create the group via API
      const newGroup = await ApiClient.chat.createGroup(groupName.trim(), memberIds);
      
      // Notify parent component
      onGroupCreated({
        id: newGroup.group_id,
        name: groupName.trim(),
        description: description.trim(),
        memberCount: memberIds.length,
        isOnline: true,
        createdBy: currentUserId,
        isDirect: memberIds.length === 2 // 1-on-1 chat if only 2 members
      });

      // Close modal
      onClose();
      
    } catch (error) {
      setError(error.message || 'Failed to create group');
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {step === 1 ? 'Create New Group' : 'Add Members'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="flex mt-4 space-x-2">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this group"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Users
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by username"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selected Members ({selectedUsers.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div 
                        key={`selected-${user.id}`} 
                        className="flex items-center bg-blue-100 dark:bg-blue-900 rounded-full px-3 py-1"
                      >
                        <span className="text-sm text-blue-800 dark:text-blue-200">
                          {user.username}
                        </span>
                        <button
                          onClick={() => toggleUserSelection(user)}
                          className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
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
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Users
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      {searchQuery ? 'No users found' : 'Start typing to search users'}
                    </p>
                  ) : (
                    availableUsers.map(user => {
                      const isSelected = selectedUsers.find(u => u.id === user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleUserSelection(user)}
                          className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700'
                              : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.username}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {user.email}
                            </p>
                          </div>
                          <div className={`w-4 h-4 rounded border ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
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
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between space-x-3">
            {step === 1 ? (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Back
              </button>
            )}
            
            <div className="flex space-x-3">
              {step === 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!groupName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleCreateGroup}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
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