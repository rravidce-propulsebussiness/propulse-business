import { authRequest } from './utils/auth'

function money(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : '₹0'
}

function getCouponCode() {
  const inputCode = String(document.querySelector('#lead-coupon-code')?.value || '').trim().toUpperCase()
  if (inputCode) return inputCode
  return String(window.__propulseLeadCouponCode || '').trim().toUpperCase()
}

function patchLeadPurchaseRequest() {
  if (window.__propulseLeadCouponFetchPatched) return
  window.__propulseLeadCouponFetchPatched = true
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : (input?.url || '')
      if (/\/api\/leads\/\d+\/purchase(?:\?|$)/.test(url) && init?.body) {
        const couponCode = getCouponCode()
        if (couponCode) {
          const body = typeof init.body === 'string' ? JSON.parse(init.body) : null
          if (body) init = { ...init, body: JSON.stringify({ ...body, couponCode }) }
        }
      }
    } catch {}
    return originalFetch(input, init)
  }
}

function saveCoupon(code) {
  const normalized = String(code || '').trim().toUpperCase()
  window.__propulseLeadCouponCode = normalized
  try {
    if (normalized) localStorage.setItem('propulse_lead_coupon_code', normalized)
    else localStorage.removeItem('propulse_lead_coupon_code')
  } catch {}
}

function enhanceLeadCoupon(modal) {
  const field = modal?.querySelector('.lv2-coupon-option')
  if (!field || field.dataset.applyReady === 'true') return
  const input = field.querySelector('#lead-coupon-code')
  if (!input) return
  field.dataset.applyReady = 'true'

  const row = document.createElement('div')
  row.className = 'lv2-coupon-apply-row'
  row.innerHTML = '<button type="button" class="lv2-coupon-apply">Apply</button><span class="lv2-coupon-status" aria-live="polite"></span>'
  field.appendChild(row)

  const status = row.querySelector('.lv2-coupon-status')
  const button = row.querySelector('.lv2-coupon-apply')
  button.addEventListener('click', () => {
    const code = String(input.value || '').trim().toUpperCase()
    if (!code) {
      saveCoupon('')
      status.className = 'lv2-coupon-status error'
      status.textContent = 'Enter a coupon code first.'
      return
    }
    input.value = code
    saveCoupon(code)
    status.className = 'lv2-coupon-status success'
    status.textContent = `${code} applied. The discount will be calculated from the exact share package you select.`
  })

  input.addEventListener('input', () => {
    saveCoupon('')
    status.textContent = ''
    status.className = 'lv2-coupon-status'
  })
}

function enhancePaymentAmount(modal) {
  if (!modal || modal.dataset.amountClarityReady === 'true') return
  const detailGrid = modal.querySelector('.lv2-detail-grid')
  if (!detailGrid || !modal.classList.contains('lv2-payment-modal')) return
  modal.dataset.amountClarityReady = 'true'

  const coupon = window.__propulseLastLeadCoupon || null
  const payment = [...detailGrid.querySelectorAll('div')]
  const directNode = payment.find(node => /Direct payment/i.test(node.textContent || ''))
  const totalNode = payment.find(node => /^Total/i.test(node.textContent?.trim() || ''))
  const directText = directNode?.querySelector('b')?.textContent || ''
  const totalText = totalNode?.querySelector('b')?.textContent || ''

  if (totalNode && coupon) {
    const label = totalNode.querySelector('small')
    if (label) label.textContent = 'Final total'
    const value = totalNode.querySelector('b')
    if (value) value.textContent = money(coupon.finalAmount)
  }

  const breakdown = document.createElement('div')
  breakdown.className = 'lv2-coupon-breakdown'
  if (coupon) {
    breakdown.innerHTML = `<div><span>Original amount</span><b>${money(coupon.subtotalAmount)}</b></div><div><span>Coupon (${coupon.code})</span><b>− ${money(coupon.discountAmount)}</b></div><div class="final"><span>Final lead amount</span><strong>${money(coupon.finalAmount)}</strong></div>`
  } else {
    breakdown.innerHTML = `<div class="final"><span>Final lead amount</span><strong>${totalText || directText || '₹0'}</strong></div>`
  }
  detailGrid.insertAdjacentElement('afterend', breakdown)

  const amount = document.createElement('div')
  amount.className = 'lv2-amount-due'
  const finalAmount = coupon ? money(coupon.finalAmount) : (directText || '₹0')
  const note = coupon
    ? `${coupon.code} saved ${money(coupon.discountAmount)}. This is the exact amount to transfer.`
    : 'Transfer exactly this amount and submit your UTR below.'
  amount.innerHTML = `<div><small>AMOUNT TO PAY NOW</small><strong>${finalAmount}</strong></div><span>${note}</span>`
  breakdown.insertAdjacentElement('afterend', amount)
}

function scan() {
  document.querySelectorAll('.lv2-buy-modal').forEach(enhanceLeadCoupon)
  document.querySelectorAll('.lv2-upgrade.lv2-payment-modal').forEach(enhancePaymentAmount)
  patchLeadPurchaseRequest()
}

const style = document.createElement('style')
style.textContent = `
.lv2-coupon-apply-row{display:flex;align-items:center;gap:8px;margin-top:8px;min-height:28px}.lv2-coupon-apply{border:0;border-radius:7px;background:#173b70;color:#fff;padding:7px 14px;font-size:9px;font-weight:900;cursor:pointer}.lv2-coupon-apply:disabled{opacity:.6;cursor:not-allowed}.lv2-coupon-status{font-size:9px;font-weight:700;color:#71849e;line-height:1.4}.lv2-coupon-status.success{color:#14805a}.lv2-coupon-status.error{color:#b52e24}.lv2-coupon-breakdown{margin-top:12px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;padding:12px 14px}.lv2-coupon-breakdown>div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:5px 0;color:#71849e;font-size:10px;font-weight:700}.lv2-coupon-breakdown>div b{color:#173b70}.lv2-coupon-breakdown>div.final{margin-top:5px;padding-top:10px;border-top:1px dashed #dfe7f1;color:#173b70;font-weight:900}.lv2-coupon-breakdown>div.final strong{font-size:16px;color:#f15a24}.lv2-amount-due{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:12px;padding:14px 16px;border:1px solid #ffd2c3;border-radius:12px;background:#fff7f3}.lv2-amount-due small{display:block;color:#a34b2d;font-size:8px;font-weight:900;letter-spacing:.12em}.lv2-amount-due strong{display:block;margin-top:3px;color:#f15a24;font-size:26px;line-height:1.1}.lv2-amount-due span{max-width:300px;color:#71849e;font-size:9px;line-height:1.45;text-align:right;font-weight:700}@media(max-width:600px){.lv2-amount-due{align-items:flex-start;flex-direction:column}.lv2-amount-due span{max-width:none;text-align:left}}
`
document.head.appendChild(style)

const observer = new MutationObserver(scan)
observer.observe(document.body, { childList: true, subtree: true })
scan()
