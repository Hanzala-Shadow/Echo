import React, { useState, useRef } from 'react';

const MessageInput = ({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Type a message...",
  isDarkMode,
  colors
}) => {
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  };

  return (
    <div 
      className="p-4 border-t-2 theme-border"
      style={{ backgroundColor: colors.surface }}
    >
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full min-h-[40px] max-h-[120px] resize-none py-2 px-4 pr-16 rounded-lg border-2 theme-border theme-text transition-all duration-300 focus:outline-none focus:ring-2"
            style={{ 
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.text
            }}
          />
          
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              onClick={() => console.log("Attachment clicked")}
              disabled={disabled}
              className="p-1 rounded hover-scale theme-text-secondary"
              title="Attach file"
            >
              📎
            </button>
            
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              disabled={disabled}
              className="p-1 rounded hover-scale theme-text-secondary"
              title="Add emoji"
            >
              😊
            </button>
          </div>
        </div>
        
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="px-4 py-2 rounded-lg font-medium transition-all duration-300 hover-scale disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: disabled || !message.trim() ? colors.border : '#3b82f6',
            color: 'white'
          }}
        >
          Send
        </button>
      </div>
      
      {showEmoji && (
        <div 
          className="mt-2 p-3 rounded-lg border-2 theme-border"
          style={{ backgroundColor: colors.background }}
        >
          <p className="text-sm theme-text-secondary">
            Emoji picker placeholder - will be implemented with emoji-picker-react
          </p>
        </div>
      )}
    </div>
  );
};

export default MessageInput;