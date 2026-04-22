// src/utils/crypto.js

/**
 * Encrypts and decrypts IndexedDB payloads using AES-GCM via Web Crypto API.
 * The key is derived from a server-issued session nonce held in volatile memory.
 */

/**
 * Derive an AES-GCM key from the server-issued session nonce.
 *
 * @param {string} keyMaterialString - The session-bound nonce from the server
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(keyMaterialString) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(keyMaterialString),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('micropay-offline-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a transaction object before storing in IndexedDB.
 *
 * @param {Object} data - The transaction object to encrypt
 * @param {string} nonce - The secure memory nonce
 * @returns {Promise<{iv: string, ciphertext: string}>}
 */
export async function encryptPayload(data, nonce) {
  const key = await deriveKey(nonce)

  // Generate a random 12-byte IV for each encryption operation.
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encoded = new TextEncoder().encode(JSON.stringify(data))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  return {
    iv: Array.from(iv).join(','),
    ciphertext: Array.from(new Uint8Array(ciphertext)).join(','),
  }
}

/**
 * Decrypt a stored payload from IndexedDB.
 *
 * @param {{iv: string, ciphertext: string}} encrypted
 * @param {string} nonce - The secure memory nonce
 * @returns {Promise<Object>}
 */
export async function decryptPayload(encrypted, nonce) {
  const key = await deriveKey(nonce)

  const iv = new Uint8Array(encrypted.iv.split(',').map(Number))
  const ciphertext = new Uint8Array(encrypted.ciphertext.split(',').map(Number))

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return JSON.parse(new TextDecoder().decode(decrypted))
}