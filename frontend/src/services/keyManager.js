/**
 * Key Manager - Pure JavaScript Implementation
 * Works in ANY environment (no WebCrypto, no Node.js dependencies)
 */

import { 
  generateX25519Keypair, 
  uint8ToBase64, 
  base64ToUint8, 
  aesGcmEncryptRaw, 
  aesGcmDecryptRaw,
  getRandomBytes,
  deriveKeyFromPassword
} from "../utils/cryptoUtils";

/** 
 * Generate user X25519 keypair and wrap private key with password 
 */
export async function generateAndPasswordWrapUserKey(password, { returnSecret = false } = {}) {
  try {
    const { publicKey, secretKey } = await generateX25519Keypair();
    const salt = getRandomBytes(16);
    const wrappingKey = await deriveKeyFromPassword(password, salt, 200000);
    const { iv, ciphertext } = await aesGcmEncryptRaw(wrappingKey, secretKey);

    const ivB64 = uint8ToBase64(iv);
    const ctB64 = uint8ToBase64(ciphertext);

    const payload = {
      publicKeyBase64: uint8ToBase64(publicKey),
      encryptedPrivateKey: `${ivB64}:${ctB64}`,
      saltBase64: uint8ToBase64(salt),
      pbkdf2Iterations: 200000,
    };

    if (returnSecret) payload.secretKeyUint8 = secretKey;
    return payload;
  } catch (error) {
    console.error('Key generation failed:', error);
    throw new Error(`Key generation failed: ${error.message}`);
  }
}

/** 
 * Recover unwrapped private key from password and stored ciphertext 
 */
export async function recoverUserPrivateKeyFromPassword(password, wrapped, saltBase64) {
  try {
    if (!wrapped.includes(":")) throw new Error("Invalid encrypted key format");
    const [ivB64, ctB64] = wrapped.split(":");
    const iv = base64ToUint8(ivB64);
    const ct = base64ToUint8(ctB64);
    const salt = base64ToUint8(saltBase64);

    const wrappingKey = await deriveKeyFromPassword(password, salt, 200000);
    return await aesGcmDecryptRaw(wrappingKey, iv, ct);
  } catch (error) {
    console.error('Key recovery failed:', error);
    throw new Error(`Key recovery failed: ${error.message}`);
  }
}