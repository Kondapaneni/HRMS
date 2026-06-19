import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

/**
 * Chat Crypto Utilities using TweetNaCl (Curve25519-XSalsa20-Poly1305)
 */

// Generate a new keypair
export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: util.encodeBase64(keyPair.publicKey),
    secretKey: util.encodeBase64(keyPair.secretKey),
  };
};

// Store my secret key securely (localStorage for now, but should ideally be IndexedDB/Session)
export const saveMySecretKey = (secretKeyBase64) => {
  localStorage.setItem('chat_secret_key', secretKeyBase64);
};

export const getMySecretKey = () => {
  const key = localStorage.getItem('chat_secret_key');
  return key ? util.decodeBase64(key) : null;
};

// Helper: Generate nonce
const newNonce = () => nacl.randomBytes(nacl.box.nonceLength);

/**
 * Encrypt a message for multiple recipients using a symmetric message key
 * @param {string} text - Plaintext message
 * @param {Object} recipientPublicKeysMap - { [userId]: "base64PublicKey" }
 * @param {Uint8Array} mySecretKey - Sender's secret key
 * @returns {Object} { encryptedPayload, encryptedSymmetricKeys }
 */
export const encryptMessage = (text, recipientPublicKeysMap, mySecretKey) => {
  const messageUint8 = util.decodeUTF8(text);
  
  // 1. Generate a random one-time symmetric key for this specific message
  const messageKey = nacl.randomBytes(nacl.secretbox.keyLength);
  
  // 2. Encrypt the actual payload with the symmetric key
  const payloadNonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encryptedPayloadBox = nacl.secretbox(messageUint8, payloadNonce, messageKey);
  
  // Combine nonce and box for the payload so we can decrypt it later
  const payloadFullMessage = new Uint8Array(payloadNonce.length + encryptedPayloadBox.length);
  payloadFullMessage.set(payloadNonce);
  payloadFullMessage.set(encryptedPayloadBox, payloadNonce.length);
  const encryptedPayloadBase64 = util.encodeBase64(payloadFullMessage);
  
  // 3. Encrypt the symmetric message key for every recipient (including sender)
  const encryptedSymmetricKeys = {};
  
  for (const [userId, pubKeyBase64] of Object.entries(recipientPublicKeysMap)) {
    const recipientPubKey = util.decodeBase64(pubKeyBase64);
    const keyNonce = newNonce();
    
    // Asymmetric encrypt the messageKey using sender's secret key and recipient's public key
    const encryptedKeyBox = nacl.box(messageKey, keyNonce, recipientPubKey, mySecretKey);
    
    // Combine nonce and box
    const fullKeyMessage = new Uint8Array(keyNonce.length + encryptedKeyBox.length);
    fullKeyMessage.set(keyNonce);
    fullKeyMessage.set(encryptedKeyBox, keyNonce.length);
    
    encryptedSymmetricKeys[userId] = util.encodeBase64(fullKeyMessage);
  }
  
  return {
    encryptedPayload: encryptedPayloadBase64,
    encryptedSymmetricKeys,
  };
};

/**
 * Decrypt a received message
 * @param {string} encryptedPayloadBase64 
 * @param {string} encryptedKeyBase64 - The specific key encrypted for me
 * @param {string} senderPublicKeyBase64 - The public key of the person who sent it
 * @param {Uint8Array} mySecretKey - My secret key
 * @returns {string|null} - The decrypted text, or null if failed
 */
export const decryptMessage = (encryptedPayloadBase64, encryptedKeyBase64, senderPublicKeyBase64, mySecretKey) => {
  try {
    const senderPubKey = util.decodeBase64(senderPublicKeyBase64);
    
    // 1. Decrypt the symmetric key
    const fullKeyMessage = util.decodeBase64(encryptedKeyBase64);
    const keyNonce = fullKeyMessage.slice(0, nacl.box.nonceLength);
    const keyBox = fullKeyMessage.slice(nacl.box.nonceLength);
    
    const messageKey = nacl.box.open(keyBox, keyNonce, senderPubKey, mySecretKey);
    if (!messageKey) {
      console.error('Failed to decrypt the symmetric key');
      return null;
    }
    
    // 2. Decrypt the payload
    const payloadFullMessage = util.decodeBase64(encryptedPayloadBase64);
    const payloadNonce = payloadFullMessage.slice(0, nacl.secretbox.nonceLength);
    const payloadBox = payloadFullMessage.slice(nacl.secretbox.nonceLength);
    
    const decryptedMessageUint8 = nacl.secretbox.open(payloadBox, payloadNonce, messageKey);
    if (!decryptedMessageUint8) {
      console.error('Failed to decrypt the payload');
      return null;
    }
    
    return util.encodeUTF8(decryptedMessageUint8);
  } catch (e) {
    console.error('Decryption error:', e);
    return null;
  }
};
