// src/utils/crypto.js

/**
 * Encrypts and decrypts IndexedDB payloads using AES-GCM via Web Crypto API.
 *
 * Why AES-GCM:
 * - Built into every modern browser (no library needed, zero cost)
 * - Authenticated encryption — detects tampering (an attacker can't
 *   silently modify the amount without the decryption failing)
 * - The key is derived from the user's session token so only the
 *   authenticated user can read their own offline queue
 */

/**
 * Derive an AES-GCM key from the user's auth token.
 * The key only exists in memory — never stored anywhere.
 *
 * @param {string} token - The user's Sanctum Bearer token
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(token) {
  // Encode the token as bytes
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  // Derive a 256-bit AES key from the token using PBKDF2
  // The salt is fixed per-app — in a real system this would be per-user
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
 * @param {string} token - User's auth token (used to derive key)
 * @returns {Promise<{iv: string, ciphertext: string}>}
 */
export async function encryptPayload(data, token) {
  const key = await deriveKey(token)

  // Generate a random 12-byte IV for each encryption operation.
  // Never reuse an IV with the same key — AES-GCM requires this.
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encoded = new TextEncoder().encode(JSON.stringify(data))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  // Store IV alongside ciphertext — IV is not secret, just must be unique
  return {
    iv: Array.from(iv).join(','),
    ciphertext: Array.from(new Uint8Array(ciphertext)).join(','),
  }
}

/**
 * Decrypt a stored payload from IndexedDB.
 * Throws if the data has been tampered with (AES-GCM authentication fails).
 *
 * @param {{iv: string, ciphertext: string}} encrypted
 * @param {string} token
 * @returns {Promise<Object>}
 */
export async function decryptPayload(encrypted, token) {
  const key = await deriveKey(token)

  const iv = new Uint8Array(encrypted.iv.split(',').map(Number))
  const ciphertext = new Uint8Array(encrypted.ciphertext.split(',').map(Number))

  // This will throw DOMException if the data was tampered with
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return JSON.parse(new TextDecoder().decode(decrypted))
}