import React from 'react';

const MessageBubble = ({ message, isCurrentUser, isDarkMode, colors }) => {
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatFullTimestamp = (timestamp) => {
    const messageTime = new Date(timestamp);
    return messageTime.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <div 
          className="px-3 py-1 rounded-full text-xs italic"
          style={{ 
            backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
            color: colors.textSecondary 
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Handle file messages
  if (message.type === "file") {
    return (
      <div className={`flex mb-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[70%] group">
          {!isCurrentUser && (
            <div className="text-xs theme-text-secondary mb-1 ml-3">
              {message.senderName}
            </div>
          )}
          <div 
            className={`px-3 py-2 rounded-lg break-words ${
              isCurrentUser 
                ? 'rounded-tr-none' 
                : 'rounded-tl-none'
            }`}
            style={{
              backgroundColor: isCurrentUser 
                ? (isDarkMode ? '#ffffff' : '#000000')
                : (isDarkMode ? '#374151' : '#f3f4f6'),
              color: isCurrentUser 
                ? (isDarkMode ? '#000000' : '#ffffff')
                : colors.text,
              border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`
            }}
          >
            <div className="flex items-center gap-2">
              <span>📁</span>
              <div>
                <div className="font-medium">{message.fileName}</div>
                <div className="text-xs opacity-75">
                  {(message.fileSize / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button 
                className={`text-xs px-2 py-1 rounded ${
                  isDarkMode 
                    ? 'bg-gray-600 hover:bg-gray-500' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Download
              </button>
              <button 
                className={`text-xs px-2 py-1 rounded ${
                  isDarkMode 
                    ? 'bg-gray-600 hover:bg-gray-500' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Preview
              </button>
            </div>
            <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
              isCurrentUser 
                ? (isDarkMode ? 'text-gray-700' : 'text-gray-300') 
                : 'theme-text-secondary'
            }`}>
              <span title={formatFullTimestamp(message.timestamp)}>
                {formatTimestamp(message.timestamp)}
              </span>
              {isCurrentUser && message.status && (
                <span>
                  {message.status === 'sent' && '✓'}
                  {message.status === 'delivered' && '✓✓'}
                  {message.status === 'read' && '✓✓'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[70%] group">
        {!isCurrentUser && (
          <div className="text-xs theme-text-secondary mb-1 ml-3">
            {message.senderName}
          </div>
        )}
        <div 
          className={`px-3 py-2 rounded-lg break-words ${
            isCurrentUser 
              ? 'rounded-tr-none' 
              : 'rounded-tl-none'
          }`}
          style={{
            backgroundColor: isCurrentUser 
              ? (isDarkMode ? '#ffffff' : '#000000')
              : (isDarkMode ? '#374151' : '#f3f4f6'),
            color: isCurrentUser 
              ? (isDarkMode ? '#000000' : '#ffffff')
              : colors.text,
            border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`
          }}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
            isCurrentUser 
              ? (isDarkMode ? 'text-gray-700' : 'text-gray-300') 
              : 'theme-text-secondary'
          }`}>
            <span title={formatFullTimestamp(message.timestamp)}>
              {formatTimestamp(message.timestamp)}
            </span>
            {isCurrentUser && message.status && (
              <span>
                {message.status === 'sent' && '✓'}
                {message.status === 'delivered' && '✓✓'}
                {message.status === 'read' && '✓✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;