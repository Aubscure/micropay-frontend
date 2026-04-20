<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getTransactions } from '@/api/transactions'

const router = useRouter()
const transactions = ref([])
const loading = ref(true)
const filter = ref('all') // 'all' | status key
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
    console.warn('[History] Failed to load transactions:', e?.message ?? 'unknown error')
  } finally {
    loading.value = false
  }
}

onMounted(fetchTransactions)
onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })

// ── Derived ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     icon: '⏳', cls: 'bg-amber-50  text-amber-700  ring-amber-200'  },
  fraud_check: { label: 'Fraud Check', icon: '🔍', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  cleared:     { label: 'Cleared',     icon: '✔️',  cls: 'bg-sky-50   text-sky-700    ring-sky-200'    },
  settled:     { label: 'Settled',     icon: '💚',  cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  flagged:     { label: 'Flagged',     icon: '🚩', cls: 'bg-red-50   text-red-700    ring-red-200'    },
  rejected:    { label: 'Rejected',    icon: '✖',  cls: 'bg-slate-50 text-slate-600  ring-slate-200'  },
}

function getStatus(status) {
  return STATUS_CONFIG[status] ?? { label: status, icon: '•', cls: 'bg-slate-50 text-slate-600 ring-slate-200' }
}

const filterTabs = computed(() => {
  const counts = {}
  transactions.value.forEach(tx => {
    counts[tx.status] = (counts[tx.status] ?? 0) + 1
  })
  return [
    { key: 'all', label: 'All', count: transactions.value.length },
    ...Object.keys(counts).map(k => ({ key: k, label: getStatus(k).label, count: counts[k] })),
  ]
})

const filtered = computed(() =>
  filter.value === 'all'
    ? transactions.value
    : transactions.value.filter(tx => tx.status === filter.value)
)

function formatAmount(centavos) {
  return (centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-PH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 font-sans">

    <!-- ── Header ────────────────────────────────────────────── -->
    <header class="bg-slate-900 text-white shadow-lg">
      <div class="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
        <button
          @click="router.back()"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="Go back"
        >
          ←
        </button>
        <h1 class="font-bold text-lg tracking-tight">Transaction History</h1>
      </div>

      <!-- Filter tabs -->
      <div
        class="max-w-lg mx-auto px-4 pb-0 overflow-x-auto"
        role="tablist"
        aria-label="Filter transactions by status"
      >
        <div class="flex gap-1 pb-0">
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            role="tab"
            :aria-selected="filter === tab.key"
            :class="[
              'shrink-0 text-xs font-semibold px-3 py-2 rounded-t-lg transition-colors whitespace-nowrap border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
              filter === tab.key
                ? 'bg-white text-slate-800 border-emerald-400'
                : 'text-slate-400 hover:text-white border-transparent'
            ]"
            @click="filter = tab.key"
          >
            {{ tab.label }}
            <span
              :class="[
                'ml-1.5 text-xs rounded-full px-1.5 py-0.5',
                filter === tab.key ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-slate-400'
              ]"
            >{{ tab.count }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-5" aria-live="polite">

      <!-- Loading skeletons -->
      <ul v-if="loading" aria-label="Loading transactions" class="space-y-3">
        <li
          v-for="n in 5"
          :key="n"
          class="bg-white rounded-2xl p-4 flex items-center justify-between animate-pulse"
          aria-hidden="true"
        >
          <div class="space-y-2 flex-1">
            <div class="h-4 bg-slate-100 rounded w-28"></div>
            <div class="h-3 bg-slate-100 rounded w-20"></div>
            <div class="h-3 bg-slate-100 rounded w-32"></div>
          </div>
          <div class="h-6 bg-slate-100 rounded-full w-20 ml-4"></div>
        </li>
      </ul>

      <!-- Empty state -->
      <div
        v-else-if="filtered.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
        role="status"
      >
        <div class="w-14 h-14 rounded-full bg-white shadow flex items-center justify-center text-3xl mb-4" aria-hidden="true">
          {{ filter === 'all' ? '📭' : '🔎' }}
        </div>
        <p class="text-sm font-semibold text-slate-600">
          {{ filter === 'all' ? 'No transactions yet' : `No ${getStatus(filter).label} transactions` }}
        </p>
        <p class="text-xs text-slate-400 mt-1 max-w-[200px]">
          {{ filter === 'all' ? 'Your payment history will appear here.' : 'Try a different filter above.' }}
        </p>
        <button
          v-if="filter !== 'all'"
          @click="filter = 'all'"
          class="mt-4 text-xs font-semibold text-emerald-600 hover:text-emerald-500 underline"
        >
          Show all
        </button>
      </div>

      <!-- Transaction list -->
      <ul v-else class="space-y-3">
        <li
          v-for="tx in filtered"
          :key="tx.id"
          class="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow"
        >
          <button
            class="w-full flex items-center justify-between px-4 py-4 text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            @click="router.push({ name: 'transaction.show', params: { id: tx.id } })"
            :aria-label="`View ₱${formatAmount(tx.amount_centavos)} transaction — ${getStatus(tx.status).label}`"
          >
            <div class="min-w-0 flex-1">
              <p class="text-base font-bold text-slate-800 tabular-nums">
                ₱{{ formatAmount(tx.amount_centavos) }}
              </p>
              <p class="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">
                {{ tx.notes ?? tx.payment_method }}
              </p>
              <p class="text-xs text-slate-400 mt-0.5">{{ formatDate(tx.created_at) }}</p>
            </div>

            <div class="flex items-center gap-2 ml-3 shrink-0">
              <span
                :class="['inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ring-1', getStatus(tx.status).cls]"
              >
                <span aria-hidden="true">{{ getStatus(tx.status).icon }}</span>
                {{ getStatus(tx.status).label }}
              </span>
              <span class="text-slate-300 group-hover:text-slate-500 transition-colors text-sm" aria-hidden="true">›</span>
            </div>
          </button>
        </li>
      </ul>

    </main>
  </div>
</template>