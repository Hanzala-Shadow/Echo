import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AuthenticatedImage from './AuthenticatedImage';
import { decryptFile } from '../../utils/cryptoUtils';
import * as keyCache from '../../services/keyCache'; // to get group or user key
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';
import ApiClient from '../../services/api';

const MessageBubble = ({ message, isCurrentUser, isDarkMode, colors, enableAI }) => {
  const { token } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

  const [translatedText, setTranslatedText] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Handle translate
  const handleTranslate = async () => {
      if (translatedText) {
          setTranslatedText(null); // Toggle off
          return;
      }
      
      setIsTranslating(true);
      try {
          // Ensure we have groupId. Prop might need to be passed if not present.
          // Message object usually has groupId.
          console.log("🌐 [MESSAGE_BUBBLE] Requesting translation for message:", message);
          const result = await ApiClient.ai.translate(message.groupId, message.content);
          setTranslatedText(result.translated_text);
      } catch (err) {
          console.error("Translation failed", err);
          alert("Could not translate message");
      } finally {
          setIsTranslating(false);
      }
  };

  const formatFullTimestamp = (timestamp) => {
    const messageTime = new Date(timestamp);
    return messageTime.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Improved file size formatting
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Universal download function for all media types
const downloadMediaWithAuth = async (mediaObj, fileName) => {
  if (!token) {
    console.error('❌ [MESSAGE_BUBBLE] No authentication token found');
    return;
  }

  setIsDownloading(true);

  try {
      const mediaId = mediaObj.media_id || mediaObj.id || mediaObj.mediaId;
  const hostIp = import.meta.env.VITE_HOST_IP || 'localhost';
  const mediaInfoUrl = `http://${hostIp}:8080/media/info/${mediaId}`;
  const mediaUrl = `http://${hostIp}:8080/media/download/${mediaId}`;

  // 🧠 STEP 1: Fetch metadata (includes IV, fileType, etc.)
  const infoResponse = await fetch(mediaInfoUrl, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!infoResponse.ok) {
    throw new Error(`Failed to fetch media info: ${infoResponse.status}`);
  }

  const mediaInfo = await infoResponse.json();
  console.log('ℹ️ [MESSAGE_BUBBLE] Media info fetched:', mediaInfo);

  const iv = mediaInfo.iv;
  const fileType = mediaInfo.fileType || 'application/octet-stream';
  const fileNameResolved = mediaInfo.fileName || fileName || `media_${mediaId}`;

  if (!iv) {
    console.error('❌ [MESSAGE_BUBBLE] IV missing in media info');
    alert('Cannot decrypt file - missing IV in metadata');
    return;
  }

  // 🧠 STEP 2: Fetch the encrypted file
  const response = await fetch(mediaUrl, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const encryptedBlob = await response.blob();
    const encryptedArrayBuffer = await encryptedBlob.arrayBuffer();

    // 2️⃣ Get group key for decryption
    const groupKey = await keyCache.getGroupKey(message.groupId);
    
    if (!groupKey) {
      console.error('❌ [MESSAGE_BUBBLE] No decryption key found for group:', message.groupId);
      alert('Unable to decrypt file - missing encryption key');
      return;
    }

    console.log('🔑 [MESSAGE_BUBBLE] Decrypting file with group key and IV');

    // 3️⃣ Decrypt the file
   const decryptedData = await decryptFile(
  {
    iv: iv,  // from mediaInfo
    ciphertext: new Uint8Array(encryptedArrayBuffer)
  },
  groupKey
);

const decryptedBlob = new Blob([decryptedData], { type: fileType });
const objectUrl = URL.createObjectURL(decryptedBlob);

const link = document.createElement('a');
link.href = objectUrl;
link.download = fileNameResolved;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);

    console.log('✅ [MESSAGE_BUBBLE] Media downloaded and decrypted successfully');
  } catch (error) {
    console.error('❌ [MESSAGE_BUBBLE] Error downloading/decrypting media:', error);
    alert(`Failed to download file: ${error.message}`);
  } finally {
    setIsDownloading(false);
  }
};
  // Function to render media content with consistent display for sender/receiver
  const renderMedia = (media) => {
  console.log('🖼️ [MESSAGE_BUBBLE] Rendering media:', JSON.stringify(media, null, 2));
  
  if (!media) {
    console.log('❌ [MESSAGE_BUBBLE] No media object provided, returning null');
    return null;
  }

  // Handle nested media object from backend
  const mediaObj = media.media || media;

  // Safely extract media properties with multiple fallbacks
  const mediaId = mediaObj.media_id || mediaObj.id || mediaObj.mediaId;
  const fileName = mediaObj.file_name || mediaObj.fileName;
  const fileType = mediaObj.file_type || mediaObj.fileType;
  const fileSize = mediaObj.file_size || mediaObj.fileSize;
  const iv = mediaObj.iv;  // ✅ Extract IV

  console.log('📄 [MESSAGE_BUBBLE] Media properties:', { 
    mediaId, 
    fileName, 
    fileType, 
    fileSize,
    hasIV: !!iv  // ✅ Check if IV exists
  });

  if (!mediaId) {
    console.log('❌ [MESSAGE_BUBBLE] No valid media ID found, returning null');
    return null;
  }

  // ⚠️ Warn if IV is missing
  if (!iv) {
    console.warn('⚠️ [MESSAGE_BUBBLE] No IV found in media object - decryption will fail!');
  }

  const hostIp = import.meta.env.VITE_HOST_IP || 'localhost';
  const mediaUrl = `http://${hostIp}:8080/media/download/${mediaId}`;
  console.log('🌐 [MESSAGE_BUBBLE] Media URL:', mediaUrl);

  // ✅ Pass IV to the decryption hook
 const [resolvedIv, setResolvedIv] = useState(iv);

useEffect(() => {
  const fetchIv = async () => {
    if (iv) return; // already have IV
    try {
      const hostIp = import.meta.env.VITE_HOST_IP || 'localhost';
      const infoUrl = `http://${hostIp}:8080/media/info/${mediaId}`;
      const res = await fetch(infoUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const info = await res.json();
        console.log('🧩 [MESSAGE_BUBBLE] Fetched IV for preview:', info.iv);
        setResolvedIv(info.iv);
      } else {
        console.warn('⚠️ Failed to fetch media info for IV:', res.status);
      }
    } catch (err) {
      console.error('❌ Error fetching IV for inline preview:', err);
    }
  };
  fetchIv();
}, [mediaId, iv, token]);

const { decryptedUrl, loading, error } = useDecryptedMedia(
  mediaUrl,
  resolvedIv,      // ✅ now always defined
  message.groupId
);


  // Download button component for all media types
  const DownloadButton = ({ className = "" }) => (
    <button
      onClick={() => downloadMediaWithAuth(mediaObj, fileName)}
      disabled={isDownloading}
      className={`flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200 text-sm font-medium ${className}`}
    >
      {isDownloading ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Downloading...
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Download
        </>
      )}
    </button>
  );

  // Image files - show inline with decryption
  if (fileType && fileType.startsWith('image/')) {
    console.log('📸 [MESSAGE_BUBBLE] Rendering image file');

    return (
      <div className="mt-2 overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="relative">
          {loading && (
            <div className="max-w-xs max-h-80 bg-gray-200 dark:bg-gray-700 flex items-center justify-center p-8">
              <div className="text-gray-500 dark:text-gray-400">Loading image...</div>
            </div>
          )}
          {error && (
            <div className="max-w-xs max-h-80 bg-red-100 dark:bg-red-900/30 flex items-center justify-center p-8">
              <div className="text-red-600 dark:text-red-400">Failed to load: {error}</div>
            </div>
          )}
          {!loading && !error && decryptedUrl && (
            <>
              <img 
                src={decryptedUrl} 
                alt={fileName}
                className="max-w-xs max-h-80 object-contain cursor-pointer hover:opacity-95 transition-opacity duration-200"
                onClick={() => window.open(decryptedUrl, '_blank')}
              />
              {/* Download overlay button */}
              <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadMediaWithAuth(mediaObj, fileName);
                  }}
                  className="text-white p-1 hover:bg-black/70 rounded transition-colors"
                  title="Download image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="text-white text-sm font-medium truncate">{fileName}</div>
              </div>
            </>
          )}
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {fileType.split('/')[1].toUpperCase()} • {formatFileSize(fileSize)}
          </div>
          <DownloadButton />
        </div>
      </div>
    );
  }

  // Video file rendering
  if (fileType && fileType.startsWith('video/')) {
    console.log('🎥 [MESSAGE_BUBBLE] Rendering video file');

    return (
      <div className="mt-2 overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="relative max-w-xs max-h-80 bg-black flex items-center justify-center">
          {loading && <div className="text-white p-4">Loading video...</div>}
          {error && <div className="text-red-400 p-4">Failed to load video: {error}</div>}
          {!loading && !error && decryptedUrl && (
            <video controls className="max-w-full max-h-80">
              <source src={decryptedUrl} type={fileType} />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {fileType.split('/')[1].toUpperCase()} • {formatFileSize(fileSize)}
          </div>
          <DownloadButton />
        </div>
      </div>
    );
  }

  // Audio file rendering
  if (fileType && fileType.startsWith('audio/')) {
    console.log('🎵 [MESSAGE_BUBBLE] Rendering audio file');

    return (
      <div className="mt-2 overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 bg-gray-100 dark:bg-gray-700 p-4">
        {loading && <div className="text-gray-500 dark:text-gray-400">Loading audio...</div>}
        {error && <div className="text-red-400">Failed to load audio: {error}</div>}
        {!loading && !error && decryptedUrl && (
          <audio controls className="w-full mb-3">
            <source src={decryptedUrl} type={fileType} />
            Your browser does not support the audio element.
          </audio>
        )}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {fileName} • {formatFileSize(fileSize)}
          </div>
          <DownloadButton />
        </div>
      </div>
    );
  }

  // Document files with specialized icons
  const isDocument = fileType && (
    fileType.startsWith('application/') ||
    fileType.startsWith('text/') ||
    fileType.includes('pdf') ||
    fileType.includes('document') ||
    fileType.includes('sheet') ||
    fileType.includes('presentation')
  );

  if (isDocument || (!fileType && fileName)) {
    console.log('📑 [MESSAGE_BUBBLE] Rendering document file');

    // Determine specialized icon and description based on file type
    let icon = '📁';
    let fileTypeDescription = 'File';
    let bgColor = 'bg-gray-100 dark:bg-gray-700';

    if (fileType) {
      if (fileType.includes('pdf')) {
        icon = '📄';
        fileTypeDescription = 'PDF Document';
        bgColor = 'bg-red-100 dark:bg-red-900/50';
      } else if (fileType.includes('word') || fileType.includes('document')) {
        icon = '📝';
        fileTypeDescription = 'Word Document';
        bgColor = 'bg-blue-100 dark:bg-blue-900/50';
      } else if (fileType.includes('excel') || fileType.includes('sheet')) {
        icon = '📊';
        fileTypeDescription = 'Spreadsheet';
        bgColor = 'bg-green-100 dark:bg-green-900/50';
      } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
        icon = '📽️';
        fileTypeDescription = 'Presentation';
        bgColor = 'bg-orange-100 dark:bg-orange-900/50';
      } else if (fileType.startsWith('text/')) {
        icon = '📄';
        fileTypeDescription = 'Text Document';
        bgColor = 'bg-gray-100 dark:bg-gray-700';
      } else if (fileType.includes('zip') || fileType.includes('compressed')) {
        icon = '📦';
        fileTypeDescription = 'Compressed File';
        bgColor = 'bg-yellow-100 dark:bg-yellow-900/50';
      }
    }

    return (
      <div className={`mt-2 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden ${bgColor}`}>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl flex-shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-lg">{fileName || 'Unnamed File'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {fileTypeDescription}
              </div>
              {fileSize && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatFileSize(fileSize)}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="bg-gray-200 dark:bg-gray-600 px-4 py-3 flex justify-end">
          <DownloadButton />
        </div>
      </div>
    );
  }

  // Fallback for any other media type
  console.log('📦 [MESSAGE_BUBBLE] Rendering fallback media file');
  return (
    <div className="mt-2 rounded-xl bg-gray-100 dark:bg-gray-700 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl flex-shrink-0">📁</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate text-lg">{fileName || 'Unnamed File'}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">File</div>
            {fileSize && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatFileSize(fileSize)}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-gray-200 dark:bg-gray-600 px-4 py-3 flex justify-end">
        <DownloadButton />
      </div>
    </div>
  );
};

  // ... rest of your existing functions (isMediaMessage, etc.) remain the same
  const isMediaMessage = (message) => {
    console.log('🔍 [MESSAGE_BUBBLE] Checking if message is media:', {
      hasMediaProperty: !!message.media,
      mediaType: message.media ? typeof message.media : 'none',
      mediaKeys: message.media ? Object.keys(message.media) : []
    });

    if (!message.media) {
      console.log('📝 [MESSAGE_BUBBLE] No media property, treating as text message');

      if (message.content === '' && !message.isCurrentUser) {
        console.log('🔍 [MESSAGE_BUBBLE] Empty message from recipient - might be missing media info');
      }

      return false;
    }

    const mediaObj = message.media.media || message.media;
    const mediaId = mediaObj.media_id || mediaObj.id || mediaObj.mediaId;
    console.log('🆔 [MESSAGE_BUBBLE] Media ID in message:', mediaId);

    const result = mediaId !== null && mediaId !== undefined && mediaId !== '';
    console.log('✅ [MESSAGE_BUBBLE] Is media message:', result);
    return result;
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

  const hasMedia = isMediaMessage(message);
  const hasContent = message.content && message.content.trim() !== '';

  console.log('📊 [MESSAGE_BUBBLE] Message processing:', {
    hasMedia,
    hasContent,
    messageId: message.id,
    sender: message.senderName,
    isCurrentUser: message.isCurrentUser
  });

  if (!hasMedia && !hasContent && !message.isCurrentUser) {
    console.log('⚠️ [MESSAGE_BUBBLE] Empty message from recipient - possible missing media');
    return (
      <div className={`flex mb-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[70%] group">
          {!isCurrentUser && (
            <div className="text-xs theme-text-secondary mb-1 ml-3">
              {message.senderName}
            </div>
          )}
          <div
            className={`px-3 py-2 rounded-lg break-words rounded-tr-none`}
            style={{
              backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
              color: colors.text,
              border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`
            }}
          >
            <div className="flex items-center gap-2">
              <div className="text-xl">⚠️</div>
              <div className="text-sm italic">Media message not loaded</div>
            </div>
            <div className={`flex items-center justify-end gap-1 mt-1 text-xs theme-text-secondary`}>
              <span title={formatFullTimestamp(message.timestamp)}>
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
          </div>
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
          className={`px-3 py-2 rounded-lg break-words ${isCurrentUser
              ? 'rounded-tr-none'
              : 'rounded-tl-none'
            } ${hasMedia ? 'pb-1' : ''}`}
          style={{
            backgroundColor: isCurrentUser
              ? (isDarkMode ? '#ffffff' : '#000000')
              : (isDarkMode ? '#374151' : '#f3f4f6'),
            color: isCurrentUser
              ? (isDarkMode ? '#000000' : '#ffffff')
              : colors.text,
            border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`
          }}
        >
          {hasContent && (
            <div className="whitespace-pre-wrap">
              {message.content}

              {/* ✅ NEW: Translation Result */}
              {translatedText && (
                  <div className="mt-2 pt-2 border-t border-gray-500/30 text-sm italic opacity-90">
                      <span className="text-xs font-bold mr-1">🌐:</span>
                      {translatedText}
                  </div>
              )}
            </div>
          )}

          {hasContent && hasMedia && <div className="my-2 border-t border-gray-300 dark:border-gray-600"></div>}

          {hasMedia && renderMedia(message.media)}

          <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isCurrentUser
              ? (isDarkMode ? 'text-gray-700' : 'text-gray-300')
              : 'theme-text-secondary'
            }`}>

            {/* ✅ NEW: Translate Button (Only if AI on & not me) */}
            {enableAI && !isCurrentUser && hasContent && (
                <button 
                    onClick={handleTranslate}
                    className="mr-2 text-xs opacity-50 hover:opacity-100 transition-opacity"
                    title="Translate message"
                >
                    {isTranslating ? '...' : '🌐'}
                </button>
            )}  

            <span title={formatFullTimestamp(message.timestamp)}>
              {formatTimestamp(message.timestamp)}
            </span>
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