import { authRequest, publicRequest } from '../utils/auth'

const syncProMembership = (data, token) => {
  if (!token || !data) return
  const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : [])
  const membershipFlag = items.find(item => typeof item?.is_pro_member === 'boolean')?.is_pro_member
  if (membershipFlag === undefined) return
  try { localStorage.setItem('propulse_is_pro_member', String(membershipFlag)) } catch {}
}

const appendPageFilters = (query) => {
  if (typeof window === 'undefined' || window.location.pathname !== '/leads') return
  const pageParams = new URLSearchParams(window.location.search)
  ;['industryId', 'serviceId', 'stateId', 'cityId', 'leadType', 'allIndustries'].forEach(key => {
    if (query.has(key)) return
    const value = pageParams.get(key)
    if (value) query.set(key, value)
  })
}

export function listLeads(params = {}, token) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  appendPageFilters(query)
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

export function purchaseLead(id, shares, options = {}) {
  let useWallet = options.useWallet
  if (useWallet === undefined) {
    try { useWallet = localStorage.getItem('propulse_use_wallet') !== 'false' } catch { useWallet = true }
  }
  const couponCode = String(options.couponCode || '').trim()
  return authRequest(`/leads/${id}/purchase`, {
    method: 'POST',
    body: JSON.stringify({
      shares,
      useWallet: useWallet !== false,
      ...(couponCode ? { couponCode } : {})
    })
  }).then(data => {
    try {
      if (data?.coupon) {
        window.__propulseLastLeadCoupon = data.coupon
      } else {
        window.__propulseLastLeadCoupon = null
      }
    } catch {}
    if (!data?.requires_external_payment) return data
    const payment = data.payment || {}
    const paymentId = data.payment_id ?? data.paymentId ?? payment.id ?? null
    const totalAmount = Number(payment.amount ?? data.amount ?? data.totalAmount ?? data.total_amount ?? data.purchase_amount ?? data.purchaseAmount ?? 0)
    const walletAmount = Number(data.walletAmount ?? data.wallet_amount ?? payment.walletAmount ?? payment.wallet_amount ?? 0)
    const externalAmount = Number(data.externalAmount ?? data.external_amount ?? payment.externalAmount ?? payment.external_amount ?? Math.max(0, totalAmount - walletAmount))
    return {
      ...data,
      walletAmount: Number.isFinite(walletAmount) ? walletAmount : 0,
      externalAmount: Number.isFinite(externalAmount) ? externalAmount : 0,
      balanceAfter: Number(data.balanceAfter ?? data.balance_after ?? payment.balanceAfter ?? payment.balance_after ?? 0),
      payment: {
        ...payment,
        id: paymentId,
        amount: Number.isFinite(totalAmount) ? totalAmount : 0,
        wallet_amount: walletAmount,
        external_amount: externalAmount
      }
    }
  })
}
