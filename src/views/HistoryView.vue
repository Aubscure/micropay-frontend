<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getTransactions } from '@/api/transactions'

const router     = useRouter()
const transactions = ref([])
const loading    = ref(true)
const mounted    = ref(false)
const filter     = ref('all') // 'all' | status key
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

onMounted(() => {
  requestAnimationFrame(() => { mounted.value = true })
  fetchTransactions()
})
onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })

// ── Status config ────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   pill: 'border-amber-400/40  text-amber-300',   tab: 'border-amber-400/40  text-amber-300'    },
  fraud_check: { label: 'Fraud Check', dot: 'bg-orange-400',  pill: 'border-orange-400/40 text-orange-300',  tab: 'border-orange-400/40 text-orange-300'   },
  cleared:     { label: 'Cleared',     dot: 'bg-sky-400',     pill: 'border-sky-400/40    text-sky-300',     tab: 'border-sky-400/40    text-sky-300'      },
  settled:     { label: 'Settled',     dot: 'bg-emerald-400', pill: 'border-emerald-400/40 text-emerald-300', tab: 'border-emerald-400/40 text-emerald-300' },
  flagged:     { label: 'Flagged',     dot: 'bg-red-400',     pill: 'border-red-400/40    text-red-300',     tab: 'border-red-400/40    text-red-300'      },
  rejected:    { label: 'Rejected',    dot: 'bg-slate-500',   pill: 'border-slate-500/40  text-slate-400',   tab: 'border-slate-500/40  text-slate-400'    },
}

function getStatus(status) {
  return STATUS_CONFIG[status] ?? {
    label: status,
    dot: 'bg-slate-500',
    pill: 'border-slate-500/40 text-slate-400',
    tab:  'border-slate-500/40 text-slate-400',
  }
}

// ── Derived ──────────────────────────────────────────────────────

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
  return (centavos / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-PH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="hist-root min-h-screen bg-[#0c0f14] font-sans">

    <!-- ── Header ────────────────────────────────────────────── -->
    <header class="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0c0f14]/90 backdrop-blur-md">
      <div class="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
        <button
          @click="router.back()"
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-0.5">Payment Gateway</p>
          <h1 class="text-sm font-bold text-white leading-none" style="font-family: 'Syne', sans-serif">
            Transaction History
          </h1>
        </div>

        <!-- Total count badge -->
        <span
          v-if="!loading && transactions.length > 0"
          class="text-[11px] font-mono text-slate-500 border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 rounded-full"
          aria-label="Total transaction count"
        >
          {{ transactions.length }}
        </span>
      </div>

      <!-- ── Filter tabs ──────────────────────────────────── -->
      <div
        class="max-w-lg mx-auto overflow-x-auto scrollbar-none"
        role="tablist"
        aria-label="Filter transactions by status"
      >
        <div class="flex gap-1.5 px-4 pb-3 pt-0.5 w-max min-w-full">
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            role="tab"
            :aria-selected="filter === tab.key"
            :class="[
              'shrink-0 flex items-center gap-1.5 text-[11px] font-mono font-semibold px-3 py-1.5 rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 whitespace-nowrap',
              filter === tab.key
                ? tab.key === 'all'
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300'
                  : `${getStatus(tab.key).tab} bg-white/[0.06]`
                : 'border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.14]'
            ]"
            @click="filter = tab.key"
          >
            <!-- Active dot for non-all tabs -->
            <span
              v-if="tab.key !== 'all'"
              :class="['w-1.5 h-1.5 rounded-full shrink-0', getStatus(tab.key).dot, filter !== tab.key && 'opacity-30']"
              aria-hidden="true"
            ></span>

            {{ tab.label }}

            <span
              :class="[
                'text-[10px] rounded-full px-1.5 py-0.5 leading-none',
                filter === tab.key
                  ? 'bg-white/[0.12] text-current'
                  : 'bg-white/[0.04] text-slate-600'
              ]"
            >{{ tab.count }}</span>
          </button>
        </div>
      </div>
    </header>

    <main
      class="max-w-lg mx-auto px-4 py-4"
      aria-live="polite"
    >

      <!-- Loading skeletons -->
      <ul v-if="loading" aria-label="Loading transactions" class="space-y-2">
        <li
          v-for="n in 5"
          :key="n"
          class="rounded-2xl border border-white/[0.05] bg-[#111520] p-5 flex items-center justify-between animate-pulse"
          aria-hidden="true"
        >
          <div class="space-y-2 flex-1">
            <div class="h-4 bg-white/5 rounded w-28"></div>
            <div class="h-3 bg-white/5 rounded w-20"></div>
            <div class="h-3 bg-white/5 rounded w-24 mt-1"></div>
          </div>
          <div class="h-6 bg-white/5 rounded-full w-20 ml-4"></div>
        </li>
      </ul>

      <!-- Empty state -->
      <div
        v-else-if="filtered.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
        role="status"
      >
        <div
          class="w-12 h-12 rounded-2xl border border-white/[0.07] bg-white/[0.03] flex items-center justify-center mb-4"
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="#475569" stroke-width="1.5"/>
            <path d="M13.5 13.5L17 17" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="text-sm font-bold text-slate-500" style="font-family: 'Syne', sans-serif">
          {{ filter === 'all' ? 'No transactions yet' : `No ${getStatus(filter).label} transactions` }}
        </p>
        <p class="text-xs text-slate-600 mt-1.5 max-w-[200px]">
          {{ filter === 'all' ? 'Your payment history will appear here.' : 'Try a different filter above.' }}
        </p>
        <button
          v-if="filter !== 'all'"
          @click="filter = 'all'"
          class="mt-4 text-[11px] font-mono font-semibold text-emerald-400 hover:text-emerald-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
        >
          Show all →
        </button>
      </div>

      <!-- Transaction list -->
      <ul v-else class="space-y-2">
        <li
          v-for="(tx, idx) in filtered"
          :key="tx.id"
          class="hist-item rounded-2xl border border-white/[0.07] bg-[#111520] overflow-hidden group"
          :class="{ 'hist-item-active': mounted }"
          :style="`--item-delay: ${Math.min(idx * 35, 280)}ms`"
        >
          <button
            class="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-white/[0.025] active:bg-white/[0.04] transition-colors focus:outline-none focus-visible:bg-white/[0.025]"
            @click="router.push({ name: 'transaction.show', params: { id: tx.id } })"
            :aria-label="`View ₱${formatAmount(tx.amount_centavos)} transaction — ${getStatus(tx.status).label}`"
          >
            <!-- Left column -->
            <div class="min-w-0 flex-1">
              <!-- Amount -->
              <p
                class="text-base font-black text-white tabular-nums leading-tight"
                style="font-family: 'DM Mono', monospace"
              >
                <span class="text-slate-600 text-sm mr-0.5" aria-hidden="true">₱</span>{{ formatAmount(tx.amount_centavos) }}
              </p>

              <!-- Note or method -->
              <p class="text-[11px] text-slate-500 mt-1 truncate max-w-[180px]">
                {{ tx.notes ?? tx.payment_method }}
              </p>

              <!-- Date -->
              <p class="text-[10px] font-mono text-slate-600 mt-1.5">{{ formatDate(tx.created_at) }}</p>
            </div>

            <!-- Right column: status + chevron -->
            <div class="flex items-center gap-2 ml-4 mt-0.5 shrink-0">
              <span
                :class="['inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2.5 py-1.5 rounded-full border', getStatus(tx.status).pill]"
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

              <svg
                class="text-slate-700 group-hover:text-slate-400 transition-colors shrink-0"
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                aria-hidden="true"
              >
                <path d="M5 2l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </button>
        </li>
      </ul>

    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500;600&display=swap');

.hist-root {
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Hide scrollbar on filter tab row */
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}

/* List item entrance — staggered per item */
.hist-item {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 300ms ease, transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--item-delay, 0ms);
}

.hist-item-active {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .hist-item,
  .hist-item-active {
    transition: none;
    transform: none;
    opacity: 1;
  }
}
</style>