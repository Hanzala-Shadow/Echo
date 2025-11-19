/**
 * Group Key Service - Pure JavaScript Implementation
 * Works in ANY environment (no WebCrypto dependency)
 */
import api from './api';

import {
  generateX25519Keypair,
  deriveX25519SharedSecret,
  hkdfSha256,
  uint8ToBase64,
  base64ToUint8,
  aesGcmEncryptRaw,
  aesGcmDecryptRaw,
  getRandomBytes
} from "../utils/cryptoUtils";


/** 
 * Create new group symmetric key and wrap it for each member 
 */
export async function createAndDistributeGroupKey(groupId, memberIds, getUserPublicKeyById) {
  try {
    const groupKey = getRandomBytes(32); // Pure JS random
    const { publicKey: ephPub, secretKey: ephPriv } = await generateX25519Keypair();

    // Publish ephemeral public
    await api.post("/api/keys/group-public", { 
      groupId, 
      groupPublicKey: uint8ToBase64(ephPub) 
    });

    for (const userId of memberIds) {
      try {
        let pubBase64;
        if (getUserPublicKeyById) {
          pubBase64 = await getUserPublicKeyById(userId);
        } else {
          const resp = await api.get(`/api/keys/user/${userId}`);
          pubBase64 = resp.data.public_key || resp.data.publicKey || resp.data.publicKeyBase64;
        }

        const memberPub = base64ToUint8(pubBase64);
        const shared = deriveX25519SharedSecret(ephPriv, memberPub);
        const aesWrapKey = await hkdfSha256(shared, "chatapp:wrap:groupkey", 32);
        const { iv, ciphertext } = await aesGcmEncryptRaw(aesWrapKey, groupKey);
        const wrapped = `${uint8ToBase64(iv)}:${uint8ToBase64(ciphertext)}`;

        await api.post("/api/keys/group-member", {
          groupId,
          userId,
          encryptedGroupPrivateKey: wrapped,
          nonce: uint8ToBase64(iv)
        });
      } catch (err) {
        console.error(`Failed to wrap group key for ${userId}:`, err);
      }
    }

    return { 
      groupKeyUint8: groupKey, 
      ephemeralPubBase64: uint8ToBase64(ephPub) 
    };
  } catch (error) {
    console.error('Group key creation failed:', error);
    throw new Error(`Group key creation failed: ${error.message}`);
  }
}

/** 
 * Fetch and unwrap a user's group key 
 */
export async function fetchAndUnwrapGroupKey(groupId, userId, userSecretKeyUint8) {
  try {
    // 🔹 Step 1: Fetch group's ephemeral public key
    const grpResp = await api.keys.getGroupPublicKey(groupId);
    const grpData = grpResp.data || grpResp; // handle either shape

    const ephPubBase64 =
      grpData.groupPublicKey ||
      grpData.group_public_key ||
      grpData.groupPublicKeyBase64;

    if (!ephPubBase64) {
      console.error("Group public key missing in response:", grpResp);
      throw new Error("Missing group public key");
    }

    const ephPub = base64ToUint8(ephPubBase64);

    // 🔹 Step 2: Fetch wrapped key for user
    const resp = await api.keys.getGroupMemberKey(groupId, userId);
    const data = resp.data || resp;
    const wrapped =
      data.encryptedGroupPrivateKey ||
      data.encrypted_group_private_key;
    const [ivB64, ctB64] = wrapped.split(":");
    const iv = base64ToUint8(ivB64);
    const ct = base64ToUint8(ctB64);

    const shared = deriveX25519SharedSecret(userSecretKeyUint8, ephPub);
    const aesWrapKey = await hkdfSha256(shared, "chatapp:wrap:groupkey", 32);
    const groupKey = await aesGcmDecryptRaw(aesWrapKey, iv, ct);
    return groupKey;
  } catch (err) {
    console.error('Group key unwrap failed:', err);
    throw new Error(`Failed to unwrap group key: ${err.message}`);
  }
}