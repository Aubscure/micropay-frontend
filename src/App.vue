<!-- src/App.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import router from '@/router'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const ready = ref(false)
const { isSyncing, pendingSyncCount } = useNetworkStatus()

onMounted(async () => {
  await router.isReady()
  ready.value = true
})
</script>

<template>
  <div v-if="!ready" class="boot-screen">
    <div class="boot-orb" aria-hidden="true"></div>
    <div class="boot-spinner" aria-hidden="true"></div>
    <p class="boot-text">Connecting to server…</p>
    <p class="boot-subtext">This can take a minute if the server's been idle</p>
  </div>

  <template v-else>
    <!-- Global sync banner — shows on every route while queued offline
         transactions are being sent, regardless of which page triggered it -->
    <div
      v-if="isSyncing"
      class="sync-bar"
      role="status"
      aria-live="polite"
    >
      <span class="sync-spinner" aria-hidden="true"></span>
      <span>Syncing {{ pendingSyncCount }} offline payment{{ pendingSyncCount === 1 ? '' : 's' }}…</span>
    </div>

    <RouterView />
  </template>
</template>

<style scoped>
.boot-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #F1F5F9;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  position: relative;
  overflow: hidden;
}
.boot-orb {
  position: absolute;
  width: 420px; height: 420px;
  top: -120px; right: -100px;
  border-radius: 50%;
  filter: blur(80px);
  background: radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%);
  pointer-events: none;
}
.boot-spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(16,185,129,0.15);
  border-top-color: #10B981;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.boot-text { font-size: 0.95rem; font-weight: 600; color: #1e293b; }
.boot-subtext { font-size: 0.8rem; color: #94a3b8; }

/* Sync banner — sits above everything, same emerald language as the rest of the app */
.sync-bar {
  position: sticky;
  top: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  color: #fff;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
}
.sync-spinner {
  width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .boot-spinner, .sync-spinner { animation: none; }
}
</style>
