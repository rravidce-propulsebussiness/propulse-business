import { authRequest } from '../utils/auth'

export function listWhatsAppAccounts() {
  return authRequest('/whatsapp/accounts')
}

export function connectWhatsAppAccount(data) {
  return authRequest('/whatsapp/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
    idempotency: true,
  })
}

export function disconnectWhatsAppAccount(id) {
  return authRequest(`/whatsapp/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function sendWhatsAppMessage(id, data, idempotencyKey) {
  return authRequest(`/whatsapp/accounts/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
    body: JSON.stringify(data),
  })
}
