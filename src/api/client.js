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
 * Attaches the bearer token as a fallback auth path. Required because
 * SameSite=Lax session cookies are excluded from cross-site subrequests
 * (vercel.app -> onrender.com is cross-site), so cookie-only auth silently
 * fails on every request except a full top-level navigation.
 */
apiClient.interceptors.request.use((config) => {
  try {
    const auth = useAuthStore()
    const token = auth?.token
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
 * Uses router navigation instead of a hard reload, so an in-flight
 * offline sync isn't cut off mid-operation by a full page unload.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthPath = window.location.pathname === '/login' ||
                       window.location.pathname === '/register';

    if ((status === 401 || status === 419) && !isAuthPath) {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_merchant');

      import('@/router').then(({ default: router }) => {
        router.push({ name: 'login' })
      });
    }

    return Promise.reject(error);
  }
)

export default apiClient
