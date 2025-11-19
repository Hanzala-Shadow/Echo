import React, { useState, useEffect } from 'react';
import ApiClient from '../../services/api';             // UPDATED

const SendFriendRequestModal = ({ isOpen, onClose, onFriendRequestSent, currentUserId, isDarkMode, colors }) => {
  const [username, setUsername] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Fetch all users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllUsers();
    }
  }, [isOpen]);

  // Filter users based on search input
  useEffect(() => {
    if (username.trim() === '') {
      setFilteredUsers([]);
    } else {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(username.toLowerCase()) && 
        user.userId !== currentUserId
      );
      setFilteredUsers(filtered);
    }
  }, [username, users, currentUserId]);

  const fetchAllUsers = async () => {
    setLoading(true);
    setError('');
    try {
      // Get all usernames
      const usernames = await ApiClient.users.getAllUsernames();
      
      // Get details for each user - simplified approach
      const userDetails = [];
      for (const username of usernames) {
        try {
          // Try to get user by email (assuming email is username@example.com)
          const email = `${username}@example.com`;
          const userByEmail = await ApiClient.users.getUserByEmail(email);
          userDetails.push({
            userId: userByEmail.userId,
            username: userByEmail.username,
            email: userByEmail.email
          });
        } catch (emailErr) {
          // If email approach fails, try search
          try {
            const searchResults = await ApiClient.users.search(username);
            if (searchResults.length > 0) {
              userDetails.push({
                userId: searchResults[0].userId,
                username: searchResults[0].username,
                email: searchResults[0].email
              });
            }
          } catch (searchErr) {
            console.log('Could not fetch details for user:', username);
          }
        }
      }
      
      setUsers(userDetails);
    } catch (err) {
      setError('Failed to fetch users: ' + err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (receiverId) => {
    setSending(true);
    setError('');
    try {
      await ApiClient.friends.sendRequest(receiverId);
      onFriendRequestSent();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send friend request');
    } finally {
      setSending(false);
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
              Add Friend
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

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Enter username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Search for users..."
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-white text-gray-900 border-gray-300'
              } border`}
              autoFocus
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {username.trim() === '' ? (
                <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Start typing to search for users
                </p>
              ) : filteredUsers.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No users found
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.userId}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleSendRequest(user.userId)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                      isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                    }`}>
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user.username}
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.email}
                      </p>
                    </div>
                    <button
                      disabled={sending}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        sending
                          ? isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {sending ? 'Sending...' : 'Add'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendFriendRequestModal;