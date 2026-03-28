// src/composables/useNetworkStatus.js

import { ref, onMounted, onUnmounted } from 'vue'
import { useOfflineQueue } from './useOfflineQueue'
import { syncTransactions } from '@/api/transactions'

/**
 * Detects network connectivity and triggers sync when back online.
 *
 * The browser fires 'online' and 'offline' events on the window object
 * whenever connectivity changes. This composable makes those events reactive.
 */
export function useNetworkStatus() {
  // Start with the browser's current state (navigator.onLine is a built-in API)
  const isOnline = ref(navigator.onLine)
  const isSyncing = ref(false)

  const { getQueue, removeFromQueue } = useOfflineQueue()

  /**
   * Sync all queued offline transactions when connectivity is restored.
   * Calls the batch sync endpoint on the Laravel API.
   */
  async function syncOfflineQueue() {
    if (isSyncing.value) return  // Prevent double-sync
    isSyncing.value = true

    try {
      const queue = await getQueue()

      if (queue.length === 0) {
        isSyncing.value = false
        return
      }

      console.log(`Syncing ${queue.length} offline transactions...`)

      // Send all queued transactions to the server in one request
      // The server handles de-duplication
      const result = await syncTransactions(queue)

      // Remove successfully synced transactions from the local queue
      for (const tx of queue) {
        await removeFromQueue(tx.id)
      }

      console.log(`Sync complete: ${result.data.created} created, ${result.data.skipped} skipped`)
    } catch (error) {
      // If sync fails (e.g., server error), the queue remains intact
      // and will be retried on the next online event
      console.error('Sync failed, will retry:', error.message)
    } finally {
      isSyncing.value = false
    }
  }

  // Event handlers — defined as named functions so we can remove them later
  function handleOnline() {
    isOnline.value = true
    // Automatically sync when back online
    syncOfflineQueue()
  }

  function handleOffline() {
    isOnline.value = false
  }

  // Register event listeners when the component mounts
  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  // Clean up event listeners when the component unmounts.
  // This prevents memory leaks.
  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return {
    isOnline,   // Boolean: true = connected
    isSyncing,  // Boolean: true = sync in progress
    syncOfflineQueue,
  }
}