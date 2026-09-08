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
  const [reference, setReference] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

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
    setCouponMessage(`${normalized} applied. The server will validate it for the selected share pack.`)
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
    setSubmitError('')
    try {
      const result = await purchaseLead(lead.id, shares, { useWallet, couponCode: couponApplied ? couponCode : '' })
      if (result?.requires_external_payment || result?.requiresExternalPayment || result?.payment?.status === 'pending') {
        setPayment({ ...result, shares })
        setReference('')
        setProofFile(null)
        setSubmitError('')
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

  const submitPayment = async () => {
    const trimmedReference = reference.trim()
    if (!trimmedReference) {
      setSubmitError('Enter the payment reference / UTR first.')
      return
    }
    if (!proofFile) {
      setSubmitError('Upload the payment screenshot or PDF first.')
      return
    }
    if (proofFile.size > 5 * 1024 * 1024) {
      setSubmitError('Payment proof must be 5 MB or smaller.')
      return
    }
    if (!payment?.payment?.id) {
      setSubmitError('Payment session is unavailable. Please start the purchase again.')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      const proofUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Unable to read payment proof'))
        reader.readAsDataURL(proofFile)
      })

      await authRequest(`/payments/${payment.payment.id}/reference`, {
        method: 'POST',
        body: JSON.stringify({
          manualReference: trimmedReference,
          proofUrl,
          notes: `Lead #${lead.id} direct payment${Number(payment.walletAmount) > 0 ? ` after wallet payment of ${money(payment.walletAmount)}` : ''}`,
        }),
      })
      setSubmitted(true)
    } catch (e) {
      setSubmitError(e.message || 'Unable to submit payment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const shares = lead?.pricing?.shares || []

  if (submitted) {
    return <div className="lv2-overlay">
      <div className="lv2-upgrade lv2-payment-success" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="lv2-success-icon">✓</div>
        <span>PAYMENT SUBMITTED</span>
        <h2>Submitted successfully</h2>
        <p>{Number(payment?.walletAmount) > 0 ? `${money(payment.walletAmount)} was deducted from your wallet. ` : ''}Your remaining {money(payment?.externalAmount)} payment and proof have been submitted for verification.</p>
        <button type="button" onClick={() => { onPurchased?.(payment, lead.id); onClose() }}>Done</button>
      </div>
    </div>
  }

  const subtotal = Number(payment?.payment?.subtotal_amount ?? payment?.coupon?.subtotalAmount ?? payment?.payment?.amount ?? 0)
  const discount = Number(payment?.payment?.discount_amount ?? payment?.coupon?.discountAmount ?? 0)
  const finalAmount = Number(payment?.payment?.amount ?? payment?.coupon?.finalAmount ?? Math.max(0, subtotal - discount))
  const walletPaid = Number(payment?.walletAmount ?? payment?.payment?.wallet_amount ?? 0)
  const externalAmount = Number(payment?.externalAmount ?? payment?.payment?.external_amount ?? Math.max(0, finalAmount - walletPaid))
  const appliedCoupon = String(payment?.payment?.coupon_code || payment?.coupon?.code || '').trim()

  return <div className="lv2-overlay" onClick={() => !submitting && onClose()}>
    <div className={`lv2-buy-modal ${payment ? 'lv2-payment-modal' : ''}`} onClick={e => e.stopPropagation()}>
      <button className="lv2-modal-close" onClick={() => !submitting && onClose()} disabled={submitting}>×</button>
      <span className="lv2-modal-kicker">{payment ? 'PAYMENT' : 'LEAD PRICING'}</span>
      <h2>{payment ? `Complete Lead #${lead.id}` : `Buy Lead #${lead.id}`}</h2>
      <p className="lv2-modal-subtitle">{payment ? (walletPaid > 0 ? `${money(walletPaid)} from your wallet was applied after the coupon discount. Pay the remaining amount directly.` : 'Complete the direct payment and submit your payment proof for verification.') : 'Choose your share pack and apply any coupon before payment.'}</p>

      {!payment && <>
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
      </>}

      {payment && <>
        <div className="lv2-detail-grid">
          <div><small>Shares</small><b>{payment.shares}</b></div>
          <div><small>Original</small><b>{money(subtotal)}</b></div>
        </div>
        <div className="lv2-payment-breakdown">
          <div><span>Original amount</span><b>{money(subtotal)}</b></div>
          {discount > 0 && <div className="discount"><span>{appliedCoupon ? `Coupon ${appliedCoupon}` : 'Coupon discount'}</span><b>−{money(discount)}</b></div>}
          <div><span>Final lead amount</span><b>{money(finalAmount)}</b></div>
          <div><span>Wallet deduction</span><b>−{money(walletPaid)}</b></div>
          <div className="due"><span>Amount to pay now</span><b>{money(externalAmount)}</b></div>
        </div>

        {externalAmount > 0 ? <>
          <label>Payment reference / UTR<input value={reference} onChange={e => { setReference(e.target.value); setSubmitError('') }} placeholder="Enter UTR or transaction ID" autoComplete="off" disabled={submitting} /></label>
          <label>Payment proof<input type="file" accept="image/*,.pdf" onChange={e => { setProofFile(e.target.files?.[0] || null); setSubmitError('') }} disabled={submitting} /></label>
          {submitError && <div className="lv2-payment-error" role="alert">{submitError}</div>}
          <div className="lv2-payment-submit">
            <button type="button" className="lv2-more" onClick={submitPayment} disabled={submitting}>{submitting ? 'Submitting…' : `Submit ${money(externalAmount)} payment`}</button>
          </div>
        </> : <div className="lv2-payment-submit"><button type="button" className="lv2-more" onClick={() => { onPurchased?.(payment, lead.id); onClose() }}>Complete purchase</button></div>}
      </>}
    </div>
  </div>
}
