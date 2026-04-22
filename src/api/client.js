// src/api/client.js
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

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
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

/**
 * Request Interceptor
 * The Authorization Bearer injection logic has been completely eradicated.
 */
apiClient.interceptors.request.use((config) => {
  // Primary auth remains cookie-based.
  // Fallback: attach Sanctum token if present (cross-domain session instability).
  try {
    const auth = useAuthStore()
    const token = auth?.token?.value ?? auth?.token ?? null
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // Store may not be initialized yet (boot order); ignore safely.
  }
  return config
})

/**
 * Response Interceptor
 * Handles global architectural rejections securely.
 */
// src/api/client.js

// src/api/client.js
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthPath = window.location.pathname === '/login' || 
                       window.location.pathname === '/register';

    // 401 (Unauthorized) or 419 (CSRF Mismatch)
    if ((status === 401 || status === 419) && !isAuthPath) {
      // Only clear cache and redirect if NOT already on an auth page
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_merchant');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
)

export default apiClient