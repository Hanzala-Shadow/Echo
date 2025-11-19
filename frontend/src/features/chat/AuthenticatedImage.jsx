import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { decryptFile } from '../../utils/cryptoUtils';
import * as keyCache from '../../services/keyCache'; 

const AuthenticatedImage = ({ mediaUrl, fileName, alt, onClick, className, groupId, userId }) => {
  const { token } = useAuth();
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !mediaUrl) {
      setLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch encrypted image
        const response = await fetch(mediaUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const encryptedBlob = await response.blob();
        const encryptedBuffer = await encryptedBlob.arrayBuffer();

        // Get decryption key
        const key = keyCache.getMediaKey(groupId || userId);
        if (!key) {
          console.warn('⚠️ No decryption key found, displaying encrypted image as-is');
          const objectUrl = URL.createObjectURL(encryptedBlob);
          setImageUrl(objectUrl);
          return;
        }

        // Decrypt the image
        const decryptedBuffer = await decryptFile(encryptedBuffer, key);
        const decryptedBlob = new Blob([decryptedBuffer], { type: encryptedBlob.type });
        const objectUrl = URL.createObjectURL(decryptedBlob);

        setImageUrl(objectUrl);

      } catch (err) {
        console.error('❌ [AUTHENTICATED_IMAGE] Error loading/decrypting image:', err);
        setError(err.message);
        setImageUrl('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM2NjYiPlVua25vd24gSW1hZ2U8L3RleHQ+PC9zdmc+');
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [mediaUrl, token, groupId, userId]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-gray-700`}>
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-200 dark:bg-gray-700`}>
        <div className="text-red-500 dark:text-red-400">Failed to load image</div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM2NjYiPlVua25vd24gSW1hZ2U8L3RleHQ+PC9zdmc+'}
      alt={alt || fileName}
      className={className}
      onClick={onClick}
      onError={(e) => {
        console.log('💥 [AUTHENTICATED_IMAGE] Image failed to load:', e);
        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM2NjYiPlVua25vd24gSW1hZ2U8L3RleHQ+PC9zdmc+';
      }}
    />
  );
};

export default AuthenticatedImage;
