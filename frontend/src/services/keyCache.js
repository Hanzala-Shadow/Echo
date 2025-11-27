/**
 * Key Cache - Pure JavaScript Implementation
 * Works in ANY environment (no WebCrypto dependency)
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
  sessionKey = keyUint8;
  console.log('🔑 Session key set in keyCache:', {
    hasKey: !!sessionKey,
    length: sessionKey?.length
  });
}

// ---------------------------
// User private key functions
// ---------------------------
export async function setUserPrivateKey(keyUint8, persist = false) {
  try {
    // Validate input
    if (!(keyUint8 instanceof Uint8Array)) {
      throw new Error('Invalid key type: must be Uint8Array');
    }

    console.log('💾 Setting user private key:', {
      keyLength: keyUint8.length,
      persist,
      hasSessionKey: !!sessionKey
    });

    // Always set in memory
    userPrivateKeyMemory = keyUint8;

    // Persist to IndexedDB if requested and session key exists
    if (persist && sessionKey) {
      const { iv, ciphertext } = await aesGcmEncryptRaw(sessionKey, keyUint8);
      await setIDB(USER_STORE, {
        id: "currentUser",
        encryptedKey: uint8ToBase64(ciphertext),
        iv: uint8ToBase64(iv),
      });
      console.log('✅ User private key persisted to IndexedDB');
    } else if (persist && !sessionKey) {
      console.warn('⚠️ Cannot persist key: no session key available');
    }

    return true; // ✅ FIXED: Always return true on success
  } catch (error) {
    console.error('❌ Error setting user private key:', error);
    throw error;
  }
}

export async function getUserPrivateKey() {
  // Return from memory if available
  if (userPrivateKeyMemory) {
    console.log('✅ Retrieved user private key from memory');
    return userPrivateKeyMemory;
  }

  // Try to load from IndexedDB if session key exists
  if (!sessionKey) {
    console.warn('⚠️ Cannot retrieve key from IndexedDB: no session key');
    return null;
  }

  try {
    const record = await getIDB(USER_STORE, "currentUser");
    if (!record) {
      console.warn('⚠️ No user private key found in IndexedDB');
      return null;
    }

    const iv = base64ToUint8(record.iv);
    const ciphertext = base64ToUint8(record.encryptedKey);
    const key = await aesGcmDecryptRaw(sessionKey, iv, ciphertext);
    
    // Cache in memory
    userPrivateKeyMemory = key;
    console.log('✅ Retrieved and decrypted user private key from IndexedDB');
    
    return key;
  } catch (error) {
    console.error('❌ Error retrieving user private key:', error);
    return null;
  }
}

export async function clearUserPrivateKey() {
  userPrivateKeyMemory = null;
  await deleteIDB(USER_STORE, "currentUser");
  console.log('🗑️ User private key cleared');
}

// ---------------------------
// Group key functions
// ---------------------------
export async function setGroupKey(groupId, keyUint8, persist = true) {
  try {
    // Validate input
    if (!(keyUint8 instanceof Uint8Array)) {
      throw new Error('Invalid key type: must be Uint8Array');
    }

    console.log('💾 Setting group key:', {
      groupId,
      keyLength: keyUint8.length,
      persist,
      hasSessionKey: !!sessionKey
    });

    // Always set in memory
    groupKeyMemory.set(groupId, keyUint8);

    // Persist to IndexedDB if requested and session key exists
    if (persist && sessionKey) {
      const { iv, ciphertext } = await aesGcmEncryptRaw(sessionKey, keyUint8);
      await setIDB(GROUP_STORE, {
        groupId,
        encryptedKey: uint8ToBase64(ciphertext),
        iv: uint8ToBase64(iv),
      });
      console.log(`✅ Group key for ${groupId} persisted to IndexedDB`);
    } else if (persist && !sessionKey) {
      console.warn(`⚠️ Cannot persist group key ${groupId}: no session key available`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error setting group key ${groupId}:`, error);
    throw error;
  }
}

export async function getGroupKey(groupId) {
  // Return from memory if available
  if (groupKeyMemory.has(groupId)) {
    console.log(`✅ Retrieved group key ${groupId} from memory`);
    return groupKeyMemory.get(groupId);
  }

  // Try to load from IndexedDB if session key exists
  if (!sessionKey) {
    console.warn(`⚠️ Cannot retrieve group key ${groupId} from IndexedDB: no session key`);
    return null;
  }

  try {
    const record = await getIDB(GROUP_STORE, groupId);
    if (!record) {
      console.warn(`⚠️ No group key found in IndexedDB for ${groupId}`);
      return null;
    }

    const iv = base64ToUint8(record.iv);
    const ciphertext = base64ToUint8(record.encryptedKey);
    const key = await aesGcmDecryptRaw(sessionKey, iv, ciphertext);
    
    // Cache in memory
    groupKeyMemory.set(groupId, key);
    console.log(`✅ Retrieved and decrypted group key ${groupId} from IndexedDB`);
    
    return key;
  } catch (error) {
    console.error(`❌ Error retrieving group key ${groupId}:`, error);
    return null;
  }
}

export async function clearGroupKey(groupId) {
  groupKeyMemory.delete(groupId);
  await deleteIDB(GROUP_STORE, groupId);
  console.log(`🗑️ Group key ${groupId} cleared`);
}

export async function clearAllGroupKeys() {
  groupKeyMemory.clear();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GROUP_STORE, "readwrite");
    const store = tx.objectStore(GROUP_STORE);
    const request = store.clear();
    request.onsuccess = () => {
      console.log('🗑️ All group keys cleared');
      resolve(true);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}