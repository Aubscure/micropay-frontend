<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createTransaction } from '@/api/transactions'
import { useOfflineQueue } from '@/composables/useOfflineQueue'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const router          = useRouter()
const { isOnline }    = useNetworkStatus()
const { addToQueue }  = useOfflineQueue()

const amount       = ref('')
const notes        = ref('')
const method       = ref('qr_code')    // qr_code | nfc | manual_entry
const loading      = ref(false)
const success      = ref(false)
const savedOffline = ref(false)
const error        = ref('')

const METHODS = [
  { key: 'qr_code',      icon: '▦', label: 'QR Code'       },
  { key: 'nfc',          icon: '⬡', label: 'NFC Tap'        },
  { key: 'manual_entry', icon: '⌨', label: 'Manual Entry'   },
]

// Live-format the display amount as the user types
const displayAmount = computed(() => {
  const n = parseFloat(amount.value)
  if (!amount.value || isNaN(n)) return '0.00'
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

async function handlePay() {
  error.value = ''
  const centavos = Math.round(parseFloat(amount.value) * 100)

  if (!centavos || centavos < 1) {
    error.value = 'Please enter a valid amount.'
    return
  }

  loading.value = true

  const transactionData = {
    id:              crypto.randomUUID(),
    amount_centavos: centavos,
    currency:        'PHP',
    payment_method:  method.value,
    notes:           notes.value || null,
  }

  try {
    if (isOnline.value) {
      await createTransaction(transactionData)
      savedOffline.value = false
    } else {
      throw { isNetworkError: true }
    }
  } catch (e) {
    const isNetworkFailure =
      e.isNetworkError ||
      e.code === 'ERR_NETWORK' ||
      e.message === 'Network Error' ||
      (!e.response && e.request)

    if (isNetworkFailure) {
      try {
        await addToQueue(transactionData)
        savedOffline.value = true
        success.value      = true
        amount.value       = ''
        notes.value        = ''
        setTimeout(() => router.push({ name: 'dashboard' }), 1800)
        return
      } catch {
        error.value   = 'Could not save payment offline. Please try again.'
        loading.value = false
        return
      }
    }

    const errData = e.response?.data
    if (errData?.errors) {
      error.value = Object.values(errData.errors).flat().join(' ')
    } else {
      error.value = errData?.message ?? 'Payment failed. Please try again.'
    }

    loading.value = false
    return
  }

  success.value = true
  amount.value  = ''
  notes.value   = ''
  setTimeout(() => router.push({ name: 'dashboard' }), 1800)
  loading.value = false
}
</script>

<template>
  <div
    class="min-h-screen bg-[#F1F5F9] text-slate-900"
    style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif;"
  >

    <!-- ── Sticky header — matches Dashboard exactly ─────── -->
    <header
      class="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80"
      role="banner"
    >
      <div class="max-w-lg mx-auto px-4 h-[56px] flex items-center gap-3">

        <!-- Back button -->
        <button
          @click="router.back()"
          class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- Title -->
        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 leading-none mb-0.5">MicroPay</p>
          <h1 class="text-[15px] font-bold text-slate-800 leading-none">New Payment</h1>
        </div>

        <!-- Offline pill -->
        <div
          v-if="!isOnline"
          class="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-amber-200"
          role="status"
          aria-label="No internet connection"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true"></span>
          Offline
        </div>

      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 pb-10">

      <!-- ── Success state ─────────────────────────────── -->
      <section
        v-if="success"
        class="flex flex-col items-center justify-center text-center pt-20 pb-10"
        role="status"
        aria-live="polite"
      >
        <div class="w-20 h-20 rounded-[24px] bg-emerald-500 flex items-center justify-center text-3xl mb-6 shadow-lg"
          style="box-shadow: 0 8px 32px rgba(16,185,129,0.35)"
          aria-hidden="true"
        >
          {{ savedOffline ? '💾' : '✓' }}
        </div>
        <h2 class="text-[22px] font-bold text-slate-800 mb-2">
          {{ savedOffline ? 'Saved offline' : 'Payment sent!' }}
        </h2>
        <p class="text-sm text-slate-400 max-w-[220px]">
          {{ savedOffline
            ? 'Will sync automatically when you\'re back online.'
            : 'Fraud check is in progress. Redirecting…' }}
        </p>
      </section>

      <!-- ── Amount hero display ───────────────────────── -->
      <section v-else class="pt-5 space-y-3">

        <!-- Big amount preview -->
        <div
          class="hero-card relative overflow-hidden rounded-[24px] p-6 text-white select-none"
          aria-label="Payment amount preview"
        >
          <div class="hero-circle hero-circle-1" aria-hidden="true"></div>
          <div class="hero-circle hero-circle-2" aria-hidden="true"></div>

          <div class="relative">
            <p class="text-[11px] font-semibold uppercase tracking-widest text-white/50 mb-2">Amount (PHP)</p>
            <div class="flex items-start gap-1">
              <span class="text-[22px] font-bold text-white/40 mt-2" aria-hidden="true">₱</span>
              <input
                v-model="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                class="amount-input"
                aria-label="Payment amount in Philippine pesos"
                :disabled="loading"
              />
            </div>
          </div>

          <!-- Method selector inside hero card -->
          <div class="relative mt-5 pt-4 border-t border-white/15">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-3">Payment method</p>
            <div class="flex gap-2" role="group" aria-label="Select payment method">
              <button
                v-for="m in METHODS"
                :key="m.key"
                @click="method = m.key"
                :aria-pressed="method === m.key"
                :class="[
                  'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all text-[10px] font-semibold uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                  method === m.key
                    ? 'border-white/30 bg-white/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white/60'
                ]"
              >
                <span class="text-[18px] leading-none" aria-hidden="true">{{ m.icon }}</span>
                {{ m.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- ── Form card ──────────────────────────────── -->
        <div
          class="bg-white rounded-[20px] border border-slate-200/80 p-5 space-y-4"
          style="box-shadow: 0 1px 4px rgba(0,0,0,0.06)"
        >

          <!-- Note -->
          <div>
            <label for="pay-notes" class="block text-[13px] font-semibold text-slate-600 mb-1.5">
              Note
              <span class="text-slate-300 font-normal ml-1">optional</span>
            </label>
            <input
              id="pay-notes"
              v-model="notes"
              type="text"
              placeholder="e.g. Isang kilo bigas"
              class="pay-input"
              :disabled="loading"
              maxlength="255"
            />
          </div>

          <!-- Error -->
          <div
            v-if="error"
            class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            role="alert"
            aria-live="polite"
          >
            <span class="text-red-500 mt-px shrink-0 text-sm" aria-hidden="true">⚠</span>
            <p class="text-sm text-red-700 font-medium leading-snug">{{ error }}</p>
          </div>

          <!-- Offline notice -->
          <div
            v-if="!isOnline"
            class="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
            role="status"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" aria-hidden="true"></span>
            <p class="text-[12px] font-semibold text-amber-700 leading-snug">
              You are offline. Payment will sync when you reconnect.
            </p>
          </div>

          <!-- Submit -->
          <button
            @click="handlePay"
            :disabled="loading"
            class="pay-btn w-full"
            :aria-busy="loading"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <span class="pay-spinner" aria-hidden="true"></span>
              Processing…
            </span>
            <span v-else-if="!isOnline">💾 Save Offline</span>
            <span v-else>💳 Send Payment</span>
          </button>

        </div>

      </section>

    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* Hero card — same gradient as Dashboard */
.hero-card {
  background:
    radial-gradient(ellipse 130% 90% at 115% 130%, rgba(52,211,153,0.30) 0%, transparent 55%),
    radial-gradient(ellipse 90% 90% at -20% -20%, rgba(99,102,241,0.22) 0%, transparent 55%),
    linear-gradient(140deg, #0F172A 0%, #1E293B 65%, #0C1A2E 100%);
  box-shadow:
    0 8px 32px rgba(15,23,42,0.28),
    0 2px 8px rgba(15,23,42,0.12),
    inset 0 1px 0 rgba(255,255,255,0.06);
}
.hero-circle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.hero-circle-1 {
  width: 200px; height: 200px;
  top: -70px; right: -50px;
  background: radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 70%);
  border: 1px solid rgba(255,255,255,0.05);
}
.hero-circle-2 {
  width: 120px; height: 120px;
  bottom: -40px; left: -20px;
  background: radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%);
  border: 1px solid rgba(255,255,255,0.04);
}

/* Large amount input — overlaid on the dark hero card */
.amount-input {
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 2.5rem;
  font-weight: 900;
  color: #fff;
  width: 100%;
  line-height: 1;
  letter-spacing: -0.02em;
  /* Hide number input spinners */
  -moz-appearance: textfield;
}
.amount-input::-webkit-outer-spin-button,
.amount-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.amount-input::placeholder { color: rgba(255,255,255,0.20); }

/* Standard text input — matches Dashboard card style */
.pay-input {
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
.pay-input::placeholder { color: #94a3b8; }
.pay-input:focus {
  border-color: #10B981;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
}
.pay-input:disabled { opacity: 0.6; cursor: not-allowed; }

/* Primary button — mirrors .action-primary in Dashboard */
.pay-btn {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  box-shadow: 0 4px 14px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
  color: #fff;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 14px 20px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.pay-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(16,185,129,0.42), inset 0 1px 0 rgba(255,255,255,0.15);
  transform: translateY(-1px);
}
.pay-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(16,185,129,0.25);
}
.pay-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.pay-spinner {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .pay-btn { transition: none; }
  .pay-spinner { animation: none; }
}
</style>