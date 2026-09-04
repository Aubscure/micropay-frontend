// src/composables/useNetworkStatus.js

import { ref, onMounted } from 'vue'
import { useOfflineQueue } from './useOfflineQueue'
import { syncTransactions } from '@/api/transactions'

const ONLINE_DELAY_MS   = 2000
const MAX_RETRIES       = 3
const BASE_BACKOFF_MS   = 2000

// ── Module-scoped (singleton) state ───────────────────────────────
// Previously these lived INSIDE useNetworkStatus(), so every component
// calling the composable (PayView, Dashboard, and now App.vue) got its
// own separate isOnline/isSyncing/listener set. Two mounted components
// reacting to the same 'online' event could each kick off a sync,
// racing over the same IndexedDB queue. Moving state to module scope
// means every caller shares one copy — one listener, one sync at a time.
const isOnline        = ref(navigator.onLine)
const isSyncing        = ref(false)
const pendingSyncCount = ref(0)   // how many were queued when the current sync started

let listenersAttached = false
let syncTimer = null

const { getQueue, removeFromQueue } = useOfflineQueue()

async function isReallyOnline() {
  try {
    const resp = await fetch(window.location.origin, { method: 'HEAD', cache: 'no-store' })
    return resp.ok
  } catch {
    return false
  }
}

function wait(ms) {
  return new Promise(resolve => { syncTimer = setTimeout(resolve, ms) })
}

async function syncOfflineQueue() {
  if (isSyncing.value) return
  isSyncing.value = true

  try {
    const queue = await getQueue()
    pendingSyncCount.value = queue.length

    if (queue.length === 0) {
      isSyncing.value = false
      return
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const online = await isReallyOnline()
      if (!online) {
        console.warn(`Sync attempt ${attempt}: connectivity check failed, waiting...`)
        await wait(BASE_BACKOFF_MS * Math.pow(2, attempt - 1))
        continue
      }

      try {
        console.log(`Syncing ${queue.length} offline transactions (attempt ${attempt})...`)
        const result = await syncTransactions(queue)

        for (const tx of queue) {
          await removeFromQueue(tx.id)
        }

        console.log(`Sync complete: ${result.data.data.created} created, ${result.data.data.skipped} skipped`)
        return

      } catch (error) {
        console.warn(`Sync attempt ${attempt} failed: ${error.message}`)
        if (attempt < MAX_RETRIES) {
          const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1)
          console.log(`Retrying in ${delay / 1000}s...`)
          await wait(delay)
        } else {
          console.error('Sync failed after all retries. Will retry on next reconnect.')
        }
      }
    }
  } finally {
    isSyncing.value = false
    pendingSyncCount.value = 0
  }
}

function handleOnline() {
  isOnline.value = true
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => { syncOfflineQueue() }, ONLINE_DELAY_MS)
}

function handleOffline() {
  isOnline.value = false
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
}

export function useNetworkStatus() {
  // Attach the browser listeners exactly once, no matter how many
  // components call this composable.
  onMounted(() => {
    if (!listenersAttached) {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      listenersAttached = true
    }
  })

  return {
    isOnline,
    isSyncing,
    pendingSyncCount,
    syncOfflineQueue,
  }
}
