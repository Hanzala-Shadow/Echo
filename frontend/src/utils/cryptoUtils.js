/**
 * Pure JavaScript Crypto Implementation
 * Works in ANY environment (HTTP, HTTPS, file://, etc.)
 * Using TweetNaCl's built-in authenticated encryption
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/** =========================
 *  Base64 <-> Uint8Array
 *  ========================= */
export function uint8ToBase64(u8) {
  return encodeBase64(u8);
}

export function base64ToUint8(b64) {
  return decodeBase64(b64);
}

/** =========================
 *  PBKDF2-SHA256 (Pure JS Implementation)
 *  ========================= */

// HMAC-SHA256 implementation
async function hmacSha256(key, data) {
  const blockSize = 64;
  
  // Pad or hash the key if needed
  let keyBytes = key;
  if (keyBytes.length > blockSize) {
    keyBytes = await sha256(keyBytes);
  }
  if (keyBytes.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(keyBytes);
    keyBytes = padded;
  }
  
  // Create inner and outer padding
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = keyBytes[i] ^ 0x36;
    opad[i] = keyBytes[i] ^ 0x5c;
  }
  
  // HMAC = H(opad || H(ipad || message))
  const innerHash = await sha256(concatUint8Arrays([ipad, data]));
  return await sha256(concatUint8Arrays([opad, innerHash]));
}

// SHA-256 using browser's crypto or fallback
async function sha256(data) {
  // Try to use SubtleCrypto for SHA-256 (available even in HTTP for digest)
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    try {
      const hash = await crypto.subtle.digest('SHA-256', data);
      return new Uint8Array(hash);
    } catch (e) {
      // Fall through to pure JS implementation
    }
  }
  
  // Fallback: Use nacl's hash (SHA-512) and truncate to 32 bytes
  const hash = nacl.hash(data);
  return hash.slice(0, 32);
}

export { sha256 };

// PBKDF2 implementation
async function pbkdf2Sha256(password, salt, iterations, keyLength) {
  const passwordBytes = typeof password === 'string' 
    ? new TextEncoder().encode(password) 
    : password;
  
  const dkLen = keyLength;
  const hLen = 32; // SHA-256 output length
  const l = Math.ceil(dkLen / hLen);
  
  const blocks = [];
  
  for (let i = 1; i <= l; i++) {
    // U1 = PRF(password, salt || INT_32_BE(i))
    const blockIndex = new Uint8Array(4);
    blockIndex[0] = (i >>> 24) & 0xff;
    blockIndex[1] = (i >>> 16) & 0xff;
    blockIndex[2] = (i >>> 8) & 0xff;
    blockIndex[3] = i & 0xff;
    
    let u = await hmacSha256(passwordBytes, concatUint8Arrays([salt, blockIndex]));
    let t = new Uint8Array(u);
    
    // U2 through Uc
    for (let j = 1; j < iterations; j++) {
      u = await hmacSha256(passwordBytes, u);
      for (let k = 0; k < hLen; k++) {
        t[k] ^= u[k];
      }
    }
    
    blocks.push(t);
  }
  
  const derived = concatUint8Arrays(blocks);
  return derived.slice(0, dkLen);
}

// Helper: concatenate Uint8Arrays
function concatUint8Arrays(arrays) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/** =========================
 *  X25519 Key Pair & Shared Secret
 *  ========================= */
export async function generateX25519Keypair() {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey
  };
}

export function deriveX25519SharedSecret(secretKeyUint8, peerPublicUint8) {
  return nacl.box.before(peerPublicUint8, secretKeyUint8);
}

/** =========================
 *  HKDF-SHA256 (Simplified)
 *  ========================= */
export async function hkdfSha256(sharedSecret, info = "", length = 32, salt = null) {
  const infoBytes = new TextEncoder().encode(info);
  const saltBytes = salt || new Uint8Array(32);
  
  // Combine shared secret and info
  const combined = new Uint8Array(sharedSecret.length + infoBytes.length);
  combined.set(sharedSecret);
  combined.set(infoBytes, sharedSecret.length);
  
  // Use PBKDF2 with 1 iteration (input is already random)
  const derived = await pbkdf2Sha256(combined, saltBytes, 1, length);
  return derived;
}

/** =========================
 *  Password Key Derivation
 *  ========================= */
export async function deriveKeyFromPassword(password, salt, iterations = 200000) {
  return await pbkdf2Sha256(password, salt, iterations, 32);
}

/** =========================
 *  XSalsa20-Poly1305 Authenticated Encryption
 *  Using TweetNaCl's secretbox (built-in authenticated encryption)
 *  ========================= */

export async function aesGcmEncryptRaw(keyBytes, plaintext, iv = null, additionalData = null) {
  try {
    // Generate random nonce if not provided
    // TweetNaCl secretbox uses 24-byte nonces
    let nonce;
    if (!iv) {
      nonce = nacl.randomBytes(24);
    } else {
      // If 12-byte IV provided, extend it to 24 bytes
      nonce = new Uint8Array(24);
      nonce.set(iv);
    }
    
    // Use TweetNaCl's secretbox (XSalsa20-Poly1305)
    const ciphertext = nacl.secretbox(plaintext, nonce, keyBytes);
    
    if (!ciphertext) {
      throw new Error('Encryption failed');
    }
    
    // Return 12-byte IV for compatibility (we'll store full nonce internally)
    const iv12 = nonce.slice(0, 12);
    
    // Store the full nonce at the beginning of ciphertext for later
    const result = new Uint8Array(nonce.length + ciphertext.length);
    result.set(nonce);
    result.set(ciphertext, nonce.length);
    
    return { 
      iv: iv12, // Return 12 bytes for API compatibility
      ciphertext: result // Contains 24-byte nonce + encrypted data
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

export async function aesGcmDecryptRaw(keyBytes, iv, ciphertext, additionalData = null) {
  try {
    // Extract the 24-byte nonce from the beginning of ciphertext
    if (ciphertext.length < 24) {
      throw new Error('Ciphertext too short');
    }
    
    const nonce = ciphertext.slice(0, 24);
    const actualCiphertext = ciphertext.slice(24);
    
    // Use TweetNaCl's secretbox.open
    const plaintext = nacl.secretbox.open(actualCiphertext, nonce, keyBytes);
    
    if (!plaintext) {
      throw new Error('Authentication verification failed - wrong key or corrupted data');
    }
    
    return new Uint8Array(plaintext);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/** =========================
 *  Encrypt / Decrypt Text Messages
 *  ========================= */
export async function encryptMessage(content, groupKeyBytes) {
  try {
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(content);
    const { iv, ciphertext } = await aesGcmEncryptRaw(groupKeyBytes, plaintext);

    return {
      iv: uint8ToBase64(iv),
      ciphertext: uint8ToBase64(ciphertext)
    };
  } catch (error) {
    console.error('Message encryption failed:', error);
    throw error;
  }
}

export async function decryptMessage(encrypted, groupKeyBytes) {
  try {
    const { iv, ciphertext } = encrypted;
    const plaintextBytes = await aesGcmDecryptRaw(
      groupKeyBytes,
      base64ToUint8(iv),
      base64ToUint8(ciphertext)
    );
    const decoder = new TextDecoder();
    return decoder.decode(plaintextBytes);
  } catch (error) {
    console.error('Message decryption failed:', error);
    throw error;
  }
}

/** =========================
 *  Encrypt / Decrypt Media Files
 *  ========================= */
export async function encryptFile(fileBuffer, groupKeyBytes) {
  try {
    const { iv, ciphertext } = await aesGcmEncryptRaw(
      groupKeyBytes,
      new Uint8Array(fileBuffer)
    );
    return {
      iv: uint8ToBase64(iv),
      ciphertext: uint8ToBase64(ciphertext)
    };
  } catch (error) {
    console.error('File encryption failed:', error);
    throw error;
  }
}

export async function decryptFile(encrypted, groupKeyBytes) {
  try {
    const { iv, ciphertext } = encrypted;
    const decrypted = await aesGcmDecryptRaw(
      groupKeyBytes,
      base64ToUint8(iv),
      base64ToUint8(ciphertext)
    );
    return decrypted.buffer;
  } catch (error) {
    console.error('File decryption failed:', error);
    throw error;
  }
}

/** =========================
 *  Random bytes
 *  ========================= */
export function getRandomBytes(length) {
  return nacl.randomBytes(length);
}

/** =========================
 *  Initialization check
 *  ========================= */
export async function checkCryptoSupport() {
  try {
    const testKey = nacl.randomBytes(32);
    const testData = new Uint8Array([1, 2, 3]);
    const { iv, ciphertext } = await aesGcmEncryptRaw(testKey, testData);
    const decrypted = await aesGcmDecryptRaw(testKey, iv, ciphertext);
    
    return {
      available: true,
      secure: true,
      library: 'tweetnacl (XSalsa20-Poly1305)',
      note: 'Works everywhere - HTTP, HTTPS, localhost'
    };
  } catch (error) {
    return {
      available: false,
      secure: false,
      error: error.message
    };
  }
}