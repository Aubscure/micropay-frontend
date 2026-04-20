<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getTransactions } from '@/api/transactions'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const router = useRouter()
const auth = useAuthStore()
const { isOnline, isSyncing } = useNetworkStatus()

const transactions = ref([])
const loading = ref(true)
let pollInterval = null

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

onMounted(fetchTransactions)
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
const pendingCount = computed(() =>
  transactions.value.filter(tx => ['pending', 'fraud_check'].includes(tx.status)).length
)

function formatAmount(centavos) {
  return (centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_CONFIG = {
  pending:     { label: 'Pending',      icon: '⏳', cls: 'bg-amber-50  text-amber-700  ring-amber-200'  },
  fraud_check: { label: 'Fraud Check',  icon: '🔍', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  cleared:     { label: 'Cleared',      icon: '✔️',  cls: 'bg-sky-50   text-sky-700    ring-sky-200'    },
  settled:     { label: 'Settled',      icon: '💚',  cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  flagged:     { label: 'Flagged',      icon: '🚩', cls: 'bg-red-50   text-red-700    ring-red-200'    },
  rejected:    { label: 'Rejected',     icon: '✖',  cls: 'bg-slate-50 text-slate-600  ring-slate-200'  },
}

function getStatus(status) {
  return STATUS_CONFIG[status] ?? { label: status, icon: '•', cls: 'bg-slate-50 text-slate-600 ring-slate-200' }
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
  <div class="min-h-screen bg-slate-100 font-sans">

    <!-- ── Top bar ─────────────────────────────────────────── -->
    <header class="bg-slate-900 text-white shadow-lg">
      <div class="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">

        <div class="flex items-center gap-2.5">
          <!-- Brand mark -->
          <span
            class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-900 font-black text-sm leading-none select-none"
            aria-hidden="true"
          >M</span>
          <span class="font-bold text-lg tracking-tight">MicroPay</span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Network status pill -->
          <span
            v-if="!isOnline"
            class="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-amber-400/30"
            role="status"
            aria-label="You are offline"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true"></span>
            Offline
          </span>
          <span
            v-if="isSyncing"
            class="inline-flex items-center gap-1 bg-sky-400/20 text-sky-300 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-sky-400/30"
            role="status"
            aria-label="Syncing transactions"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" aria-hidden="true"></span>
            Syncing
          </span>

          <!-- User chip -->
          <div class="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
            <span class="text-xs text-slate-300 max-w-[80px] truncate" :title="auth.user?.name">
              {{ auth.user?.name }}
            </span>
            <button
              @click="handleLogout"
              class="text-xs text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
              aria-label="Log out"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-6 space-y-5">

      <!-- ── Greeting + Stats ──────────────────────────────── -->
      <section aria-label="Account summary">
        <div class="bg-slate-800 rounded-2xl p-5 text-white shadow-md">

          <p class="text-xs text-slate-400 uppercase tracking-widest font-semibold">Welcome back</p>
          <p class="text-xl font-bold mt-0.5">{{ userFirstName }}</p>

          <div class="grid grid-cols-2 gap-3 mt-4">
            <div class="bg-white/5 rounded-xl p-3">
              <p class="text-xs text-slate-400">Total Settled</p>
              <p class="text-lg font-bold text-emerald-400 mt-0.5 tabular-nums">
                ₱{{ formatAmount(totalSettled) }}
              </p>
            </div>
            <div class="bg-white/5 rounded-xl p-3">
              <p class="text-xs text-slate-400">Pending</p>
              <p class="text-lg font-bold text-amber-400 mt-0.5">
                {{ pendingCount }} txn{{ pendingCount !== 1 ? 's' : '' }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Actions ───────────────────────────────────────── -->
      <section aria-label="Quick actions">
        <div class="grid grid-cols-2 gap-3">
          <RouterLink
            to="/pay"
            class="group flex flex-col items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white rounded-2xl py-5 shadow-md shadow-emerald-500/20 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Start a new payment"
          >
            <span class="text-2xl group-hover:scale-110 transition-transform" aria-hidden="true">+</span>
            <span class="text-sm font-semibold">New Payment</span>
          </RouterLink>

          <RouterLink
            to="/history"
            class="flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 rounded-2xl py-5 shadow-md transition-all duration-150 border border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="View all transaction history"
          >
            <span class="text-2xl" aria-hidden="true">≡</span>
            <span class="text-sm font-semibold">History</span>
          </RouterLink>
        </div>
      </section>

      <!-- ── Recent transactions ───────────────────────────── -->
      <section aria-label="Recent transactions" aria-live="polite">
        <div class="bg-white rounded-2xl shadow-md overflow-hidden">

          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wide">Recent</h2>
            <RouterLink
              to="/history"
              class="text-xs text-emerald-600 font-semibold hover:text-emerald-500 transition-colors"
              aria-label="View all transactions"
            >
              View all →
            </RouterLink>
          </div>

          <!-- Loading skeletons -->
          <ul v-if="loading" aria-label="Loading transactions" class="divide-y divide-slate-100">
            <li
              v-for="n in 4"
              :key="n"
              class="px-5 py-4 flex items-center justify-between animate-pulse"
              aria-hidden="true"
            >
              <div class="space-y-2">
                <div class="h-3.5 bg-slate-100 rounded w-24"></div>
                <div class="h-3 bg-slate-100 rounded w-16"></div>
              </div>
              <div class="h-6 bg-slate-100 rounded-full w-16"></div>
            </li>
          </ul>

          <!-- Empty state -->
          <div
            v-else-if="transactions.length === 0"
            class="flex flex-col items-center justify-center py-12 text-center px-4"
          >
            <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-3" aria-hidden="true">💳</div>
            <p class="text-sm font-semibold text-slate-600">No transactions yet</p>
            <p class="text-xs text-slate-400 mt-1">Your payment activity will appear here.</p>
          </div>

          <!-- Transaction list -->
          <ul v-else class="divide-y divide-slate-100">
            <li
              v-for="tx in transactions.slice(0, 8)"
              :key="tx.id"
              class="group flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors focus-within:bg-slate-50"
            >
              <button
                class="flex items-center justify-between w-full text-left focus:outline-none"
                @click="router.push({ name: 'transaction.show', params: { id: tx.id } })"
                :aria-label="`View transaction of ₱${formatAmount(tx.amount_centavos)}, status: ${getStatus(tx.status).label}`"
              >
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-slate-800 tabular-nums">
                    ₱{{ formatAmount(tx.amount_centavos) }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">
                    {{ tx.notes ?? tx.payment_method }}
                  </p>
                </div>

                <div class="flex items-center gap-2 ml-3 shrink-0">
                  <span
                    :class="['inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ring-1', getStatus(tx.status).cls]"
                  >
                    <span aria-hidden="true">{{ getStatus(tx.status).icon }}</span>
                    {{ getStatus(tx.status).label }}
                  </span>
                  <span class="text-slate-300 group-hover:text-slate-500 transition-colors text-xs" aria-hidden="true">›</span>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </section>

    </main>
  </div>
</template>