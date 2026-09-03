// src/api/auth.js
import apiClient from './client'

/**
 * Bootstraps the CSRF protection for Sanctum across different domains.
 * This MUST be called before any state-changing auth requests.
 */
export async function fetchCsrfCookie() {
  // Strip the trailing /api segment to hit the root-level sanctum route.
  const rootURL = apiClient.defaults.baseURL.replace(/\/api\/?$/, '')
  await apiClient.get('/sanctum/csrf-cookie', { baseURL: rootURL })

  const { data } = await apiClient.get('auth/csrf')
  apiClient.defaults.headers.common['X-CSRF-TOKEN'] = data.csrf_token
}


export async function register(data) {
  await fetchCsrfCookie();
  const response = await apiClient.post('auth/register', data);
  // Session regeneration can rotate the CSRF token; re-sync immediately.
  await fetchCsrfCookie();
  return response;
}

export async function login(data) {
  await fetchCsrfCookie();
  const response = await apiClient.post('auth/login', data);
  // Session regeneration can rotate the CSRF token; re-sync immediately.
  await fetchCsrfCookie();
  return response;
}

export async function logout() {
  return apiClient.post('auth/logout');
}

export function getMe() {
  return apiClient.get('auth/me');
}
