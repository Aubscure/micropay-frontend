// src/api/auth.js
import apiClient from './client'

/**
 * Bootstraps the CSRF protection for Sanctum across different domains.
 * This MUST be called before any state-changing auth requests.
 */
export async function fetchCsrfCookie() {
  // Let Sanctum set both the session and readable XSRF cookies.
  // Axios will read XSRF-TOKEN and send X-XSRF-TOKEN automatically.
  await apiClient.get('/sanctum/csrf-cookie', {
    baseURL: import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') 
  });
}

export async function register(data) {
  await fetchCsrfCookie();
  return apiClient.post('/auth/register', data);
}

export async function login(data) {
  await fetchCsrfCookie();
  return apiClient.post('/auth/login', data);
}

export async function logout() {
  return apiClient.post('/auth/logout');
}

export function getMe() {
  return apiClient.get('/auth/me');
}