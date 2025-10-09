import React, { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import Skeleton from '../Common/Skeleton';

const MessageList = ({ messages = [], currentUserId, isDarkMode, colors, loading = false }) => {
  const scrollRef = useRef(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const prevMessagesLengthRef = useRef(0);

  // Check if user is near bottom (within 100px)
  const isNearBottom = () => {
    if (!scrollRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 100;
  };

  // Smooth scroll to bottom
  const scrollToBottom = (behavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: behavior
      });
    }
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return;

    const hasNewMessages = messages.length > prevMessagesLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage?.isCurrentUser;

    // Auto-scroll if: user sent message, or user is near bottom, or initial load
    if (hasNewMessages && (isOwnMessage || isNearBottom() || prevMessagesLengthRef.current === 0)) {
      setTimeout(() => scrollToBottom(prevMessagesLengthRef.current === 0 ? 'auto' : 'smooth'), 100);
      setIsAutoScrolling(true);
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Handle manual scroll events
  const handleScroll = () => {
    if (scrollRef.current) {
      const currentlyNearBottom = isNearBottom();
      setIsAutoScrolling(currentlyNearBottom);
    }
  };

  // Skeleton for message loading
  const renderMessageSkeletons = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-start">
          <div className="max-w-[70%]">
            <Skeleton width="4rem" height="1rem" className="mb-2" />
            <Skeleton width="80%" height="3rem" />
            <Skeleton width="3rem" height="0.75rem" className="mt-1" />
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[70%]">
            <Skeleton width="70%" height="3rem" />
            <Skeleton width="3rem" height="0.75rem" className="mt-1" />
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[70%]">
            <Skeleton width="60%" height="2rem" />
            <Skeleton width="3rem" height="0.75rem" className="mt-1" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-2 relative"
      style={{ backgroundColor: colors.background }}
      onScroll={handleScroll}
    >
      {/* Loading State */}
      {loading && messages.length === 0 && (
        <div className="h-full">
          {renderMessageSkeletons()}
        </div>
      )}

      {/* Empty State */}
      {!loading && messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4 opacity-50">💬</div>
            <p className="theme-text-secondary text-lg mb-2">No messages yet</p>
            <p className="theme-text-secondary text-sm">
              Send the first message to start the conversation!
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <>
          {/* Scroll to bottom button when not near bottom */}
          {!isAutoScrolling && (
            <button
              onClick={() => {
                scrollToBottom('smooth');
                setIsAutoScrolling(true);
              }}
              className="fixed bottom-24 right-8 z-10 p-3 rounded-full shadow-lg hover:scale-110 transition-all"
              style={{
                backgroundColor: isDarkMode ? '#ffffff' : '#000000',
                color: isDarkMode ? '#000000' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#d1d5db' : '#4b5563'}`
              }}
              title="Scroll to bottom"
            >
              ↓
            </button>
          )}

          {/* Messages container */}
          <div className="space-y-3">
            {messages.map((message, index) => {
              const showSender = index === 0 || messages[index - 1]?.senderId !== message.senderId;
              
              return (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  isCurrentUser={message.isCurrentUser || message.senderId === currentUserId}
                  isDarkMode={isDarkMode}
                  colors={colors}
                  showSender={showSender}
                />
              );
            })}
          </div>

          {/* Loading more messages indicator */}
          {loading && messages.length > 0 && (
            <div className="mt-4 text-center">
              <Skeleton width="8rem" height="1rem" className="mx-auto" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MessageList;