import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

const MessageInput = ({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Type a message...",
  isDarkMode,
  colors
}) => {
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Handle emoji selection
  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      console.log('📁 Files selected:', files);
      // Here you would handle file upload to your backend
      // For now, we'll just log and reset the input
      event.target.value = '';
      setShowAttachmentMenu(false);
    }
  };

  // Trigger file input click
  const triggerFileInput = (type = 'all') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = getAcceptType(type);
      fileInputRef.current.click();
    }
  };

  // Get accept attribute based on file type
  const getAcceptType = (type) => {
    switch (type) {
      case 'image': return 'image/*';
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      case 'document': return '.pdf,.doc,.docx,.txt';
      default: return '*';
    }
  };

  // Voice recording functionality
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    // Here you would integrate with Web Audio API for actual recording
    console.log('🎤 Started recording...');
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    if (recordingTime > 1) {
      // Send voice message
      console.log('🎤 Voice message recorded:', recordingTime + 's');
      // You would send the audio blob to your backend here
    }
    
    setRecordingTime(0);
  };

  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      setShowEmoji(false);
      setShowAttachmentMenu(false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  };

  // Focus the input when it becomes enabled
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Cleanup recording interval
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmoji || showAttachmentMenu) {
        setShowEmoji(false);
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmoji, showAttachmentMenu]);

  return (
    <div 
      className="p-4 border-t-2 theme-border relative"
      style={{ backgroundColor: colors.surface }}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        className="hidden"
      />

      <div className="flex items-end gap-3">
        {/* Left side - Attachment and voice buttons */}
        <div className="flex items-center gap-1">
          {/* Attachment button with dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAttachmentMenu(!showAttachmentMenu);
                setShowEmoji(false);
              }}
              disabled={disabled}
              className={`p-2 rounded-lg transition-all ${
                disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              style={{ color: colors.textSecondary }}
              title="Attach files"
            >
              📎
            </button>

            {/* Attachment dropdown menu */}
            {showAttachmentMenu && !disabled && (
              <div 
                className="absolute bottom-full left-0 mb-2 w-48 rounded-lg shadow-lg border-2 z-50"
                style={{ 
                  backgroundColor: colors.surface,
                  borderColor: colors.border
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => triggerFileInput('image')}
                    className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span>🖼️</span>
                    <span className="text-sm">Photos & Videos</span>
                  </button>
                  <button
                    onClick={() => triggerFileInput('document')}
                    className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span>📄</span>
                    <span className="text-sm">Documents</span>
                  </button>
                  <button
                    onClick={() => triggerFileInput('audio')}
                    className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span>🎵</span>
                    <span className="text-sm">Audio Files</span>
                  </button>
                  <button
                    onClick={() => triggerFileInput()}
                    className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span>📁</span>
                    <span className="text-sm">Other Files</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Voice message button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={disabled}
            className={`p-2 rounded-lg transition-all ${
              disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600'
            } ${isRecording ? 'animate-pulse bg-red-100 dark:bg-red-900' : ''}`}
            style={{ color: isRecording ? '#ef4444' : colors.textSecondary }}
            title="Hold to record voice message"
          >
            🎤
          </button>
        </div>

        {/* Message textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Select a group to start chatting" : placeholder}
            disabled={disabled}
            className={`w-full min-h-[40px] max-h-[120px] resize-none py-2 px-4 pr-16 rounded-lg border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
            }`}
            style={{ 
              backgroundColor: colors.background,
              borderColor: disabled ? colors.border : '#3b82f6',
              color: colors.text
            }}
          />
          
          {/* Right side buttons */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* Emoji button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEmoji(!showEmoji);
                setShowAttachmentMenu(false);
              }}
              disabled={disabled}
              className={`p-1 rounded transition-all ${
                disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'
              }`}
              style={{ color: colors.textSecondary }}
              title="Add emoji"
            >
              😊
            </button>

            {/* Formatting button (future feature) */}
            <button
              onClick={() => console.log("Formatting options")}
              disabled={disabled}
              className={`p-1 rounded transition-all ${
                disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'
              }`}
              style={{ color: colors.textSecondary }}
              title="Text formatting"
            >
              𝐀
            </button>
          </div>
        </div>
        
        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
            disabled || !message.trim() 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 cursor-pointer'
          }`}
          style={{
            backgroundColor: disabled || !message.trim() ? colors.border : '#3b82f6',
            color: 'white'
          }}
        >
          Send
        </button>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white py-1 px-4 text-sm text-center animate-pulse">
          🎤 Recording... {formatRecordingTime(recordingTime)} - Release to send
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && !disabled && (
        <div 
          className="absolute bottom-full right-0 mb-2 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiPicker 
            onEmojiClick={onEmojiClick}
            theme={isDarkMode ? 'dark' : 'light'}
            height={400}
            width={350}
            searchDisabled={false}
          />
        </div>
      )}
    </div>
  );
};

export default MessageInput;