// src/api/transactions.js
import apiClient from './client'

export function getTransactions(page = 1) {
  return apiClient.get('/transactions', { params: { page } })
}

export function createTransaction(data) {
  return apiClient.post('/transactions', data)
}

export function getTransaction(id) {
  return apiClient.get(`/transactions/${id}`)
}

export function syncTransactions(transactions) {
  // Batch sync for offline-queued transactions
  return apiClient.post('/transactions/sync', { transactions })
}