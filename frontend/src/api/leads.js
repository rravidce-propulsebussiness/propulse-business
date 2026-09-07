import { authRequest, publicRequest } from '../utils/auth'

const syncProMembership = (data, token) => {
  if (!token || !data) return
  const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : [])
  const membershipFlag = items.find(item => typeof item?.is_pro_member === 'boolean')?.is_pro_member
  if (membershipFlag === undefined) return
  try { localStorage.setItem('propulse_is_pro_member', String(membershipFlag)) } catch {}
}

export function listLeads(params = {}, token) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const request = token ? authRequest(`/leads?${query.toString()}`) : publicRequest(`/leads?${query.toString()}`)
  return request.then(data => {
    syncProMembership(data, token)
    return data
  })
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
