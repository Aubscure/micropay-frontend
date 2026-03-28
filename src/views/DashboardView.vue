<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getTransactions } from '@/api/transactions'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const router = useRouter()
const auth = useAuthStore()
const { isOnline, isSyncing } = useNetworkStatus()

const transactions = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await getTransactions()
    // Laravel pagination wraps results in response.data.data
    transactions.value = response.data.data ?? response.data
  } catch (e) {
    console.error('Failed to load transactions', e)
  } finally {
    loading.value = false
  }
})

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}

// Status badge colors
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
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Top navigation bar -->
    <nav class="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow">
      <div class="flex items-center gap-2">
        <span class="text-xl">💳</span>
        <span class="font-bold text-lg">MicroPay</span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Offline badge -->
        <span
          v-if="!isOnline"
          class="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-1 rounded-full"
        >
          Offline
        </span>
        <span
          v-if="isSyncing"
          class="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full"
        >
          Syncing...
        </span>

        <span class="text-sm opacity-80">{{ auth.user?.name }}</span>
        <button @click="handleLogout" class="text-sm bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded-lg transition">
          Logout
        </button>
      </div>
    </nav>

    <div class="max-w-lg mx-auto px-4 py-6 space-y-4">

      <!-- Action buttons -->
      <div class="grid grid-cols-2 gap-3">
        <RouterLink
          to="/pay"
          class="bg-blue-700 hover:bg-blue-800 text-white text-center font-semibold rounded-xl py-4 text-sm transition shadow"
        >
          ➕ New Payment
        </RouterLink>
        <RouterLink
          to="/history"
          class="bg-white hover:bg-gray-50 text-blue-700 text-center font-semibold rounded-xl py-4 text-sm transition shadow border border-blue-100"
        >
          📋 History
        </RouterLink>
      </div>

      <!-- Recent transactions -->
      <div class="bg-white rounded-2xl shadow p-4">
        <h2 class="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Recent Transactions</h2>

        <div v-if="loading" class="text-center text-gray-400 text-sm py-6">Loading...</div>

        <div v-else-if="transactions.length === 0" class="text-center text-gray-400 text-sm py-6">
          No transactions yet. Create your first payment above.
        </div>

        <ul v-else class="divide-y divide-gray-100">
          <li
            v-for="tx in transactions"
            :key="tx.id"
            class="py-3 flex items-center justify-between"
          >
            <div>
              <p class="text-sm font-medium text-gray-800">PHP {{ (tx.amount_centavos / 100).toFixed(2) }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ tx.notes ?? tx.payment_method }}</p>
            </div>
            <span :class="['text-xs font-semibold px-2 py-1 rounded-full', s