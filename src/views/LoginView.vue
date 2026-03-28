<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (e) {
    // Show the validation message from Laravel
    error.value = e.response?.data?.message ?? 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-blue-50 flex items-center justify-center px-4">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">

      <!-- Logo / Title -->
      <div class="text-center mb-8">
        <div class="text-4xl mb-2">💳</div>
        <h1 class="text-2xl font-bold text-blue-700">MicroPay</h1>
        <p class="text-gray-500 text-sm mt-1">Sign in to your account</p>
      </div>

      <!-- Error message -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
        {{ error }}
      </div>

      <!-- Form -->
      <div class="space-y-4">
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
            placeholder="••••••••"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="handleLogin"
          />
        </div>


        <button
          @click="handleLogin"
          :disabled="loading"
          class="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded-lg py-2 text-sm transition"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </div>

      <p class="text-center text-sm text-gray-500 mt-6">
        No account?
        <RouterLink to="/register" class="text-blue-600 font-medium hover:underline">Register</RouterLink>
      </p>
    </div>
  </div>
</template>