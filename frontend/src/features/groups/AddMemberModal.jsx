import React, { useState, useEffect } from 'react';
import ApiClient from '../../services/api';

const AddMemberModal = ({ 
  isOpen, 
  onClose, 
  onMemberAdded, 
  groupId, 
  currentUserId, 
  isDarkMode, 
  colors 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setAvailableUsers([]);
      setSelectedUsers([]);
      setError('');
    }
  }, [isOpen]);

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setAvailableUsers([]);
      return;
    }

    setSearchLoading(true);
    try {
      const users = await ApiClient.users.search(query);
      const filteredUsers = users.filter(user => user.userId !== currentUserId);
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      setAvailableUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setAvailableUsers([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.userId === user.userId);
      if (isSelected) {
        return prev.filter(u => u.userId !== user.userId);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user to add');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Add each selected user to the group
      for (const user of selectedUsers) {
        await ApiClient.chat.addMember(groupId, currentUserId, user.userId);
      }

      // Notify parent component
      onMemberAdded(selectedUsers);

      // Close modal
      onClose();
      
    } catch (error) {
      setError(error.message || 'Failed to add members. Please try again.');
      console.error('Error adding members:', error);
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
              Add Members to Group
            </h2>
            <button
              onClick={onClose}
              className={`text-2xl ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className={`mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-red-900 border-red-700' : 'bg-red-100 border-red-300'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Search Users
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username"
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
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
                  Selected Users ({selectedUsers.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(user => (
                    <div 
                      key={`selected-${user.userId}`} 
                      className={`flex items-center rounded-full px-3 py-1 ${
                        isDarkMode ? 'bg-green-900' : 'bg-green-100'
                      }`}
                    >
                      <span className={`text-sm ${isDarkMode ? 'text-green-200' : 'text-green-800'}`}>
                        {user.username}
                      </span>
                      <button
                        onClick={() => toggleUserSelection(user)}
                        className={`ml-2 ${isDarkMode ? 'text-green-300 hover:text-green-100' : 'text-green-600 hover:text-green-800'}`}
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
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? (isDarkMode ? 'bg-green-900 border border-green-700' : 'bg-green-50 border border-green-200')
                            : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100')
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                          isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
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
                        <div className={`w-4 h-4 rounded border ${
                          isSelected
                            ? 'bg-green-500 border-green-500'
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
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleAddMembers}
              disabled={loading || selectedUsers.length === 0}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                loading || selectedUsers.length === 0
                  ? isDarkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                `Add ${selectedUsers.length} Member${selectedUsers.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;