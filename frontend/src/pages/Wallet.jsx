import { useEffect, useMemo, useState } from 'react'
import UserHeader from '../components/UserHeader'
import { authRequest } from '../utils/auth'
import './WalletV2.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = value => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

function statusLabel(item) {
  if (item.status === 'pending') return 'Pending approval'
  if (item.status === 'paid' || item.status === 'approved') return 'Approved'
  if (item.status === 'rejected') return 'Rejected'
  if (item.status === 'refunded') return 'Refunded'
  if (item.status === 'failed') return 'Failed'
  if (item.status === 'completed') return 'Completed'
  return item.status || 'Completed'
}

function statusClass(item) {
  if (item.status === 'pending') return 'pending'
  if (item.status === 'rejected' || item.status === 'failed') return 'rejected'
  if (item.status === 'refunded') return 'refunded'
  return 'approved'
}

function activityMeta(item) {
  if (item.source === 'topup') return { label: 'Wallet top-up', icon: '+', iconClass: 'credit' }
  if (item.source === 'purchase') return { label: item.purchase_type === 'lead' ? 'Lead purchase' : item.purchase_type || 'Purchase', icon: '−', iconClass: 'debit' }
  if (item.type === 'refund') return { label: 'Wallet refund', icon: '↩', iconClass: 'refund' }
  if (item.type === 'debit') return { label: 'Wallet debit', icon: '−', iconClass: 'debit' }
  return { label: 'Wallet credit', icon: '+', iconClass: 'credit' }
}

export default function Wallet() {
  const [wallet, setWallet] = useState(null)
  const [history, setHistory] = useState({ combined: [] })
  const [topups, setTopups] = useState([])
  const [receiving, setReceiving] = useState([])
  const [receivingLoaded, setReceivingLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [receivingLoading, setReceivingLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [proof, setProof] = useState(null)
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const [walletData, historyData, topupData] = await Promise.all([
        authRequest('/wallet'),
        authRequest('/wallet/history'),
        authRequest('/wallet/topups/history'),
      ])
      setWallet(walletData)
      setHistory({ combined: Array.isArray(historyData?.combined) ? historyData.combined : [] })
      setTopups(Array.isArray(topupData) ? topupData : Array.isArray(topupData?.items) ? topupData.items : [])
    } catch (e) {
      if (!silent) setError(e.message || 'Failed to load wallet')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('add') === '1') setShowAdd(true)
  }, [])

  useEffect(() => {
    if (!showAdd || receivingLoaded || receivingLoading) return
    setReceivingLoading(true)
    authRequest('/payment-receiving-details')
      .then(data => setReceiving(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message || 'Failed to load payment details'))
      .finally(() => {
        setReceivingLoading(false)
        setReceivingLoaded(true)
      })
  }, [showAdd, receiving.length, receivingLoading])

  const pendingTopups = useMemo(() => topups.filter(x => x.status === 'pending'), [topups])
  const reservedBalance = Number(wallet?.reservedBalance || 0)
  const availableBalance = Number(wallet?.availableBalance ?? wallet?.balance ?? 0)

  const activities = useMemo(() => {
    const base = Array.isArray(history.combined) ? history.combined : []
    const visibleUnapprovedTopups = topups
      .filter(x => x.status === 'pending' || x.status === 'rejected')
      .map(x => ({
        id: `topup-${x.id}`,
        source: 'topup',
        kind: 'topup',
        topup_id: x.id,
        amount: Number(x.amount || 0),
        status: x.status,
        reference: x.reference,
        manual_reference: x.reference,
        payment_method: x.payment_method,
        proof_url: x.proof_url,
        created_at: x.created_at,
        reviewed_at: x.reviewed_at,
        description: `Wallet top-up #${x.id}`,
      }))
    return [...base, ...visibleUnapprovedTopups].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [history.combined, topups])

  const filteredActivities = useMemo(() => activities.filter(item => {
    if (filter === 'wallet') return item.source === 'wallet'
    if (filter === 'purchase') return item.source === 'purchase'
    if (filter === 'topup') return item.source === 'topup' || item.reference_type === 'wallet_topup'
    return true
  }), [activities, filter])

  const resetTopupForm = () => {
    setAmount('')
    setReference('')
    setProof(null)
    setCouponCode('')
    setCoupon(null)
    const file = document.getElementById('wallet-proof')
    if (file) file.value = ''
  }

  const closeAdd = () => {
    if (submitting) return
    setShowAdd(false)
    resetTopupForm()
    if (window.location.search) window.history.replaceState({}, '', window.location.pathname)
  }

  const applyCoupon = async () => {
    const value = Number(amount)
    const code = String(couponCode || '').trim().toUpperCase()
    setError('')
    setMessage('')
    if (!Number.isFinite(value) || value <= 0) return setError('Enter the wallet amount first.')
    if (!code) {
      setCoupon(null)
      return setError('Enter a coupon code first.')
    }
    try {
      setCouponLoading(true)
      const data = await authRequest('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal: value, purchaseType: 'wallet_topup' }),
      })
      setCoupon({
        code,
        discountAmount: Number(data.discountAmount) || 0,
        finalAmount: Number(data.finalAmount) || 0,
      })
      setCouponCode(code)
    } catch (e) {
      setCoupon(null)
      setError(e.message || 'Coupon could not be applied.')
    } finally {
      setCouponLoading(false)
    }
  }

  const onAmountChange = value => {
    setAmount(value)
    setCoupon(null)
  }

  const onCouponChange = value => {
    setCouponCode(value.toUpperCase())
    setCoupon(null)
  }

  const payableAmount = coupon ? Math.max(0, Number(coupon.finalAmount || 0)) : Number(amount || 0)
  const fullyDiscounted = Boolean(coupon && payableAmount === 0)

  const submit = async event => {
    event.preventDefault()
    setError('')
    setMessage('')
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setError('Enter a valid top-up amount.')
    if (coupon && coupon.finalAmount < 0) return setError('Invalid coupon amount.')
    if (!fullyDiscounted && !reference.trim()) return setError('Enter your payment reference / UTR.')
    if (proof && proof.size > 5 * 1024 * 1024) return setError('Payment proof must be 5 MB or smaller.')

    try {
      setSubmitting(true)
      let proofUrl = null
      if (proof) {
        proofUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('Unable to read payment proof'))
          reader.readAsDataURL(proof)
        })
      }

      const result = await authRequest('/wallet/topups', {
        method: 'POST',
        body: JSON.stringify({
          amount: value,
          reference: fullyDiscounted ? null : reference.trim(),
          proof_url: fullyDiscounted ? null : proofUrl,
          couponCode: coupon?.code || null,
        }),
      })

      resetTopupForm()
      setShowAdd(false)
      setMessage(result?.auto_approved
        ? `₹${value.toLocaleString('en-IN')} was added to your wallet using coupon ${result?.coupon?.code || coupon?.code}.`
        : 'Balance request submitted. Your wallet will update after approval.')
      await load()
    } catch (e) {
      setError(e.message || 'Failed to submit top-up')
    } finally {
      setSubmitting(false)
    }
  }

  const renderActivity = item => {
    const meta = activityMeta(item)
    const isPurchase = item.source === 'purchase'
    const isTopup = item.source === 'topup'
    const amountIsDebit = (isPurchase && item.status !== 'refunded') || item.type === 'debit'
    const title = isPurchase ? item.title : item.description
    const subtitle = isPurchase
      ? (item.purchase_type === 'lead'
        ? `Lead #${item.lead_id || item.purchase_id}${item.location ? ` · ${item.location}` : ''}`
        : item.purchase_type)
      : isTopup
        ? `${date(item.created_at)} · ${item.reference || 'No UTR'}`
        : `${date(item.created_at)} · ${item.reference_type || 'wallet'}`

    return (
      <button type="button" className="wallet-history-item" key={item.id} onClick={() => setSelected(item)}>
        <div className={`wallet-history-icon ${meta.iconClass}`}>{meta.icon}</div>
        <div className="wallet-history-copy">
          <b>{title}</b>
          <small>{subtitle}</small>
          {isPurchase && item.purchase_type === 'lead' && item.requirement && item.requirement !== item.title && <small>{item.requirement}</small>}
          {!isPurchase && item.manual_reference && <small>UTR: {item.manual_reference}</small>}
        </div>
        <div className="wallet-history-amount">
          <strong className={amountIsDebit ? 'debit' : 'credit'}>{amountIsDebit ? '−' : '+'}{money(item.amount)}</strong>
          <em className={`wallet-pill ${statusClass(item)}`}>{statusLabel(item)}</em>
        </div>
      </button>
    )
  }

  return (
    <div className="wallet-page">
      <UserHeader />
      <main className="wallet-main">
        <header className="wallet-head">
          <span>WALLET</span>
          <h1>Your wallet</h1>
          <p>Manage your balance, payments and lead spending in one place.</p>
        </header>

        {error && <div className="wallet-alert error">{error}</div>}
        {message && <div className="wallet-alert success">{message}</div>}

        {loading ? <div className="wallet-state">Loading wallet…</div> : <>
          <section className="wallet-balance-card">
            <div className="wallet-balance-main">
              <small>AVAILABLE BALANCE</small>
              <strong>{money(availableBalance)}</strong>
              <span>Ready to use for your next purchase.</span>
            </div>
            <div className="wallet-balance-side">
              <div><small>WALLET BALANCE</small><b>{money(wallet?.balance)}</b></div>
              <div><small>RESERVED</small><b>{money(reservedBalance)}</b></div>
              <button className="wallet-add-button" onClick={() => setShowAdd(true)}>＋ Add Balance</button>
            </div>
          </section>

          <section className="wallet-stat-grid">
            <div className="wallet-stat-card"><span>AVAILABLE</span><strong>{money(availableBalance)}</strong><small>Can be spent now</small></div>
            <div className="wallet-stat-card"><span>RESERVED</span><strong>{money(reservedBalance)}</strong><small>{wallet?.reservedPaymentCount || 0} pending lead payment{Number(wallet?.reservedPaymentCount || 0) === 1 ? '' : 's'}</small></div>
            <div className="wallet-stat-card"><span>PENDING TOP-UPS</span><strong>{pendingTopups.length}</strong><small>Waiting for verification</small></div>
          </section>

          {pendingTopups.length > 0 && <div className="wallet-pending-strip">
            <span className="wallet-pending-icon">◷</span>
            <div>
              <b>{pendingTopups.length} balance request{pendingTopups.length === 1 ? '' : 's'} pending</b>
              <small>{pendingTopups.slice(0, 2).map(x => `${money(x.amount)} · ${x.reference || 'No UTR'}`).join('  •  ')}</small>
            </div>
            <button type="button" onClick={() => setFilter('topup')}>View top-ups</button>
          </div>}

          <section className="wallet-panel wallet-history-panel">
            <div className="wallet-panel-head wallet-history-header">
              <div>
                <span>ACTIVITY</span>
                <h2>Transaction history</h2>
                <p>Every wallet movement and purchase is shown once, with the payment split inside the details.</p>
              </div>
              <div className="wallet-filter-tabs" role="tablist" aria-label="Wallet history filters">
                {[
                  ['all', 'All'],
                  ['wallet', 'Wallet'],
                  ['purchase', 'Purchases'],
                  ['topup', 'Top-ups'],
                ].map(([value, label]) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
              </div>
            </div>

            {!filteredActivities.length
              ? <div className="wallet-empty">No transactions in this view yet.</div>
              : <div className="wallet-history-list">{filteredActivities.map(renderActivity)}</div>}
          </section>
        </>}
      </main>

      {showAdd && <div className="wallet-modal-backdrop" onClick={closeAdd}>
        <section className="wallet-detail-modal wallet-add-modal" onClick={e => e.stopPropagation()}>
          <button className="wallet-modal-close" onClick={closeAdd}>×</button>
          <span className="wallet-modal-kicker">ADD BALANCE</span>
          <h2>Fund your Propulse wallet</h2>
          <p className="wallet-modal-subtitle">Choose the amount you want credited, apply a coupon if you have one, then pay the final amount and submit the UTR.</p>

          <form onSubmit={submit}>
            <label>Wallet credit amount
              <input type="number" min="1" step="0.01" value={amount} onChange={e => onAmountChange(e.target.value)} placeholder="e.g. 1000" autoFocus />
            </label>
            <div className="wallet-quick-amounts">
              {[500, 1000, 2000, 5000].map(value => <button type="button" key={value} onClick={() => onAmountChange(String(value))}>{money(value).replace('.00', '')}</button>)}
            </div>

            <label className="wallet-coupon-field">Coupon code <small>Optional</small>
              <div className="wallet-coupon-input-row">
                <input type="text" maxLength="50" value={couponCode} onChange={e => onCouponChange(e.target.value)} placeholder="Enter coupon code" autoComplete="off" />
                <button type="button" onClick={applyCoupon} disabled={couponLoading}>{couponLoading ? 'Checking…' : 'Apply'}</button>
              </div>
              {coupon && <span className="wallet-coupon-success">{coupon.code} applied successfully.</span>}
            </label>

            {Number(amount) > 0 && <div className="wallet-payment-summary">
              <div><span>Wallet credit</span><strong>{money(amount)}</strong></div>
              <div><span>Coupon discount</span><strong>{money(coupon?.discountAmount || 0)}</strong></div>
              <div className="wallet-payment-total"><span>{fullyDiscounted ? 'PAY NOW' : 'AMOUNT TO PAY'}</span><strong>{money(payableAmount)}</strong></div>
              <small>{fullyDiscounted ? '100% coupon applied. No UTR or payment proof is required.' : 'The full wallet credit amount is added after your payment is approved.'}</small>
            </div>}

            {receivingLoading ? <div className="wallet-method">Loading payment details…</div> : receiving.length > 0 ? <div className="wallet-receiving-list">
              {receiving.map(item => <div className="wallet-receiving-card" key={item.id}>
                <div className="wallet-receiving-head"><b>{item.label}</b><span>{item.method_type === 'both' ? 'UPI + BANK' : String(item.method_type || '').toUpperCase()}</span></div>
                <div className="wallet-receiving-grid">
                  {item.account_name && <div><small>ACCOUNT NAME</small><strong>{item.account_name}</strong></div>}
                  {item.upi_id && <div><small>UPI ID</small><strong>{item.upi_id}</strong></div>}
                  {item.bank_name && <div><small>BANK</small><strong>{item.bank_name}</strong></div>}
                  {item.account_number && <div><small>ACCOUNT NUMBER</small><strong>{item.account_number}</strong></div>}
                  {item.ifsc_code && <div><small>IFSC</small><strong>{item.ifsc_code}</strong></div>}
                  {item.branch_name && <div><small>BRANCH</small><strong>{item.branch_name}</strong></div>}
                </div>
                {item.qr_code && <img className="wallet-receiving-qr" src={item.qr_code} alt="Payment QR code" />}
                {item.instructions && <p>{item.instructions}</p>}
              </div>)}
            </div> : <div className="wallet-method"><b>UPI / BANK TRANSFER</b><span>Payment details are not configured yet. Please contact Propulse support.</span></div>}

            {!fullyDiscounted && <>
              <label>Payment reference / UTR
                <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Enter transaction ID / UTR" />
              </label>
              <label>Payment proof <small>Optional, max 5 MB</small>
                <input id="wallet-proof" type="file" accept="image/*,.pdf" onChange={e => setProof(e.target.files?.[0] || null)} />
              </label>
            </>}

            <button className="wallet-primary" disabled={submitting || couponLoading}>{submitting ? 'Submitting…' : fullyDiscounted ? 'Add to wallet for ₹0' : 'Submit balance request'} <span>→</span></button>
          </form>
        </section>
      </div>}

      {selected && <div className="wallet-modal-backdrop" onClick={() => setSelected(null)}>
        <section className="wallet-detail-modal" onClick={e => e.stopPropagation()}>
          <button className="wallet-modal-close" onClick={() => setSelected(null)}>×</button>
          <span className="wallet-modal-kicker">{selected.source === 'purchase' ? (selected.purchase_type === 'lead' ? 'LEAD PURCHASE' : 'PURCHASE') : selected.source === 'topup' ? 'WALLET TOP-UP' : 'WALLET TRANSACTION'}</span>
          <h2>{selected.title || selected.description || `Lead #${selected.lead_id}`}</h2>
          <div className="wallet-detail-status">
            <span className={`wallet-pill ${statusClass(selected)}`}>{statusLabel(selected)}</span>
            <strong>{selected.source === 'purchase' || selected.type === 'debit' ? '−' : '+'}{money(selected.amount)}</strong>
          </div>
          {selected.source === 'purchase' && selected.purchase_type === 'lead' && <div className="wallet-detail-summary">
            <div><span>Total purchase</span><strong>{money(selected.total_amount || selected.amount)}</strong></div>
            <div><span>Wallet portion</span><strong>{money(selected.wallet_amount)}</strong></div>
            <div><span>Direct portion</span><strong>{money(selected.external_amount)}</strong></div>
          </div>}
          <div className="wallet-detail-grid">
            <div><small>DATE</small><b>{date(selected.created_at)}</b></div>
            {selected.payment_id && <div><small>PAYMENT</small><b>#{selected.payment_id}</b></div>}
            {selected.topup_id && <div><small>TOP-UP</small><b>#{selected.topup_id}</b></div>}
            {(selected.manual_reference || selected.reference) && <div><small>UTR / REFERENCE</small><b>{selected.manual_reference || selected.reference}</b></div>}
            {selected.purchase_type && <div><small>PURCHASE TYPE</small><b>{selected.purchase_type}</b></div>}
            {selected.lead_id && <div><small>LEAD</small><b>#{selected.lead_id}</b></div>}
            {selected.location && <div><small>LOCATION</small><b>{selected.location}</b></div>}
            {selected.wallet_amount !== undefined && selected.source !== 'wallet' && <div><small>WALLET PORTION</small><b>{money(selected.wallet_amount)}</b></div>}
            {selected.external_amount !== undefined && selected.source !== 'wallet' && <div><small>DIRECT PORTION</small><b>{money(selected.external_amount)}</b></div>}
            {selected.balance_after !== undefined && <div><small>BALANCE AFTER</small><b>{money(selected.balance_after)}</b></div>}
            {selected.coupon_code && <div><small>COUPON</small><b>{selected.coupon_code}</b></div>}
          </div>
          <button className="wallet-modal-action" onClick={() => setSelected(null)}>Done</button>
        </section>
      </div>}
    </div>
  )
}
