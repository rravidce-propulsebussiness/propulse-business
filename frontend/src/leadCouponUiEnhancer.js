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
    let isLeadPurchase = false
    try {
      const url = typeof input === 'string' ? input : (input?.url || '')
      isLeadPurchase = /\/api\/leads\/\d+\/purchase(?:\?|$)/.test(url)
      if (isLeadPurchase && init?.body) {
        const couponCode = getCouponCode()
        if (couponCode) {
          const body = typeof init.body === 'string' ? JSON.parse(init.body) : null
          if (body) {
            init = { ...init, body: JSON.stringify({ ...body, couponCode }) }
            window.__propulseLeadCouponCode = ''
          }
        }
      }
    } catch {}
    return originalFetch(input, init)
  }
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
  button.addEventListener('click', async () => {
    const code = String(input.value || '').trim().toUpperCase()
    if (!code) {
      window.__propulseLeadCouponCode = ''
      status.className = 'lv2-coupon-status error'
      status.textContent = 'Enter a coupon code first.'
      return
    }

    const prices = [...modal.querySelectorAll('.lv2-modal-price')]
      .map(node => Number(String(node.textContent || '').replace(/[^0-9.]/g, '')))
      .filter(value => Number.isFinite(value) && value > 0)
    const subtotal = prices.length ? Math.min(...prices) : 0
    if (!subtotal) {
      status.className = 'lv2-coupon-status error'
      status.textContent = 'No share price is available to validate this coupon.'
      return
    }

    button.disabled = true
    button.textContent = 'Checking…'
    status.className = 'lv2-coupon-status'
    status.textContent = ''
    try {
      const data = await authRequest('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal, purchaseType: 'lead' })
      })
      input.value = code
      window.__propulseLeadCouponCode = code
      status.className = 'lv2-coupon-status success'
      status.textContent = `${code} applied — discount ${money(data.discountAmount)}. Final lead amount ${money(data.finalAmount)} before wallet balance.`
    } catch (error) {
      window.__propulseLeadCouponCode = ''
      status.className = 'lv2-coupon-status error'
      status.textContent = error?.message || 'Coupon could not be applied.'
    } finally {
      button.disabled = false
      button.textContent = 'Apply'
    }
  })

  input.addEventListener('input', () => {
    window.__propulseLeadCouponCode = ''
    status.textContent = ''
    status.className = 'lv2-coupon-status'
  })
}

function enhancePaymentAmount(modal) {
  if (!modal || modal.dataset.amountClarityReady === 'true') return
  const detailGrid = modal.querySelector('.lv2-detail-grid')
  if (!detailGrid || !modal.classList.contains('lv2-payment-modal')) return
  modal.dataset.amountClarityReady = 'true'

  const payment = [...detailGrid.querySelectorAll('div')]
  const directText = payment.find(node => /Direct payment/i.test(node.textContent || ''))?.querySelector('b')?.textContent || ''
  const totalText = payment.find(node => /^Total/i.test(node.textContent?.trim() || ''))?.querySelector('b')?.textContent || ''
  const amount = document.createElement('div')
  amount.className = 'lv2-amount-due'
  amount.innerHTML = `<div><small>AMOUNT TO PAY NOW</small><strong>${directText || '₹0'}</strong></div><span>${totalText ? `Final amount after coupon: ${totalText}. ` : ''}Transfer exactly this amount and submit your UTR below.</span>`
  detailGrid.insertAdjacentElement('afterend', amount)
}

function scan() {
  document.querySelectorAll('.lv2-buy-modal').forEach(enhanceLeadCoupon)
  document.querySelectorAll('.lv2-upgrade.lv2-payment-modal').forEach(enhancePaymentAmount)
  patchLeadPurchaseRequest()
}

const style = document.createElement('style')
style.textContent = `
.lv2-coupon-apply-row{display:flex;align-items:center;gap:8px;margin-top:8px;min-height:28px}.lv2-coupon-apply{border:0;border-radius:7px;background:#173b70;color:#fff;padding:7px 14px;font-size:9px;font-weight:900;cursor:pointer}.lv2-coupon-apply:disabled{opacity:.6;cursor:not-allowed}.lv2-coupon-status{font-size:9px;font-weight:700;color:#71849e;line-height:1.4}.lv2-coupon-status.success{color:#14805a}.lv2-coupon-status.error{color:#b52e24}.lv2-amount-due{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px;padding:14px 16px;border:1px solid #ffd2c3;border-radius:12px;background:#fff7f3}.lv2-amount-due small{display:block;color:#a34b2d;font-size:8px;font-weight:900;letter-spacing:.12em}.lv2-amount-due strong{display:block;margin-top:3px;color:#f15a24;font-size:24px;line-height:1.1}.lv2-amount-due span{max-width:260px;color:#71849e;font-size:9px;line-height:1.45;text-align:right;font-weight:700}@media(max-width:600px){.lv2-amount-due{align-items:flex-start;flex-direction:column}.lv2-amount-due span{max-width:none;text-align:left}}
`
document.head.appendChild(style)

const observer = new MutationObserver(scan)
observer.observe(document.body, { childList: true, subtree: true })
scan()
