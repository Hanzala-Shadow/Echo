import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import FileUpload from './FileUpload';
import { useAuth } from '../../context/AuthContext';

const MessageInput = ({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Type a message...",
  isDarkMode,
  colors,
  activeGroupId,
  onTyping // New prop for typing indicators
}) => {
  const { sendFile } = useAuth();
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Handle emoji selection
  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // Handle file selection from FileUpload component
  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile || !activeGroupId) {
      console.error('No file selected or group ID missing');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Send file through WebSocket
      await sendFile(selectedFile, activeGroupId, (progress) => {
        setUploadProgress(progress);
      });
      
      console.log('File uploaded successfully');
      setSelectedFile(null);
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file selection from attachment menu
  const handleFileInputChange = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const file = files[0];
      console.log('📁 File selected:', file);
      setSelectedFile(file);
      // Auto-trigger file upload
      event.target.value = '';
      setShowAttachmentMenu(false);
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

  const handleSend = async () => {
    if (message.trim() && !disabled) {
      try {
        await onSendMessage(message.trim());
        setMessage("");
        setShowEmoji(false);
        setShowAttachmentMenu(false);
        
        // Reset typing state
        if (isTyping) {
          setIsTyping(false);
          if (onTyping) {
            onTyping(false);
          }
        }
        
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        
        textareaRef.current?.focus();
      } catch (error) {
        console.error('Error sending message:', error);
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
    const newMessage = e.target.value;
    setMessage(newMessage);
    adjustTextareaHeight();
    
    // Handle typing indicators with better debouncing
    if (onTyping) {
      if (newMessage.trim() && !isTyping) {
        setIsTyping(true);
        onTyping(true);
        
        // Clear any existing timeout
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
        
        // Set timeout to stop typing indicator after 1.5 seconds of inactivity
        const timeout = setTimeout(() => {
          setIsTyping(false);
          onTyping(false);
        }, 1500);
        
        setTypingTimeout(timeout);
      } else if (!newMessage.trim() && isTyping) {
        // If message is cleared, immediately stop typing
        setIsTyping(false);
        onTyping(false);
        
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
      }
    }
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

  // Clean up typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

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
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="flex items-end gap-3">
        {/* Left side - Attachment button */}
        <div className="flex items-center gap-1">
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
                    className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors theme-text"
                  >
                    <span>🖼️</span>
                    <span className="text-sm">Photos & Videos</span>
                  </button>
                  <button
                    onClick={() => triggerFileInput('document')}
                    className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors theme-text"
                  >
                    <span>📄</span>
                    <span className="text-sm">Documents</span>
                  </button>
                  <button
                    onClick={() => triggerFileInput('audio')}
                    className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors theme-text"
                  >
                    <span>🎵</span>
                    <span className="text-sm">Audio Files</span>
                  </button>
                  <button
                    onClick={() => triggerFileInput()}
                    className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors theme-text"
                  >
                    <span>📁</span>
                    <span className="text-sm">Other Files</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isUploading}
            className={`w-full min-h-[40px] max-h-[120px] resize-none py-2 px-4 pr-16 rounded-lg border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
            }`}
            style={{ 
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.text
            }}
          />
          
          {/* Right side buttons inside textarea */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* Emoji button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEmoji(!showEmoji);
                setShowAttachmentMenu(false);
              }}
              disabled={disabled || isUploading}
              className={`p-1 rounded transition-all ${
                disabled || isUploading ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'
              }`}
              style={{ color: colors.textSecondary }}
              title="Add emoji"
            >
              😊
            </button>
          </div>
        </div>
        
        {/* Send/File Upload button */}
        {selectedFile ? (
          <div className="flex items-center gap-2">
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span className="text-xs theme-text">{uploadProgress}%</span>
              </div>
            ) : (
              <button
                onClick={handleFileUpload}
                disabled={isUploading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-white text-black hover:bg-gray-200' 
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                Upload
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim() || isUploading}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              disabled || !message.trim() || isUploading
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:scale-105 cursor-pointer'
            }`}
            style={{
              backgroundColor: disabled || !message.trim() || isUploading 
                ? (isDarkMode ? '#374151' : '#d1d5db') 
                : (isDarkMode ? 'white' : 'black'),
              color: disabled || !message.trim() || isUploading 
                ? (isDarkMode ? '#9ca3af' : '#6b7280') 
                : (isDarkMode ? 'black' : 'white')
            }}
          >
            Send
          </button>
        )}
      </div>

      {/* Selected file preview */}
      {selectedFile && !isUploading && (
        <div className="mt-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📁</span>
            <span className="text-sm theme-text truncate max-w-xs">
              {selectedFile.name}
            </span>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="text-red-500 hover:text-red-700"
            title="Remove file"
          >
            ✕
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && !disabled && !isUploading && (
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