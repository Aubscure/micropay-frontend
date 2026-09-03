// src/api/client.js
// src/api/client.js
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

// Read from Vite env at build time. Falls back to localhost only for dev
// convenience; production must always come from VITE_API_URL so a change
// in Vercel's dashboard is visible in the built bundle after redeploy.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
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
