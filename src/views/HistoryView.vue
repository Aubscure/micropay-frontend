<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getTransactions } from '@/api/transactions'

const router       = useRouter()
const transactions = ref([])
const loading      = ref(true)
const mounted      = ref(false)
const filter       = ref('all')
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

// ── Status config — light-mode tokens to match Dashboard ────────
const STATUS_CONFIG = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   pill: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200',   tab: 'bg-amber-50   text-amber-700   border-amber-200'   },
  fraud_check: { label: 'Fraud Check', dot: 'bg-orange-400',  pill: 'bg-orange-50  text-orange-700  ring-1 ring-orange-200',  tab: 'bg-orange-50  text-orange-700  border-orange-200'  },
  cleared:     { label: 'Cleared',     dot: 'bg-sky-400',     pill: 'bg-sky-50     text-sky-700     ring-1 ring-sky-200',     tab: 'bg-sky-50     text-sky-700     border-sky-200'     },
  settled:     { label: 'Settled',     dot: 'bg-emerald-400', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', tab: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  flagged:     { label: 'Flagged',     dot: 'bg-red-400',     pill: 'bg-red-50     text-red-700     ring-1 ring-red-200',     tab: 'bg-red-50     text-red-700     border-red-200'     },
  rejected:    { label: 'Rejected',    dot: 'bg-slate-300',   pill: 'bg-slate-50   text-slate-500   ring-1 ring-slate-200',   tab: 'bg-slate-50   text-slate-500   border-slate-200'   },
}

function getStatus(status) {
  return STATUS_CONFIG[status] ?? {
    label: status,
    dot:  'bg-slate-300',
    pill: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',
    tab:  'bg-slate-50 text-slate-500 border-slate-200',
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

const METHOD_ICON = { qr_code: '▦', nfc: '⬡', manual_entry: '⌨' }
function methodIcon(m) { return METHOD_ICON[m] ?? '•' }

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
  <div
    class="min-h-screen bg-[#F1F5F9] text-slate-900"
    style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif;"
  >

    <!-- ── Sticky header ─────────────────────────────────────── -->
    <header
      class="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80"
      role="banner"
    >
      <div class="max-w-lg mx-auto px-4 h-[56px] flex items-center gap-3">

        <!-- Back -->
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
          <h1 class="text-[15px] font-bold text-slate-800 leading-none">Transaction History</h1>
        </div>

        <!-- Count badge -->
        <span
          v-if="!loading && transactions.length > 0"
          class="text-[11px] font-semibold text-slate-500 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-full tabular-nums"
          aria-label="Total transaction count"
        >{{ transactions.length }}</span>

      </div>

      <!-- ── Filter tabs ────────────────────────────────────── -->
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
              'shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 whitespace-nowrap',
              filter === tab.key
                ? tab.key === 'all'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : getStatus(tab.key).tab
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'
            ]"
            @click="filter = tab.key"
          >
            <span
              v-if="tab.key !== 'all'"
              :class="['w-1.5 h-1.5 rounded-full shrink-0', getStatus(tab.key).dot, filter !== tab.key && 'opacity-30']"
              aria-hidden="true"
            ></span>
            {{ tab.label }}
            <span
              :class="[
                'text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none',
                filter === tab.key ? 'bg-black/[0.07] text-current' : 'bg-slate-100 text-slate-400'
              ]"
            >{{ tab.count }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-4" aria-live="polite">

      <!-- ── Loading skeletons ─────────────────────────────── -->
      <ul v-if="loading" aria-label="Loading transactions" class="space-y-2">
        <li
          v-for="n in 5"
          :key="n"
          class="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-center gap-3 animate-pulse"
          style="box-shadow: 0 1px 4px rgba(0,0,0,0.05)"
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

      <!-- ── Empty state ───────────────────────────────────── -->
      <div
        v-else-if="filtered.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
        role="status"
      >
        <div
          class="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4"
          style="box-shadow: 0 1px 4px rgba(0,0,0,0.05)"
          aria-hidden="true"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="10" cy="10" r="6.5" stroke="#CBD5E1" stroke-width="1.5"/>
            <path d="M15 15L19 19" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="text-sm font-bold text-slate-600">
          {{ filter === 'all' ? 'No transactions yet' : `No ${getStatus(filter).label} transactions` }}
        </p>
        <p class="text-xs text-slate-400 mt-1.5 max-w-[200px]">
          {{ filter === 'all' ? 'Your payment history will appear here.' : 'Try a different filter above.' }}
        </p>
        <button
          v-if="filter !== 'all'"
          @click="filter = 'all'"
          class="mt-4 text-[12px] font-semibold text-emerald-600 hover:text-emerald-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
        >Show all →</button>
      </div>

      <!-- ── Transaction list ──────────────────────────────── -->
      <div
        v-else
        class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden"
        style="box-shadow: 0 1px 4px rgba(0,0,0,0.06)"
      >
        <ul role="list">
          <li
            v-for="(tx, idx) in filtered"
            :key="tx.id"
            class="hist-item border-b border-slate-100 last:border-0 group"
            :class="{ 'hist-item-active': mounted }"
            :style="`--item-delay: ${Math.min(idx * 35, 280)}ms`"
          >
            <button
              class="w-full flex items-center gap-3 px-4 py-[14px] hover:bg-slate-50 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
              @click="router.push({ name: 'transaction.show', params: { id: tx.id } })"
              :aria-label="`₱${formatAmount(tx.amount_centavos)} — ${getStatus(tx.status).label}`"
            >
              <!-- Method icon -->
              <div
                class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[18px] shrink-0"
                aria-hidden="true"
              >{{ methodIcon(tx.payment_method) }}</div>

              <!-- Label + date -->
              <div class="flex-1 min-w-0">
                <p class="text-[14px] font-semibold text-slate-800 truncate leading-snug">
                  {{ tx.notes ?? tx.payment_method ?? 'Payment' }}
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5 leading-none">{{ formatDate(tx.created_at) }}</p>
              </div>

              <!-- Amount + status badge -->
              <div class="text-right shrink-0 space-y-1.5">
                <p class="text-[14px] font-bold text-slate-900 tabular-nums leading-snug">
                  ₱{{ formatAmount(tx.amount_centavos) }}
                </p>
                <span
                  :class="[
                    'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
                    getStatus(tx.status).pill,
                  ]"
                >
                  <span
                    :class="[
                      'w-1.5 h-1.5 rounded-full bg-current',
                      ['pending','fraud_check'].includes(tx.status) ? 'animate-pulse' : 'opacity-60'
                    ]"
                    aria-hidden="true"
                  ></span>
                  {{ getStatus(tx.status).label }}
                </span>
              </div>

              <!-- Chevron -->
              <svg
                class="text-slate-300 group-hover:text-slate-400 transition-colors shrink-0 ml-1"
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                aria-hidden="true"
              >
                <path d="M5 2l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </li>
        </ul>
      </div>

    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar { display: none; }

/* Staggered list entrance — identical easing to Dashboard */
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
  .hist-item, .hist-item-active {
    transition: none; transform: none; opacity: 1;
  }
}
</style>