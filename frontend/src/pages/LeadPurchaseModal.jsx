import { useEffect, useState } from 'react'
import { authRequest } from '../utils/auth'
import { purchaseLead } from '../api/leads'
import './LeadsV2.css'
import './LeadsV2Payment.css'

const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`

export default function LeadPurchaseModal({ lead, isPro, onClose, onPurchased, onUpgrade }) {
  const [walletBalance, setWalletBalance] = useState(0)
  const [useWallet, setUseWallet] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponMessage, setCouponMessage] = useState('')
  const [buying, setBuying] = useState('')
  const [error, setError] = useState('')
  const [payment, setPayment] = useState(null)

  useEffect(() => {
    authRequest('/wallet').then(data => setWalletBalance(Number(data?.balance ?? data?.wallet?.balance ?? 0))).catch(() => setWalletBalance(0))
  }, [])

  const applyCoupon = () => {
    const normalized = couponCode.trim().toUpperCase()
    setError('')
    if (!normalized) {
      setCouponApplied(false)
      setCouponMessage('Enter a coupon code first.')
      return
    }
    setCouponCode(normalized)
    setCouponApplied(true)
    setCouponMessage(`${normalized} applied. Choose a share pack to validate the discount.`)
  }

  const buy = async (shares, plan) => {
    if (plan === 'pro' && !isPro) {
      onClose()
      onUpgrade?.()
      return
    }
    const key = `${shares}-${plan}`
    setBuying(key)
    setError('')
    try {
      const result = await purchaseLead(lead.id, shares, { useWallet, couponCode: couponApplied ? couponCode : '' })
      if (result?.requires_external_payment || result?.requiresExternalPayment || result?.payment?.status === 'pending') {
        setPayment({ ...result, shares })
        return
      }
      onPurchased?.(result, lead.id)
      onClose()
    } catch (e) {
      setError(e.message || 'Unable to purchase this lead.')
    } finally {
      setBuying(current => current === key ? '' : current)
    }
  }

  const shares = lead?.pricing?.shares || []

  return <div className="lv2-overlay" onClick={onClose}>
    <div className="lv2-buy-modal" onClick={e => e.stopPropagation()}>
      <button className="lv2-modal-close" onClick={onClose}>×</button>
      <span className="lv2-modal-kicker">LEAD PRICING</span>
      <h2>Buy Lead #{lead.id}</h2>
      <p className="lv2-modal-subtitle">Choose your share pack and apply any coupon before payment.</p>

      <section className="lv2-coupon-box" aria-label="Coupon code">
        <div><strong>COUPON / PROMO CODE</strong><small>Optional · discount is applied to the selected share pack.</small></div>
        <div className="lv2-coupon-row">
          <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponApplied(false); setCouponMessage(''); setError('') }} onKeyDown={e => e.key === 'Enter' && applyCoupon()} placeholder="ENTER COUPON CODE" autoComplete="off" maxLength={50} />
          <button type="button" onClick={applyCoupon}>Apply</button>
        </div>
        {couponMessage && <small className={couponApplied ? 'lv2-coupon-status' : 'lv2-coupon-error'}>{couponApplied ? '✓ ' : ''}{couponMessage}</small>}
      </section>

      <div className="lv2-wallet-choice">
        <label><input type="checkbox" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} /> <span>Use wallet balance</span></label>
        <strong>{money(walletBalance)}</strong>
        <small>Coupon is applied before wallet deduction.</small>
      </div>

      {error && <div className="lv2-payment-error" role="alert">{error}</div>}

      <div className={`lv2-modal-pricing ${isPro ? 'pro-only' : ''}`}>
        <div className="lv2-modal-price-head"><span>SHARES</span><span>{isPro ? 'PRO PRICE' : 'NORMAL PRICE'}</span>{!isPro && <span>PRO PRICE</span>}</div>
        {shares.map(p => {
          const n = Number(p.shares)
          const normal = Number(p.normal)
          const pro = Number(p.pro)
          const normalKey = `${n}-normal`
          const proKey = `${n}-pro`
          return <div className="lv2-modal-price-row" key={n}>
            <div className="lv2-share-badge"><strong>{n}</strong><small>{n === 1 ? 'Single share' : `${n} shares`}</small></div>
            {!isPro && <button className="lv2-modal-price normal" disabled={Boolean(buying)} onClick={() => buy(n, 'normal')}>{buying === normalKey ? 'Buying…' : money(normal)}</button>}
            {isPro && <button className="lv2-modal-price pro selected-pro" disabled={Boolean(buying)} onClick={() => buy(n, 'pro')}>{buying === proKey ? 'Buying…' : money(pro)}</button>}
            {!isPro && <button className="lv2-modal-price pro" disabled={Boolean(buying)} onClick={() => buy(n, 'pro')}><span>{buying === proKey ? 'Buying…' : money(pro)}</span></button>}
          </div>
        })}
      </div>

      {payment && <div className="lv2-payment-breakdown">
        <div><span>Original amount</span><b>{money(payment.payment?.subtotal_amount ?? payment.coupon?.subtotalAmount ?? payment.payment?.amount)}</b></div>
        <div className="discount"><span>Coupon discount</span><b>−{money(payment.payment?.discount_amount ?? payment.coupon?.discountAmount)}</b></div>
        <div><span>Final lead amount</span><b>{money(payment.payment?.amount ?? payment.coupon?.finalAmount)}</b></div>
        <div><span>Wallet deduction</span><b>−{money(payment.walletAmount)}</b></div>
        <div className="due"><span>Amount to pay now</span><b>{money(payment.externalAmount)}</b></div>
      </div>}
    </div>
  </div>
}
