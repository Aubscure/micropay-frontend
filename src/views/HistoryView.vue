<script setup>
import { ref, onMounted } from 'vue'
import { getTransactions } from '@/api/transactions'

const transactions = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await getTransactions()
    transactions.value = response.data.data ?? response.data
  } catch (e) {
    console.error('Failed to load history', e)
  } finally {
    loading.value = false
  }
})

function statusColor(status) {
  const map = {
    pending:    'bg-yellow-100 text-yellow-700',
    fraud_check:'bg-orange-100 text-orange-700',
    cleared:    'bg-blue-100 text-blue-700',
    settled:    'bg-green-100 text-green-700',
    flagged:    'bg-red-100 text-red-700',
    rejected:   'bg-gray-100 text-gray-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-PH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <nav class="bg-blue-700 text-white px-4 py-3 flex items-center gap-3 shadow">
      <RouterLink to="/" class="text-white opacity-70 hover:opacity-100 text-sm">← Back</RouterLink>
      <span class="font-semibold">Transaction History</span>
    </nav>

    <div class="max-w-lg mx-auto px-4 py-6">

      <div v-if="loading" class="text-center text-gray-400 text-sm py-12">Loading...</div>

      <div v-else-if="transactions.length === 0" class="text-center text-gray-400 text-sm py-12">
        No transactions found.
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="tx in transactions"
          :key="tx.id"
          class="bg-white rounded-xl shadow p-4 flex items-center justify-between"
        >
          <div>
            <p class="font-semibold text-gray-800">PHP {{ (tx.amount_centavos / 100).toFixed(2) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ tx.notes ?? tx.payment_method }}</p>
            <p class="text-xs text-gray-300 mt-0.5">{{ formatDate(tx.created_at) }}</p>
          </div>
          <span :class="['text-xs font-semibold px-2 py-1 rounded-full', statusColor(tx.status)]">
            {{ tx.status }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>