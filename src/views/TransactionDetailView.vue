<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTransaction } from '@/api/transactions'

const route  = useRoute()
const router = useRouter()

// ── State ──────────────────────────────────────────────────────
const transaction = ref(null)
const loading     = ref(true)
const error       = ref(null)

// ── Fetch ───────────────────────────────────────────────────────
onMounted(async () => {
  try {
    // route.params.id is the UUID from the URL segment /transactions/:id
    const response = await getTransaction(route.params.id)

    // Backend wraps the single resource in { data: { ... } }
    transaction.value = response.data.data
  } catch (err) {
    // 403 = not your transaction, 404 = doesn't exist
    error.value = err.response?.data?.message ?? 'Failed to load transaction.'
  } finally {
    loading.value = false
  }
})

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Format ISO date string to a readable Philippine locale timestamp.
 * e.g. "Mar 29, 10:06 AM"
 */
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-PH', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
    hour:  '2-digit',
    minute:'2-digit',
  })
}

/**
 * Convert snake_case rule names to a readable label.
 * "rapid_succession" → "Rapid Succession"
 */
function formatRuleName(rule) {
  return rule
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Map payment method keys to human-readable labels with icons.
 */
const paymentMethodLabel = computed(() => {
  const map = {
    qr_code:      '📷 QR Code',
    nfc:          '📶 NFC Tap',
    manual_entry: '⌨️ Manual Entry',
  }
  return map[transaction.value?.payment_method] ?? transaction.value?.payment_method
})

/**
 * Status badge — Tailwind classes for background + text.
 * Centralised here so it's consistent with the list views.
 */
function statusColor(status) {
  const map = {
    pending:    'bg-yellow-100 text-yellow-700',
    fraud_check:'bg-orange-100 text-orange-700',
    cleared:    'bg-blue-100  text-blue-700',
    settled:    'bg-green-100 text-green-700',
    flagged:    'bg-red-100   text-red-700',
    rejected:   'bg-gray-100  text-gray-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

/**
 * Risk score colour: green below 0.5, orange 0.5–0.75, red above.
 */
function riskColor(score) {
  const n = parseFloat(score)
  if (n >= 0.75) return 'text-red-600 font-bold'
  if (n >= 0.50) return 'text-orange-500 font-semibold'
  return 'text-green-600'
}

/**
 * Source badge colours for rule_engine vs ai_agent.
 */
function sourceBadgeColor(source) {
  return source === 'ai_agent'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Nav -->
    <nav class="bg-blue-700 text-white px-4 py-3 flex items-center gap-3 shadow">
      <button
        @click="router.back()"
        class="text-white opacity-70 hover:opacity-100 text-sm"
      >
        ← Back
      </button>
      <span class="font-semibold">Transaction Detail</span>
    </nav>

    <div class="max-w-lg mx-auto px-4 py-6 space-y-4">

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-3">
        <div class="bg-white rounded-2xl shadow p-5 animate-pulse space-y-3">
          <div class="h-8 bg-gray-200 rounded w-1/2"></div>
          <div class="h-4 bg-gray-100 rounded w-1/3"></div>
          <div class="h-4 bg-gray-100 rounded w-2/3"></div>
        </div>
      </div>

      <!-- Error state (403 / 404) -->
      <div v-else-if="error" class="bg-white rounded-2xl shadow p-6 text-center space-y-2">
        <p class="text-4xl">⚠️</p>
        <p class="text-gray-700 font-semibold">{{ error }}</p>
        <button
          @click="router.back()"
          class="mt-2 text-blue-600 text-sm hover:underline"
        >
          Go back
        </button>
      </div>

      <!-- Main content -->
      <template v-else-if="transaction">

        <!-- Amount + Status card -->
        <div class="bg-white rounded-2xl shadow p-5">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-3xl font-bold text-gray-900">
                PHP {{ (transaction.amount_centavos / 100).toFixed(2) }}
              </p>
              <p class="text-xs text-gray-400 mt-1">{{ transaction.currency }}</p>
            </div>
            <span
              :class="['text-xs font-semibold px-3 py-1.5 rounded-full capitalize', statusColor(transaction.status)]"
            >
              {{ transaction.status.replace('_', ' ') }}
            </span>
          </div>

          <!-- Notes (optional) -->
          <p v-if="transaction.notes" class="mt-4 text-sm text-gray-600 italic border-t border-gray-100 pt-3">
            "{{ transaction.notes }}"
          </p>
        </div>

        <!-- Details card -->
        <div class="bg-white rounded-2xl shadow p-5 space-y-3">
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Details</h2>

          <!-- Each row: label + value -->
          <div class="grid grid-cols-2 gap-y-3 text-sm">

            <span class="text-gray-500">Payment Method</span>
            <span class="text-gray-800 text-right">{{ paymentMethodLabel }}</span>

            <span class="text-gray-500">Initiated</span>
            <span class="text-gray-800 text-right">{{ formatDate(transaction.initiated_at) }}</span>

            <span class="text-gray-500">Recorded</span>
            <span class="text-gray-800 text-right">{{ formatDate(transaction.created_at) }}</span>

            <span class="text-gray-500">Source</span>
            <span class="text-gray-800 text-right">
              {{ transaction.was_offline ? '📴 Offline (synced)' : '🌐 Online' }}
            </span>

            <span class="text-gray-500">Transaction ID</span>
            <span class="text-gray-400 text-right text-xs break-all font-mono">
              {{ transaction.id }}
            </span>
          </div>
        </div>

        <!-- Fraud flags card — only shown when flags exist -->
        <div
          v-if="transaction.fraud_flags && transaction.fraud_flags.length > 0"
          class="bg-white rounded-2xl shadow p-5 space-y-4"
        >
          <h2 class="text-xs font-semibold text-red-500 uppercase tracking-wide flex items-center gap-1">
            🚩 Fraud Flags ({{ transaction.fraud_flags.length }})
          </h2>

          <div
            v-for="flag in transaction.fraud_flags"
            :key="flag.id"
            class="border border-gray-100 rounded-xl p-4 space-y-2"
          >
            <!-- Rule name + source badge -->
            <div class="flex items-center justify-between flex-wrap gap-2">
              <p class="text-sm font-semibold text-gray-800">
                {{ formatRuleName(flag.rule_triggered) }}
              </p>
              <span
                :class="['text-xs font-medium px-2 py-0.5 rounded-full', sourceBadgeColor(flag.source)]"
              >
                {{ flag.source === 'ai_agent' ? '🤖 AI Agent' : '⚙️ Rule Engine' }}
              </span>
            </div>

            <!-- Risk score bar -->
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-400 w-16 shrink-0">Risk Score</span>
              <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <!-- Width is the score as a percentage (0.75 → 75%) -->
                <div
                  class="h-2 rounded-full transition-all"
                  :class="{
                    'bg-red-500':    parseFloat(flag.risk_score) >= 0.75,
                    'bg-orange-400': parseFloat(flag.risk_score) >= 0.50 && parseFloat(flag.risk_score) < 0.75,
                    'bg-green-400':  parseFloat(flag.risk_score) <  0.50,
                  }"
                  :style="{ width: (parseFloat(flag.risk_score) * 100) + '%' }"
                ></div>
              </div>
              <span :class="['text-xs w-10 text-right', riskColor(flag.risk_score)]">
                {{ (parseFloat(flag.risk_score) * 100).toFixed(0) }}%
              </span>
            </div>

            <!-- Reason text -->
            <p class="text-xs text-gray-500 leading-relaxed">
              {{ flag.reason }}
            </p>

            <!-- Resolution state -->
            <div class="flex items-center gap-1.5 pt-1">
              <span
                v-if="flag.resolved"
                class="text-xs text-green-600 font-medium"
              >
                ✅ Resolved {{ formatDate(flag.resolved_at) }}
              </span>
              <span
                v-else
                class="text-xs text-orange-500 font-medium"
              >
                ⏳ Pending review
              </span>
            </div>
          </div>
        </div>

        <!-- Clean transaction — no fraud flags -->
        <div
          v-else-if="transaction.fraud_flags"
          class="bg-green-50 border border-green-100 rounded-2xl p-4 text-center text-sm text-green-700"
        >
          ✅ No fraud flags detected on this transaction.
        </div>

      </template>
    </div>
  </div>
</template>