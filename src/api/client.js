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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthPath = window.location.pathname === '/login' ||
                       window.location.pathname === '/register';

    if ((status === 401 || status === 419) && !isAuthPath) {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_merchant');

      // Use router navigation instead of a hard reload. This lets any
      // in-flight offline sync (IndexedDB reads/writes) finish naturally
      // instead of being cut off mid-operation by a full page unload.
      import('@/router').then(({ default: router }) => {
        router.push({ name: 'login' })
      });
    }

    return Promise.reject(error);
  }
)

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
