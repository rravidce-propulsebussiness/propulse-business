import { useEffect, useState } from 'react'
import { authRequest } from '../utils/auth'
import { quoteLead, submitLeadPurchase } from '../api/leads'
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
  const [receivingDetails, setReceivingDetails] = useState([])
  const [receivingLoading, setReceivingLoading] = useState(false)
  const [receivingError, setReceivingError] = useState('')
  const [reference, setReference] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    authRequest('/wallet').then(data => setWalletBalance(Number(data?.availableBalance ?? data?.available_balance ?? data?.balance ?? data?.wallet?.balance ?? 0))).catch(() => setWalletBalance(0))
  }, [])

  useEffect(() => {
    if (!payment || Number(payment.externalAmount ?? payment.payment?.external_amount ?? 0) <= 0) return
    let cancelled = false
    setReceivingLoading(true)
    setReceivingError('')
    authRequest('/payment-receiving-details')
      .then(data => {
        if (!cancelled) setReceivingDetails(Array.isArray(data) ? data.filter(item => item?.is_active !== false) : [])
      })
      .catch(e => {
        if (!cancelled) setReceivingError(e.message || 'Unable to load payment receiving details.')
      })
      .finally(() => {
        if (!cancelled) setReceivingLoading(false)
      })
    return () => { cancelled = true }
  }, [payment])

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
    setCouponMessage(`${normalized} selected. The server will validate it for the selected share pack.`)
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
      const result = await quoteLead(lead.id, shares, { useWallet, couponCode: couponApplied ? couponCode : '' })
      setPayment({ ...result, shares, plan })
      setReference('')
      setProofFile(null)
      setSubmitError('')
    } catch (e) {
      setError(e.message || 'Unable to calculate this lead purchase.')
    } finally {
      setBuying(current => current === key ? '' : current)
    }
  }

  const submitPayment = async () => {
    const trimmedReference = reference.trim()
    const externalAmount = Number(payment?.externalAmount ?? payment?.payment?.external_amount ?? 0)
    if (externalAmount > 0 && !trimmedReference) {
      setSubmitError('Enter the payment reference / UTR first.')
      return
    }
    if (externalAmount > 0 && !proofFile) {
      setSubmitError('Upload the payment screenshot or PDF first.')
      return
    }
    if (proofFile && proofFile.size > 5 * 1024 * 1024) {
      setSubmitError('Payment proof must be 5 MB or smaller.')
      return
    }
    if (!payment?.shares) {
      setSubmitError('Payment selection is unavailable. Please start the purchase again.')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      let proofUrl = ''
      if (proofFile) {
        proofUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('Unable to read payment proof'))
          reader.readAsDataURL(proofFile)
        })
      }

      const result = await submitLeadPurchase(lead.id, payment.shares, {
        useWallet,
        couponCode: couponApplied ? couponCode : (payment?.coupon?.code || ''),
        manualReference: trimmedReference,
        proofUrl,
      })
      setPayment(result)
      setSubmitted(true)
    } catch (e) {
      setSubmitError(e.message || 'Unable to submit payment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const shares = lead?.pricing?.shares || []

  if (submitted) {
    const walletPending = Number(payment?.walletAmount ?? payment?.payment?.wallet_amount ?? 0)
    const directPaid = Number(payment?.externalAmount ?? payment?.payment?.external_amount ?? 0)
    return <div className="lv2-overlay">
      <div className="lv2-upgrade lv2-payment-success" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="lv2-success-icon">✓</div>
        <span>PAYMENT SUBMITTED</span>
        <h2>Waiting for approval</h2>
        <p>{walletPending > 0 ? `${money(walletPending)} from your wallet is reserved and cannot be used for another lead until this payment is approved. ` : ''}{directPaid > 0 ? `${money(directPaid)} direct payment and proof were submitted for verification.` : 'Your purchase was submitted for processing.'}</p>
        <button type="button" onClick={() => { onPurchased?.(payment, lead.id); onClose() }}>Done</button>
      </div>
    </div>
  }

  const subtotal = Number(payment?.payment?.subtotal_amount ?? payment?.coupon?.subtotalAmount ?? payment?.payment?.amount ?? payment?.amount ?? 0)
  const discount = Number(payment?.payment?.discount_amount ?? payment?.coupon?.discountAmount ?? 0)
  const finalAmount = Number(payment?.payment?.amount ?? payment?.coupon?.finalAmount ?? payment?.amount ?? Math.max(0, subtotal - discount))
  const walletPaid = Number(payment?.walletAmount ?? payment?.payment?.wallet_amount ?? 0)
  const externalAmount = Number(payment?.externalAmount ?? payment?.payment?.external_amount ?? Math.max(0, finalAmount - walletPaid))
  const appliedCoupon = String(payment?.payment?.coupon_code || payment?.coupon?.code || couponCode || '').trim()

  return <div className="lv2-overlay" onClick={() => !submitting && onClose()}>
    <div className={`lv2-buy-modal ${payment ? 'lv2-payment-modal' : ''}`} onClick={e => e.stopPropagation()}>
      <button className="lv2-modal-close" onClick={() => !submitting && onClose()} disabled={submitting}>×</button>
      <span className="lv2-modal-kicker">{payment ? 'PAYMENT' : 'LEAD PRICING'}</span>
      <h2>{payment ? `Complete Lead #${lead.id}` : `Buy Lead #${lead.id}`}</h2>
      <p className="lv2-modal-subtitle">{payment ? (walletPaid > 0 ? `${money(walletPaid)} is reserved from your available wallet balance after the coupon. It will be captured only after admin approval.` : 'Complete the direct payment and submit your payment proof for verification.') : 'Choose your share pack and apply any coupon before payment.'}</p>

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
          <small>Available wallet balance. Any amount reserved by a submitted lead payment is excluded.</small>
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
              {!isPro && <button className="lv2-modal-price normal" disabled={Boolean(buying)} onClick={() => buy(n, 'normal')}>{buying === normalKey ? 'Checking…' : money(normal)}</button>}
              {isPro && <button className="lv2-modal-price pro selected-pro" disabled={Boolean(buying)} onClick={() => buy(n, 'pro')}>{buying === proKey ? 'Checking…' : money(pro)}</button>}
              {!isPro && <button className="lv2-modal-price pro" disabled={Boolean(buying)} onClick={() => buy(n, 'pro')}><span>{buying === proKey ? 'Checking…' : money(pro)}</span></button>}
            </div>
          })}
        </div>
      </>}

      {payment && <>
        <section className="lv2-payment-summary" aria-label="Payment summary">
          <div className="lv2-payment-summary-head">
            <div><span>PAYMENT SUMMARY</span><strong>{payment.shares} {Number(payment.shares) === 1 ? 'share' : 'shares'}</strong></div>
            <b>{money(finalAmount)}</b>
          </div>
          <div className="lv2-payment-breakdown">
            <div><span>Original</span><b>{money(subtotal)}</b></div>
            <div className="discount"><span>{appliedCoupon ? `Coupon (${appliedCoupon})` : 'Coupon discount'}</span><b>−{money(discount)}</b></div>
            <div className="after-coupon"><span>Final</span><b>{money(finalAmount)}</b></div>
            <div className="wallet"><span>Wallet reserved</span><b>−{money(walletPaid)}</b></div>
            <div className="due"><span>Amount to pay</span><b>{money(externalAmount)}</b></div>
          </div>
        </section>

        {externalAmount > 0 ? <>
          <section className="lv2-payment-receiving" aria-label="Payment receiving details">
            <div className="lv2-payment-receiving-head">
              <div><strong>Pay to Propulse</strong><span>Use one of the active payment accounts below for this payment.</span></div>
              {receivingDetails.length > 0 && <b>{receivingDetails.length} {receivingDetails.length === 1 ? 'option' : 'options'}</b>}
            </div>
            {receivingLoading && <div className="lv2-payment-receiving-status">Loading payment account details…</div>}
            {receivingError && <div className="lv2-payment-receiving-status error">{receivingError}</div>}
            {!receivingLoading && !receivingError && !receivingDetails.length && <div className="lv2-payment-receiving-status error">Payment account details are not configured yet. Please contact Propulse before paying.</div>}
            {!receivingLoading && receivingDetails.map(item => <article className="lv2-payment-account" key={item.id}>
              <div className="lv2-payment-account-title"><strong>{item.label || 'Propulse payment account'}</strong><span>{item.method_type === 'both' ? 'UPI + BANK' : String(item.method_type || '').toUpperCase()}</span></div>
              <div className="lv2-payment-account-grid">
                {item.account_name && <div><small>ACCOUNT NAME</small><strong>{item.account_name}</strong></div>}
                {item.upi_id && <div><small>UPI ID</small><strong>{item.upi_id}</strong></div>}
                {item.bank_name && <div><small>BANK</small><strong>{item.bank_name}</strong></div>}
                {item.account_number && <div className="account-number"><small>ACCOUNT NUMBER</small><strong>{item.account_number}</strong></div>}
                {item.ifsc_code && <div><small>IFSC</small><strong>{item.ifsc_code}</strong></div>}
                {item.branch_name && <div><small>BRANCH</small><strong>{item.branch_name}</strong></div>}
              </div>
              {item.qr_code && <div className="lv2-payment-qr"><img src={item.qr_code} alt={`${item.label || 'Propulse'} payment QR`} /></div>}
              {item.instructions && <p>{item.instructions}</p>}
            </article>)}
          </section>

          <div className="lv2-payment-instruction"><strong>Complete direct payment</strong><span>Pay {money(externalAmount)} using one of the payment methods above, then enter the transaction details below.</span></div>
          <label>Payment reference / UTR<input value={reference} onChange={e => { setReference(e.target.value); setSubmitError('') }} placeholder="Enter UTR or transaction ID" autoComplete="off" disabled={submitting} /></label>
          <label>Payment proof<input type="file" accept="image/*,.pdf" onChange={e => { setProofFile(e.target.files?.[0] || null); setSubmitError('') }} disabled={submitting} /></label>
          {submitError && <div className="lv2-payment-error" role="alert">{submitError}</div>}
          <div className="lv2-payment-submit"><button type="button" className="lv2-more" onClick={submitPayment} disabled={submitting}>{submitting ? 'Submitting…' : `Submit ${money(externalAmount)} payment`}</button></div>
        </> : <>
          {submitError && <div className="lv2-payment-error" role="alert">{submitError}</div>}
          <div className="lv2-payment-submit"><button type="button" className="lv2-more" onClick={submitPayment} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit purchase'}</button></div>
        </>}
      </>}
    </div>
  </div>
}
