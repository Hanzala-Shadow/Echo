import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { decryptFile } from '../utils/cryptoUtils';
import * as keyCache from '../services/keyCache';

export const useDecryptedMedia = (mediaUrl, mediaIv, groupId) => {
  const { token } = useAuth();
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Early return if required data is missing
    if (!token || !mediaUrl || !mediaIv || !groupId) {
      setLoading(false);
      return;
    }

    let objectUrl = null;

    const fetchAndDecrypt = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 [useDecryptedMedia] Fetching and decrypting media:', {
          mediaUrl,
          hasIV: !!mediaIv,
          groupId
        });

        // 1️⃣ Fetch encrypted file
        const response = await fetch(mediaUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const encryptedBlob = await response.blob();
        const encryptedBuffer = await encryptedBlob.arrayBuffer();

        // 2️⃣ Get group key
        const groupKey = await keyCache.getGroupKey(groupId);
        
        if (!groupKey) {
          console.error('❌ [useDecryptedMedia] No group key found for groupId:', groupId);
          throw new Error('Decryption key not found');
        }

        console.log('🔑 [useDecryptedMedia] Decrypting with group key and IV');

        // 3️⃣ Decrypt the file using stored IV
        const decryptedBuffer = await decryptFile(
          {
            iv: mediaIv,  // ✅ Use provided IV
            ciphertext: new Uint8Array(encryptedBuffer)
          },
          groupKey
        );

        // 4️⃣ Create blob and object URL
        const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
        const blob = new Blob([decryptedBuffer], { type: contentType });
        objectUrl = URL.createObjectURL(blob);
        
        setDecryptedUrl(objectUrl);
        console.log('✅ [useDecryptedMedia] Media decrypted successfully');

      } catch (err) {
        console.error('❌ [useDecryptedMedia] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAndDecrypt();

    // Cleanup: revoke object URL when component unmounts or dependencies change
    return () => {
      if (objectUrl) {
        console.log('🧹 [useDecryptedMedia] Cleaning up object URL');
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [mediaUrl, mediaIv, groupId, token]);

  return { decryptedUrl, loading, error };
};