import { authRequest } from './utils/auth'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function enhanceWalletCoupon(modal) {
  if (!modal || modal.dataset.walletCouponReady === 'true') return
  const form = modal.querySelector('form')
  if (!form) return
  const amountInput = form.querySelector('input[type="number"]')
  if (!amountInput) return
  modal.dataset.walletCouponReady = 'true'

  const label = document.createElement('label')
  label.className = 'wallet-coupon-field'
  label.innerHTML = '<span>Coupon code <small>Optional</small></span><div class="wallet-coupon-input-row"><input id="wallet-coupon-code" type="text" maxlength="50" autocomplete="off" placeholder="Enter coupon code"><button type="button" class="wallet-coupon-apply">Apply</button></div><small>Enter the amount you want credited to your wallet. The coupon reduces the amount you need to pay.</small><span class="wallet-coupon-status" aria-live="polite"></span>'
  const amountLabel = amountInput.closest('label')
  if (amountLabel) amountLabel.after(label)
  else form.prepend(label)

  const input = label.querySelector('#wallet-coupon-code')
  const button = label.querySelector('.wallet-coupon-apply')
  const status = label.querySelector('.wallet-coupon-status')

  const summary = document.createElement('div')
  summary.className = 'wallet-coupon-summary'
  summary.innerHTML = '<div><span>Wallet credit</span><strong class="wallet-coupon-credit">₹0.00</strong></div><div><span>Coupon discount</span><strong class="wallet-coupon-discount">₹0.00</strong></div><div class="wallet-coupon-pay-row"><span>AMOUNT TO PAY NOW</span><strong class="wallet-coupon-pay">₹0.00</strong></div><small>After approval, the full wallet credit amount will be added to your balance.</small>'
  label.after(summary)

  let applied = null
  const render = () => {
    const amount = Number(amountInput.value)
    const validAmount = Number.isFinite(amount) && amount > 0
    const discount = applied && validAmount ? Math.min(Number(applied.discountAmount) || 0, amount) : 0
    const payable = validAmount ? Math.max(0, amount - discount) : 0
    summary.querySelector('.wallet-coupon-credit').textContent = money(validAmount ? amount : 0)
    summary.querySelector('.wallet-coupon-discount').textContent = money(discount)
    summary.querySelector('.wallet-coupon-pay').textContent = money(payable)
  }

  button.addEventListener('click', async () => {
    const code = String(input.value || '').trim().toUpperCase()
    const amount = Number(amountInput.value)
    if (!Number.isFinite(amount) || amount <= 0) {
      status.className = 'wallet-coupon-status error'
      status.textContent = 'Enter the wallet amount first.'
      return
    }
    if (!code) {
      applied = null
      render()
      status.className = 'wallet-coupon-status error'
      status.textContent = 'Enter a coupon code first.'
      return
    }

    button.disabled = true
    button.textContent = 'Checking…'
    status.className = 'wallet-coupon-status'
    status.textContent = ''
    try {
      const data = await authRequest('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal: amount, purchaseType: 'wallet_topup' })
      })
      applied = { code, discountAmount: Number(data.discountAmount) || 0, finalAmount: Number(data.finalAmount) || 0 }
      input.value = code
      render()
      status.className = 'wallet-coupon-status success'
      status.textContent = `${code} applied — ${money(applied.discountAmount)} off. Pay ${money(applied.finalAmount)} and receive ${money(amount)} in your wallet after approval.`
    } catch (error) {
      applied = null
      render()
      status.className = 'wallet-coupon-status error'
      status.textContent = error?.message || 'Coupon could not be applied.'
    } finally {
      button.disabled = false
      button.textContent = 'Apply'
    }
  })

  amountInput.addEventListener('input', () => {
    applied = null
    status.textContent = ''
    status.className = 'wallet-coupon-status'
    render()
  })
  input.addEventListener('input', () => {
    applied = null
    status.textContent = ''
    status.className = 'wallet-coupon-status'
    render()
  })
  render()
}

function patchWalletTopupRequest() {
  if (window.__propulseWalletCouponFetchPatched) return
  window.__propulseWalletCouponFetchPatched = true
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : (input?.url || '')
      if (/\/api\/wallet\/topups(?:\?|$)/.test(url) && init?.body) {
        const coupon = String(document.querySelector('#wallet-coupon-code')?.value || '').trim().toUpperCase()
        if (coupon) {
          const body = JSON.parse(init.body)
          if (body && !body.couponCode) init = { ...init, body: JSON.stringify({ ...body, couponCode: coupon }) }
        }
      }
    } catch {}
    return originalFetch(input, init)
  }
}

function scan() {
  document.querySelectorAll('.wallet-add-modal').forEach(enhanceWalletCoupon)
  patchWalletTopupRequest()
}

const style = document.createElement('style')
style.textContent = `
.wallet-coupon-field{display:flex;flex-direction:column;gap:6px}
.wallet-coupon-field>span:first-child{font-size:11px;font-weight:800;color:#173b70}
.wallet-coupon-field>span:first-child small{font-weight:500;color:#7b8ba0}
.wallet-coupon-input-row{display:grid;grid-template-columns:1fr auto;gap:8px}
.wallet-coupon-field input{height:42px;box-sizing:border-box;border:1px solid #d6e0eb;border-radius:9px;padding:0 11px;color:#173b70;font-size:12px;font-weight:800;text-transform:uppercase;outline:0}
.wallet-coupon-apply{border:0;border-radius:9px;background:#173b70;color:#fff;padding:0 18px;font-size:11px;font-weight:900;cursor:pointer}
.wallet-coupon-apply:disabled{opacity:.6;cursor:not-allowed}
.wallet-coupon-field>small{font-size:9px;color:#7b8ba0;line-height:1.4}
.wallet-coupon-status{font-size:10px;font-weight:800;line-height:1.4;color:#71849e}
.wallet-coupon-status.success{color:#14805a}
.wallet-coupon-status.error{color:#b52e24}
.wallet-coupon-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:2px 0 4px;padding:12px;border:1px solid #dce5ef;border-radius:10px;background:#f8fbff}
.wallet-coupon-summary>div{padding:8px 9px;border-radius:8px;background:#fff;border:1px solid #e4eaf1}
.wallet-coupon-summary span{display:block;color:#71849e;font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
.wallet-coupon-summary strong{display:block;margin-top:4px;color:#173b70;font-size:14px}
.wallet-coupon-summary .wallet-coupon-pay-row{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border:1px solid #ffd2c3;background:#fff7f3}
.wallet-coupon-summary .wallet-coupon-pay-row span{color:#a34b2d;font-size:9px}
.wallet-coupon-summary .wallet-coupon-pay{color:#f15a24;font-size:21px}
.wallet-coupon-summary>small{grid-column:1/-1;color:#71849e;font-size:9px;line-height:1.4}
@media(max-width:600px){.wallet-coupon-input-row{grid-template-columns:1fr}.wallet-coupon-apply{height:40px}.wallet-coupon-summary{grid-template-columns:1fr}.wallet-coupon-summary .wallet-coupon-pay-row,.wallet-coupon-summary>small{grid-column:auto}}
`
document.head.appendChild(style)

const observer = new MutationObserver(scan)
observer.observe(document.body, { childList: true, subtree: true })
scan()
