import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { decryptFile } from '../utils/cryptoUtils';
import * as keyCache from '../services/keyCache';

export const useDecryptedMedia = (mediaUrl, groupId, userId) => {
  const { token } = useAuth();
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !mediaUrl) return;

    const fetchAndDecrypt = async () => {
      try {
        setLoading(true);
        const response = await fetch(mediaUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const encryptedBuffer = await response.arrayBuffer();
        const key = keyCache.getMediaKey(groupId || userId);

        let finalBuffer = encryptedBuffer;
        if (key) {
          finalBuffer = await decryptFile(encryptedBuffer, key);
        }

        const blob = new Blob([finalBuffer], { type: response.headers.get('Content-Type') });
        setDecryptedUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error('❌ [useDecryptedMedia] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAndDecrypt();

    return () => {
      if (decryptedUrl) URL.revokeObjectURL(decryptedUrl);
    };
  }, [mediaUrl, token, groupId, userId]);

  return { decryptedUrl, loading, error };
};
