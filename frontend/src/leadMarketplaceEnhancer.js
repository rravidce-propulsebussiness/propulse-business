import { authRequest } from './utils/auth'

const preferenceKey = 'propulse_use_wallet'

function formatMoney(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : '₹0'
}

function enhanceBuyModal(modal) {
  if (!modal || modal.dataset.walletPreferenceReady === 'true') return
  const pricing = modal.querySelector('.lv2-modal-pricing')
  if (!pricing) return

  modal.dataset.walletPreferenceReady = 'true'
  try { localStorage.setItem(preferenceKey, 'true') } catch {}

  const option = document.createElement('label')
  option.className = 'lv2-wallet-option'
  option.innerHTML = '<input type="checkbox" checked><span><strong>Use wallet balance</strong><small>Apply your available wallet balance first. Uncheck to pay the full amount directly.</small></span><b class="lv2-wallet-balance">Checking…</b>'

  const checkbox = option.querySelector('input')
  checkbox.addEventListener('change', () => {
    try { localStorage.setItem(preferenceKey, checkbox.checked ? 'true' : 'false') } catch {}
  })

  pricing.parentNode.insertBefore(option, pricing)

  authRequest('/wallet').then(data => {
    const balance = Number(data?.balance ?? 0)
    const balanceNode = option.querySelector('.lv2-wallet-balance')
    if (balanceNode) balanceNode.textContent = `Available ${formatMoney(balance)}`
    if (!Number.isFinite(balance) || balance <= 0) {
      checkbox.checked = true
      try { localStorage.setItem(preferenceKey, 'true') } catch {}
    }
  }).catch(() => {
    const balanceNode = option.querySelector('.lv2-wallet-balance')
    if (balanceNode) balanceNode.textContent = 'Wallet balance unavailable'
  })
}

function enhancePaymentModal(modal) {
  if (!modal || modal.dataset.paymentModalReady === 'true') return
  if (!modal.querySelector('#lead-payment-utr')) return
  modal.dataset.paymentModalReady = 'true'
  modal.classList.add('lead-payment-modal')
}

function scan() {
  document.querySelectorAll('.lv2-buy-modal').forEach(enhanceBuyModal)
  document.querySelectorAll('.lv2-upgrade').forEach(enhancePaymentModal)
}

const observer = new MutationObserver(scan)
observer.observe(document.body, { childList: true, subtree: true })
scan()
