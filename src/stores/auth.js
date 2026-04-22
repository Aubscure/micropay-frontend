// src/stores/auth.js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { login, register, logout, getMe } from '@/api/auth'
import { getMyMerchant } from '@/api/merchants'

export const useAuthStore = defineStore('auth', () => {
  // State 
  // Memory only. Completely removed localStorage dependencies to prevent state desynchronization.
  const user     = ref(null)
  const merchant = ref(null)
  const loading  = ref(false)
  const error    = ref(null)

  // Getters 
  // Authentication is now strictly derived from the presence of a validated user object.
  const isAuthenticated = computed(() => !!user.value)
  const hasMerchant     = computed(() => !!merchant.value)

  // Actions 

  /**
   * The Source of Truth Bootstrapper.
   * Calls the backend to verify the secure cookie and retrieve the user.
   * This must be called when the frontend application initializes.
   */
  async function fetchUser() {
    try {
      const response = await getMe()
      user.value = response.data.user
      await loadMerchant()
      return true
    } catch (err) {
      // If the backend rejects the cookie, clear all reactive state immediately.
      user.value = null
      merchant.value = null
      return false
    }
  }

  /**
   * Log in user using the secure CSRF handshake.
   */
  async function loginUser(credentials) {
    loading.value = true
    error.value   = null

    try {
      const response = await login(credentials)
      
      // We no longer expect a token from the backend, only the validated user payload.
      user.value = response.data.user

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
      
      user.value = response.data.user

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
      const merchants = response.data.data
      
      if (merchants && merchants.length > 0) {
        merchant.value = merchants[0]
      } else {
        merchant.value = null
      }
    } catch {
      merchant.value = null
    }
  }

  /**
   * Log out and clear reactive state.
   */
  async function logoutUser() {
    try {
      await logout() // Tell the server to invalidate the session cookie
    } catch {
      // Even if server call fails (e.g., network error), forcefully clear local state
    } finally {
      user.value     = null
      merchant.value = null
    }
  }

  return {
    user, merchant, loading, error,
    isAuthenticated, hasMerchant,
    fetchUser, loginUser, registerUser, loadMerchant, logoutUser,
  }
})