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
}

// ---------------------------
// User private key functions
// ---------------------------
export async function setUserPrivateKey(keyUint8, persist = false) {
  userPrivateKeyMemory = keyUint8;

  if (persist && sessionKey) {
    const { iv, ciphertext } = await aesGcmEncryptRaw(sessionKey, keyUint8);
    await setIDB(USER_STORE, {
      id: "currentUser",
      encryptedKey: uint8ToBase64(ciphertext),
      iv: uint8ToBase64(iv),
    });
  }
}

export async function getUserPrivateKey() {
  if (userPrivateKeyMemory) return userPrivateKeyMemory;

  if (!sessionKey) return null;

  const record = await getIDB(USER_STORE, "currentUser");
  if (!record) return null;

  const iv = base64ToUint8(record.iv);
  const ciphertext = base64ToUint8(record.encryptedKey);
  const key = await aesGcmDecryptRaw(sessionKey, iv, ciphertext);
  userPrivateKeyMemory = key;
  return key;
}

export async function clearUserPrivateKey() {
  userPrivateKeyMemory = null;
  await deleteIDB(USER_STORE, "currentUser");
}

// ---------------------------
// Group key functions
// ---------------------------
export async function setGroupKey(groupId, keyUint8, persist = true) {
  groupKeyMemory.set(groupId, keyUint8);

  if (persist && sessionKey) {
    const { iv, ciphertext } = await aesGcmEncryptRaw(sessionKey, keyUint8);
    await setIDB(GROUP_STORE, {
      groupId,
      encryptedKey: uint8ToBase64(ciphertext),
      iv: uint8ToBase64(iv),
    });
  }
}

export async function getGroupKey(groupId) {
  if (groupKeyMemory.has(groupId)) return groupKeyMemory.get(groupId);

  if (!sessionKey) return null;

  const record = await getIDB(GROUP_STORE, groupId);
  if (!record) return null;

  const iv = base64ToUint8(record.iv);
  const ciphertext = base64ToUint8(record.encryptedKey);
  const key = await aesGcmDecryptRaw(sessionKey, iv, ciphertext);
  groupKeyMemory.set(groupId, key);
  return key;
}

export async function clearGroupKey(groupId) {
  groupKeyMemory.delete(groupId);
  await deleteIDB(GROUP_STORE, groupId);
}

export async function clearAllGroupKeys() {
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