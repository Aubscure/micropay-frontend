// src/stores/auth.js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { login, register, logout, getMe } from '@/api/auth'
import { getMyMerchant } from '@/api/merchants'

export const useAuthStore = defineStore('auth', () => {
  // ── State ──────────────────────────────────────────────────
  // Load from localStorage so the user stays logged in on refresh
  const token = ref(localStorage.getItem('auth_token') || null)
  const user  = ref(JSON.parse(localStorage.getItem('auth_user') || 'null'))
  const merchant = ref(JSON.parse(localStorage.getItem('auth_merchant') || 'null'))
  const loading = ref(false)
  const error   = ref(null)

  // ── Getters ────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value)
  const hasMerchant     = computed(() => !!merchant.value)

  // ── Actions ────────────────────────────────────────────────

  /**
   * Log in — stores token and user in memory and localStorage.
   */
  async function loginUser(credentials) {
    loading.value = true
    error.value   = null

    try {
      const response = await login(credentials)
      const { token: newToken, user: newUser } = response.data

      // Save to reactive state
      token.value = newToken
      user.value  = newUser

      // Persist so page refresh doesn't log the user out
      localStorage.setItem('auth_token', newToken)
      localStorage.setItem('auth_user', JSON.stringify(newUser))

      // Try to load their merchant profile
      await loadMerchant()

      return true
    } catch (err) {
      error.value = err.response?.data?.errors?.email?.[0]
                 ?? err.response?.data?.message
                 ?? 'Login failed.'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Register a new account.
   */
  async function registerUser(data) {
    loading.value = true
    error.value   = null

    try {
      const response = await register(data)
      const { token: newToken, user: newUser } = response.data

      token.value = newToken
      user.value  = newUser

      localStorage.setItem('auth_token', newToken)
      localStorage.setItem('auth_user', JSON.stringify(newUser))

      return true
    } catch (err) {
      error.value = err.response?.data?.errors
                 ?? err.response?.data?.message
                 ?? 'Registration failed.'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Load the merchant profile for the current user.
   */
  async function loadMerchant() {
    try {
      const response = await getMyMerchant()
      // API returns { data: [...] } — get the first merchant
      const merchants = response.data.data
      if (merchants && merchants.length > 0) {
        merchant.value = merchants[0]
        localStorage.setItem('auth_merchant', JSON.stringify(merchants[0]))
      }
    } catch {
      // No merchant profile yet — that's okay
      merchant.value = null
    }
  }

  /**
   * Log out — clear all state and localStorage.
   */
  async function logoutUser() {
    try {
      await logout() // Tell the server to revoke the token
    } catch {
      // Even if server call fails, clear local state
    } finally {
      token.value    = null
      user.value     = null
      merchant.value = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_merchant')
    }
  }

  return {
    token, user, merchant, loading, error,
    isAuthenticated, hasMerchant,
    loginUser, registerUser, loadMerchant, logoutUser,
  }
})