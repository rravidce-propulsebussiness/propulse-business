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
  if (!modal) return

  let field = modal.querySelector('.lv2-coupon-option')
  if (!field) {
    const pricing = modal.querySelector('.lv2-modal-pricing')
    if (!pricing) return

    field = document.createElement('div')
    field.className = 'lv2-coupon-option'
    field.innerHTML = '<div class="lv2-coupon-label"><span>COUPON CODE</span><small>Optional</small></div><div class="lv2-coupon-input-row"><input id="lead-coupon-code" type="text" maxlength="50" autocomplete="off" placeholder="Enter coupon code"><button type="button" class="lv2-coupon-apply">Apply</button></div><small class="lv2-coupon-help">Apply a coupon before selecting your share package. The discount is calculated on the selected package.</small><span class="lv2-coupon-status" aria-live="polite"></span>'
    pricing.parentNode.insertBefore(field, pricing)
  }

  if (field.dataset.applyReady === 'true') return
  const input = field.querySelector('#lead-coupon-code')
  const button = field.querySelector('.lv2-coupon-apply')
  const status = field.querySelector('.lv2-coupon-status')
  if (!input || !button || !status) return
  field.dataset.applyReady = 'true'

  try {
    const saved = localStorage.getItem('propulse_lead_coupon_code')
    if (saved) input.value = saved
  } catch {}

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
.lv2-coupon-option{margin:14px 0;padding:14px;border:1px solid #dce5ef;border-radius:12px;background:#f8fbff;box-sizing:border-box}.lv2-coupon-label{display:flex;align-items:center;gap:7px;margin-bottom:8px}.lv2-coupon-label span{color:#173b70;font-size:9px;font-weight:900;letter-spacing:.1em}.lv2-coupon-label small{color:#7b8ba0;font-size:9px;font-weight:600}.lv2-coupon-input-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.lv2-coupon-input-row input{width:100%;height:40px;box-sizing:border-box;border:1px solid #d6e0eb;border-radius:8px;padding:0 11px;background:#fff;color:#173b70;font-size:11px;font-weight:800;text-transform:uppercase;outline:0}.lv2-coupon-input-row input:focus{border-color:#f15a24;box-shadow:0 0 0 2px rgba(241,90,36,.08)}.lv2-coupon-apply{height:40px;border:0;border-radius:8px;background:#f15a24;color:#fff;padding:0 18px;font-size:10px;font-weight:900;cursor:pointer}.lv2-coupon-apply:hover{filter:brightness(.96)}.lv2-coupon-help{display:block;margin-top:7px;color:#7b8ba0;font-size:9px;line-height:1.4}.lv2-coupon-status{display:block;margin-top:7px;min-height:13px;color:#71849e;font-size:9px;font-weight:800;line-height:1.4}.lv2-coupon-status.success{color:#14805a}.lv2-coupon-status.error{color:#b52e24}.lv2-coupon-breakdown{margin-top:12px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;padding:12px 14px}.lv2-coupon-breakdown>div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:5px 0;color:#71849e;font-size:10px;font-weight:700}.lv2-coupon-breakdown>div b{color:#173b70}.lv2-coupon-breakdown>div.final{margin-top:5px;padding-top:10px;border-top:1px dashed #dfe7f1;color:#173b70;font-weight:900}.lv2-coupon-breakdown>div.final strong{font-size:16px;color:#f15a24}.lv2-amount-due{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:12px;padding:14px 16px;border:1px solid #ffd2c3;border-radius:12px;background:#fff7f3}.lv2-amount-due small{display:block;color:#a34b2d;font-size:8px;font-weight:900;letter-spacing:.12em}.lv2-amount-due strong{display:block;margin-top:3px;color:#f15a24;font-size:26px;line-height:1.1}.lv2-amount-due span{max-width:300px;color:#71849e;font-size:9px;line-height:1.45;text-align:right;font-weight:700}@media(max-width:600px){.lv2-coupon-input-row{grid-template-columns:1fr}.lv2-coupon-apply{width:100%}.lv2-amount-due{align-items:flex-start;flex-direction:column}.lv2-amount-due span{max-width:none;text-align:left}}
`
document.head.appendChild(style)

const observer = new MutationObserver(scan)
observer.observe(document.body, { childList: true, subtree: true })
scan()
