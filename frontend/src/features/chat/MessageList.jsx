import React, { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import Skeleton from '../../components/ui/Skeleton';

const MessageList = ({ messages = [], currentUserId, isDarkMode, colors, loading = false, enableAI }) => {
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
      // Only change state if it's different to prevent re-renders
      if (currentlyNearBottom !== isAutoScrolling) {
        setIsAutoScrolling(currentlyNearBottom);
      }
    }
  };

  const renderMessageSkeletons = () => {
    return (
      <div className="space-y-4">
        {/* ... existing skeletons ... */}
        <div className="flex justify-start">
          <div className="max-w-[70%]">
            <Skeleton width="4rem" height="1rem" className="mb-2" />
            <Skeleton width="80%" height="3rem" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[70%]">
            <Skeleton width="70%" height="3rem" />
          </div>
        </div>
      </div>
    );
  };

  // Group messages by date
  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      if (!msg.timestamp) return;
      const date = new Date(msg.timestamp).toLocaleDateString([], { 
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    // 1️⃣ OUTER WRAPPER: Creates the coordinate context for the button
    <div className="relative flex-1 flex flex-col overflow-hidden h-full theme-bg">
      
      {/* 2️⃣ SCROLLABLE AREA */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth"
        onScroll={handleScroll}
      >
        {/* Loading State */}
        {loading && messages.length === 0 && (
          <div className="h-full">{renderMessageSkeletons()}</div>
        )}

        {/* Empty State */}
        {!loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4 opacity-50">💬</div>
              <p className="theme-text-secondary text-lg mb-2">No messages yet</p>
              <p className="theme-text-secondary text-sm">Send the first message to start the conversation!</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <>
            <div className="space-y-3 pb-4">
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <React.Fragment key={date}>
                  {/* Date Separator */}
                  <div className="flex justify-center my-6 relative z-10 pointer-events-none">
                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-3 py-1 rounded-full shadow-sm border border-gray-300 dark:border-gray-600 backdrop-blur-sm opacity-90">
                      {date === new Date().toLocaleDateString([], { 
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                      }) ? 'Today' : date}
                    </span>
                  </div>

                  {msgs.map((message, index) => {
                    const showSender = index === 0 || msgs[index - 1]?.senderId !== message.senderId;
                    return (
                      <MessageBubble 
                        key={message.id} 
                        message={message} 
                        isCurrentUser={message.isCurrentUser || message.senderId === currentUserId}
                        isDarkMode={isDarkMode}
                        colors={colors}
                        showSender={showSender}
                        enableAI={enableAI}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            {loading && messages.length > 0 && (
              <div className="mt-4 text-center">
                <Skeleton width="8rem" height="1rem" className="mx-auto" />
              </div>
            )}
          </>
        )}
      </div>

      {/* 3️⃣ BUTTON: Now a sibling, positioned absolute relative to the chat box */}
      {!isAutoScrolling && (
        <button
          onClick={() => {
            scrollToBottom('smooth');
            // Do NOT immediately set isAutoScrolling(true) here; 
            // let the handleScroll event detect the movement naturally.
          }}
          className="absolute bottom-6 right-6 z-50 p-3 rounded-full text-white shadow-xl animate-bounce-in transition-all duration-300 hover:scale-110 hover:shadow-blue-500/40 active:scale-95 border border-white/20 cursor-pointer"
          style={{
            background: `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))`
          }}
          title="Jump to latest messages"
          type="button" // Explicitly prevent form submission
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M19 12l-7 7-7-7" />
          </svg>
          {/* Unread dot */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>
        </button>
      )}
    </div>
  );
};

export default MessageList;