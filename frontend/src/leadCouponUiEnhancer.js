function saveCoupon(code) {
  const normalized = String(code || '').trim().toUpperCase()
  window.__propulseLeadCouponCode = normalized
  try {
    if (normalized) localStorage.setItem('propulse_lead_coupon_code', normalized)
    else localStorage.removeItem('propulse_lead_coupon_code')
  } catch {}
}

function getCouponCode() {
  return String(window.__propulseLeadCouponCode || '').trim().toUpperCase()
}

function getSavedCoupon() {
  const live = getCouponCode()
  if (live) return live
  try { return String(localStorage.getItem('propulse_lead_coupon_code') || '').trim().toUpperCase() } catch { return '' }
}

function patchLeadPurchaseRequest() {
  if (window.__propulseLeadCouponFetchPatched) return
  window.__propulseLeadCouponFetchPatched = true
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : (input?.url || '')
      if (/\/api\/leads\/\d+\/purchase(?:\?|$)/.test(url) && init?.body) {
        const body = typeof init.body === 'string' ? JSON.parse(init.body) : null
        const couponCode = getSavedCoupon()
        if (body && couponCode && !body.couponCode) {
          init = { ...init, body: JSON.stringify({ ...body, couponCode }) }
        }
      }
    } catch {}
    return originalFetch(input, init)
  }
}

function removeLegacyCouponPanels() {
  document.querySelectorAll('.lv2-coupon-option,.lv2-coupon-breakdown,.lv2-amount-due').forEach(node => {
    if (node.closest('.lv2-buy-modal,.lv2-payment-modal')) node.remove()
  })
}

function ensureCouponPanel() {
  const modal = document.querySelector('.lv2-buy-modal')
  if (!modal) {
    document.querySelectorAll('.propulse-floating-lead-coupon').forEach(node => node.remove())
    return
  }

  let panel = document.querySelector('.propulse-floating-lead-coupon')
  if (!panel) {
    panel = document.createElement('div')
    panel.className = 'propulse-floating-lead-coupon'
    panel.innerHTML = '<div class="plc-head"><b>COUPON CODE</b><span>Optional</span></div><div class="plc-row"><input id="propulse-floating-coupon" type="text" maxlength="50" autocomplete="off" placeholder="Enter coupon code"><button type="button">Apply</button></div><small class="plc-help">Apply before selecting a share package. The discount is calculated on the selected package.</small><div class="plc-status" aria-live="polite"></div>'
    document.body.appendChild(panel)

    panel.addEventListener('click', event => event.stopPropagation())
    panel.querySelector('button').addEventListener('click', () => {
      const input = panel.querySelector('input')
      const status = panel.querySelector('.plc-status')
      const code = String(input?.value || '').trim().toUpperCase()
      if (!code) {
        saveCoupon('')
        status.textContent = 'Enter a coupon code first.'
        status.className = 'plc-status error'
        return
      }
      input.value = code
      saveCoupon(code)
      status.textContent = `${code} applied. Select your share package.`
      status.className = 'plc-status success'
    })

    panel.querySelector('input').addEventListener('input', event => {
      saveCoupon('')
      event.currentTarget.value = event.currentTarget.value.toUpperCase()
      panel.querySelector('.plc-status').textContent = ''
      panel.querySelector('.plc-status').className = 'plc-status'
    })
  }

  const input = panel.querySelector('input')
  const saved = getSavedCoupon()
  if (saved && document.activeElement !== input) input.value = saved

  const rect = modal.getBoundingClientRect()
  const width = Math.min(Math.max(rect.width - 48, 300), 680)
  const left = rect.left + (rect.width - width) / 2
  panel.style.left = `${Math.max(12, left)}px`
  panel.style.width = `${width}px`
  panel.style.top = `${Math.max(12, rect.top + 18)}px`
}

function scan() {
  patchLeadPurchaseRequest()
  removeLegacyCouponPanels()
  ensureCouponPanel()
}

const style = document.createElement('style')
style.textContent = `
.propulse-floating-lead-coupon{position:fixed;z-index:1002;box-sizing:border-box;padding:13px 14px;border:1px solid #dce5ef;border-radius:12px;background:#f8fbff;box-shadow:0 12px 30px rgba(10,45,97,.12);pointer-events:auto}.plc-head{display:flex;align-items:center;gap:7px;margin-bottom:7px}.plc-head b{color:#173b70;font-size:9px;font-weight:900;letter-spacing:.1em}.plc-head span{color:#7b8ba0;font-size:9px;font-weight:600}.plc-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.plc-row input{width:100%;height:39px;box-sizing:border-box;border:1px solid #d6e0eb;border-radius:8px;padding:0 11px;background:#fff;color:#173b70;font-size:11px;font-weight:800;text-transform:uppercase;outline:0}.plc-row input:focus{border-color:#f15a24;box-shadow:0 0 0 2px rgba(241,90,36,.08)}.plc-row button{height:39px;border:0;border-radius:8px;background:#f15a24;color:#fff;padding:0 18px;font-size:10px;font-weight:900;cursor:pointer}.plc-help{display:block;margin-top:6px;color:#7b8ba0;font-size:9px;line-height:1.35}.plc-status{min-height:12px;margin-top:5px;color:#71849e;font-size:9px;font-weight:800}.plc-status.success{color:#14805a}.plc-status.error{color:#b52e24}@media(max-width:600px){.plc-row{grid-template-columns:1fr}.plc-row button{width:100%}.propulse-floating-lead-coupon{left:12px!important;width:calc(100vw - 24px)!important}}
`
document.head.appendChild(style)

const observer = new MutationObserver(() => {
  window.requestAnimationFrame(scan)
})
observer.observe(document.body, { childList: true, subtree: true })
window.addEventListener('resize', scan)
window.addEventListener('scroll', scan, true)
scan()
