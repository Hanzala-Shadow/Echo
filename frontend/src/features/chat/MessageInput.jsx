import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../context/AuthContext';

const MessageInput = ({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Type a message...",
  isDarkMode,
  colors,
  activeGroupId,
  onTyping
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

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [showRecordingPreview, setShowRecordingPreview] = useState(false);
  const [stream, setStream] = useState(null);
  const recordingIntervalRef = useRef(null);

  // Handle emoji selection
  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // Voice recording functions - FIXED VERSION
  const startRecording = async () => {
    if (!activeGroupId) {
      setError("Please select a conversation before recording voice messages");
      setTimeout(() => {
        alert("Please select a conversation before recording voice messages");
      }, 100);
      return;
    }

    try {
      setError("");
      setAudioChunks([]); // Clear previous chunks
      
      // Get user media with better audio constraints
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1,
        } 
      });
      
      setStream(audioStream);

      // Check available MIME types
      const options = { mimeType: 'audio/webm' };
      
      // Create MediaRecorder with proper configuration
      const recorder = new MediaRecorder(audioStream, options);
      
      console.log('🎤 MediaRecorder created:', {
        state: recorder.state,
        mimeType: recorder.mimeType,
        audioTracks: audioStream.getAudioTracks().length
      });

      // Set up data available handler
      recorder.ondataavailable = (event) => {
        console.log('📊 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          setAudioChunks(prev => {
            const newChunks = [...prev, event.data];
            console.log('📦 Total chunks:', newChunks.length, 'Total size:', newChunks.reduce((acc, chunk) => acc + chunk.size, 0), 'bytes');
            return newChunks;
          });
        }
      };

      recorder.onstop = () => {
        console.log('⏹️ Recording stopped, creating blob...');
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          console.log('🎵 Blob created:', audioBlob.size, 'bytes');
          setAudioBlob(audioBlob);
          setShowRecordingPreview(true);
        } else {
          console.error('❌ No audio chunks collected');
          setError('No audio was recorded. Please try again.');
        }
        
        // Stop all tracks in the stream
        if (audioStream) {
          audioStream.getTracks().forEach(track => {
            console.log('🔇 Stopping track:', track.kind, track.label);
            track.stop();
          });
        }
      };

      recorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        setError('Recording error: ' + event.error);
      };

      // Start recording with timeslice to ensure data collection
      recorder.start(1000); // Collect data every second
      console.log('🎙️ Recording started with timeslice');
      
      setMediaRecorder(recorder);
      setRecordingTime(0);
      setIsRecording(true);
      setShowRecordingPreview(false);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          console.log('⏰ Recording time:', prev + 1, 'seconds');
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setError('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    console.log('🛑 Stopping recording...');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      console.log('✅ Recording stopped, waiting for onstop event');
    } else {
      console.warn('⚠️ MediaRecorder not in recording state:', mediaRecorder?.state);
    }
  };

  const cancelRecording = () => {
    console.log('❌ Canceling recording...');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    setIsRecording(false);
    setShowRecordingPreview(false);
    setAudioBlob(null);
    setAudioChunks([]);
    setRecordingTime(0);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    // Stop all tracks if stream exists
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('🔇 Stopping track on cancel:', track.kind);
        track.stop();
      });
      setStream(null);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !activeGroupId) {
      console.error('❌ Cannot send: no audio blob or active group');
      return;
    }

    console.log('📤 Sending voice message, blob size:', audioBlob.size);

    if (audioBlob.size === 0) {
      setError('Recorded audio is empty. Please try recording again.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create a file from the audio blob
      const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
        type: 'audio/webm'
      });

      console.log('🎤 Uploading voice message:', {
        size: audioFile.size,
        type: audioFile.type
      });

      const uploadResult = await uploadMedia(audioFile, activeGroupId, (progress) => {
        console.log('📊 Voice upload progress:', progress + '%');
        setUploadProgress(progress);
      });

      console.log('✅ Voice upload result:', uploadResult);

      let uploadedMediaObj = null;
      if (uploadResult && uploadResult.mediaId) {
        uploadedMediaObj = {
          media_id: uploadResult.mediaId,
          id: uploadResult.mediaId,
          mediaId: uploadResult.mediaId,
          file_name: uploadResult.fileName || 'Voice message',
          fileName: uploadResult.fileName || 'Voice message',
          file_type: uploadResult.fileType || 'audio/webm',
          fileType: uploadResult.fileType || 'audio/webm',
          file_size: uploadResult.fileSize,
          fileSize: uploadResult.fileSize
        };
      } else if (uploadResult && uploadResult.media) {
        uploadedMediaObj = uploadResult.media;
      }

      if (uploadedMediaObj) {
        // Send the voice message
        await onSendMessage({
          content: "🎤 Voice message",
          media: uploadedMediaObj
        });

        console.log('✅ Voice message sent successfully');

        // Reset recording states
        setShowRecordingPreview(false);
        setAudioBlob(null);
        setAudioChunks([]);
        setRecordingTime(0);
        setStream(null);
        setError("");
      } else {
        throw new Error('Invalid upload response');
      }

    } catch (error) {
      console.error('❌ Error uploading voice message:', error);
      setError('Failed to send voice message. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Format recording time (MM:SS)
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ... (rest of your existing functions: handleFileInputChange, handleFileSelect, handleSend, etc.)

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

  // Focus the input when it becomes enabled
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Clean up recording interval and media tracks
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Voice Recording Interface */}
      {isRecording && (
        <div className="mb-3 p-4 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-red-700 dark:text-red-300">
                Recording... {formatRecordingTime(recordingTime)}
              </span>
              <span className="text-xs text-red-600 dark:text-red-400">
                {audioChunks.length} chunks
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Voice Recording Preview */}
      {showRecordingPreview && audioBlob && (
        <div className="mb-3 p-4 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎤</span>
              <div>
                <div className="font-medium theme-text">Voice Message</div>
                <div className="text-sm theme-text-secondary">
                  Duration: {formatRecordingTime(recordingTime)} • Size: {(audioBlob.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <audio controls className="h-8">
                <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                Your browser does not support the audio element.
              </audio>
              <button
                onClick={cancelRecording}
                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                title="Cancel"
              >
                ✕
              </button>
              <button
                onClick={sendVoiceMessage}
                disabled={isUploading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isUploading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isUploading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
          {isUploading && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="text-xs theme-text">{uploadProgress}%</span>
            </div>
          )}
        </div>
      )}

      {/* Rest of your JSX remains the same */}
      <div className="flex items-end gap-3">
        {/* Left side - Attachment and Voice buttons */}
        <div className="flex items-center gap-1">
          {/* Voice Recording Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
                setShowEmoji(false);
              }}
              disabled={disabled || !activeGroupId || isRecording || showRecordingPreview}
              className={`p-2 rounded-lg transition-all ${
                (disabled || !activeGroupId || isRecording || showRecordingPreview) 
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'hover:scale-110 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600'
              } ${isRecording ? 'bg-red-100 dark:bg-red-900' : ''}`}
              style={{ color: isRecording ? '#ef4444' : colors.textSecondary }}
              title={!activeGroupId ? "Select a conversation first" : isRecording ? "Stop recording" : "Record voice message"}
            >
              🎤
            </button>
          </div>

          {/* File Attachment Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
                setShowEmoji(false);
              }}
              disabled={disabled || !activeGroupId || isRecording || showRecordingPreview}
              className={`p-2 rounded-lg transition-all ${
                (disabled || !activeGroupId || isRecording || showRecordingPreview) 
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'hover:scale-110 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              style={{ color: colors.textSecondary }}
              title={!activeGroupId ? "Select a conversation first" : "Attach files"}
            >
              📎
            </button>
          </div>
        </div>

        {/* Message textarea and send button - same as before */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isUploading || isRecording || showRecordingPreview}
            className={`w-full min-h-[40px] max-h-[120px] resize-none py-2 px-4 pr-16 rounded-lg border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              disabled || isUploading || isRecording || showRecordingPreview ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
            }`}
            style={{ 
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.text
            }}
          />
          
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEmoji(!showEmoji);
              }}
              disabled={disabled || isUploading || isRecording || showRecordingPreview}
              className={`p-1 rounded transition-all ${
                disabled || isUploading || isRecording || showRecordingPreview ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'
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
                onClick={() => handleSend()}
                disabled={isUploading || isRecording || showRecordingPreview}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-white text-black hover:bg-gray-200' 
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                Send
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => handleSend()}
            disabled={disabled || (!message.trim() && !uploadedMedia && !selectedFile) || isUploading || isRecording || showRecordingPreview}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              disabled || (!message.trim() && !uploadedMedia && !selectedFile) || isUploading || isRecording || showRecordingPreview
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:scale-105 cursor-pointer'
            }`}
            style={{
              backgroundColor: disabled || (!message.trim() && !uploadedMedia && !selectedFile) || isUploading || isRecording || showRecordingPreview 
                ? (isDarkMode ? '#374151' : '#d1d5db') 
                : (isDarkMode ? 'white' : 'black'),
              color: disabled || (!message.trim() && !uploadedMedia && !selectedFile) || isUploading || isRecording || showRecordingPreview 
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

      {/* Uploaded media preview */}
      {uploadedMedia && (
        <div className="mt-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span className="text-sm theme-text truncate max-w-xs">
              {uploadedMedia.fileName || uploadedMedia.file_name}
            </span>
          </div>
          <button
            onClick={() => setUploadedMedia(null)}
            className="text-red-500 hover:text-red-700"
            title="Remove media"
          >
            ✕
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && !disabled && !isUploading && !isRecording && !showRecordingPreview && (
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