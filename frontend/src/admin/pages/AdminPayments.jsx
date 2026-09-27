import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, openApiBlob } from '../../utils/api'
import { clearSession, getToken } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminPayments.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const dateOnly = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function AdminPayments() {
  const navigate = useNavigate()
  const [approvalType, setApprovalType] = useState('membership')
  const [payments, setPayments] = useState([])
  const [topups, setTopups] = useState([])
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [paymentMeta, setPaymentMeta] = useState({ total: 0, pages: 0, stats: {} })
  const [topupMeta, setTopupMeta] = useState({ total: 0, pages: 0, stats: {} })
  const [expandedApproval, setExpandedApproval] = useState({})

  const request = useCallback(async (path, options = {}) => {
    if (!getToken()) {
      clearSession()
      navigate('/login', { replace: true })
      throw new Error('Your admin session has expired. Please sign in again.')
    }
    return apiRequest(path, options)
  }, [navigate])

  const fetchPayments = useCallback(async (nextPage = 1, overrideStatus = status) => {
    const qs = new URLSearchParams({
      status: overrideStatus,
      search: search.trim(),
      page: String(nextPage),
      limit: '50',
    })
    const data = await request(`/payments?${qs}`)
    setPayments(Array.isArray(data) ? data : data.items || [])
    setPaymentMeta({ total: data.total ?? 0, pages: data.pages ?? 1, stats: data.stats || {} })
  }, [request, search, status])

  const fetchTopups = useCallback(async (nextPage = 1, overrideStatus = status) => {
    const qs = new URLSearchParams({
      status: overrideStatus,
      search: search.trim(),
      page: String(nextPage),
      limit: '50',
    })
    const data = await request(`/wallet/topups?${qs}`)
    setTopups(Array.isArray(data) ? data : data.items || [])
    setTopupMeta({ total: data.total ?? 0, pages: data.pages ?? 1, stats: data.stats || {} })
  }, [request, search, status])

  const load = useCallback(async (nextPage = 1, silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const topupStatus = status === 'approved' || status === 'paid'
        ? 'approved'
        : status === 'rejected'
          ? 'rejected'
          : status === 'pending'
            ? 'pending'
            : 'all'
      await Promise.all([
        fetchPayments(nextPage, status),
        fetchTopups(nextPage, topupStatus),
      ])
      setPage(nextPage)
    } catch (e) {
      if (!silent) setError(e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [status, fetchPayments, fetchTopups])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) load(1) })
    return () => { active = false }
  }, [load])

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') load(1, true) }
    const timer = window.setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  async function updatePayment(id, next) {
    if (busy) return
    setBusy(`payment-${id}`)
    setError('')
    try {
      await request(`/payments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      setExpandedApproval(current => {
        const nextState = { ...current }
        delete nextState[`payment-${id}`]
        return nextState
      })
      await load(page)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  async function updateTopup(id, next) {
    if (busy) return
    setBusy(`topup-${id}`)
    setError('')
    try {
      await request(
        next === 'approved' ? `/wallet/topups/${id}/approve` : `/wallet/topups/${id}/reject`,
        { method: 'PATCH' },
      )
      setExpandedApproval(current => {
        const nextState = { ...current }
        delete nextState[`topup-${id}`]
        return nextState
      })
      await load(page)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const paymentType = payment => String(payment?.purchase_type || payment?.payment_type || '').toLowerCase()
  const membershipPayments = useMemo(() => payments.filter(payment => !['lead', 'investment'].includes(paymentType(payment))), [payments])
  const leadPayments = useMemo(() => payments.filter(payment => paymentType(payment) === 'lead'), [payments])
  const investmentPayments = useMemo(() => payments.filter(payment => paymentType(payment) === 'investment'), [payments])
  const pendingCount = items => items.filter(item => String(item?.status || '').toLowerCase() === 'pending').length

  const pstats = paymentMeta.stats || {}
  const tstats = topupMeta.stats || {}
  const membershipPending = pendingCount(membershipPayments)
  const leadPending = pendingCount(leadPayments)
  const investmentPending = pendingCount(investmentPayments)

  const queues = [
    { key: 'wallet', label: 'Wallet', note: 'Recharge verification', count: Number(tstats.pending || 0) },
    { key: 'leads', label: 'Leads', note: 'Lead purchase payments', count: leadPending },
    { key: 'membership', label: 'Membership', note: 'GROW / SCALE payments', count: membershipPending },
    { key: 'investment', label: 'Investment', note: 'Investment payments', count: investmentPending },
  ]

  const activeItems = approvalType === 'wallet'
    ? topups
    : approvalType === 'leads'
      ? leadPayments
      : approvalType === 'investment'
        ? investmentPayments
        : membershipPayments

  const activePages = approvalType === 'wallet' ? Number(topupMeta.pages || 1) : Number(paymentMeta.pages || 1)
  const activeTotal = approvalType === 'wallet'
    ? Number(topupMeta.total || 0)
    : approvalType === 'leads'
      ? leadPayments.length
      : approvalType === 'investment'
        ? investmentPayments.length
        : membershipPayments.length

  const toggleApproval = (type, id) => {
    setExpandedApproval(current => ({
      ...current,
      [`${type}-${id}`]: !current[`${type}-${id}`],
    }))
  }
  const isApprovalOpen = (type, id) => Boolean(expandedApproval[`${type}-${id}`])

  const openProof = proof => {
    const source = String(proof || '').trim()
    if (!source) return
    const win = window.open('', '_blank')
    if (!win) return
    const doc = win.document
    doc.title = 'Payment Proof'
    const style = doc.createElement('style')
    style.textContent = 'body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:95vw;max-height:95vh;object-fit:contain}iframe{width:95vw;height:95vh;border:0;background:#fff}'
    doc.head.appendChild(style)
    const isPdf = /^data:application\/pdf(?:;|,)/i.test(source)
    const viewer = doc.createElement(isPdf ? 'iframe' : 'img')
    viewer.src = source
    if (!isPdf) viewer.alt = 'Payment proof'
    doc.body.replaceChildren(viewer)
  }

  const openStoredProof = async (kind, id) => {
    setError('')
    const basePath = kind === 'topup' ? `/wallet/topups/${id}/proof` : `/payments/${id}/proof`
    try {
      await openApiBlob(`${basePath}/file`)
    } catch (streamError) {
      try {
        const data = await request(basePath)
        if (!data?.proof_url) {
          setError('No payment proof is available for this record.')
          return
        }
        openProof(data.proof_url)
      } catch (e) {
        setError(e.message || streamError.message || 'Unable to load payment proof')
      }
    }
  }

  const PaymentCard = ({ payment }) => {
    const open = isApprovalOpen('payment', payment.id)
    return <article className={`payment-approval-card ${open ? 'is-expanded' : ''}`}>
      <div className="payment-approval-main">
        <div className="payment-approval-identity">
          <div className="payment-approval-avatar">{(payment.business_name || payment.user_name || '?').charAt(0).toUpperCase()}</div>
          <div>
            <span className="payment-record-id">PAYMENT #{payment.id}</span>
            <h3>{payment.business_name || payment.user_name || 'User'}</h3>
            <small>{payment.user_email || '—'}</small>
          </div>
        </div>
        <div className="payment-approval-purchase">
          <span>Purchase</span>
          <strong>{payment.membership_plan_name || (paymentType(payment) === 'lead' ? 'Lead purchase' : paymentType(payment) === 'investment' ? 'Investment' : 'Purchase')}</strong>
          <small>{payment.membership_plan_type || payment.payment_type || payment.purchase_type || 'payment'}</small>
        </div>
        <div className="payment-approval-amount">
          <span>Amount</span>
          <strong>{money(payment.amount)}</strong>
          <small>{payment.payment_method || '—'}</small>
        </div>
        <span className={`pay-status ${payment.status}`}>{payment.status}</span>
        <div className="payment-approval-actions">
          <button type="button" className="payment-details-toggle" onClick={() => toggleApproval('payment', payment.id)}>{open ? 'Hide details' : 'View details'}</button>
          {payment.status === 'pending' && <>
            <button type="button" className="approve" disabled={busy !== null} onClick={() => updatePayment(payment.id, 'paid')}>{busy === `payment-${payment.id}` ? 'Working…' : 'Approve'}</button>
            <button type="button" className="reject" disabled={busy !== null} onClick={() => updatePayment(payment.id, 'rejected')}>Reject</button>
          </>}
        </div>
      </div>
      {open && <div className="payment-approval-details">
        <div><span>Payment method</span><strong>{payment.payment_method || '—'}</strong></div>
        <div><span>Total amount</span><strong>{money(payment.amount)}</strong></div>
        <div><span>Wallet used</span><strong>{money(payment.wallet_amount)}</strong></div>
        <div><span>Direct amount</span><strong>{money(payment.external_amount)}</strong></div>
        <div><span>Reference / UTR</span><strong>{payment.manual_reference || payment.gateway_payment_id || '—'}</strong></div>
        <div><span>Created</span><strong>{dateTime(payment.created_at)}</strong></div>
        {payment.membership_plan_name && <div><span>Membership</span><strong>{payment.membership_status || '—'}</strong><small>{payment.membership_expires_at ? `Expires ${dateOnly(payment.membership_expires_at)}` : 'No membership expiry'}</small></div>}
        <div className="payment-proof-detail"><span>Payment proof</span>{payment.proof_url || payment.has_proof ? <button type="button" onClick={() => payment.proof_url ? openProof(payment.proof_url) : openStoredProof('payment', payment.id)}>View proof</button> : <strong>—</strong>}</div>
      </div>}
    </article>
  }

  const TopupCard = ({ topup }) => {
    const open = isApprovalOpen('topup', topup.id)
    return <article className={`payment-approval-card wallet-approval-card ${open ? 'is-expanded' : ''}`}>
      <div className="payment-approval-main">
        <div className="payment-approval-identity">
          <div className="payment-approval-avatar wallet">{(topup.business_name || topup.user_name || '?').charAt(0).toUpperCase()}</div>
          <div>
            <span className="payment-record-id">RECHARGE #{topup.id}</span>
            <h3>{topup.business_name || topup.user_name || 'User'}</h3>
            <small>{topup.user_email || '—'}</small>
          </div>
        </div>
        <div className="payment-approval-purchase">
          <span>Wallet balance</span>
          <strong>{money(topup.wallet_balance)}</strong>
          <small>Current balance</small>
        </div>
        <div className="payment-approval-amount">
          <span>Recharge</span>
          <strong>{money(topup.amount)}</strong>
          <small>{topup.payment_method || 'manual'}</small>
        </div>
        <span className={`pay-status ${topup.status}`}>{topup.status}</span>
        <div className="payment-approval-actions">
          <button type="button" className="payment-details-toggle" onClick={() => toggleApproval('topup', topup.id)}>{open ? 'Hide details' : 'View details'}</button>
          {topup.status === 'pending' && <>
            <button type="button" className="approve" disabled={busy !== null} onClick={() => updateTopup(topup.id, 'approved')}>{busy === `topup-${topup.id}` ? 'Working…' : 'Approve'}</button>
            <button type="button" className="reject" disabled={busy !== null} onClick={() => updateTopup(topup.id, 'rejected')}>Reject</button>
          </>}
        </div>
      </div>
      {open && <div className="payment-approval-details">
        <div><span>Recharge amount</span><strong>{money(topup.amount)}</strong></div>
        <div><span>Wallet balance</span><strong>{money(topup.wallet_balance)}</strong></div>
        <div><span>Payment method</span><strong>{topup.payment_method || 'manual'}</strong></div>
        <div><span>Reference / UTR</span><strong>{topup.reference || '—'}</strong></div>
        <div><span>Submitted</span><strong>{dateTime(topup.created_at)}</strong></div>
        <div><span>Reviewed by</span><strong>{topup.reviewer_name || '—'}</strong></div>
        <div className="payment-proof-detail"><span>Payment proof</span>{topup.proof_url || topup.has_proof ? <button type="button" onClick={() => topup.proof_url ? openProof(topup.proof_url) : openStoredProof('topup', topup.id)}>View proof</button> : <strong>—</strong>}</div>
      </div>}
    </article>
  }

  return <section className="admin-payments-page premium-payments-page">
    <section className="payments-premium-hero">
      <div>
        <span>FINANCE OPERATIONS / APPROVALS</span>
        <h1>Payments</h1>
        <p>Review incoming payment and wallet recharge requests. Customer histories and account-level controls are available in Users → Customer 360.</p>
      </div>
      <div className="payments-hero-state">
        <i/>
        <div><strong>{Number(pstats.pending || 0) + Number(tstats.pending || 0)}</strong><span>awaiting review</span></div>
      </div>
    </section>

    <section className="payments-kpi-grid">
      <article className="payments-kpi pending"><div className="payments-kpi-icon">!</div><div><span>Payment requests</span><strong>{Number(pstats.pending || 0)}</strong><small>Pending review</small></div></article>
      <article className="payments-kpi wallet"><div className="payments-kpi-icon">₹</div><div><span>Wallet top-ups</span><strong>{Number(tstats.pending || 0)}</strong><small>Pending recharge approvals</small></div></article>
      <article className="payments-kpi paid"><div className="payments-kpi-icon">✓</div><div><span>Paid purchases</span><strong>{Number(pstats.paid || 0)}</strong><small>Approved payment records</small></div></article>
      <article className="payments-kpi value"><div className="payments-kpi-icon">↗</div><div><span>Recharge value</span><strong>{money(tstats.approved_amount)}</strong><small>Approved wallet recharges</small></div></article>
    </section>

    <section className="payments-operations-panel">
      <div className="payments-panel-head">
        <div><span>APPROVAL QUEUES</span><h2>Review transactions</h2></div>
        <div className="payments-panel-meta"><span>{activeTotal} shown</span><span>{queues.find(item => item.key === approvalType)?.label}</span></div>
      </div>

      <div className="payments-command-bar">
        <div className="payments-search">
          <span>⌕</span>
          <input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => event.key === 'Enter' && load(1)} placeholder="Search user, business, mobile, plan, payment ID or UTR…" />
        </div>
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid / approved</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <button type="button" onClick={() => load(1)}>Search</button>
      </div>

      {error && <div className="payment-error">{error}</div>}

      <div className="premium-approval-switcher" role="tablist" aria-label="Payment approval queue">
        {queues.map(queue => <button type="button" className={approvalType === queue.key ? 'active' : ''} onClick={() => { setApprovalType(queue.key); setExpandedApproval({}); setPage(1) }} key={queue.key}>
          <div><strong>{queue.label}</strong><small>{queue.note}</small></div>
          <b>{queue.count}</b>
        </button>)}
      </div>

      <div className="payments-queue-head">
        <div>
          <span>{approvalType === 'wallet' ? 'WALLET RECHARGES' : approvalType === 'leads' ? 'LEAD PAYMENTS' : approvalType === 'investment' ? 'INVESTMENT PAYMENTS' : 'MEMBERSHIP APPROVALS'}</span>
          <h3>{approvalType === 'wallet' ? 'Recharge approvals' : approvalType === 'leads' ? 'Lead purchase approvals' : approvalType === 'investment' ? 'Investment approvals' : 'GROW / SCALE payment approvals'}</h3>
        </div>
        <small>Auto refreshes every minute</small>
      </div>

      <div className="payment-approval-list">
        {loading ? <div className="payments-empty-state"><span className="payment-loading-ring"/><strong>Loading approval queue…</strong></div>
          : activeItems.length === 0 ? <div className="payments-empty-state"><div className="payments-empty-icon">✓</div><strong>No matching requests</strong><small>This approval queue is clear for the selected filter.</small></div>
          : approvalType === 'wallet'
            ? activeItems.map(item => <TopupCard topup={item} key={item.id}/>)
            : activeItems.map(item => <PaymentCard payment={item} key={item.id}/>)}
      </div>

      {activePages > 1 && <div className="payments-pagination">
        <span>Page <strong>{page}</strong> of {activePages}</span>
        <div><button type="button" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>← Previous</button><button type="button" disabled={page >= activePages || loading} onClick={() => load(page + 1)}>Next →</button></div>
      </div>}
    </section>
  </section>
}
