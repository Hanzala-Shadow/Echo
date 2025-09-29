import React, { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import Skeleton from '../Common/Skeleton';

const MessageList = ({ messages = [], currentUserId, isDarkMode, colors, loading = false }) => {
  const scrollRef = useRef(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const lastMessageCountRef = useRef(0);

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

  // Handle new messages and auto-scroll logic
  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return;

    const currentMessageCount = messages.length;
    const hadNewMessages = currentMessageCount > lastMessageCountRef.current;
    
    // If user sent a message or is near bottom, auto-scroll
    const shouldAutoScroll = isNearBottom() || 
                           (hadNewMessages && messages[messages.length - 1]?.isCurrentUser);

    if (shouldAutoScroll) {
      setIsAutoScrolling(true);
      scrollToBottom(hadNewMessages ? 'smooth' : 'auto');
    } else if (hadNewMessages) {
      // New messages but user is not near bottom - show "new messages" indicator
      setIsAutoScrolling(false);
    }

    lastMessageCountRef.current = currentMessageCount;
  }, [messages]);

  // Handle manual scroll events
  const handleScroll = () => {
    if (scrollRef.current) {
      const currentlyNearBottom = isNearBottom();
      
      if (currentlyNearBottom && !isAutoScrolling) {
        // User scrolled to bottom - re-enable auto-scroll
        setIsAutoScrolling(true);
      } else if (!currentlyNearBottom && isAutoScrolling) {
        // User scrolled away from bottom - disable auto-scroll
        setIsAutoScrolling(false);
      }
    }
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        scrollToBottom('auto');
      }, 100);
    }
  }, []); // Only on initial mount

  // Skeleton for message loading
  const renderMessageSkeletons = () => {
    return (
      <div className="space-y-4">
        {/* Incoming messages skeletons */}
        <div className="flex justify-start">
          <div className="max-w-[70%]">
            <div className="flex items-end gap-2 mb-2">
              <Skeleton type="circle" width="2.5rem" height="2.5rem" />
              <Skeleton width="4rem" height="1rem" />
            </div>
            <Skeleton width="80%" height="3rem" />
            <Skeleton width="3rem" height="0.75rem" className="mt-1 ml-auto" />
          </div>
        </div>

        {/* Outgoing messages skeletons */}
        <div className="flex justify-end">
          <div className="max-w-[70%]">
            <Skeleton width="70%" height="3rem" className="rounded-tr-none" />
            <Skeleton width="3rem" height="0.75rem" className="mt-1" />
          </div>
        </div>

        {/* More varied skeletons */}
        <div className="flex justify-start">
          <div className="max-w-[70%]">
            <Skeleton width="60%" height="2rem" />
            <Skeleton width="3rem" height="0.75rem" className="mt-1 ml-auto" />
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[70%]">
            <Skeleton width="90%" height="4rem" className="rounded-tr-none" />
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
      {/* Loading State with Skeletons */}
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
              {currentUserId ? "Send the first message to start the conversation!" : "Select a group to start chatting"}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <>
          {/* "New messages" indicator when not auto-scrolling */}
          {!isAutoScrolling && isNearBottom() === false && (
            <button
              onClick={() => {
                scrollToBottom('smooth');
                setIsAutoScrolling(true);
              }}
              className="sticky top-4 left-1/2 transform -translate-x-1/2 z-10 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors text-sm font-medium animate-bounce"
            >
              ↓ New messages
            </button>
          )}

          {/* Scroll to bottom button when not near bottom */}
          {!isAutoScrolling && (
            <button
              onClick={() => {
                scrollToBottom('smooth');
                setIsAutoScrolling(true);
              }}
              className="fixed bottom-24 right-8 z-10 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all hover:scale-110"
              title="Scroll to bottom"
            >
              ↓
            </button>
          )}

          {/* Messages container */}
          <div className="space-y-3">
            {messages.map((message, index) => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                isCurrentUser={message.senderId === currentUserId}
                isDarkMode={isDarkMode}
                colors={colors}
                showSender={index === 0 || messages[index - 1]?.senderId !== message.senderId}
              />
            ))}
          </div>

          {/* Show loading skeleton at bottom when loading more messages */}
          {loading && messages.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-center">
                <div className="text-center">
                  <Skeleton width="8rem" height="1rem" />
                </div>
              </div>
              {renderMessageSkeletons()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MessageList;