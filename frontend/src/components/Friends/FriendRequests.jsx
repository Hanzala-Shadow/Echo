import React, { useState, useEffect } from 'react';
import ApiClient from '../../utils/apis';

const FriendRequests = ({ currentUserId, isDarkMode, colors, onRequestsUpdate }) => {
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState('');

  // Fetch friend requests when component mounts
  useEffect(() => {
    fetchFriendRequests();
  }, []);

  const fetchFriendRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const requests = await ApiClient.friends.getPendingRequests();
      setFriendRequests(requests);
      onRequestsUpdate(requests.length);
    } catch (err) {
      setError(err.message || 'Failed to fetch friend requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setProcessing(prev => ({ ...prev, [requestId]: 'accepting' }));
    setError('');
    try {
      await ApiClient.friends.acceptRequest(requestId);
      // Remove the accepted request from the list
      setFriendRequests(prev => prev.filter(req => req.requestId !== requestId));
      onRequestsUpdate(friendRequests.length - 1);
    } catch (err) {
      setError(err.message || 'Failed to accept friend request');
    } finally {
      setProcessing(prev => {
        const newProcessing = { ...prev };
        delete newProcessing[requestId];
        return newProcessing;
      });
    }
  };

  const handleRejectRequest = async (requestId) => {
    setProcessing(prev => ({ ...prev, [requestId]: 'rejecting' }));
    setError('');
    try {
      await ApiClient.friends.rejectRequest(requestId);
      // Remove the rejected request from the list
      setFriendRequests(prev => prev.filter(req => req.requestId !== requestId));
      onRequestsUpdate(friendRequests.length - 1);
    } catch (err) {
      setError(err.message || 'Failed to reject friend request');
    } finally {
      setProcessing(prev => {
        const newProcessing = { ...prev };
        delete newProcessing[requestId];
        return newProcessing;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900' : 'bg-red-100'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {friendRequests.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🤝</div>
          <h3 className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>No friend requests</h3>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            You don't have any pending friend requests
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {friendRequests.map((request) => (
            <div 
              key={request.requestId} 
              className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <span className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {request.sender.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {request.sender.username}
                  </h4>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Sent you a friend request
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAcceptRequest(request.requestId)}
                    disabled={processing[request.requestId] === 'accepting'}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      processing[request.requestId] === 'accepting'
                        ? isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {processing[request.requestId] === 'accepting' ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.requestId)}
                    disabled={processing[request.requestId] === 'rejecting'}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      processing[request.requestId] === 'rejecting'
                        ? isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {processing[request.requestId] === 'rejecting' ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendRequests;