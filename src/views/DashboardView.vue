//base UI

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getTransactions } from '@/api/transactions'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const router = useRouter()
const auth   = useAuthStore()
const { isOnline } = useNetworkStatus()

const transactions = ref([])
const loading      = ref(true)
const mounted      = ref(false)

let pollTimeout = null
let pollAttempt = 0

// ── Fetch ──────────────────────────────────────────────────────
const fetchTransactions = async () => {
  try {
    const { data } = await getTransactions()
    const raw = data?.data ?? data ?? []
    transactions.value = Array.isArray(raw) ? raw.slice(0, 100) : []

    const hasPending = transactions.value.some(
      tx => tx.status === 'pending' || tx.status === 'fraud_check'
    )
    if (hasPending) {
      const delay = Math.min(3000 * Math.pow(1.4, pollAttempt), 30_000)
      pollAttempt++
      clearTimeout(pollTimeout)
      pollTimeout = setTimeout(fetchTransactions, delay)
    } else {
      pollAttempt = 0
      clearTimeout(pollTimeout)
    }
  } catch {
    console.warn('[Dashboard] fetch failed')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  requestAnimationFrame(() => (mounted.value = true))
  fetchTransactions()
})
onUnmounted(() => clearTimeout(pollTimeout))

// ── Auth ───────────────────────────────────────────────────────
async function logout() {
  try {
    await auth.logoutUser()
    router.replace({ name: 'login' })
  } catch {
    console.warn('Logout failed')
  }
}

// ── Computed ───────────────────────────────────────────────────
const settledTotal = computed(() =>
  transactions.value.reduce(
    (s, tx) => s + (tx.status === 'settled' ? (tx.amount_centavos ?? 0) : 0), 0
  )
)
const pendingCount = computed(() =>
  transactions.value.filter(
    tx => tx.status === 'pending' || tx.status === 'fraud_check'
  ).length
)
const flaggedCount = computed(() =>
  transactions.value.filter(tx => tx.status === 'flagged').length
)
const recent = computed(() => transactions.value.slice(0, 6))

const userName     = computed(() => auth.user?.name?.split(' ')[0] ?? 'Merchant')
const userFullName = computed(() => auth.user?.name ?? 'Merchant')

// ── Formatters ─────────────────────────────────────────────────
function formatMoney(cents) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', minimumFractionDigits: 2
  }).format((cents ?? 0) / 100)
}

function formatShortDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-PH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ── Status map ─────────────────────────────────────────────────
const STATUS = {
  pending:     { label: 'Pending',  bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200'   },
  fraud_check: { label: 'Checking', bg: 'bg-orange-50',  text: 'text-orange-700',  ring: 'ring-orange-200'  },
  cleared:     { label: 'Cleared',  bg: 'bg-sky-50',     text: 'text-sky-700',     ring: 'ring-sky-200'     },
  settled:     { label: 'Settled',  bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  flagged:     { label: 'Flagged',  bg: 'bg-red-50',     text: 'text-red-700',     ring: 'ring-red-200'     },
  rejected:    { label: 'Rejected', bg: 'bg-slate-50',   text: 'text-slate-500',   ring: 'ring-slate-200'   },
}
function getStatus(s) {
  return STATUS[s] ?? { label: s, bg: 'bg-slate-50', text: 'text-slate-500', ring: 'ring-slate-200' }
}

const METHOD_ICON = { qr_code: '▦', nfc: '⬡', manual_entry: '⌨' }
function methodIcon(m) { return METHOD_ICON[m] ?? '•' }
</script>

<template>
  <div class="min-h-screen bg-[#F1F5F9] text-slate-900" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif;">

    <!-- ── Sticky header ─────────────────────────────────────── -->
    <header
      class="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80"
      role="banner"
    >
      <div class="max-w-lg mx-auto px-4 h-[56px] flex items-center justify-between gap-3">

        <!-- Brand -->
        <div class="flex items-center gap-2.5 select-none" aria-label="MicroPay">
          <div
            class="w-8 h-8 rounded-[10px] bg-emerald-500 flex items-center justify-center text-white font-black text-[15px] shadow-sm"
            style="box-shadow: 0 2px 8px rgba(16,185,129,0.35)"
            aria-hidden="true"
          >M</div>
          <span class="font-bold text-[17px] tracking-tight text-slate-800">MicroPay</span>
        </div>

        <!-- Right cluster -->
        <div class="flex items-center gap-2">
          <div
            v-if="!isOnline"
            class="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-amber-200"
            role="status"
            aria-label="No internet connection"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true"></span>
            Offline
          </div>
          <div class="flex items-center gap-1.5">
            <div
              class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 uppercase select-none"
              :aria-label="`Logged in as ${userFullName}`"
            >{{ userName.charAt(0) }}</div>
            <button
              @click="logout"
              class="text-[12px] font-medium text-slate-400 hover:text-slate-700 transition-colors px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
              aria-label="Sign out of MicroPay"
            >Sign out</button>
          </div>
        </div>

      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 pb-10">

      <!-- ── Hero balance card ─────────────────────────────── -->
      <section aria-label="Account balance" class="pt-5 pb-1">
        <div class="hero-card relative overflow-hidden rounded-[24px] p-6 text-white select-none">

          <div class="hero-circle hero-circle-1" aria-hidden="true"></div>
          <div class="hero-circle hero-circle-2" aria-hidden="true"></div>

          <!-- Top row -->
          <div class="relative flex items-start justify-between mb-7">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">Welcome back</p>
              <p class="text-[20px] font-bold leading-none">{{ userName }}</p>
            </div>
            <div
              class="text-[11px] font-semibold bg-white/15 text-white/90 px-2.5 py-1 rounded-full ring-1 ring-white/20"
              role="status"
              :aria-label="isOnline ? 'Connected' : 'Offline'"
            >
              <span :class="['inline-block w-1.5 h-1.5 rounded-full mr-1 mb-px', isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse']" aria-hidden="true"></span>
              {{ isOnline ? 'Live' : 'Offline' }}
            </div>
          </div>

          <!-- Balance -->
          <div class="relative">
            <p class="text-[11px] font-semibold uppercase tracking-widest text-white/50 mb-1">Total Settled</p>
            <p class="text-[38px] font-black leading-none tracking-tight tabular-nums">
              {{ formatMoney(settledTotal) }}
            </p>
          </div>

          <!-- Stats row -->
          <div class="relative flex items-center mt-6 pt-4 border-t border-white/15 gap-0">
            <div class="flex-1 text-center">
              <p class="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">Pending</p>
              <p class="text-[17px] font-bold tabular-nums">{{ pendingCount }}</p>
            </div>
            <div class="w-px h-8 bg-white/20" aria-hidden="true"></div>
            <div class="flex-1 text-center">
              <p class="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">Flagged</p>
              <p :class="['text-[17px] font-bold tabular-nums', flaggedCount > 0 ? 'text-red-300' : '']">
                {{ flaggedCount }}
              </p>
            </div>
            <div class="w-px h-8 bg-white/20" aria-hidden="true"></div>
            <div class="flex-1 text-center">
              <p class="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">Total</p>
              <p class="text-[17px] font-bold tabular-nums">{{ transactions.length }}</p>
            </div>
          </div>

        </div>
      </section>

      <!-- ── Flagged alert banner ──────────────────────────── -->
      <section
        v-if="flaggedCount > 0"
        class="mt-3"
        role="alert"
        aria-live="polite"
      >
        <div class="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-sm" aria-hidden="true">🚩</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-red-700">
              {{ flaggedCount }} flagged transaction{{ flaggedCount > 1 ? 's' : '' }}
            </p>
            <p class="text-xs text-red-500 mt-0.5">Review required before settlement.</p>
          </div>
          <RouterLink
            to="/history"
            class="text-xs font-bold text-red-600 hover:text-red-700 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded whitespace-nowrap"
          >Review →</RouterLink>
        </div>
      </section>

      <!-- ── Quick actions ─────────────────────────────────── -->
      <section class="mt-4" aria-label="Quick actions">
        <div class="grid grid-cols-2 gap-3">

          <RouterLink
            to="/pay"
            class="action-primary group flex items-center justify-center gap-2.5 py-[18px] rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Create a new payment"
          >
            <span
              class="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-[17px] group-hover:scale-110 transition-transform text-white"
              aria-hidden="true"
            >+</span>
            <span class="text-sm font-bold text-white">New Payment</span>
          </RouterLink>

          <RouterLink
            to="/history"
            class="group flex items-center justify-center gap-2.5 py-[18px] rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="View transaction history"
          >
            <span
              class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[16px] group-hover:scale-110 transition-transform text-slate-600"
              aria-hidden="true"
            >≡</span>
            <span class="text-sm font-bold text-slate-700">History</span>
          </RouterLink>

        </div>
      </section>

      <!-- ── Recent transactions ───────────────────────────── -->
      <section class="mt-5" aria-label="Recent transactions">

        <div class="flex items-center justify-between mb-3 px-1">
          <h2 class="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity</h2>
          <RouterLink
            to="/history"
            class="text-[12px] font-semibold text-emerald-600 hover:text-emerald-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
          >See all →</RouterLink>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden" style="box-shadow: 0 1px 4px rgba(0,0,0,0.06)">

          <!-- Skeletons -->
          <ul v-if="loading" aria-label="Loading" aria-busy="true">
            <li
              v-for="n in 4"
              :key="n"
              class="flex items-center gap-3 px-4 py-[14px] border-b border-slate-100 last:border-0 animate-pulse"
              aria-hidden="true"
            >
              <div class="w-10 h-10 rounded-xl bg-slate-100 shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3.5 bg-slate-100 rounded w-32"></div>
                <div class="h-3 bg-slate-100 rounded w-20"></div>
              </div>
              <div class="text-right space-y-2">
                <div class="h-3.5 bg-slate-100 rounded w-16 ml-auto"></div>
                <div class="h-5 bg-slate-100 rounded-full w-14 ml-auto"></div>
              </div>
            </li>
          </ul>

          <!-- Empty -->
          <div
            v-else-if="recent.length === 0"
            class="flex flex-col items-center justify-center py-12 px-4 text-center"
            role="status"
          >
            <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-3" aria-hidden="true">💳</div>
            <p class="text-sm font-bold text-slate-700">No transactions yet</p>
            <p class="text-xs text-slate-400 mt-1 max-w-[180px]">
              Create your first payment to get started.
            </p>
            <RouterLink
              to="/pay"
              class="mt-4 inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-emerald-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >+ New Payment</RouterLink>
          </div>

          <!-- Rows -->
          <ul v-else role="list">
            <li
              v-for="tx in recent"
              :key="tx.id"
              class="border-b border-slate-100 last:border-0"
            >
              <button
                class="w-full flex items-center gap-3 px-4 py-[14px] hover:bg-slate-50 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
                @click="router.push({ name: 'transaction.show', params: { id: tx.id } })"
                :aria-label="`${formatMoney(tx.amount_centavos)} — ${getStatus(tx.status).label}`"
              >
                <!-- Icon -->
                <div
                  class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[18px] shrink-0"
                  aria-hidden="true"
                >{{ methodIcon(tx.payment_method) }}</div>

                <!-- Label + date -->
                <div class="flex-1 min-w-0">
                  <p class="text-[14px] font-semibold text-slate-800 truncate leading-snug">
                    {{ tx.notes ?? tx.payment_method ?? 'Payment' }}
                  </p>
                  <p class="text-[11px] text-slate-400 mt-0.5 leading-none">
                    {{ formatShortDate(tx.created_at) }}
                  </p>
                </div>

                <!-- Amount + badge -->
                <div class="text-right shrink-0 space-y-1.5">
                  <p class="text-[14px] font-bold text-slate-900 tabular-nums leading-snug">
                    {{ formatMoney(tx.amount_centavos) }}
                  </p>
                  <span
                    :class="[
                      'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1',
                      getStatus(tx.status).bg,
                      getStatus(tx.status).text,
                      getStatus(tx.status).ring,
                    ]"
                  >
                    <span
                      :class="[
                        'w-1.5 h-1.5 rounded-full bg-current',
                        (tx.status === 'pending' || tx.status === 'fraud_check') ? 'animate-pulse' : 'opacity-60'
                      ]"
                      aria-hidden="true"
                    ></span>
                    {{ getStatus(tx.status).label }}
                  </span>
                </div>

              </button>
            </li>
          </ul>

        </div>
      </section>

    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* Hero card */
.hero-card {
  background:
    radial-gradient(ellipse 130% 90% at 115% 130%, rgba(52, 211, 153, 0.30) 0%, transparent 55%),
    radial-gradient(ellipse 90% 90% at -20% -20%, rgba(99, 102, 241, 0.22) 0%, transparent 55%),
    linear-gradient(140deg, #0F172A 0%, #1E293B 65%, #0C1A2E 100%);
  box-shadow:
    0 8px 32px rgba(15, 23, 42, 0.28),
    0 2px 8px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.hero-circle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.hero-circle-1 {
  width: 220px; height: 220px;
  top: -80px; right: -60px;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.10) 0%, transparent 70%);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.hero-circle-2 {
  width: 140px; height: 140px;
  bottom: -50px; left: -30px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.10) 0%, transparent 70%);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

/* Primary action button */
.action-primary {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: transform 0.1s ease, box-shadow 0.15s ease;
}
.action-primary:hover {
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}
.action-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
}
</style>