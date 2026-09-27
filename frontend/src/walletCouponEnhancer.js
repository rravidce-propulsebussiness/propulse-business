import { authRequest } from './utils/auth'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const offerTitle = offer => {
  if (offer?.benefit_type === 'wallet_bonus') {
    return offer.reward_value_type === 'percent'
      ? `${Number(offer.reward_value || 0)}% extra wallet balance`
      : `${money(offer.reward_value)} bonus wallet balance`
  }
  if (offer?.benefit_type === 'lead_bonus') {
    const qty = Number(offer.bonus_lead_quantity || 0)
    return `+${qty} ${offer.bonus_lead_type === 'premium' ? 'Premium' : 'Basic'} lead${qty === 1 ? '' : 's'}`
  }
  return offer?.discount_type === 'percent'
    ? `${Number(offer?.discount_value || 0)}% off`
    : `${money(offer?.discount_value)} off`
}
const walletOfferPreview = offer => {
  const minimum = Math.max(0, Number(offer?.min_order_amount || 0))
  if (offer?.benefit_type === 'wallet_bonus') {
    const reward = offer.reward_value_type === 'percent'
      ? minimum * Number(offer.reward_value || 0) / 100
      : Number(offer.reward_value || 0)
    return minimum > 0
      ? `Add ${money(minimum)} → receive ${money(minimum + reward)}`
      : offerTitle(offer)
  }
  return minimum > 0 ? `Minimum top-up ${money(minimum)}` : 'Available on wallet top-up'
}

function enhanceWalletCoupon(modal) {
  if (!modal || modal.dataset.walletCouponReady === 'true') return
  const form = modal.querySelector('form')
  if (!form) return
  const amountInput = form.querySelector('input[type="number"]')
  if (!amountInput) return
  modal.dataset.walletCouponReady = 'true'
  modal.dataset.walletCouponZero = 'false'

  const offers = document.createElement('section')
  offers.className = 'wallet-public-offers'
  offers.innerHTML = '<div class="wallet-public-offers-head"><div><span>AVAILABLE OFFERS</span><strong>Get more from your top-up</strong></div><small>Eligible offers for your account</small></div><div class="wallet-public-offer-list"><span class="wallet-offer-loading">Checking offers…</span></div>'
  const subtitle = modal.querySelector('.wallet-modal-subtitle')
  if (subtitle) subtitle.after(offers)
  else form.before(offers)

  const label = document.createElement('label')
  label.className = 'wallet-coupon-field'
  label.innerHTML = '<span>Promotion / coupon code <small>Optional</small></span><div class="wallet-coupon-input-row"><input id="wallet-coupon-code" type="text" maxlength="50" autocomplete="off" placeholder="Enter offer code"><button type="button" class="wallet-coupon-apply">Apply</button></div><small>Public offers can be selected above. Private codes can still be entered here.</small><span class="wallet-coupon-status" aria-live="polite"></span>'
  const amountLabel = amountInput.closest('label')
  if (amountLabel) amountLabel.after(label)
  else form.prepend(label)

  const input = label.querySelector('#wallet-coupon-code')
  const button = label.querySelector('.wallet-coupon-apply')
  const status = label.querySelector('.wallet-coupon-status')
  const referenceLabel = [...form.querySelectorAll('label')].find(x => /payment reference|utr/i.test(x.textContent || ''))
  const proofLabel = [...form.querySelectorAll('label')].find(x => /payment proof/i.test(x.textContent || ''))
  const submitButton = form.querySelector('button[type="submit"]')

  const summary = document.createElement('div')
  summary.className = 'wallet-coupon-summary'
  summary.innerHTML = '<div><span>Wallet credit</span><strong class="wallet-coupon-credit">₹0.00</strong></div><div><span>Promotion benefit</span><strong class="wallet-coupon-discount">₹0.00</strong></div><div class="wallet-coupon-pay-row"><span>AMOUNT TO PAY NOW</span><strong class="wallet-coupon-pay">₹0.00</strong></div><small>After approval, the wallet amount shown above will be credited to your balance.</small>'
  label.after(summary)

  let applied = null
  let publicOffers = []

  const render = () => {
    const amount = Number(amountInput.value)
    const validAmount = Number.isFinite(amount) && amount > 0
    const discount = applied && validAmount ? Math.min(Number(applied.discountAmount) || 0, amount) : 0
    const bonus = applied?.reward?.type === 'wallet_bonus' && validAmount ? Math.max(0, Number(applied.reward.amount) || 0) : 0
    const payable = applied && validAmount ? Math.max(0, Number(applied.finalAmount ?? amount - discount) || 0) : (validAmount ? amount : 0)
    const walletCredit = validAmount ? amount + bonus : 0
    const fullyDiscounted = Boolean(applied && validAmount && payable === 0)
    modal.dataset.walletCouponZero = fullyDiscounted ? 'true' : 'false'
    summary.querySelector('.wallet-coupon-credit').textContent = money(walletCredit)
    summary.querySelector('.wallet-coupon-discount').textContent = bonus > 0
      ? `+${money(bonus)} bonus`
      : discount > 0
        ? `−${money(discount)} discount`
        : '₹0.00'
    summary.querySelector('.wallet-coupon-pay-row span').textContent = 'AMOUNT TO PAY NOW'
    summary.querySelector('.wallet-coupon-pay').textContent = money(payable)
    const note = summary.querySelector(':scope > small')
    if (note) {
      note.textContent = fullyDiscounted
        ? `100% discount applied. ${money(walletCredit)} will be credited immediately; no UTR or proof is required.`
        : bonus > 0
          ? `Pay ${money(payable)}. After approval, ${money(walletCredit)} will be credited including ${money(bonus)} promotional balance.`
          : 'After approval, the wallet amount shown above will be credited to your balance.'
    }
    if (referenceLabel) referenceLabel.hidden = fullyDiscounted
    if (proofLabel) proofLabel.hidden = fullyDiscounted
    if (submitButton) submitButton.innerHTML = fullyDiscounted ? 'Add to wallet for ₹0 <span>→</span>' : 'Submit balance request <span>→</span>'
  }

  const renderOffers = () => {
    const list = offers.querySelector('.wallet-public-offer-list')
    if (!list) return
    if (!publicOffers.length) {
      list.innerHTML = '<span class="wallet-offer-empty">No public wallet offers are active for your account right now.</span>'
      return
    }
    list.replaceChildren(...publicOffers.map(offer => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'wallet-public-offer-card'
      card.dataset.code = offer.code
      const minimum = Math.max(0, Number(offer.min_order_amount || 0))
      card.innerHTML = `<span class="wallet-public-offer-icon">${offer.benefit_type === 'wallet_bonus' ? '₹+' : '%'}</span><span class="wallet-public-offer-copy"><b>${walletOfferPreview(offer)}</b><small>${offer.description || offerTitle(offer)}</small>${minimum > 0 ? `<em>Minimum ${money(minimum)}</em>` : ''}</span><strong>Use offer</strong>`
      card.addEventListener('click', () => {
        input.value = offer.code
        applied = null
        status.className = 'wallet-coupon-status'
        status.textContent = minimum > 0 && Number(amountInput.value || 0) < minimum
          ? `Enter at least ${money(minimum)}, then apply ${offer.code}.`
          : `${offer.code} selected. Click Apply to confirm.`
        document.querySelectorAll('.wallet-public-offer-card').forEach(x => x.classList.toggle('selected', x === card))
        render()
        if (!(minimum > 0 && Number(amountInput.value || 0) < minimum)) button.click()
      })
      return card
    }))
  }

  authRequest('/coupons/offers?purchaseType=wallet_topup')
    .then(data => {
      publicOffers = Array.isArray(data) ? data : []
      renderOffers()
    })
    .catch(() => {
      publicOffers = []
      renderOffers()
    })

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
      status.textContent = 'Enter or select a promotion code first.'
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
      applied = {
        code,
        discountAmount: Number(data.discountAmount) || 0,
        finalAmount: Number(data.finalAmount) || 0,
        reward: data.reward || null,
        benefit: data.benefit || null
      }
      input.value = code
      render()
      status.className = 'wallet-coupon-status success'
      const bonus = applied.reward?.type === 'wallet_bonus' ? Number(applied.reward.amount || 0) : 0
      status.textContent = bonus > 0
        ? `${code} applied — pay ${money(applied.finalAmount)} and receive ${money(amount + bonus)} in your wallet after approval.`
        : applied.finalAmount === 0
          ? `${code} applied — 100% off. Pay ₹0.00 and receive ${money(amount)} immediately.`
          : `${code} applied — ${money(applied.discountAmount)} off. Pay ${money(applied.finalAmount)} and receive ${money(amount)} after approval.`
    } catch (error) {
      applied = null
      render()
      status.className = 'wallet-coupon-status error'
      status.textContent = error?.message || 'Promotion could not be applied.'
    } finally {
      button.disabled = false
      button.textContent = 'Apply'
    }
  })

  amountInput.addEventListener('input', () => {
    applied = null
    modal.dataset.walletCouponZero = 'false'
    status.textContent = ''
    status.className = 'wallet-coupon-status'
    render()
  })
  input.addEventListener('input', () => {
    applied = null
    modal.dataset.walletCouponZero = 'false'
    status.textContent = ''
    status.className = 'wallet-coupon-status'
    document.querySelectorAll('.wallet-public-offer-card').forEach(x => x.classList.toggle('selected', String(x.dataset.code || '') === String(input.value || '').trim().toUpperCase()))
    render()
  })
  render()
}

function scan() {
  document.querySelectorAll('.wallet-add-modal').forEach(enhanceWalletCoupon)
}

const style = document.createElement('style')
style.textContent = `
.wallet-public-offers{margin:12px 0;padding:12px;border:1px solid #d7e6dc;border-radius:12px;background:linear-gradient(180deg,#f8fff9,#f2faf5)}
.wallet-public-offers-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:8px}
.wallet-public-offers-head span,.wallet-public-offers-head strong{display:block}
.wallet-public-offers-head span{color:#2e7e58;font-size:8px;font-weight:950;letter-spacing:.08em}
.wallet-public-offers-head strong{margin-top:2px;color:#173b5f;font-size:12px}
.wallet-public-offers-head>small{color:#81938a;font-size:8px}
.wallet-public-offer-list{display:grid;gap:7px}
.wallet-public-offer-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;width:100%;padding:9px;border:1px solid #d9e6df;border-radius:10px;background:#fff;text-align:left;cursor:pointer}
.wallet-public-offer-card:hover,.wallet-public-offer-card.selected{border-color:#86b69d;background:#f6fcf8;box-shadow:0 5px 14px rgba(37,111,76,.07)}
.wallet-public-offer-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;background:#e6f6ec;color:#26784f;font-size:10px;font-weight:950}
.wallet-public-offer-copy{min-width:0}
.wallet-public-offer-copy b,.wallet-public-offer-copy small,.wallet-public-offer-copy em{display:block;overflow:hidden;text-overflow:ellipsis}
.wallet-public-offer-copy b{color:#235d43;font-size:10px}
.wallet-public-offer-copy small{margin-top:2px;color:#72877c;font-size:8px;white-space:nowrap}
.wallet-public-offer-copy em{margin-top:3px;color:#8c9b93;font-size:7px;font-style:normal}
.wallet-public-offer-card>strong{color:#1f6f4b;font-size:8px;white-space:nowrap}
.wallet-offer-loading,.wallet-offer-empty{display:block;padding:7px;color:#7c8d84;font-size:8px}
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
@media(max-width:600px){.wallet-public-offers-head{align-items:flex-start;flex-direction:column}.wallet-public-offer-card{grid-template-columns:auto minmax(0,1fr)}.wallet-public-offer-card>strong{grid-column:2}.wallet-coupon-input-row{grid-template-columns:1fr}.wallet-coupon-apply{height:40px}.wallet-coupon-summary{grid-template-columns:1fr}.wallet-coupon-summary .wallet-coupon-pay-row,.wallet-coupon-summary>small{grid-column:auto}}
`
document.head.appendChild(style)

const observer = new MutationObserver(scan)
observer.observe(document.body, { childList: true, subtree: true })
scan()
