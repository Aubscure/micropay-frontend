// src/api/client.js
import axios from 'axios'

/**
 * Central Axios instance for all API calls.
 * Configured strictly for secure, first-party cookie authentication.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,

  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },

  // SECURITY MANDATE: This is the linchpin of the new architecture.
  // It instructs the browser to attach secure cookies and the X-XSRF-TOKEN 
  // to every cross-origin request automatically.
  withCredentials: true,
})

/**
 * Request Interceptor
 * The Authorization Bearer injection logic has been completely eradicated.
 */
apiClient.interceptors.request.use((config) => {
  // Authentication is now handled natively by the browser.
  // This interceptor is kept clean, but remains available if you need to 
  // inject non-security headers in the future.
  return config
})

/**
 * Response Interceptor
 * Handles global architectural rejections securely.
 */
apiClient.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status

    // 401: The server explicitly rejected the session (Unauthenticated).
    // 419: Laravel specific. The CSRF token was missing or mismatched.
    if (status === 401 || status === 419) {
      
      // Clear UI-only cache data. We no longer clear auth_token because it does not exist.
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_merchant')

      // Hard redirect to force a clean slate and re-bootstrap the CSRF phase.
      window.location.href = '/login'
    }

    // Re-throw the error so specific components can render UI warnings if necessary.
    return Promise.reject(error)
  }
)

export default apiClient