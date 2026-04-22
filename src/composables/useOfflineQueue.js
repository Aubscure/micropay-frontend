// src/composables/useOfflineQueue.js

import { ref } from 'vue'
import { encryptPayload, decryptPayload } from '@/utils/crypto'
import { useAuthStore } from '@/stores/auth'

const DB_NAME = 'micropay_offline'
const DB_VERSION = 1
const STORE_NAME = 'pending_transactions'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id', 
        })
        store.createIndex('status', 'status', { unique: false })
      }
    }

    request.onsuccess = (event) => resolve(event.target.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

export function useOfflineQueue() {
  const pendingCount = ref(0)

  /**
   * Retrieves the secure key material from active memory.
   * Throws a fatal error if the user is not authenticated.
   */
  function getSecureNonce() {
    const authStore = useAuthStore()
    const nonce = authStore.user?.offline_encryption_nonce
    
    if (!nonce) {
      throw new Error('Security Violation: Cannot read or write to offline queue without an active session.')
    }
    return nonce
  }

  async function addToQueue(transaction) {
    const db = await openDatabase()
    
    // Will throw and abort the operation if memory is wiped
    const nonce = getSecureNonce()

    const encrypted = await encryptPayload(transaction, nonce)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)

      const record = {
        id:        transaction.id,   
        status:    'queued',         
        queued_at: new Date().toISOString(),
        payload:   encrypted,        
      }

      const request = store.put(record)

      request.onsuccess = () => { pendingCount.value++; resolve(record) }
      request.onerror   = () => reject(request.error)
    })
  }

  async function getQueue() {
    const db = await openDatabase()
    
    // Will throw and abort if memory is wiped
    const nonce = getSecureNonce()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('status')
      
      const request = index.getAll('queued')

      request.onsuccess = async () => {
        const records = request.result
        const decrypted = []

        for (const record of records) {
          try {
            const data = await decryptPayload(record.payload, nonce)
            decrypted.push(data)
          } catch (e) {
            console.error(`Tampered or unreadable record detected and discarded: ${record.id}`)
          }
        }

        pendingCount.value = decrypted.length
        resolve(decrypted)
      }

      request.onerror = () => reject(request.error)
    })
  }

  async function removeFromQueue(id) {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => { if (pendingCount.value > 0) pendingCount.value--; resolve() }
      request.onerror   = () => reject(request.error)
    })
  }

  return {
    pendingCount, 
    addToQueue,   
    getQueue,     
    removeFromQueue 
  }
}