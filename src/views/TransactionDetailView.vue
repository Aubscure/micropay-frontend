<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTransaction } from '@/api/transactions'

// ── Add to your nuxt.config.ts > app.head.link:
// { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap' }

const route  = useRoute()
const router = useRouter()

const transaction = ref(null)
const loading     = ref(true)
const error       = ref(null)
const mounted     = ref(false)

onMounted(async () => {
  // Defer entrance animation
  requestAnimationFrame(() => { mounted.value = true })

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
  qr_code:      { label: 'QR Code',      icon: '▦'  },
  nfc:          { label: 'NFC Tap',       icon: '📶' },
  manual_entry: { label: 'Manual Entry',  icon: '⌨️' },
}

const paymentMethod = computed(() => {
  const m = transaction.value?.payment_method
  return PAYMENT_METHODS[m] ?? { label: m ?? '—', icon: '•' }
})

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     icon: '⏳', dot: 'bg-amber-400',   pill: 'border-amber-400/40  text-amber-300'   },
  fraud_check: { label: 'Fraud Check', icon: '🔍', dot: 'bg-orange-400',  pill: 'border-orange-400/40 text-orange-300'  },
  cleared:     { label: 'Cleared',     icon: '✔',  dot: 'bg-sky-400',     pill: 'border-sky-400/40    text-sky-300'     },
  settled:     { label: 'Settled',     icon: '✦',  dot: 'bg-emerald-400', pill: 'border-emerald-400/40 text-emerald-300'},
  flagged:     { label: 'Flagged',     icon: '⚑',  dot: 'bg-red-400',     pill: 'border-red-400/40    text-red-300'    },
  rejected:    { label: 'Rejected',    icon: '✖',  dot: 'bg-slate-500',   pill: 'border-slate-500/40  text-slate-400'  },
}

function getStatus(status) {
  return STATUS_CONFIG[status] ?? { label: status, icon: '•', dot: 'bg-slate-500', pill: 'border-slate-500/40 text-slate-400' }
}

// Risk: 0.00–0.49 low, 0.50–0.74 medium, 0.75+ high
function riskLevel(score) {
  const n = parseFloat(score)
  if (n >= 0.75) return { label: 'High',   color: 'text-red-400',    fill: '#f87171', track: 'bg-red-400'    }
  if (n >= 0.50) return { label: 'Medium', color: 'text-orange-400', fill: '#fb923c', track: 'bg-orange-400' }
  return              { label: 'Low',    color: 'text-emerald-400', fill: '#34d399', track: 'bg-emerald-400'}
}

function sourceBadge(source) {
  return source === 'ai_agent'
    ? { label: 'AI Agent',    cls: 'border-purple-400/40 text-purple-300', icon: '⬡' }
    : { label: 'Rule Engine', cls: 'border-sky-400/40    text-sky-300',    icon: '⚙' }
}

// Segment bar: 10 ticks representing 0–100%
function riskSegments(score) {
  const pct = parseFloat(score) * 100
  const filled = Math.round(pct / 10)
  return Array.from({ length: 10 }, (_, i) => i < filled)
}
</script>

<template>
  <div class="txn-root min-h-screen bg-[#0c0f14] font-sans">

    <!-- ── Header ───────────────────────────────────────────── -->
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
          <h1 class="text-sm font-bold text-white leading-none truncate" style="font-family: 'Syne', sans-serif">
            Transaction Detail
          </h1>
        </div>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-6 space-y-3">

      <!-- ── Loading skeleton ─────────────────────────────────── -->
      <div v-if="loading" aria-live="polite" aria-busy="true" class="space-y-3">
        <!-- Amount skeleton -->
        <div class="rounded-2xl border border-white/[0.07] bg-[#111520] p-6 animate-pulse space-y-4">
          <div class="h-11 bg-white/5 rounded-lg w-44"></div>
          <div class="h-3 bg-white/5 rounded w-16"></div>
          <div class="flex justify-between mt-3">
            <div class="h-6 bg-white/5 rounded-full w-24"></div>
            <div class="h-3 bg-white/5 rounded w-20 self-end"></div>
          </div>
        </div>
        <!-- Details skeleton -->
        <div class="rounded-2xl border border-white/[0.07] bg-[#111520] p-6 animate-pulse space-y-4">
          <div class="h-3 bg-white/5 rounded w-14"></div>
          <div v-for="n in 4" :key="n" class="flex justify-between">
            <div class="h-3 bg-white/5 rounded w-24"></div>
            <div class="h-3 bg-white/5 rounded w-32"></div>
          </div>
        </div>
      </div>

      <!-- ── Error ─────────────────────────────────────────────── -->
      <div
        v-else-if="error"
        class="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-4"
        role="alert"
      >
        <div class="w-12 h-12 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-center text-2xl mx-auto" aria-hidden="true">
          ⚠
        </div>
        <div class="space-y-1">
          <p class="text-sm font-semibold text-slate-200">Failed to load transaction</p>
          <p class="text-xs text-slate-500">{{ error }}</p>
        </div>
        <button
          @click="router.back()"
          class="text-xs font-mono font-semibold text-emerald-400 hover:text-emerald-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
        >
          ← back
        </button>
      </div>

      <!-- ── Main content ─────────────────────────────────────── -->
      <template v-else-if="transaction">

        <!-- ─ Hero: Amount + Status ─────────────────────────── -->
        <section
          class="card-enter rounded-2xl border border-white/[0.07] bg-[#111520] overflow-hidden"
          aria-label="Transaction summary"
          :class="{ 'card-enter-active': mounted }"
          style="--delay: 0ms"
        >
          <!-- Subtle top accent line matching status color -->
          <div
            :class="['h-[2px] w-full', getStatus(transaction.status).dot]"
            aria-hidden="true"
          ></div>

          <div class="p-6">
            <!-- Currency label -->
            <p class="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2">
              {{ transaction.currency ?? 'PHP' }}
            </p>

            <!-- Amount — hero element -->
            <p
              class="text-[2.75rem] leading-none font-black text-white tabular-nums tracking-tight mb-4"
              style="font-family: 'DM Mono', monospace"
              aria-label="Amount: {{ formatAmount(transaction.amount_centavos) }} {{ transaction.currency ?? 'PHP' }}"
            >
              <span class="text-2xl text-slate-500 mr-1" aria-hidden="true">₱</span>{{ formatAmount(transaction.amount_centavos) }}
            </p>

            <!-- Status pill + timestamp -->
            <div class="flex items-center justify-between flex-wrap gap-3">
              <span
                :class="['inline-flex items-center gap-2 text-[11px] font-semibold font-mono px-3 py-1.5 rounded-full border capitalize', getStatus(transaction.status).pill]"
                role="status"
                :aria-label="`Status: ${getStatus(transaction.status).label}`"
              >
                <!-- Animated pulse dot -->
                <span class="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span
                    v-if="['pending','fraud_check'].includes(transaction.status)"
                    :class="['animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', getStatus(transaction.status).dot]"
                  ></span>
                  <span :class="['relative inline-flex rounded-full h-1.5 w-1.5', getStatus(transaction.status).dot]"></span>
                </span>
                {{ getStatus(transaction.status).label }}
              </span>

              <span class="text-[11px] font-mono text-slate-500">
                {{ formatDate(transaction.created_at) }}
              </span>
            </div>

            <!-- Notes -->
            <blockquote
              v-if="transaction.notes"
              class="mt-5 pt-4 border-t border-white/[0.06] text-xs text-slate-400 italic leading-relaxed"
            >
              "{{ transaction.notes }}"
            </blockquote>
          </div>
        </section>

        <!-- ─ Details ──────────────────────────────────────── -->
        <section
          class="card-enter rounded-2xl border border-white/[0.07] bg-[#111520] p-6 space-y-5"
          aria-label="Transaction details"
          :class="{ 'card-enter-active': mounted }"
          style="--delay: 60ms"
        >
          <h2 class="section-label">Details</h2>

          <dl class="space-y-0 divide-y divide-white/[0.05]">

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
              <dd class="font-mono">{{ formatDate(transaction.initiated_at) }}</dd>
            </div>

            <div class="row-item">
              <dt>Recorded</dt>
              <dd class="font-mono">{{ formatDate(transaction.created_at) }}</dd>
            </div>

            <!-- Transaction ID — selectable for easy copying -->
            <div class="flex items-start justify-between gap-4 py-4">
              <dt class="text-xs text-slate-500 shrink-0 pt-px">Transaction ID</dt>
              <dd
                class="text-[11px] font-mono text-slate-400 break-all text-right select-all cursor-text leading-relaxed"
                aria-label="Transaction ID, select to copy"
              >
                {{ transaction.id }}
              </dd>
            </div>

          </dl>
        </section>

        <!-- ─ Fraud Flags ──────────────────────────────────── -->
        <section
          v-if="transaction.fraud_flags && transaction.fraud_flags.length > 0"
          class="card-enter space-y-3"
          aria-label="Fraud detection flags"
          :class="{ 'card-enter-active': mounted }"
          style="--delay: 120ms"
        >
          <!-- Section header outside of cards -->
          <div class="flex items-center justify-between px-1">
            <h2 class="section-label text-red-400/80">
              <span aria-hidden="true">⚑</span>
              Fraud Flags
            </h2>
            <span class="text-[11px] font-mono font-bold bg-red-500/10 border border-red-500/25 text-red-400 px-2 py-0.5 rounded-full">
              {{ transaction.fraud_flags.length }} flag{{ transaction.fraud_flags.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <ul class="space-y-2.5">
            <li
              v-for="(flag, idx) in transaction.fraud_flags"
              :key="flag.id"
              class="card-enter rounded-2xl border border-white/[0.07] bg-[#111520] p-5 space-y-4"
              :class="{ 'card-enter-active': mounted }"
              :style="`--delay: ${180 + idx * 60}ms`"
            >
              <!-- Rule + Source row -->
              <div class="flex items-start justify-between gap-3 flex-wrap">
                <p class="text-sm font-bold text-white leading-tight" style="font-family: 'Syne', sans-serif">
                  {{ formatRuleName(flag.rule_triggered) }}
                </p>
                <span
                  :class="['inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-1 rounded-lg border shrink-0', sourceBadge(flag.source).cls]"
                >
                  <span aria-hidden="true">{{ sourceBadge(flag.source).icon }}</span>
                  {{ sourceBadge(flag.source).label }}
                </span>
              </div>

              <!-- Risk score — segmented bar -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Risk Score</span>
                  <span :class="['text-[11px] font-mono font-bold', riskLevel(flag.risk_score).color]">
                    {{ riskLevel(flag.risk_score).label }} · {{ (parseFloat(flag.risk_score) * 100).toFixed(0) }}%
                  </span>
                </div>

                <!-- Segmented tick bar -->
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
                      active ? riskLevel(flag.risk_score).track : 'bg-white/[0.06]'
                    ]"
                    :style="active ? `transition-delay: ${i * 40}ms` : ''"
                    aria-hidden="true"
                  ></div>
                </div>
              </div>

              <!-- Reason — text binding only, never v-html -->
              <p class="text-xs text-slate-400 leading-relaxed border-l-2 border-white/[0.08] pl-3">
                {{ flag.reason }}
              </p>

              <!-- Resolution state -->
              <div class="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
                <template v-if="flag.resolved">
                  <span class="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400" aria-live="polite">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true"></span>
                    Resolved · {{ formatDate(flag.resolved_at) }}
                  </span>
                </template>
                <template v-else>
                  <span class="flex items-center gap-1.5 text-[11px] font-mono text-orange-400">
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

        <!-- ─ Clean slate ──────────────────────────────────── -->
        <section
          v-else-if="transaction.fraud_flags"
          class="card-enter rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 flex items-center gap-4"
          :class="{ 'card-enter-active': mounted }"
          style="--delay: 120ms"
          role="status"
          aria-label="No fraud flags detected"
        >
          <div class="w-9 h-9 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
            ✦
          </div>
          <div>
            <p class="text-sm font-semibold text-emerald-300" style="font-family: 'Syne', sans-serif">No fraud flags</p>
            <p class="text-xs text-slate-500 mt-0.5">This transaction passed all fraud checks.</p>
          </div>
        </section>

      </template>
    </main>
  </div>
</template>

<style scoped>
/* ── Fonts (add to nuxt.config.ts instead for production) ───── */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500;600&display=swap');

.txn-root {
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── Section label ──────────────────────────────────────────── */
.section-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.625rem;
  font-family: 'DM Mono', monospace;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(100 116 139); /* slate-500 */
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
  color: rgb(100 116 139); /* slate-500 */
  flex-shrink: 0;
}

.row-item dd {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(226 232 240); /* slate-200 */
  text-align: right;
}

/* ── Card entrance animation ────────────────────────────────── */
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

/* ── Reduce motion ───────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .card-enter,
  .card-enter-active {
    transition: none;
    transform: none;
    opacity: 1;
  }
}
</style>