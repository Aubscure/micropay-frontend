// Deliberate, scoped exception to "memory only" state management.
// The offline nonce must survive a page reload that happens while the
// device is offline, or the offline queue can never be written to in
// the exact scenario it exists for (no network to re-fetch it).
// This alone grants no access: without a valid session cookie or
// bearer token alongside it, the nonce cannot be used to reach the API.
const KEY = 'micropay_offline_nonce'

export function persistNonce(nonce) {
  if (nonce) sessionStorage.setItem(KEY, nonce)
}

export function readPersistedNonce() {
  return sessionStorage.getItem(KEY)
}

export function clearPersistedNonce() {
  sessionStorage.removeItem(KEY)
}
