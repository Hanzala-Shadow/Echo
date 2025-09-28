import React from 'react';

const MessageBubble = ({ message, isCurrentUser, isDarkMode, colors }) => {
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return messageTime.toLocaleDateString();
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
              ? '#3b82f6'
              : (isDarkMode ? '#374151' : '#f3f4f6'),
            color: isCurrentUser 
              ? 'white' 
              : colors.text
          }}
        >
          <div>{message.content}</div>
          <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
            isCurrentUser ? 'text-blue-100' : 'theme-text-secondary'
          }`}>
            <span>{formatTimestamp(message.timestamp)}</span>
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