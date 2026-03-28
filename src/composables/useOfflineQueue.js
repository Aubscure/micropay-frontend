// src/composables/useOfflineQueue.js

import { ref } from 'vue'

/**
 * Manages the offline transaction queue using IndexedDB.
 *
 * When the device is offline, transactions are saved here.
 * When connectivity is restored, they are synced to the server.
 *
 * IndexedDB is a browser-based database — data persists even
 * after the browser is closed, unlike localStorage.
 */

// Database configuration constants
const DB_NAME = 'micropay_offline'    // Database name
const DB_VERSION = 1                   // Version — increment when schema changes
const STORE_NAME = 'pending_transactions'  // "Table" name in IndexedDB

/**
 * Opens (or creates) the IndexedDB database.
 * Returns a Promise that resolves to the IDBDatabase object.
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    // Open the database — creates it if it doesn't exist
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    // Called only when database is created or version is upgraded
    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Create the object store (like a SQL table) if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',  // Use the transaction UUID as the key
        })

        // Index by status so we can query "all pending" efficiently
        store.createIndex('status', 'status', { unique: false })
      }
    }

    request.onsuccess = (event) => resolve(event.target.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

/**
 * The composable — a function that returns reactive state and methods.
 * Call this in any Vue component: const { addToQueue, syncQueue } = useOfflineQueue()
 */
export function useOfflineQueue() {
  // Reactive count of pending offline transactions
  const pendingCount = ref(0)

  /**
   * Save a transaction to the offline queue.
   *
   * @param {Object} transaction - Transaction data object
   * @param {string} transaction.id - UUID (generate with crypto.randomUUID())
   * @param {number} transaction.amount_centavos
   * @param {string} transaction.currency
   * @param {string} transaction.payment_method
   */
  async function addToQueue(transaction) {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      // Start a read-write transaction on the object store
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)

      // Add metadata to track when it was queued
      const record = {
        ...transaction,
        status: 'queued',
        queued_at: new Date().toISOString(),
      }

      // put() adds or updates the record
      const request = store.put(record)

      request.onsuccess = () => {
        pendingCount.value++
        resolve(record)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Load all pending transactions from IndexedDB.
   *
   * @returns {Promise<Array>} Array of pending transaction objects
   */
  async function getQueue() {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('status')

      // Query only records with status = 'queued'
      const request = index.getAll('queued')

      request.onsuccess = () => {
        pendingCount.value = request.result.length
        resolve(request.result)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove a transaction from the queue after successful sync.
   *
   * @param {string} id - UUID of the transaction to remove
   */
  async function removeFromQueue(id) {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        if (pendingCount.value > 0) pendingCount.value--
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  return {
    pendingCount,   // Reactive number of queued transactions
    addToQueue,     // Save transaction offline
    getQueue,       // Get all queued transactions
    removeFromQueue // Remove after successful sync
  }
}