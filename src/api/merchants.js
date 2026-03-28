// src/api/merchants.js
import apiClient from './client'

export function getMyMerchant() {
  return apiClient.get('/merchants')
}

export function createMerchant(data) {
  return apiClient.post('/merchants', data)
}