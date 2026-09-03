// src/api/auth.js
import apiClient from './client'

/**
 * Bootstraps the CSRF protection for Sanctum across different domains.
 * This MUST be called before any state-changing auth requests.
 */
export async function fetchCsrfCookie() {
  // 1) Establish/refresh the session cookie with the backend (Sanctum).
  await apiClient.get('/sanctum/csrf-cookie', {
    baseURL: '[https://micropay-api.onrender.com/api](https://micropay-api.onrender.com/api)'.replace(/\/api\/?$/, '')
  });

  // 2) Cross-site fallback: fetch a session-bound CSRF token as JSON.
  // Needed when the browser blocks JS access to the XSRF-TOKEN cookie on a different TLD.
  const { data } = await apiClient.get('auth/csrf');

  // 3) Send the token on subsequent state-changing requests.
  apiClient.defaults.headers.common['X-CSRF-TOKEN'] = data.csrf_token;
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
