import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../context/AuthContext';
import ApiClient from '../../services/api';

const MessageInput = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type a message...",
  isDarkMode,
  colors,
  activeGroupId,
  onTyping,
  enableAI,
  lastMessage
}) => {
  const { uploadMedia } = useAuth();
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isCheckingToxicity, setIsCheckingToxicity] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false); // Add this state

  // Handle emoji selection
  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // Handle file selection from file input
  const handleFileInputChange = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const file = files[0];
      console.log('📁 File selected:', file);

      if (!activeGroupId) {
        console.log('❌ No active group ID, cannot select file');
        setError("Please select a conversation before sending files");
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setTimeout(() => {
          alert("Please select a conversation before sending files");
        }, 100);
        return;
      }

      setSelectedFile(file);
    }
  };

  // Handle sending a message (text only, text + media, or media only)
  const handleSend = async (media = null) => {
    const hasText = message.trim() !== "";
    const hasMedia = media !== null || uploadedMedia !== null || selectedFile !== null;
    const mediaToSend = media || uploadedMedia;

    if (!hasText && !hasMedia) {
      return;
    }

    if (enableAI && hasText && !media) { // Only check text toxicity
      setIsCheckingToxicity(true);
      try {
        const toxicityResult = await ApiClient.ai.checkToxicity(activeGroupId, message);

        if (toxicityResult.is_toxic && toxicityResult.action === 'block') {
          setError(`🚫 Message blocked: ${toxicityResult.label} detected.`);
          setIsCheckingToxicity(false);
          return; // STOP sending
        }
      } catch (err) {
        console.warn("Toxicity check failed, allowing message anyway:", err);
        // Optionally block on error or allow
      }
      setIsCheckingToxicity(false);
    }

    if (selectedFile && !mediaToSend) {
      if (!activeGroupId) {
        setError("Please select a conversation before sending files");
        setTimeout(() => {
          alert("Please select a conversation before sending files");
        }, 100);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const uploadResult = await uploadMedia(selectedFile, activeGroupId, (progress) => {
          setUploadProgress(progress);
        });

        let uploadedMediaObj = null;
        if (uploadResult && uploadResult.mediaId) {
          uploadedMediaObj = {
            media_id: uploadResult.mediaId,
            id: uploadResult.mediaId,
            mediaId: uploadResult.mediaId,
            file_name: uploadResult.fileName,
            fileName: uploadResult.fileName,
            file_type: uploadResult.fileType,
            fileType: uploadResult.fileType,
            file_size: uploadResult.fileSize,
            fileSize: uploadResult.fileSize
          };
        } else if (uploadResult && uploadResult.media) {
          uploadedMediaObj = uploadResult.media;
        } else if (uploadResult && (uploadResult.media_id || uploadResult.mediaId)) {
          uploadedMediaObj = {
            media_id: uploadResult.media_id || uploadResult.mediaId,
            id: uploadResult.media_id || uploadResult.mediaId,
            mediaId: uploadResult.media_id || uploadResult.mediaId,
            file_name: uploadResult.file_name || uploadResult.fileName,
            fileName: uploadResult.file_name || uploadResult.fileName,
            file_type: uploadResult.file_type || uploadResult.fileType,
            fileType: uploadResult.file_type || uploadResult.fileType,
            file_size: uploadResult.file_size || uploadResult.fileSize,
            fileSize: uploadResult.file_size || uploadResult.fileSize
          };
        } else {
          setError('Failed to upload file. Please try again.');
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }

        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        await onSendMessage({
          content: hasText ? message.trim() : "",
          media: uploadedMediaObj
        });
      } catch (error) {
        console.error('❌ Error uploading file:', error);
        setError('Failed to upload file. Please try again.');
        setIsUploading(false);
        setUploadProgress(0);
        return;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    } else {
      if (!disabled) {
        try {
          await onSendMessage({
            content: hasText ? message.trim() : "",
            media: mediaToSend
          });

          setMessage("");
          setSelectedFile(null);
          setUploadedMedia(null);
          setShowEmoji(false);
          setError("");

          if (isTyping) {
            setIsTyping(false);
            if (onTyping) {
              onTyping(false);
            }
          }

          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
          }

          textareaRef.current?.focus();
        } catch (error) {
          console.error('Error sending message:', error);
          setError('Failed to send message. Please try again.');
        }
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

    if (onTyping) {
      if (newMessage.trim() && !isTyping) {
        setIsTyping(true);
        onTyping(true);

        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }

        const timeout = setTimeout(() => {
          setIsTyping(false);
          onTyping(false);
        }, 1500);

        setTypingTimeout(timeout);
      } else if (!newMessage.trim() && isTyping) {
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

  const triggerFileInput = (type = null) => {
    if (!activeGroupId) {
      setError("Please select a conversation before sending files");
      setTimeout(() => {
        alert("Please select a conversation before sending files");
      }, 100);
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.accept = '*';
      fileInputRef.current.click();
    }
  };

  const handleGenerateSmartReplies = async () => {
    if (!enableAI || !activeGroupId) return;

    const contextText = lastMessage?.content || "Hello";

    setIsLoadingAi(true);
    setSuggestions([]);

    try {
      console.log("🤖 Generating smart replies for:", contextText);
      // Request 3 suggestions based on "context" (or last message if backend supports it)
      const result = await ApiClient.ai.smartReply(
        activeGroupId,
        contextText, // 👈 Use the variable here
        3
      );
      if (result.suggestions) {
        setSuggestions(result.suggestions);
      }
    } catch (error) {
      console.error("AI Error:", error);
      setError("Failed to generate replies");
    } finally {
      setIsLoadingAi(false);
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
      if (showEmoji) {
        setShowEmoji(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmoji]);

  return (
    <div
      className="p-4 border-t-2 theme-border relative"
      style={{ backgroundColor: colors.surface }}
    >
      {/* Error message display */}
      {error && (
        <div className="mb-2 p-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">
          {error}
        </div>
      )}

      {/* ✅ FIXED: Suggestions Container (Moved ABOVE everything else) */}
      {suggestions.length > 0 && (
        <div className="mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex gap-2">
            {suggestions.map((text, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setMessage(text);
                  setSuggestions([]);
                  textareaRef.current?.focus();
                }}
                className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 hover:from-purple-200 hover:to-blue-200 dark:from-purple-900 dark:to-blue-900 dark:text-purple-200 border border-purple-200 dark:border-purple-700 transition-all shadow-sm hover:shadow-md"
              >
                ✨ {text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" />



      {/* Main Input Row */}
      <div className="flex items-end gap-3">

        {/* Left Actions */}
        <div className="flex items-center gap-1">
          {/* Magic Wand */}
          {enableAI && (
            <button
              onClick={(e) => { e.stopPropagation(); handleGenerateSmartReplies(); }}
              disabled={disabled || isLoadingAi}
              className={`p-2 rounded-lg transition-all ${isLoadingAi ? 'animate-pulse opacity-50' : 'hover:bg-purple-100 dark:hover:bg-purple-900/30'}`}
              style={{ color: colors.textSecondary }}
              title="Generate AI Suggestions"
            >
              ✨
            </button>
          )}

          {/* Attachment */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
                setShowEmoji(false);
              }}
              disabled={disabled || !activeGroupId}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              style={{ color: colors.textSecondary }}
            >
              📎
            </button>
          </div>
        </div>

        {/* Text Input Area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isUploading}
            className={`w-full min-h-[40px] max-h-[120px] resize-none py-2 px-4 pr-16 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
              }`}
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.text
            }}
          />

          <div className="absolute right-2 bottom-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowEmoji(!showEmoji); }}
              disabled={disabled}
              className="p-1 hover:scale-110 transition-transform"
              style={{ color: colors.textSecondary }}
            >
              😊
            </button>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={() => handleSend()}
          disabled={disabled || (!message.trim() && !uploadedMedia && !selectedFile) || isUploading}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${disabled || (!message.trim() && !uploadedMedia && !selectedFile)
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:scale-105 cursor-pointer'
            }`}
          style={{
            background: `linear-gradient(to right, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))`,
            color: '#ffffff'
          }}
        >
          Send
        </button>
      </div>

      {/* File Previews (Below input) */}
      {(selectedFile || uploadedMedia) && (
        <div className="mt-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <span>{uploadedMedia ? '✅' : '📁'}</span>
            <span className="text-sm truncate max-w-xs">
              {selectedFile?.name || uploadedMedia?.fileName}
            </span>
          </div>
          <button onClick={() => { setSelectedFile(null); setUploadedMedia(null); }} className="text-red-500">✕</button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmoji && (
        <div className="absolute bottom-full right-0 mb-2 z-50" onClick={(e) => e.stopPropagation()}>
          <EmojiPicker onEmojiClick={onEmojiClick} theme={isDarkMode ? 'dark' : 'light'} height={400} width={350} />
        </div>
      )}
    </div>
  );
};

export default MessageInput;