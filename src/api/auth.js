// src/api/auth.js
import apiClient from './client'

/**
 * Bootstraps the CSRF protection for Sanctum across different domains.
 * This MUST be called before any authentication attempts.
 */
export async function fetchCsrfCookie() {
  // 1. Establish the session cookie with the backend
  await apiClient.get('/sanctum/csrf-cookie', {
    baseURL: import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') 
  });

  // 2. Fetch the readable token from our new secure endpoint
  const response = await apiClient.get('/auth/csrf');
  
  // 3. Manually inject the token into Axios so it is sent on all subsequent POSTs
  apiClient.defaults.headers.common['X-CSRF-TOKEN'] = response.data.csrf_token;
}

export async function register(data) {
  await fetchCsrfCookie()
  return apiClient.post('/auth/register', data)
}

export async function login(data) {
  await fetchCsrfCookie()
  return apiClient.post('/auth/login', data)
}

export async function logout() {
  return apiClient.post('/auth/logout')
}

export function getMe() {
  return apiClient.get('/auth/me')
}