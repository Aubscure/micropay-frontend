// src/api/auth.js
import apiClient from './client'

/**
 * All authentication API calls.
 * Kept separate from other endpoints for clarity.
 */

export function register(data) {
  // POST /api/auth/register
  return apiClient.post('/auth/register', data)
}

export function login(data) {
  // POST /api/auth/login
  return apiClient.post('/auth/login', data)
}

export function logout() {
  // POST /api/auth/logout — invalidates the server-side token
  return apiClient.post('/auth/logout')
}

export function getMe() {
  // GET /api/auth/me — returns the authenticated user
  return apiClient.get('/auth/me')
}