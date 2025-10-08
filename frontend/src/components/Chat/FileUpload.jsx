import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const FileUpload = ({ onFileSelect, groupId, isDarkMode, colors }) => {
  const { sendFile, sendFileChunk, sendFileEnd } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !groupId) {
      console.error('No file selected or group ID missing');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Send file through WebSocket
      await sendFile(selectedFile, groupId, (progress) => {
        setUploadProgress(progress);
      });
      
      console.log('File uploaded successfully');
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
      
      <button
        onClick={triggerFileSelect}
        disabled={isUploading}
        className={`p-2 rounded-full ${
          isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
        } transition-opacity`}
        style={{ 
          backgroundColor: colors.surface,
          color: colors.text
        }}
        title="Upload file"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {selectedFile && (
        <div className="flex items-center space-x-2">
          <div className="text-sm theme-text truncate max-w-xs">
            {selectedFile.name}
          </div>
          
          {isUploading ? (
            <div className="flex items-center space-x-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
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
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
            >
              Send
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;