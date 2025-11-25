/**
 * Key Manager - Pure JavaScript Implementation
 * Fixed to always return Uint8Array
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
    console.log('🔑 Generating X25519 keypair...');
    const { publicKey, secretKey } = await generateX25519Keypair();
    
    console.log('🔑 Generated keys:', {
      publicKeyType: publicKey.constructor.name,
      publicKeyLength: publicKey.length,
      secretKeyType: secretKey.constructor.name,
      secretKeyLength: secretKey.length
    });
    
    console.log('🧂 Generating salt...');
    const salt = getRandomBytes(16);
    
    console.log('🔐 Deriving wrapping key from password...');
    const wrappingKey = await deriveKeyFromPassword(password, salt, 200000);
    
    console.log('🔒 Encrypting private key...');
    const { iv, ciphertext } = await aesGcmEncryptRaw(wrappingKey, secretKey);

    const ivB64 = uint8ToBase64(iv);
    const ctB64 = uint8ToBase64(ciphertext);

    const payload = {
      publicKeyBase64: uint8ToBase64(publicKey),
      encryptedPrivateKey: `${ivB64}:${ctB64}`,
      saltBase64: uint8ToBase64(salt),
      pbkdf2Iterations: 200000,
    };

    if (returnSecret) {
      payload.secretKeyUint8 = secretKey;
    }
    
    console.log('✅ Key generation complete');
    return payload;
  } catch (error) {
    console.error('❌ Key generation failed:', error);
    throw new Error(`Key generation failed: ${error.message}`);
  }
}

/** 
 * Recover unwrapped private key from password and stored ciphertext 
 * CRITICAL: Always returns Uint8Array
 */
export async function recoverUserPrivateKeyFromPassword(password, wrapped, saltBase64) {
  try {
    console.log('🔓 Starting key recovery...');
    console.log('📋 Input validation:', {
      hasPassword: !!password,
      hasWrapped: !!wrapped,
      hasSalt: !!saltBase64,
      wrappedFormat: wrapped?.includes(':') ? 'valid' : 'invalid'
    });

    // Validate input format
    if (!wrapped || !wrapped.includes(":")) {
      throw new Error("Invalid encrypted key format - expected 'iv:ciphertext'");
    }

    // Parse the encrypted key
    const [ivB64, ctB64] = wrapped.split(":");
    console.log('📦 Parsing encrypted components...');
    
    const iv = base64ToUint8(ivB64);
    const ct = base64ToUint8(ctB64);
    const salt = base64ToUint8(saltBase64);

    console.log('📋 Parsed components:', {
      ivLength: iv.length,
      ctLength: ct.length,
      saltLength: salt.length
    });

    // Derive the wrapping key from password
    console.log('🔐 Deriving wrapping key...');
    const wrappingKey = await deriveKeyFromPassword(password, salt, 200000);

    // Decrypt the private key
    console.log('🔓 Decrypting private key...');
    const decryptedKey = await aesGcmDecryptRaw(wrappingKey, iv, ct);

    // CRITICAL: Ensure we return Uint8Array
    if (!(decryptedKey instanceof Uint8Array)) {
      console.error('❌ Decrypted key is not Uint8Array!', {
        type: typeof decryptedKey,
        constructor: decryptedKey?.constructor?.name
      });
      
      // Try to convert if possible
      if (decryptedKey instanceof ArrayBuffer) {
        console.log('🔄 Converting ArrayBuffer to Uint8Array');
        const converted = new Uint8Array(decryptedKey);
        console.log('✅ Conversion successful:', {
          type: converted.constructor.name,
          length: converted.length
        });
        return converted;
      } else if (typeof decryptedKey === 'string') {
        console.log('🔄 Converting base64 string to Uint8Array');
        const converted = base64ToUint8(decryptedKey);
        console.log('✅ Conversion successful:', {
          type: converted.constructor.name,
          length: converted.length
        });
        return converted;
      } else {
        throw new Error(`Decrypted key is ${typeof decryptedKey}, expected Uint8Array`);
      }
    }

    console.log('✅ Key recovery successful:', {
      type: decryptedKey.constructor.name,
      length: decryptedKey.length
    });

    return decryptedKey;
  } catch (error) {
    console.error('❌ Key recovery failed:', error);
    console.error('Stack trace:', error.stack);
    throw new Error(`Key recovery failed: ${error.message}`);
  }
}