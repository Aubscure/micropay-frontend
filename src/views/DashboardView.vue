<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getTransactions } from '@/api/transactions'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const router = useRouter()
const auth   = useAuthStore()
const { isOnline, isSyncing } = useNetworkStatus()

const transactions = ref([])
const loading      = ref(true)
const mounted      = ref(false)
let pollInterval   = null

const fetchTransactions = async () => {
  try {
    const response = await getTransactions()
    transactions.value = response.data.data ?? response.data

    const hasPending = transactions.value.some(tx =>
      ['pending', 'fraud_check'].includes(tx.status)
    )

    if (hasPending && !pollInterval) {
      pollInterval = setInterval(fetchTransactions, 3000)
    } else if (!hasPending && pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  } catch (e) {
    // Only log the message — never expose raw error objects with tokens/stack traces
    console.warn('[Dashboard] Failed to load transactions:', e?.message ?? 'unknown error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  requestAnimationFrame(() => { mounted.value = true })
  fetchTransactions()
})
onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}

// Totals derived from transaction list — no extra API call
const totalSettled = computed(() =>
  transactions.value
    .filter(tx => tx.status === 'settled')
    .reduce((sum, tx) => sum + tx.amount_centavos, 0)
)

const totalFlagged = computed(() =>
  transactions.value.filter(tx => tx.status === 'flagged').length
)

const pendingCount = computed(() =>
  transactions.value.filter(tx => ['pending', 'fraud_check'].includes(tx.status)).length
)

const recentTransactions = computed(() => transactions.value.slice(0, 8))

function formatAmount(centavos) {
  return (centavos / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   pill: 'border-amber-400/40  text-amber-300'    },
  fraud_check: { label: 'Fraud Check', dot: 'bg-orange-400',  pill: 'border-orange-400/40 text-orange-300'   },
  cleared:     { label: 'Cleared',     dot: 'bg-sky-400',     pill: 'border-sky-400/40    text-sky-300'      },
  settled:     { label: 'Settled',     dot: 'bg-emerald-400', pill: 'border-emerald-400/40 text-emerald-300' },
  flagged:     { label: 'Flagged',     dot: 'bg-red-400',     pill: 'border-red-400/40    text-red-300'      },
  rejected:    { label: 'Rejected',    dot: 'bg-slate-500',   pill: 'border-slate-500/40  text-slate-400'    },
}

function getStatus(status) {
  return STATUS_CONFIG[status] ?? { label: status, dot: 'bg-slate-500', pill: 'border-slate-500/40 text-slate-400' }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-PH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const userFirstName = computed(() => auth.user?.name?.split(' ')[0] ?? 'Merchant')
</script>

<template>
  <div class="dash-root min-h-screen bg-[#0c0f14] font-sans">

    <!-- ── Header ────────────────────────────────────────────── -->
    <header class="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0c0f14]/90 backdrop-blur-md">
      <div class="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">

        <!-- Brand -->
        <div class="flex items-center gap-2.5">
          <span
            class="w-7 h-7 rounded-lg bg-emerald-400 flex items-center justify-center text-slate-900 font-black text-xs leading-none select-none"
            aria-hidden="true"
          >M</span>
          <span class="font-bold text-white tracking-tight" style="font-family: 'Syne', sans-serif">MicroPay</span>
        </div>

        <!-- Right: Network + User -->
        <div class="flex items-center gap-2">
          <span
            v-if="!isOnline"
            class="inline-flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full"
            role="status"
            aria-label="You are offline"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" aria-hidden="true"></span>
            Offline
          </span>
          <span
            v-if="isSyncing"
            class="inline-flex items-center gap-1.5 bg-sky-400/10 border border-sky-400/20 text-sky-300 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full"
            role="status"
            aria-label="Syncing transactions"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping shrink-0" aria-hidden="true"></span>
            Syncing
          </span>

          <!-- User chip -->
          <div class="flex items-center gap-2 border border-white/[0.08] bg-white/[0.04] rounded-full pl-3 pr-2 py-1.5">
            <span
              class="text-[11px] font-mono text-slate-400 max-w-[80px] truncate"
              :title="auth.user?.name"
            >
              {{ auth.user?.name }}
            </span>
            <button
              @click="handleLogout"
              class="text-[11px] font-mono font-semibold text-slate-600 hover:text-slate-300 border border-white/[0.08] rounded-full px-2 py-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Log out"
            >
              out
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-6 space-y-3">

      <!-- ── Hero: Greeting + Stats ─────────────────────────── -->
      <section
        class="card-enter rounded-2xl border border-white/[0.07] bg-[#111520] overflow-hidden"
        :class="{ 'card-enter-active': mounted }"
        style="--delay: 0ms"
        aria-label="Account summary"
      >
        <!-- Top accent line -->
        <div class="h-[2px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-transparent" aria-hidden="true"></div>

        <div class="p-6">
          <!-- Greeting -->
          <p class="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Welcome back</p>
          <h2 class="text-2xl font-black text-white mt-1 mb-5" style="font-family: 'Syne', sans-serif">
            {{ userFirstName }}
          </h2>

          <!-- Stats grid -->
          <div class="grid grid-cols-3 gap-2">
            <!-- Total settled -->
            <div class="col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
              <p class="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Settled</p>
              <p
                class="text-xl font-black text-emerald-400 tabular-nums leading-none"
                style="font-family: 'DM Mono', monospace"
              >
                <span class="text-sm text-emerald-600 mr-0.5" aria-hidden="true">₱</span>{{ formatAmount(totalSettled) }}
              </p>
            </div>

            <!-- Pending + Flagged stacked -->
            <div class="flex flex-col gap-2">
              <div class="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex flex-col justify-between">
                <p class="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">Pending</p>
                <p class="text-lg font-black text-amber-400 tabular-nums leading-none mt-1.5" style="font-family: 'DM Mono', monospace">
                  {{ pendingCount }}
                </p>
              </div>
              <div class="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex flex-col justify-between">
                <p class="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">Flagged</p>
                <p
                  :class="['text-lg font-black tabular-nums leading-none mt-1.5', totalFlagged > 0 ? 'text-red-400' : 'text-slate-600']"
                  style="font-family: 'DM Mono', monospace"
                >
                  {{ totalFlagged }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Quick Actions ──────────────────────────────────── -->
      <section
        class="card-enter grid grid-cols-2 gap-2.5"
        :class="{ 'card-enter-active': mounted }"
        style="--delay: 60ms"
        aria-label="Quick actions"
      >
        <RouterLink
          to="/pay"
          class="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-slate-900 py-5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f14]"
          aria-label="Start a new payment"
        >
          <span class="w-8 h-8 rounded-lg bg-slate-900/10 flex items-center justify-center text-lg font-black group-hover:scale-110 transition-transform" aria-hidden="true">+</span>
          <span class="text-xs font-bold tracking-wide" style="font-family: 'Syne', sans-serif">New Payment</span>
        </RouterLink>

        <RouterLink
          to="/history"
          class="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[#111520] hover:bg-white/[0.05] active:bg-white/[0.03] text-white py-5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f14]"
          aria-label="View all transaction history"
        >
          <span class="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.04] flex items-center justify-center text-slate-400" aria-hidden="true">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path d="M0 1h16M0 6h10M0 11h13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="text-xs font-bold text-slate-300 tracking-wide" style="font-family: 'Syne', sans-serif">History</span>
        </RouterLink>
      </section>

      <!-- ── Recent Transactions ───────────────────────────── -->
      <section
        class="card-enter rounded-2xl border border-white/[0.07] bg-[#111520] overflow-hidden"
        :class="{ 'card-enter-active': mounted }"
        style="--delay: 120ms"
        aria-label="Recent transactions"
        aria-live="polite"
      >
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 class="text-[10px] font-mono text-slate-500 uppercase tracking-[0.18em]">Recent</h2>
          <RouterLink
            to="/history"
            class="text-[11px] font-mono font-semibold text-emerald-400 hover:text-emerald-300 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
            aria-label="View all transactions"
          >
            View all →
          </RouterLink>
        </div>

        <!-- Loading skeletons -->
        <ul v-if="loading" aria-label="Loading transactions" class="divide-y divide-white/[0.04]">
          <li
            v-for="n in 4"
            :key="n"
            class="px-5 py-4 flex items-center justify-between animate-pulse"
            aria-hidden="true"
          >
            <div class="space-y-2">
              <div class="h-4 bg-white/5 rounded w-24"></div>
              <div class="h-3 bg-white/5 rounded w-16"></div>
            </div>
            <div class="h-5 bg-white/5 rounded-full w-18"></div>
          </li>
        </ul>

        <!-- Empty state -->
        <div
          v-else-if="recentTransactions.length === 0"
          class="flex flex-col items-center justify-center py-12 text-center px-4"
        >
          <div class="w-11 h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-3" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="3" width="16" height="12" rx="2" stroke="#475569" stroke-width="1.4"/>
              <path d="M1 7h16" stroke="#475569" stroke-width="1.4"/>
            </svg>
          </div>
          <p class="text-sm font-semibold text-slate-500" style="font-family: 'Syne', sans-serif">No transactions yet</p>
          <p class="text-xs text-slate-600 mt-1">Your payment activity will appear here.</p>
        </div>

        <!-- Transaction list -->
        <ul v-else class="divide-y divide-white/[0.04]">
          <li
            v-for="tx in recentTransactions"
            :key="tx.id"
            class="group"
          >
            <button
              class="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-white/[0.025] active:bg-white/[0.04] transition-colors focus:outline-none focus-visible:bg-white/[0.025]"
              @click="router.push({ name: 'transaction.show', params: { id: tx.id } })"
              :aria-label="`View transaction of ₱${formatAmount(tx.amount_centavos)}, status: ${getStatus(tx.status).label}`"
            >
              <!-- Left: amount + note -->
              <div class="min-w-0 flex-1">
                <p
                  class="text-sm font-bold text-white tabular-nums"
                  style="font-family: 'DM Mono', monospace"
                >
                  <span class="text-slate-500 text-xs mr-0.5" aria-hidden="true">₱</span>{{ formatAmount(tx.amount_centavos) }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5 truncate max-w-[160px]">
                  {{ tx.notes ?? tx.payment_method }}
                </p>
              </div>

              <!-- Right: status pill + timestamp + chevron -->
              <div class="flex flex-col items-end gap-1.5 ml-3 shrink-0">
                <span
                  :class="['inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full border', getStatus(tx.status).pill]"
                >
                  <span class="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
                    <span
                      v-if="['pending','fraud_check'].includes(tx.status)"
                      :class="['animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', getStatus(tx.status).dot]"
                    ></span>
                    <span :class="['relative inline-flex rounded-full h-1.5 w-1.5', getStatus(tx.status).dot]"></span>
                  </span>
                  {{ getStatus(tx.status).label }}
                </span>
                <span class="text-[10px] font-mono text-slate-600">{{ formatDate(tx.created_at) }}</span>
              </div>
            </button>
          </li>
        </ul>
      </section>

    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500;600&display=swap');

.dash-root {
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.card-enter {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 360ms ease, transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--delay, 0ms);
}

.card-enter-active {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .card-enter,
  .card-enter-active {
    transition: none;
    transform: none;
    opacity: 1;
  }
}
</style>