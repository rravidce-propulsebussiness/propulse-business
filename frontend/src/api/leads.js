import { authRequest, publicRequest } from '../utils/auth'

export function listLeads(params = {}, token) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  return token ? authRequest(`/leads?${query.toString()}`) : publicRequest(`/leads?${query.toString()}`)
}

export function getLead(id) {
  return authRequest(`/leads/${id}`)
}

export function claimLead(id) {
  return authRequest(`/leads/${id}/claim`, { method: 'POST' })
}

export function purchaseLead(id, shares) {
  return authRequest(`/leads/${id}/purchase`, {
    method: 'POST',
    body: JSON.stringify({ shares })
  })
}
