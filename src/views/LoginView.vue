<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()

const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)
const mounted  = ref(false)

// Trigger entrance animation on next paint
import { onMounted } from 'vue'
onMounted(() => requestAnimationFrame(() => (mounted.value = true)))

async function handleLogin() {
  error.value   = ''
  loading.value = true
  try {
    const success = await auth.loginUser({ email: email.value, password: password.value })
    if (success) {
      router.push({ name: 'dashboard' })
    } else {
      error.value = auth.error || 'Login failed. Please try again.'
    }
  } catch (e) {
    console.error('Unexpected error during login:', e)
    error.value = 'A critical error occurred.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="auth-root min-h-screen flex items-center justify-center px-4 py-12"
    style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif;"
  >
    <!-- Atmospheric background orbs -->
    <div class="auth-orb auth-orb-1" aria-hidden="true"></div>
    <div class="auth-orb auth-orb-2" aria-hidden="true"></div>

    <div
      class="auth-card w-full max-w-sm"
      :class="{ 'auth-card-visible': mounted }"
      role="main"
    >
      <!-- Brand mark -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2.5 mb-6" aria-label="MicroPay">
          <div
            class="w-10 h-10 rounded-[12px] bg-emerald-500 flex items-center justify-center text-white font-black text-[18px]"
            style="box-shadow: 0 4px 14px rgba(16,185,129,0.40)"
            aria-hidden="true"
          >M</div>
          <span class="font-bold text-[20px] tracking-tight text-slate-800">MicroPay</span>
        </div>
        <h1 class="text-[22px] font-bold text-slate-800 leading-tight">Welcome back</h1>
        <p class="text-sm text-slate-400 mt-1">Sign in to your merchant account</p>
      </div>

      <!-- Error banner -->
      <div
        v-if="error"
        class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-5"
        role="alert"
        aria-live="polite"
      >
        <span class="text-red-500 mt-px shrink-0" aria-hidden="true">⚠</span>
        <p class="text-sm text-red-700 font-medium leading-snug">{{ error }}</p>
      </div>

      <!-- Form card -->
      <div class="bg-white rounded-[20px] border border-slate-200/80 p-6 space-y-4"
        style="box-shadow: 0 4px 24px rgba(15,23,42,0.07), 0 1px 2px rgba(15,23,42,0.04)">

        <!-- Email -->
        <div>
          <label for="email" class="block text-[13px] font-semibold text-slate-600 mb-1.5">Email address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="username"
            class="auth-input"
            :disabled="loading"
          />
        </div>

        <!-- Password -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label for="password" class="block text-[13px] font-semibold text-slate-600">Password</label>
          </div>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            class="auth-input"
            :disabled="loading"
            @keyup.enter="handleLogin"
          />
        </div>

        <!-- Submit -->
        <button
          @click="handleLogin"
          :disabled="loading"
          class="auth-btn w-full mt-1"
          :aria-busy="loading"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <span class="auth-spinner" aria-hidden="true"></span>
            Signing in…
          </span>
          <span v-else>Sign In →</span>
        </button>
      </div>

      <!-- Register link -->
      <p class="text-center text-[13px] text-slate-400 mt-5">
        No account?
        <RouterLink
          to="/register"
          class="text-emerald-600 font-semibold hover:text-emerald-500 transition-colors focus:outline-none focus-visible:underline"
        >Create one →</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* Page background */
.auth-root {
  background: #F1F5F9;
  position: relative;
  overflow: hidden;
}

/* Atmospheric orbs — match the dashboard hero palette */
.auth-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(80px);
  opacity: 0.55;
}
.auth-orb-1 {
  width: 420px; height: 420px;
  top: -120px; right: -100px;
  background: radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%);
}
.auth-orb-2 {
  width: 360px; height: 360px;
  bottom: -100px; left: -80px;
  background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
}

/* Card entrance */
.auth-card {
  position: relative;
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 400ms ease, transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
.auth-card-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Input */
.auth-input {
  width: 100%;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 0.875rem;
  font-family: inherit;
  color: #1e293b;
  background: #F8FAFC;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  outline: none;
}
.auth-input::placeholder { color: #94a3b8; }
.auth-input:focus {
  border-color: #10B981;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
}
.auth-input:disabled { opacity: 0.6; cursor: not-allowed; }

/* Primary button — mirrors dashboard .action-primary */
.auth-btn {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  box-shadow: 0 4px 14px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
  color: #fff;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 12px 20px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.auth-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(16,185,129,0.42), inset 0 1px 0 rgba(255,255,255,0.15);
  transform: translateY(-1px);
}
.auth-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(16,185,129,0.25);
}
.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Spinner */
.auth-spinner {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .auth-card { transition: none; opacity: 1; transform: none; }
  .auth-spinner { animation: none; }
}
</style>