<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTransaction } from '@/api/transactions'

const route  = useRoute()
const router = useRouter()

const transaction = ref(null)
const loading     = ref(true)
const error       = ref(null)

onMounted(async () => {
  try {
    const response = await getTransaction(route.params.id)
    transaction.value = response.data.data
  } catch (err) {
    // Expose only the user-facing message — never raw error objects
    error.value = err.response?.data?.message ?? 'This transaction could not be loaded.'
  } finally {
    loading.value = false
  }
})

// ── Helpers ──────────────────────────────────────────────────────

function formatAmount(centavos) {
  return (centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatRuleName(rule) {
  return String(rule)
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const PAYMENT_METHODS = {
  qr_code:      { label: 'QR Code',      icon: '▦' },
  nfc:          { label: 'NFC Tap',       icon: '📶' },
  manual_entry: { label: 'Manual Entry',  icon: '⌨️' },
}

const paymentMethod = computed(() => {
  const m = transaction.value?.payment_method
  return PAYMENT_METHODS[m] ?? { label: m ?? '—', icon: '•' }
})

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

// Risk score: 0–49 low, 50–74 medium, 75+ high
function riskLevel(score) {
  const n = parseFloat(score)
  if (n >= 0.75) return { label: 'High',   bar: 'bg-red-500',    text: 'text-red-600 font-bold'   }
  if (n >= 0.50) return { label: 'Medium', bar: 'bg-orange-400', text: 'text-orange-600 font-semibold' }
  return              { label: 'Low',    bar: 'bg-emerald-400', text: 'text-emerald-600' }
}

function sourceBadge(source) {
  return source === 'ai_agent'
    ? { label: 'AI Agent',    cls: 'bg-purple-50 text-purple-700 ring-purple-200', icon: '🤖' }
    : { label: 'Rule Engine', cls: 'bg-sky-50    text-sky-700    ring-sky-200',    icon: '⚙️' }
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
        <h1 class="font-bold text-lg tracking-tight">Transaction Detail</h1>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-6 space-y-4">

      <!-- ── Loading ──────────────────────────────────────────── -->
      <div v-if="loading" aria-live="polite" aria-busy="true" class="space-y-4">
        <div class="bg-white rounded-2xl shadow p-5 animate-pulse space-y-4">
          <div class="flex justify-between">
            <div class="space-y-2">
              <div class="h-9 bg-slate-100 rounded w-40"></div>
              <div class="h-3 bg-slate-100 rounded w-16"></div>
            </div>
            <div class="h-7 bg-slate-100 rounded-full w-24"></div>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow p-5 animate-pulse space-y-3">
          <div class="h-3 bg-slate-100 rounded w-16"></div>
          <div v-for="n in 4" :key="n" class="flex justify-between">
            <div class="h-3 bg-slate-100 rounded w-24"></div>
            <div class="h-3 bg-slate-100 rounded w-28"></div>
          </div>
        </div>
      </div>

      <!-- ── Error ─────────────────────────────────────────────── -->
      <div
        v-else-if="error"
        class="bg-white rounded-2xl shadow p-8 text-center space-y-3"
        role="alert"
      >
        <div class="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-3xl mx-auto" aria-hidden="true">⚠️</div>
        <p class="text-sm font-semibold text-slate-700">{{ error }}</p>
        <button
          @click="router.back()"
          class="text-sm text-emerald-600 hover:text-emerald-500 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
        >
          ← Go back
        </button>
      </div>

      <!-- ── Main content ─────────────────────────────────────── -->
      <template v-else-if="transaction">

        <!-- Amount + Status card -->
        <section class="bg-white rounded-2xl shadow-md p-5" aria-label="Transaction summary">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                ₱{{ formatAmount(transaction.amount_centavos) }}
              </p>
              <p class="text-xs text-slate-400 mt-1">{{ transaction.currency }}</p>
            </div>
            <span
              :class="['inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ring-1 capitalize shrink-0 mt-1', getStatus(transaction.status).cls]"
              role="status"
              :aria-label="`Status: ${getStatus(transaction.status).label}`"
            >
              <span aria-hidden="true">{{ getStatus(transaction.status).icon }}</span>
              {{ getStatus(transaction.status).label }}
            </span>
          </div>

          <!-- Notes -->
          <blockquote
            v-if="transaction.notes"
            class="mt-4 text-sm text-slate-500 italic border-l-2 border-emerald-300 pl-3 pt-3 border-t border-t-slate-100"
          >
            {{ transaction.notes }}
          </blockquote>
        </section>

        <!-- Details card -->
        <section class="bg-white rounded-2xl shadow-md p-5 space-y-4" aria-label="Transaction details">
          <h2 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Details</h2>

          <dl class="space-y-3 text-sm">

            <div class="flex items-center justify-between">
              <dt class="text-slate-500">Payment Method</dt>
              <dd class="text-slate-800 font-medium flex items-center gap-1.5">
                <span aria-hidden="true">{{ paymentMethod.icon }}</span>
                {{ paymentMethod.label }}
              </dd>
            </div>

            <div class="flex items-center justify-between">
              <dt class="text-slate-500">Source</dt>
              <dd class="text-slate-800 font-medium">
                {{ transaction.was_offline ? '📴 Offline (synced)' : '🌐 Online' }}
              </dd>
            </div>

            <div class="flex items-center justify-between" v-if="transaction.initiated_at">
              <dt class="text-slate-500">Initiated</dt>
              <dd class="text-slate-800 font-medium">{{ formatDate(transaction.initiated_at) }}</dd>
            </div>

            <div class="flex items-center justify-between">
              <dt class="text-slate-500">Recorded</dt>
              <dd class="text-slate-800 font-medium">{{ formatDate(transaction.created_at) }}</dd>
            </div>

            <div class="flex items-start justify-between pt-2 border-t border-slate-100">
              <dt class="text-slate-500 shrink-0">Transaction ID</dt>
              <dd
                class="text-slate-400 text-xs font-mono break-all text-right ml-4 select-all"
                aria-label="Transaction ID, select to copy"
              >
                {{ transaction.id }}
              </dd>
            </div>

          </dl>
        </section>

        <!-- Fraud flags card -->
        <section
          v-if="transaction.fraud_flags && transaction.fraud_flags.length > 0"
          class="bg-white rounded-2xl shadow-md p-5 space-y-4"
          aria-label="Fraud detection flags"
        >
          <header class="flex items-center justify-between">
            <h2 class="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-1.5">
              <span aria-hidden="true">🚩</span>
              Fraud Flags
            </h2>
            <span class="text-xs font-bold bg-red-50 text-red-600 ring-1 ring-red-200 px-2 py-0.5 rounded-full">
              {{ transaction.fraud_flags.length }}
            </span>
          </header>

          <ul class="space-y-3">
            <li
              v-for="flag in transaction.fraud_flags"
              :key="flag.id"
              class="border border-slate-100 rounded-xl p-4 space-y-3"
            >
              <!-- Rule name + source badge -->
              <div class="flex items-start justify-between gap-2 flex-wrap">
                <p class="text-sm font-bold text-slate-800">
                  {{ formatRuleName(flag.rule_triggered) }}
                </p>
                <span
                  :class="['inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ring-1', sourceBadge(flag.source).cls]"
                >
                  <span aria-hidden="true">{{ sourceBadge(flag.source).icon }}</span>
                  {{ sourceBadge(flag.source).label }}
                </span>
              </div>

              <!-- Risk score bar -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs text-slate-400">Risk Score</span>
                  <span :class="['text-xs', riskLevel(flag.risk_score).text]">
                    {{ riskLevel(flag.risk_score).label }} — {{ (parseFloat(flag.risk_score) * 100).toFixed(0) }}%
                  </span>
                </div>
                <div
                  class="w-full bg-slate-100 rounded-full h-2 overflow-hidden"
                  role="meter"
                  :aria-valuenow="(parseFloat(flag.risk_score) * 100).toFixed(0)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="`Risk score: ${(parseFloat(flag.risk_score) * 100).toFixed(0)}%`"
                >
                  <div
                    :class="['h-2 rounded-full transition-all duration-500', riskLevel(flag.risk_score).bar]"
                    :style="{ width: (parseFloat(flag.risk_score) * 100) + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Reason text — rendered as text binding, never v-html -->
              <p class="text-xs text-slate-500 leading-relaxed">
                {{ flag.reason }}
              </p>

              <!-- Resolution state -->
              <div class="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <span
                  v-if="flag.resolved"
                  class="text-xs text-emerald-600 font-semibold flex items-center gap-1"
                >
                  <span aria-hidden="true">✅</span>
                  Resolved {{ formatDate(flag.resolved_at) }}
                </span>
                <span
                  v-else
                  class="text-xs text-orange-500 font-semibold flex items-center gap-1"
                >
                  <span aria-hidden="true">⏳</span>
                  Pending review
                </span>
              </div>

            </li>
          </ul>
        </section>

        <!-- No fraud flags -->
        <section
          v-else-if="transaction.fraud_flags"
          class="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center"
          role="status"
          aria-label="No fraud flags detected"
        >
          <p class="text-sm font-semibold text-emerald-700 flex items-center justify-center gap-2">
            <span aria-hidden="true">✅</span>
            No fraud flags on this transaction
          </p>
        </section>

      </template>
    </main>
  </div>
</template>