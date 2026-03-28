<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  loading.value = true

  try {
    await auth.register(name.value, email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (e) {
    // Laravel returns validation errors as an object under 'errors'
    const errors = e.response?.data?.errors
    if (errors) {
      // Flatten all validation messages into one string
      error.value = Object.values(errors).flat().join(' ')
    } else {
      error.value = e.response?.data?.message ?? 'Registration failed.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-blue-50 flex items-center justify-center px-4">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">

      <div class="text-center mb-8">
        <div class="text-4xl mb-2">💳</div>
        <h1 class="text-2xl font-bold text-blue-700">MicroPay</h1>
        <p class="text-gray-500 text-sm mt-1">Create your account</p>
      </div>

      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
        {{ error }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            v-model="name"
            type="text"
            placeholder="Juan dela Cruz"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="Min. 8 characters"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="handleRegister"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="••••••••"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="handleRegister"
          />
        </div>

        <button
          @click="handleRegister"
          :disabled="loading"
          class="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded-lg py-2 text-sm transition"
        >
          {{ loading ? 'Creating account...' : 'Create Account' }}
        </button>
      </div>

      <p class="text-center text-sm text-gray-500 mt-6">
        Already have an account?
        <RouterLink to="/login" class="text-blue-600 font-medium hover:underline">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>