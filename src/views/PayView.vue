<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createTransaction } from '@/api/transactions'
import { useOfflineQueue } from '@/composables/useOfflineQueue'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const router = useRouter()
const { isOnline } = useNetworkStatus()
const { addToQueue } = useOfflineQueue()

const amount = ref('')
const notes = ref('')
const loading = ref(false)
const success = ref(false)
const savedOffline = ref(false)
const error = ref('')

// src/views/PayView.vue — replace the handlePay function

async function handlePay() {
  error.value = ''

  const centavos = Math.round(parseFloat(amount.value) * 100)

  if (!centavos || centavos < 1) {
    error.value = 'Please enter a valid amount.'
    return
  }

  loading.value = true

  const transactionData = {
    id:              crypto.randomUUID(),
    amount_centavos: centavos,
    currency:        'PHP',
    payment_method:  'qr_code',
    notes:           notes.value || null,
  }

  try {
    if (isOnline.value) {
      // Attempt the API call — this may still fail even if navigator.onLine is true
      await createTransaction(transactionData)
      savedOffline.value = false
    } else {
      // navigator.onLine already says we're offline — skip the API attempt
      throw { isNetworkError: true }
    }

  } catch (e) {
    // Check if this is a network failure (no internet) vs a server error (API rejected it)
    //
    // Axios sets e.code = 'ERR_NETWORK' or e.message = 'Network Error' for connection failures.
    // A server error (400, 422, 500) has e.response defined.
    // We only want to save offline for true network failures — not validation errors.
    const isNetworkFailure = e.isNetworkError
      || e.code === 'ERR_NETWORK'
      || e.message === 'Network Error'
      || (!e.response && !e.isAxiosError === false)
      || (!e.response && e.request)

    if (isNetworkFailure) {
      // True offline — save to IndexedDB queue instead of failing
      try {
        await addToQueue(transactionData)
        savedOffline.value = true
        success.value = true

        amount.value = ''
        notes.value  = ''

        setTimeout(() => router.push({ name: 'dashboard' }), 1500)
        return // Exit here — don't fall through to the error handler below

      } catch (queueError) {
        error.value = 'Could not save payment offline. Please try again.'
        loading.value = false
        return
      }
    }

    // This is a server error (422 validation, 403 auth, 500 crash) — show the message
    const errData = e.response?.data
    if (errData?.errors) {
      error.value = Object.values(errData.errors).flat().join(' ')
    } else {
      error.value = errData?.message ?? 'Payment failed. Please try again.'
    }

    loading.value = false
    return
  }

  // Online success path
  success.value = true
  amount.value  = ''
  notes.value   = ''
  setTimeout(() => router.push({ name: 'dashboard' }), 1500)

  loading.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <nav class="bg-blue-700 text-white px-4 py-3 flex items-center gap-3 shadow">
      <RouterLink to="/" class="text-white opacity-70 hover:opacity-100 text-sm">← Back</RouterLink>
      <span class="font-semibold">New Payment</span>
      <span
        v-if="!isOnline"
        class="ml-auto bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-1 rounded-full"
      >
        Offline mode
      </span>
    </nav>

    <div class="max-w-sm mx-auto px-4 py-8">

      <!-- Success state -->
      <div v-if="success" class="text-center py-12">
        <div class="text-6xl mb-4">✅</div>
        <p class="text-xl font-semibold text-green-600">
          {{ isOnline ? 'Payment sent!' : 'Saved offline!' }}
        </p>
        <p class="text-gray-500 text-sm mt-2">
          {{ isOnline ? 'Fraud check in progress.' : 'Will sync when you are back online.' }}
        </p>
      </div>

      <!-- Payment form -->
      <div v-else class="bg-white rounded-2xl shadow p-6 space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount (PHP)</label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-gray-400 text-sm">₱</span>
            <input
              v-model="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              class="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
          <input
            v-model="notes"
            type="text"
            placeholder="e.g. Isang kilo bigas"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {{ error }}
        </div>

        <button
          @click="handlePay"
          :disabled="loading"
          class="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded-lg py-3 text-sm transition"
        >
          {{ loading ? 'Processing...' : (isOnline ? '💳 Send Payment' : '💾 Save Offline') }}
        </button>

        <p v-if="!isOnline" class="text-xs text-center text-yellow-600">
          You are offline. Payment will sync automatically when reconnected.
        </p>
      </div>
    </div>
  </div>
</template>