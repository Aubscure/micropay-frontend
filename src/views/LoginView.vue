<!-- src/views/LoginView.vue -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()

// Form state
const email    = ref('')
const password = ref('')

async function handleLogin() {
  const success = await auth.loginUser({
    email:    email.value,
    password: password.value,
  })

  if (success) {
    // Redirect to dashboard after login
    router.push({ name: 'dashboard' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-blue-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">

      <!-- Logo / Header -->
      <div class="text-center mb-8">
        <div class="text-4xl mb-2">💳</div>
        <h1 class="text-2xl font-bold text-blue-700">MicroPay</h1>
        <p class="text-gray-500 text-sm mt-1">Fast payments for MSMEs</p>
      </div>

      <!-- Error message -->
      <div v-if="auth.error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
        {{ auth.error }}
      </div>

      <!-- Login form -->
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
          :disabled="auth.loading"
          class="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition"
        >
          {{ auth.loading ? 'Logging in...' : 'Log In' }}
        </button>
      </div>

      <!-- Register link -->
      <p class="text-center text-sm text-gray-500 mt-6">
        No account?
        <RouterLink to="/register" class="text-blue-700 font-medium hover:underline">
          Register here
        </RouterLink>
      </p>

    </div>
  </div>
</template>