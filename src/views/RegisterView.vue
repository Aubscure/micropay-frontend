<!-- src/views/RegisterView.vue -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()

const name                 = ref('')
const email                = ref('')
const password             = ref('')
const passwordConfirmation = ref('')

async function handleRegister() {
  const success = await auth.registerUser({
    name:                  name.value,
    email:                 email.value,
    password:              password.value,
    password_confirmation: passwordConfirmation.value,
  })

  if (success) {
    router.push({ name: 'dashboard' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-blue-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">

      <div class="text-center mb-8">
        <div class="text-4xl mb-2">💳</div>
        <h1 class="text-2xl font-bold text-blue-700">Create Account</h1>
        <p class="text-gray-500 text-sm mt-1">Join MicroPay today</p>
      </div>

      <!-- Validation errors -->
      <div v-if="auth.error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
        <div v-if="typeof auth.error === 'object'">
          <div v-for="(msgs, field) in auth.error" :key="field">
            {{ msgs[0] }}
          </div>
        </div>
        <div v-else>{{ auth.error }}</div>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input v-model="name" type="text" placeholder="Juan dela Cruz"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input v-model="email" type="email" placeholder="you@example.com"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input v-model="password" type="password" placeholder="Min. 8 characters"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input v-model="passwordConfirmation" type="password" placeholder="Repeat password"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="handleRegister" />
        </div>

        <button @click="handleRegister" :disabled="auth.loading"
          class="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition">
          {{ auth.loading ? 'Creating account...' : 'Create Account' }}
        </button>
      </div>

      <p class="text-center text-sm text-gray-500 mt-6">
        Already have an account?
        <RouterLink to="/login" class="text-blue-700 font-medium hover:underline">Log in</RouterLink>
      </p>
    </div>
  </div>
</template>