<!-- src/App.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import router from '@/router'

// router.isReady() resolves once the FIRST navigation (including the
// beforeEach guard's fetchUser() call) has finished, success or fail.
// Until then, nothing meaningful exists to route to, so show a splash
// screen instead of leaving RouterView to render empty.
const ready = ref(false)

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
  <RouterView v-else />
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

.boot-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
}

.boot-subtext {
  font-size: 0.8rem;
  color: #94a3b8;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .boot-spinner { animation: none; }
}
</style>
