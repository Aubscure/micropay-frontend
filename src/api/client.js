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
// src/api/client.js

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    
    // Check if the user is already on an authentication page
    const isAuthPage = window.location.pathname === '/login' || 
                       window.location.pathname === '/register';

    // 401: Unauthorized | 419: CSRF Token Mismatch
    if ((status === 401 || status === 419) && !isAuthPage) {
      
      // Only clear cache and redirect if we aren't already trying to log in
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_merchant');

      // Force a hard reload to the login page to reset the CSRF state
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
)

export default apiClient