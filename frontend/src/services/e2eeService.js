/**
 * E2EE Service - Pure JavaScript Implementation
 * Works in ANY environment (no WebCrypto dependency)
 */

import { 
  uint8ToBase64, 
  base64ToUint8, 
  aesGcmEncryptRaw, 
  aesGcmDecryptRaw 
} from "../utils/cryptoUtils";

/** 
 * Encrypt a plaintext string 
 */
export async function encryptMessageWithGroupKey(groupKeyUint8, plaintext) {
  try {
    const pt = new TextEncoder().encode(plaintext);
    const { iv, ciphertext } = await aesGcmEncryptRaw(groupKeyUint8, pt);
    const out = new Uint8Array(iv.length + ciphertext.length);
    out.set(iv);
    out.set(ciphertext, iv.length);
    return uint8ToBase64(out);
  } catch (error) {
    console.error('Message encryption failed:', error);
    throw error;
  }
}

/** 
 * Decrypt a base64 message blob 
 */
export async function decryptMessageWithGroupKey(groupKeyUint8, contentBase64) {
  try {
    const blob = base64ToUint8(contentBase64);
    const iv = blob.slice(0, 12);
    const ct = blob.slice(12);
    const pt = await aesGcmDecryptRaw(groupKeyUint8, iv, ct);
    return new TextDecoder().decode(pt);
  } catch (error) {
    console.error('Message decryption failed:', error);
    throw error;
  }
}

/** 
 * Encrypt a file (single-chunk) 
 */
export async function encryptFileWithGroupKey(groupKeyUint8, file) {
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const { iv, ciphertext } = await aesGcmEncryptRaw(groupKeyUint8, data);
    return new Blob([iv, ciphertext], { type: "application/octet-stream" });
  } catch (error) {
    console.error('File encryption failed:', error);
    throw error;
  }
}

/** 
 * Decrypt a file blob 
 */
export async function decryptFileWithGroupKey(groupKeyUint8, encryptedArrayBuffer) {
  try {
    const data = new Uint8Array(encryptedArrayBuffer);
    const iv = data.slice(0, 12);
    const ct = data.slice(12);
    const plain = await aesGcmDecryptRaw(groupKeyUint8, iv, ct);
    return new Blob([plain]);
  } catch (error) {
    console.error('File decryption failed:', error);
    throw error;
  }
}