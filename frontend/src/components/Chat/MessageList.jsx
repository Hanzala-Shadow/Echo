import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

const MessageList = ({ messages = [], currentUserId, isDarkMode, colors }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-2"
      style={{ backgroundColor: colors.background }}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="theme-text-secondary text-lg">No messages yet</p>
            <p className="theme-text-secondary text-sm">Start a conversation!</p>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message} 
            isCurrentUser={message.senderId === currentUserId}
            isDarkMode={isDarkMode}
            colors={colors}
          />
        ))
      )}
    </div>
  );
};

export default MessageList;