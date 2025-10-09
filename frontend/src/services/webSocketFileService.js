import { v4 as uuidv4 } from 'uuid';

class WebSocketFileService {
  constructor() {
    this.chunkSize = 16384; // 16KB chunks
    this.pendingUploads = new Map();
  }

  /**
   * Send a file through WebSocket
   * @param {File} file - The file to send
   * @param {number} groupId - The group ID to send the file to
   * @param {Function} onProgress - Progress callback (0-100)
   * @param {Object} webSocketService - The WebSocket service instance
   */
  async sendFile(file, groupId, onProgress, webSocketService) {
    if (!file || !groupId) {
      throw new Error('Invalid file or group ID');
    }

    const uploadId = uuidv4();
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    
    console.log(`📤 Starting file upload: ${file.name} (${file.size} bytes) in ${totalChunks} chunks`);

    // Create upload tracking
    this.pendingUploads.set(uploadId, {
      file,
      groupId,
      totalChunks,
      uploadedChunks: 0,
      uploadId
    });

    // Send file metadata first
    const metadataMessage = {
      type: 'file_start',
      uploadId,
      groupId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks
    };

    const metadataSent = webSocketService.sendWebSocketMessage(metadataMessage);
    
    if (!metadataSent) {
      this.pendingUploads.delete(uploadId);
      throw new Error('Failed to send file metadata');
    }

    // Read file and send in chunks
    const arrayBuffer = await file.arrayBuffer();
    let offset = 0;
    let chunkIndex = 0;

    while (offset < file.size) {
      const chunk = arrayBuffer.slice(offset, offset + this.chunkSize);
      const chunkMessage = {
        type: 'file_chunk',
        uploadId,
        groupId,
        chunkIndex,
        totalChunks,
        chunk: Array.from(new Uint8Array(chunk))
      };

      const chunkSent = webSocketService.sendWebSocketMessage(chunkMessage);
      
      if (!chunkSent) {
        this.pendingUploads.delete(uploadId);
        throw new Error(`Failed to send chunk ${chunkIndex}`);
      }

      chunkIndex++;
      offset += this.chunkSize;
      
      // Update progress
      const progress = Math.round((chunkIndex / totalChunks) * 100);
      if (onProgress) {
        onProgress(progress);
      }

      // Add small delay to prevent overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Send completion message
    const completionMessage = {
      type: 'file_end',
      uploadId,
      groupId,
      fileName: file.name,
      fileSize: file.size
    };

    const completionSent = webSocketService.sendWebSocketMessage(completionMessage);
    
    if (!completionSent) {
      this.pendingUploads.delete(uploadId);
      throw new Error('Failed to send file completion message');
    }

    this.pendingUploads.delete(uploadId);
    console.log(`✅ File upload completed: ${file.name}`);
    
    return {
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      groupId
    };
  }

  /**
   * Handle incoming file metadata
   * @param {Object} data - File metadata from WebSocket
   * @param {Function} onFileStart - Callback when file transfer starts
   */
  handleFileStart(data, onFileStart) {
    const { uploadId, fileName, fileSize, fileType, totalChunks } = data;
    
    console.log(`📥 Receiving file: ${fileName} (${fileSize} bytes)`);

    // Store file info for chunk assembly
    this.pendingUploads.set(uploadId, {
      uploadId,
      fileName,
      fileSize,
      fileType,
      totalChunks,
      receivedChunks: 0,
      chunks: new Array(totalChunks),
      startTime: Date.now()
    });

    if (onFileStart) {
      onFileStart({
        uploadId,
        fileName,
        fileSize,
        fileType,
        totalChunks
      });
    }
  }

  /**
   * Handle incoming file chunk
   * @param {Object} data - File chunk data from WebSocket
   * @param {Function} onProgress - Progress callback
   */
  handleFileChunk(data, onProgress) {
    const { uploadId, chunkIndex, totalChunks, chunk } = data;
    
    if (!this.pendingUploads.has(uploadId)) {
      console.warn(`⚠️ Received chunk for unknown upload: ${uploadId}`);
      return;
    }

    const fileInfo = this.pendingUploads.get(uploadId);
    
    // Store chunk
    fileInfo.chunks[chunkIndex] = new Uint8Array(chunk);
    fileInfo.receivedChunks++;
    
    // Update progress
    const progress = Math.round((fileInfo.receivedChunks / totalChunks) * 100);
    
    if (onProgress) {
      onProgress({
        uploadId,
        fileName: fileInfo.fileName,
        progress,
        receivedChunks: fileInfo.receivedChunks,
        totalChunks
      });
    }

    console.log(`📥 Received chunk ${chunkIndex + 1}/${totalChunks} for ${fileInfo.fileName} (${progress}%)`);
  }

  /**
   * Handle file transfer completion
   * @param {Object} data - Completion data from WebSocket
   * @param {Function} onFileComplete - Callback when file transfer completes
   */
  handleFileEnd(data, onFileComplete) {
    const { uploadId, fileName, fileSize } = data;
    
    if (!this.pendingUploads.has(uploadId)) {
      console.warn(`⚠️ Received completion for unknown upload: ${uploadId}`);
      return;
    }

    const fileInfo = this.pendingUploads.get(uploadId);
    
    // Reassemble file
    const totalBytes = fileInfo.chunks.reduce((acc, chunk) => acc + (chunk ? chunk.length : 0), 0);
    const fileBuffer = new Uint8Array(totalBytes);
    
    let offset = 0;
    for (const chunk of fileInfo.chunks) {
      if (chunk) {
        fileBuffer.set(chunk, offset);
        offset += chunk.length;
      }
    }
    
    // Create Blob from buffer
    const blob = new Blob([fileBuffer], { type: fileInfo.fileType });
    const file = new File([blob], fileInfo.fileName, { type: fileInfo.fileType });
    
    // Calculate transfer time
    const transferTime = Date.now() - fileInfo.startTime;
    const transferSpeed = (fileInfo.fileSize / 1024 / 1024) / (transferTime / 1000); // MB/s
    
    console.log(`✅ File received: ${fileName} (${fileSize} bytes) in ${transferTime}ms (${transferSpeed.toFixed(2)} MB/s)`);

    // Clean up
    this.pendingUploads.delete(uploadId);
    
    if (onFileComplete) {
      onFileComplete({
        uploadId,
        fileName,
        fileSize,
        file,
        transferTime,
        transferSpeed
      });
    }
  }

  /**
   * Cancel an ongoing upload
   * @param {string} uploadId - The upload ID to cancel
   * @param {Object} webSocketService - The WebSocket service instance
   */
  cancelUpload(uploadId, webSocketService) {
    if (this.pendingUploads.has(uploadId)) {
      const cancelMessage = {
        type: 'file_cancel',
        uploadId
      };
      
      webSocketService.sendWebSocketMessage(cancelMessage);
      this.pendingUploads.delete(uploadId);
      console.log(`⏹️ Upload cancelled: ${uploadId}`);
    }
  }

  /**
   * Get upload status
   * @param {string} uploadId - The upload ID to check
   * @returns {Object|null} Upload status or null if not found
   */
  getUploadStatus(uploadId) {
    if (this.pendingUploads.has(uploadId)) {
      const fileInfo = this.pendingUploads.get(uploadId);
      return {
        uploadId,
        fileName: fileInfo.fileName,
        fileSize: fileInfo.fileSize,
        progress: fileInfo.totalChunks 
          ? Math.round((fileInfo.uploadedChunks || fileInfo.receivedChunks || 0) / fileInfo.totalChunks * 100)
          : 0,
        isUpload: !!fileInfo.uploadedChunks,
        isDownload: !!fileInfo.receivedChunks
      };
    }
    return null;
  }
}

// Create and export singleton instance
const webSocketFileService = new WebSocketFileService();

export default webSocketFileService;