<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTransaction } from '@/api/transactions'

const route  = useRoute()
const router = useRouter()

const transaction = ref(null)
const loading     = ref(true)
const error       = ref(null)
const mounted     = ref(false)

onMounted(async () => {
  requestAnimationFrame(() => { mounted.value = true })
  try {
    const response = await getTransaction(route.params.id)
    transaction.value = response.data.data
  } catch (err) {
    error.value = err.response?.data?.message ?? 'This transaction could not be loaded.'
  } finally {
    loading.value = false
  }
})

// ── Helpers ──────────────────────────────────────────────────────

function formatAmount(centavos) {
  return (centavos / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
  qr_code:      { label: 'QR Code',     icon: '▦'  },
  nfc:          { label: 'NFC Tap',      icon: '⬡' },
  manual_entry: { label: 'Manual Entry', icon: '⌨' },
}

const paymentMethod = computed(() => {
  const m = transaction.value?.payment_method
  return PAYMENT_METHODS[m] ?? { label: m ?? '—', icon: '•' }
})

// Light-mode status tokens — consistent with Dashboard + HistoryView
const STATUS_CONFIG = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   pill: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200',   accent: '#F59E0B' },
  fraud_check: { label: 'Fraud Check', dot: 'bg-orange-400',  pill: 'bg-orange-50  text-orange-700  ring-1 ring-orange-200',  accent: '#F97316' },
  cleared:     { label: 'Cleared',     dot: 'bg-sky-400',     pill: 'bg-sky-50     text-sky-700     ring-1 ring-sky-200',     accent: '#38BDF8' },
  settled:     { label: 'Settled',     dot: 'bg-emerald-400', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', accent: '#10B981' },
  flagged:     { label: 'Flagged',     dot: 'bg-red-400',     pill: 'bg-red-50     text-red-700     ring-1 ring-red-200',     accent: '#EF4444' },
  rejected:    { label: 'Rejected',    dot: 'bg-slate-300',   pill: 'bg-slate-50   text-slate-500   ring-1 ring-slate-200',   accent: '#94A3B8' },
}

function getStatus(status) {
  return STATUS_CONFIG[status] ?? {
    label: status, dot: 'bg-slate-300',
    pill: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200', accent: '#94A3B8',
  }
}

// Risk levels — adapted for light background
function riskLevel(score) {
  const n = parseFloat(score)
  if (n >= 0.75) return { label: 'High',   color: 'text-red-600',     track: 'bg-red-400'    }
  if (n >= 0.50) return { label: 'Medium', color: 'text-orange-600',  track: 'bg-orange-400' }
  return              { label: 'Low',    color: 'text-emerald-600', track: 'bg-emerald-400'}
}

function sourceBadge(source) {
  return source === 'ai_agent'
    ? { label: 'AI Agent',    cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200', icon: '⬡' }
    : { label: 'Rule Engine', cls: 'bg-sky-50    text-sky-700    ring-1 ring-sky-200',    icon: '⚙' }
}

function riskSegments(score) {
  const filled = Math.round(parseFloat(score) * 10)
  return Array.from({ length: 10 }, (_, i) => i < filled)
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

        <button
          @click="router.back()"
          class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 leading-none mb-0.5">MicroPay</p>
          <h1 class="text-[15px] font-bold text-slate-800 leading-none truncate">Transaction Detail</h1>
        </div>

      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-5 space-y-3">

      <!-- ── Loading skeleton ──────────────────────────────── -->
      <div v-if="loading" aria-live="polite" aria-busy="true" class="space-y-3">
        <div
          class="rounded-2xl border border-slate-200/80 bg-white p-6 animate-pulse space-y-4"
          style="box-shadow: 0 1px 4px rgba(0,0,0,0.06)"
        >
          <div class="h-11 bg-slate-100 rounded-lg w-44"></div>
          <div class="h-3 bg-slate-100 rounded w-16"></div>
          <div class="flex justify-between mt-3">
            <div class="h-6 bg-slate-100 rounded-full w-24"></div>
            <div class="h-3 bg-slate-100 rounded w-20 self-end"></div>
          </div>
        </div>
        <div
          class="rounded-2xl border border-slate-200/80 bg-white p-6 animate-pulse space-y-4"
          style="box-shadow: 0 1px 4px rgba(0,0,0,0.06)"
        >
          <div class="h-3 bg-slate-100 rounded w-14"></div>
          <div v-for="n in 4" :key="n" class="flex justify-between">
            <div class="h-3 bg-slate-100 rounded w-24"></div>
            <div class="h-3 bg-slate-100 rounded w-32"></div>
          </div>
        </div>
      </div>

      <!-- ── Error state ───────────────────────────────────── -->
      <div
        v-else-if="error"
        class="rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-4"
        role="alert"
      >
        <div
          class="w-12 h-12 rounded-2xl border border-red-200 bg-white flex items-center justify-center text-xl mx-auto"
          aria-hidden="true"
        >⚠</div>
        <div class="space-y-1">
          <p class="text-sm font-bold text-red-700">Failed to load transaction</p>
          <p class="text-xs text-red-500">{{ error }}</p>
        </div>
        <button
          @click="router.back()"
          class="text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
        >← Back</button>
      </div>

      <!-- ── Main content ──────────────────────────────────── -->
      <template v-else-if="transaction">

        <!-- ─ Hero: Amount + Status ──────────────────────── -->
        <section
          class="card-enter rounded-2xl bg-white border border-slate-200/80 overflow-hidden"
          aria-label="Transaction summary"
          :class="{ 'card-enter-active': mounted }"
          style="--delay: 0ms; box-shadow: 0 1px 4px rgba(0,0,0,0.06)"
        >
          <!-- Status-colored accent bar -->
          <div
            :class="['h-[3px] w-full', getStatus(transaction.status).dot]"
            aria-hidden="true"
          ></div>

          <div class="p-6">
            <!-- Currency eyebrow -->
            <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
              {{ transaction.currency ?? 'PHP' }}
            </p>

            <!-- Hero amount -->
            <p
              class="text-[2.75rem] leading-none font-black text-slate-900 tabular-nums tracking-tight mb-4"
              :aria-label="`Amount: ${formatAmount(transaction.amount_centavos)} ${transaction.currency ?? 'PHP'}`"
            >
              <span class="text-2xl text-slate-300 mr-1" aria-hidden="true">₱</span>{{ formatAmount(transaction.amount_centavos) }}
            </p>

            <!-- Status pill + timestamp -->
            <div class="flex items-center justify-between flex-wrap gap-3">
              <span
                :class="[
                  'inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full',
                  getStatus(transaction.status).pill
                ]"
                role="status"
                :aria-label="`Status: ${getStatus(transaction.status).label}`"
              >
                <span class="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span
                    v-if="['pending','fraud_check'].includes(transaction.status)"
                    :class="['animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current']"
                  ></span>
                  <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                </span>
                {{ getStatus(transaction.status).label }}
              </span>
              <span class="text-[12px] font-medium text-slate-400">
                {{ formatDate(transaction.created_at) }}
              </span>
            </div>

            <!-- Notes -->
            <blockquote
              v-if="transaction.notes"
              class="mt-5 pt-4 border-t border-slate-100 text-sm text-slate-500 italic leading-relaxed"
            >
              "{{ transaction.notes }}"
            </blockquote>
          </div>
        </section>

        <!-- ─ Details ────────────────────────────────────── -->
        <section
          class="card-enter rounded-2xl bg-white border border-slate-200/80 p-6"
          aria-label="Transaction details"
          :class="{ 'card-enter-active': mounted }"
          style="--delay: 60ms; box-shadow: 0 1px 4px rgba(0,0,0,0.06)"
        >
          <h2 class="section-label">Details</h2>

          <dl class="mt-4 divide-y divide-slate-100">

            <div class="row-item">
              <dt>Payment Method</dt>
              <dd>
                <span aria-hidden="true" class="mr-1">{{ paymentMethod.icon }}</span>
                {{ paymentMethod.label }}
              </dd>
            </div>

            <div class="row-item">
              <dt>Source</dt>
              <dd>
                <span aria-hidden="true" class="mr-1">{{ transaction.was_offline ? '📴' : '🌐' }}</span>
                {{ transaction.was_offline ? 'Offline (synced)' : 'Online' }}
              </dd>
            </div>

            <div v-if="transaction.initiated_at" class="row-item">
              <dt>Initiated</dt>
              <dd class="font-mono text-[12px]">{{ formatDate(transaction.initiated_at) }}</dd>
            </div>

            <div class="row-item">
              <dt>Recorded</dt>
              <dd class="font-mono text-[12px]">{{ formatDate(transaction.created_at) }}</dd>
            </div>

            <!-- Transaction ID — selectable for copy -->
            <div class="flex items-start justify-between gap-4 py-4">
              <dt class="text-[12px] text-slate-400 shrink-0 pt-px">Transaction ID</dt>
              <dd
                class="text-[11px] font-mono text-slate-500 break-all text-right select-all cursor-text leading-relaxed"
                aria-label="Transaction ID, select to copy"
              >{{ transaction.id }}</dd>
            </div>

          </dl>
        </section>

        <!-- ─ Fraud Flags ─────────────────────────────────── -->
        <section
          v-if="transaction.fraud_flags && transaction.fraud_flags.length > 0"
          class="card-enter space-y-3"
          aria-label="Fraud detection flags"
          :class="{ 'card-enter-active': mounted }"
          style="--delay: 120ms"
        >
          <!-- Section header -->
          <div class="flex items-center justify-between px-1">
            <h2 class="section-label text-red-500">
              <span aria-hidden="true">⚑</span>
              Fraud Flags
            </h2>
            <span class="text-[11px] font-bold bg-red-50 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full">
              {{ transaction.fraud_flags.length }} flag{{ transaction.fraud_flags.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <ul class="space-y-2">
            <li
              v-for="(flag, idx) in transaction.fraud_flags"
              :key="flag.id"
              class="card-enter rounded-2xl bg-white border border-slate-200/80 p-5 space-y-4"
              :class="{ 'card-enter-active': mounted }"
              :style="`--delay: ${180 + idx * 60}ms; box-shadow: 0 1px 4px rgba(0,0,0,0.06)`"
            >
              <!-- Rule name + source badge -->
              <div class="flex items-start justify-between gap-3 flex-wrap">
                <p class="text-[14px] font-bold text-slate-800 leading-tight">
                  {{ formatRuleName(flag.rule_triggered) }}
                </p>
                <span
                  :class="['inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0', sourceBadge(flag.source).cls]"
                >
                  <span aria-hidden="true">{{ sourceBadge(flag.source).icon }}</span>
                  {{ sourceBadge(flag.source).label }}
                </span>
              </div>

              <!-- Risk score bar -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Risk Score</span>
                  <span :class="['text-[12px] font-bold', riskLevel(flag.risk_score).color]">
                    {{ riskLevel(flag.risk_score).label }} · {{ (parseFloat(flag.risk_score) * 100).toFixed(0) }}%
                  </span>
                </div>
                <div
                  class="flex gap-0.5"
                  role="meter"
                  :aria-valuenow="(parseFloat(flag.risk_score) * 100).toFixed(0)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="`Risk score: ${(parseFloat(flag.risk_score) * 100).toFixed(0)}%`"
                >
                  <div
                    v-for="(active, i) in riskSegments(flag.risk_score)"
                    :key="i"
                    :class="[
                      'flex-1 h-1.5 rounded-sm transition-all duration-300',
                      active ? riskLevel(flag.risk_score).track : 'bg-slate-100'
                    ]"
                    :style="active ? `transition-delay: ${i * 40}ms` : ''"
                    aria-hidden="true"
                  ></div>
                </div>
              </div>

              <!-- Reason -->
              <p class="text-[13px] text-slate-500 leading-relaxed border-l-2 border-slate-200 pl-3">
                {{ flag.reason }}
              </p>

              <!-- Resolution -->
              <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
                <template v-if="flag.resolved">
                  <span class="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600" aria-live="polite">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true"></span>
                    Resolved · {{ formatDate(flag.resolved_at) }}
                  </span>
                </template>
                <template v-else>
                  <span class="flex items-center gap-1.5 text-[12px] font-semibold text-orange-600">
                    <span class="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-400"></span>
                    </span>
                    Pending review
                  </span>
                </template>
              </div>

            </li>
          </ul>
        </section>

        <!-- ─ Clean slate ─────────────────────────────────── -->
        <section
          v-else-if="transaction.fraud_flags"
          class="card-enter rounded-2xl bg-white border border-emerald-200 p-5 flex items-center gap-4"
          :class="{ 'card-enter-active': mounted }"
          style="--delay: 120ms; box-shadow: 0 1px 4px rgba(0,0,0,0.04)"
          role="status"
          aria-label="No fraud flags detected"
        >
          <div
            class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-lg shrink-0"
            aria-hidden="true"
          >✦</div>
          <div>
            <p class="text-sm font-bold text-emerald-700">No fraud flags</p>
            <p class="text-xs text-slate-400 mt-0.5">This transaction passed all fraud checks.</p>
          </div>
        </section>

      </template>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* ── Section label ──────────────────────────────────────────── */
.section-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #94a3b8; /* slate-400 */
}

/* ── Detail row ─────────────────────────────────────────────── */
.row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 0;
}
.row-item dt {
  font-size: 0.75rem;
  color: #94a3b8; /* slate-400 */
  flex-shrink: 0;
}
.row-item dd {
  font-size: 0.75rem;
  font-weight: 600;
  color: #334155; /* slate-700 */
  text-align: right;
}

/* ── Card entrance ──────────────────────────────────────────── */
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
  .card-enter, .card-enter-active {
    transition: none; transform: none; opacity: 1;
  }
}
</style>