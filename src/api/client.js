// src/api/client.js
import axios from 'axios'

/**
 * Central Axios instance for all API calls.
 * Every request goes through here — auth headers, base URL,
 * and error handling are configured once in this file.
 */
const apiClient = axios.create({
  // Read the API URL from .env — never hardcode it
  baseURL: import.meta.env.VITE_API_URL,

  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

/**
 * Request interceptor — runs before every request is sent.
 * Automatically attaches the Bearer token if one is stored.
 */
apiClient.interceptors.request.use((config) => {
  // Read token from localStorage on every request
  // so we always use the latest token
  const token = localStorage.getItem('auth_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

/**
 * Response interceptor — runs after every response.
 * Handles global errors like 401 (token expired).
 */
apiClient.interceptors.response.use(
  // Success — just pass the response through
  (response) => response,

  // Error — handle globally
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }

    // Re-throw so individual calls can still handle their own errors
    return Promise.reject(error)
  }
)

export default apiClient