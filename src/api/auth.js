// src/api/auth.js
import apiClient from './client'

/**
 * Bootstraps the CSRF protection for Sanctum.
 * This MUST be called before any authentication attempts.
 * * Architectural Note: apiClient's baseURL likely ends in '/api'. 
 * The csrf-cookie route exists at the root of the Laravel domain.
 * We override the baseURL for this specific request to ensure it hits the correct endpoint.
 */
export async function fetchCsrfCookie() {
  return apiClient.get('/sanctum/csrf-cookie', {
    // Dynamically strip '/api' from the end of the base URL to hit the root domain
    baseURL: import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') 
  })
}

/**
 * Register a new user.
 * We await the CSRF handshake first to ensure the backend trusts this POST request.
 */
export async function register(data) {
  await fetchCsrfCookie()
  return apiClient.post('/auth/register', data)
}

/**
 * Authenticate the user.
 * The CSRF handshake guarantees the X-XSRF-TOKEN header is populated 
 * before the credentials are transmitted.
 */
export async function login(data) {
  await fetchCsrfCookie()
  return apiClient.post('/auth/login', data)
}

/**
 * Invalidate the server-side session.
 */
export async function logout() {
  return apiClient.post('/auth/logout')
}

/**
 * Returns the authenticated user based on the active session cookie.
 */
export function getMe() {
  return apiClient.get('/auth/me')
}