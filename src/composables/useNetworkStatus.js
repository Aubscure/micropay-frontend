// src/composables/useNetworkStatus.js

import { ref, onMounted, onUnmounted } from 'vue'
import { useOfflineQueue } from './useOfflineQueue'
import { syncTransactions } from '@/api/transactions'

/**
 * Detects network connectivity and triggers sync when back online.
 *
 * The browser fires 'online' and 'offline' events on the window object
 * whenever connectivity changes. However, the event fires the instant
 * the network interface reconnects — before the connection is stable.
 * We add a delay + real connectivity check to avoid ERR_NETWORK_CHANGED.
 */

// ── Configuration ──────────────────────────────────────────────
const ONLINE_DELAY_MS   = 2000   // Wait 2s after 'online' event before syncing
const MAX_RETRIES       = 3      // Retry sync up to 3 times
const BASE_BACKOFF_MS   = 2000   // First retry waits 2s, then 4s, then 8s

export function useNetworkStatus() {
  const isOnline = ref(navigator.onLine)
  const isSyncing = ref(false)

  const { getQueue, removeFromQueue } = useOfflineQueue()

  let syncTimer = null  // Track the delayed sync so we can cancel it

  /**
   * Check if we truly have internet — a HEAD request to the app itself
   * is lightweight and proves the connection works end-to-end.
   * Falls back to navigator.onLine if the check itself fails ambiguously.
   */
  async function isReallyOnline() {
    try {
      // Use the app's own origin — no CORS issues, tiny response
      const resp = await fetch(window.location.origin, {
        method: 'HEAD',
        cache: 'no-store',
      })
      return resp.ok
    } catch {
      return false
    }
  }

  /**
   * Utility: wait for a given number of milliseconds.
   */
  function wait(ms) {
    return new Promise(resolve => { syncTimer = setTimeout(resolve, ms) })
  }

  /**
   * Sync all queued offline transactions with retry + exponential backoff.
   * The queue stays intact until each transaction is confirmed synced.
   */
  async function syncOfflineQueue() {
    if (isSyncing.value) return
    isSyncing.value = true

    try {
      const queue = await getQueue()

      if (queue.length === 0) {
        isSyncing.value = false
        return
      }

      // Retry loop with exponential backoff
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // Verify the connection is truly usable before hitting the API
        const online = await isReallyOnline()
        if (!online) {
          console.warn(`Sync attempt ${attempt}: connectivity check failed, waiting...`)
          await wait(BASE_BACKOFF_MS * Math.pow(2, attempt - 1))
          continue
        }

        try {
          console.log(`Syncing ${queue.length} offline transactions (attempt ${attempt})...`)

          const result = await syncTransactions(queue)

          // Success — remove synced transactions from IndexedDB
          for (const tx of queue) {
            await removeFromQueue(tx.id)
          }

          console.log(`Sync complete: ${result.data.created} created, ${result.data.skipped} skipped`)
          return  // Done — exit the retry loop

        } catch (error) {
          console.warn(`Sync attempt ${attempt} failed: ${error.message}`)

          if (attempt < MAX_RETRIES) {
            // Wait with exponential backoff before retrying
            const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1)
            console.log(`Retrying in ${delay / 1000}s...`)
            await wait(delay)
          } else {
            // All retries exhausted — queue stays intact for next online event
            console.error('Sync failed after all retries. Will retry on next reconnect.')
          }
        }
      }
    } finally {
      isSyncing.value = false
    }
  }

  // ── Event handlers ───────────────────────────────────────────
  function handleOnline() {
    isOnline.value = true

    // Clear any pending sync timer (e.g., if flipping online/offline rapidly)
    if (syncTimer) clearTimeout(syncTimer)

    // Wait for the connection to stabilize before syncing
    syncTimer = setTimeout(() => {
      syncOfflineQueue()
    }, ONLINE_DELAY_MS)
  }

  function handleOffline() {
    isOnline.value = false

    // Cancel any pending sync — no point trying if we just went offline
    if (syncTimer) {
      clearTimeout(syncTimer)
      syncTimer = null
    }
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (syncTimer) clearTimeout(syncTimer)
  })

  return {
    isOnline,
    isSyncing,
    syncOfflineQueue,
  }
}