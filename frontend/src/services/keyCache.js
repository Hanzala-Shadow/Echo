/**
 * Key Cache - Pure JavaScript Implementation
 * Fixed version with proper initialization checks
 */

import { 
  aesGcmEncryptRaw, 
  aesGcmDecryptRaw, 
  uint8ToBase64, 
  base64ToUint8 
} from "../utils/cryptoUtils";

// ---------------------------
// Memory caches
// ---------------------------
let userPrivateKeyMemory = null; // Uint8Array
const groupKeyMemory = new Map(); // groupId -> Uint8Array

// ---------------------------
// IndexedDB setup
// ---------------------------
const DB_NAME = "ChatKeysDB";
const DB_VERSION = 1;
const USER_STORE = "userKeys";
const GROUP_STORE = "groupKeys";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(USER_STORE)) {
        db.createObjectStore(USER_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(GROUP_STORE)) {
        db.createObjectStore(GROUP_STORE, { keyPath: "groupId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ---------------------------
// Helper functions
// ---------------------------
async function setIDB(storeName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getIDB(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function deleteIDB(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).delete(key);
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ---------------------------
// Session key (optional) for encrypting persisted keys
// ---------------------------
let sessionKey = null; // Uint8Array

export async function setSessionKey(keyUint8) {
  console.log('🔑 [keyCache] Setting session key');
  sessionKey = keyUint8;
}

export function getSessionKey() {
  return sessionKey;
}

// ---------------------------
// User private key functions
// ---------------------------
export async function setUserPrivateKey(keyUint8, persist = false) {
  console.log('🔐 [keyCache] Setting user private key', {
    type: keyUint8?.constructor?.name,
    length: keyUint8?.length,
    persist
  });

  // Validate input
  if (!(keyUint8 instanceof Uint8Array)) {
    console.error('❌ [keyCache] Invalid key type passed to setUserPrivateKey');
    throw new Error('Key must be Uint8Array');
  }

  // Store in memory first (always)
  userPrivateKeyMemory = keyUint8;
  console.log('✅ [keyCache] User private key stored in memory');

  // Optionally persist to IndexedDB
  if (persist) {
    if (!sessionKey) {
      console.warn('⚠️ [keyCache] No session key available for persistence, storing unencrypted');
      // Store unencrypted as fallback (you might want to handle this differently)
      await setIDB(USER_STORE, {
        id: "currentUser",
        rawKey: uint8ToBase64(keyUint8), // Store base64 encoded
        encrypted: false
      });
    } else {
      console.log('🔒 [keyCache] Encrypting and persisting user private key');
      const { iv, ciphertext } = await aesGcmEncryptRaw(sessionKey, keyUint8);
      await setIDB(USER_STORE, {
        id: "currentUser",
        encryptedKey: uint8ToBase64(ciphertext),
        iv: uint8ToBase64(iv),
        encrypted: true
      });
    }
    console.log('✅ [keyCache] User private key persisted to IndexedDB');
  }

  // Verify the memory cache
  const verify = userPrivateKeyMemory instanceof Uint8Array;
  console.log('🔍 [keyCache] Memory cache verification:', verify ? 'PASS' : 'FAIL');
  
  return verify;
}

export async function getUserPrivateKey() {
  console.log('🔍 [keyCache] Getting user private key...');
  
  // 1. Check memory cache first (fastest)
  if (userPrivateKeyMemory) {
    console.log('✅ [keyCache] Found in memory cache');
    const isValid = userPrivateKeyMemory instanceof Uint8Array;
    console.log('🔍 [keyCache] Memory key validation:', {
      type: userPrivateKeyMemory.constructor.name,
      length: userPrivateKeyMemory.length,
      isUint8Array: isValid
    });
    return isValid ? userPrivateKeyMemory : null;
  }

  console.log('⏳ [keyCache] Not in memory, checking IndexedDB...');

  // 2. Try to load from IndexedDB
  try {
    const record = await getIDB(USER_STORE, "currentUser");
    
    if (!record) {
      console.log('❌ [keyCache] No key found in IndexedDB');
      return null;
    }

    console.log('📦 [keyCache] Found key record in IndexedDB', {
      encrypted: record.encrypted
    });

    let key;

    // Handle unencrypted stored keys (fallback)
    if (record.encrypted === false && record.rawKey) {
      console.log('🔓 [keyCache] Loading unencrypted key from IndexedDB');
      key = base64ToUint8(record.rawKey);
    }
    // Handle encrypted stored keys (normal case)
    else if (record.encrypted !== false && record.encryptedKey && record.iv) {
      if (!sessionKey) {
        console.warn('⚠️ [keyCache] Session key not available, cannot decrypt');
        return null;
      }
      console.log('🔓 [keyCache] Decrypting key from IndexedDB');
      const iv = base64ToUint8(record.iv);
      const ciphertext = base64ToUint8(record.encryptedKey);
      key = await aesGcmDecryptRaw(sessionKey, iv, ciphertext);
    } else {
      console.error('❌ [keyCache] Invalid key record format');
      return null;
    }

    // Validate and cache
    if (key instanceof Uint8Array) {
      userPrivateKeyMemory = key;
      console.log('✅ [keyCache] Key loaded and cached in memory');
      return key;
    } else {
      console.error('❌ [keyCache] Loaded key is not Uint8Array');
      return null;
    }
  } catch (error) {
    console.error('❌ [keyCache] Error loading key from IndexedDB:', error);
    return null;
  }
}

export async function clearUserPrivateKey() {
  console.log('🧹 [keyCache] Clearing user private key');
  userPrivateKeyMemory = null;
  await deleteIDB(USER_STORE, "currentUser");
}

// ---------------------------
// Group key functions
// ---------------------------
export async function setGroupKey(groupId, keyUint8, persist = true) {
  console.log(`🔐 [keyCache] Setting group key for group ${groupId}`);
  
  if (!(keyUint8 instanceof Uint8Array)) {
    console.error('❌ [keyCache] Invalid key type for group key');
    throw new Error('Group key must be Uint8Array');
  }

  groupKeyMemory.set(groupId, keyUint8);

  if (persist) {
    if (!sessionKey) {
      console.warn('⚠️ [keyCache] No session key, storing group key unencrypted');
      await setIDB(GROUP_STORE, {
        groupId,
        rawKey: uint8ToBase64(keyUint8),
        encrypted: false
      });
    } else {
      const { iv, ciphertext } = await aesGcmEncryptRaw(sessionKey, keyUint8);
      await setIDB(GROUP_STORE, {
        groupId,
        encryptedKey: uint8ToBase64(ciphertext),
        iv: uint8ToBase64(iv),
        encrypted: true
      });
    }
    console.log(`✅ [keyCache] Group key for ${groupId} persisted`);
  }
}

export async function getGroupKey(groupId) {
  console.log(`🔍 [keyCache] Getting group key for group ${groupId}...`);
  
  // Check memory first
  if (groupKeyMemory.has(groupId)) {
    console.log(`✅ [keyCache] Found in memory for group ${groupId}`);
    return groupKeyMemory.get(groupId);
  }

  console.log(`⏳ [keyCache] Not in memory, checking IndexedDB for group ${groupId}...`);

  try {
    const record = await getIDB(GROUP_STORE, groupId);
    if (!record) {
      console.log(`❌ [keyCache] No key found for group ${groupId}`);
      return null;
    }

    let key;

    // Handle unencrypted
    if (record.encrypted === false && record.rawKey) {
      key = base64ToUint8(record.rawKey);
    }
    // Handle encrypted
    else if (record.encrypted !== false && record.encryptedKey && record.iv) {
      if (!sessionKey) {
        console.warn(`⚠️ [keyCache] No session key for group ${groupId}`);
        return null;
      }
      const iv = base64ToUint8(record.iv);
      const ciphertext = base64ToUint8(record.encryptedKey);
      key = await aesGcmDecryptRaw(sessionKey, iv, ciphertext);
    } else {
      console.error(`❌ [keyCache] Invalid record format for group ${groupId}`);
      return null;
    }

    if (key instanceof Uint8Array) {
      groupKeyMemory.set(groupId, key);
      console.log(`✅ [keyCache] Group key loaded for ${groupId}`);
      return key;
    }
  } catch (error) {
    console.error(`❌ [keyCache] Error loading group key for ${groupId}:`, error);
  }

  return null;
}

export async function clearGroupKey(groupId) {
  console.log(`🧹 [keyCache] Clearing group key for ${groupId}`);
  groupKeyMemory.delete(groupId);
  await deleteIDB(GROUP_STORE, groupId);
}

export async function clearAllGroupKeys() {
  console.log('🧹 [keyCache] Clearing all group keys');
  groupKeyMemory.clear();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GROUP_STORE, "readwrite");
    const store = tx.objectStore(GROUP_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}