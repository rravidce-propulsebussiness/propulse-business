export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

function withLeadCoupon(path, options) {
  if (!/^\/leads\/\d+\/purchase(?:\?|$)/.test(path) || !options?.body) return options
  try {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : null
    if (!body) return options
    let couponCode = String(body.couponCode || '').trim().toUpperCase()
    if (!couponCode) couponCode = String(window.__propulseLeadCouponCode || '').trim().toUpperCase()
    if (!couponCode) {
      try { couponCode = String(localStorage.getItem('propulse_lead_coupon_code') || '').trim().toUpperCase() } catch {}
    }
    if (!couponCode) return options
    const nextBody = JSON.stringify({ ...body, couponCode })
    try { localStorage.removeItem('propulse_lead_coupon_code') } catch {}
    window.__propulseLeadCouponCode = ''
    return { ...options, body: nextBody }
  } catch {
    return options
  }
}

export async function apiRequest(path, options = {}, includeToken = true) {
  const requestOptions = withLeadCoupon(path, options)
  const headers = { 'Content-Type': 'application/json', ...(requestOptions.headers || {}) }
  const token = includeToken ? localStorage.getItem('propulse_auth_token') : null
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_BASE_URL}${path}`, { ...requestOptions, headers })
  const data = await response.json().catch(() => ({}))

  if (response.status === 401 && token && path !== '/auth/login') {
    localStorage.removeItem('propulse_auth_token')
    localStorage.removeItem('propulse_auth_user')
    localStorage.removeItem('propulse_session_mode')
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed')
    error.status = response.status
    error.code = data.code
    throw error
  }

  if (Array.isArray(data?.data)) {
    const collection = data.data
    collection.data = collection
    if (data.pagination) collection.pagination = data.pagination
    return collection
  }

  return data
}
