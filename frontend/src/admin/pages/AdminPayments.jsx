import { useEffect, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { getToken, clearSession } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminTable.css'
import './AdminPayments.css'

export default function AdminPayments() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('approvals')
  const [approvalType, setApprovalType] = useState('membership')
  const [payments, setPayments] = useState([])
  const [topups, setTopups] = useState([])
  const [customers, setCustomers] = useState([])
  const [walletCustomers, setWalletCustomers] = useState([])
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [paymentMeta, setPaymentMeta] = useState({ total: 0, pages: 0, stats: {} })
  const [topupMeta, setTopupMeta] = useState({ total: 0, pages: 0, stats: {} })
  const [customerMeta, setCustomerMeta] = useState({ total: 0, pages: 0 })
  const [walletMeta, setWalletMeta] = useState({ total: 0, pages: 0, stats: {} })
  const [details, setDetails] = useState(null)
  const [walletDetails, setWalletDetails] = useState(null)
  const [selectedMembershipId, setSelectedMembershipId] = useState(null)
  const [days, setDays] = useState(30)
  const [expiry, setExpiry] = useState('')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [expandedApproval, setExpandedApproval] = useState({})

  async function request(path, options = {}) {
    if (!getToken()) {
      clearSession()
      navigate('/login', { replace: true })
      throw new Error('Your admin session has expired. Please sign in again.')
    }
    return apiRequest(path, options)
  }

  async function fetchPayments(nextPage = 1, overrideStatus = status) {
    const qs = new URLSearchParams({ status: overrideStatus, search: search.trim(), page: String(nextPage), limit: '50' })
    const data = await request(`/payments?${qs}`)
    setPayments(Array.isArray(data) ? data : data.items || [])
    setPaymentMeta({ total: data.total ?? 0, pages: data.pages ?? 1, stats: data.stats || {} })
  }

  async function fetchTopups(nextPage = 1, overrideStatus = status) {
    const qs = new URLSearchParams({ status: overrideStatus, search: search.trim(), page: String(nextPage), limit: '50' })
    const data = await request(`/wallet/topups?${qs}`)
    setTopups(Array.isArray(data) ? data : data.items || [])
    setTopupMeta({ total: data.total ?? 0, pages: data.pages ?? 1, stats: data.stats || {} })
  }

  async function fetchCustomers(nextPage = 1) {
    const qs = new URLSearchParams({ search: search.trim(), page: String(nextPage), limit: '50' })
    const data = await request(`/payments/memberships/customers?${qs}`)
    setCustomers(Array.isArray(data) ? data : data.items || [])
    setCustomerMeta({ total: data.total ?? 0, pages: data.pages ?? 1 })
  }

  async function fetchWalletCustomers(nextPage = 1) {
    const qs = new URLSearchParams({ search: search.trim(), page: String(nextPage), limit: '50' })
    const data = await request(`/wallet/admin/history/customers?${qs}`)
    setWalletCustomers(Array.isArray(data) ? data : data.items || [])
    setWalletMeta({ total: data.total ?? 0, pages: data.pages ?? 1, stats: data.stats || {} })
  }

  async function load(nextPage = 1, silent = false) {
    if (!silent) setLoading(true)
    setError('')
    try {
      if (tab === 'approvals') {
        const topupStatus = status === 'approved' ? 'approved' : status === 'paid' ? 'approved' : status === 'rejected' ? 'rejected' : status === 'pending' ? 'pending' : 'all'
        await Promise.all([fetchPayments(nextPage, status), fetchTopups(nextPage, topupStatus)])
      } else if (tab === 'membership') {
        await fetchCustomers(nextPage)
      } else {
        await fetchWalletCustomers(nextPage)
      }
      setPage(nextPage)
    } catch (e) {
      if (!silent) setError(e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [tab, status])
  useEffect(() => {
    const timer = window.setInterval(() => load(1, true), 15000)
    return () => window.clearInterval(timer)
  }, [tab, status, search])

  async function updatePayment(id, next) {
    if (busy) return
    setBusy(`payment-${id}`)
    try {
      await request(`/payments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) })
      setExpandedApproval((s) => { const n = { ...s }; delete n[`payment-${id}`]; return n })
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
    try {
      await request(next === 'approved' ? `/wallet/topups/${id}/approve` : `/wallet/topups/${id}/reject`, { method: 'PATCH' })
      setExpandedApproval((s) => { const n = { ...s }; delete n[`topup-${id}`]; return n })
      await load(page)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  async function openCustomer(userId) {
    setError('')
    try {
      const data = await request(`/payments/memberships/customers/${userId}`)
      setDetails(data)
      const first = data.plans?.[0]
      setSelectedMembershipId(first?.membership_id || null)
      setDays(30)
      setExpiry(first?.expires_at ? new Date(first.expires_at).toISOString().slice(0, 10) : '')
    } catch (e) {
      setError(e.message)
    }
  }

  async function openWalletCustomer(userId) {
    setError('')
    try {
      const data = await request(`/wallet/admin/history/customers/${userId}`)
      setWalletDetails(data)
      setAdjustAmount('')
      setAdjustReason('')
    } catch (e) {
      setError(e.message)
    }
  }

  const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  const date = (v) => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
  const dateOnly = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  async function adjustWallet(action) {
    if (!walletDetails || busy) return
    const amount = Number(adjustAmount)
    const reason = adjustReason.trim()
    if (!Number.isFinite(amount) || amount <= 0) { setError('Enter a valid amount greater than zero.'); return }
    if (!reason) { setError('Enter a reason for this balance adjustment.'); return }
    if (action === 'debit' && amount > Number(walletDetails.wallet.balance)) {
      setError(`Cannot deduct more than the current wallet balance of ${money(walletDetails.wallet.balance)}.`)
      return
    }
    if (!window.confirm(`${action === 'credit' ? 'Add' : action === 'debit' ? 'Deduct' : 'Refund'} ${money(amount)} ${action === 'debit' ? 'from' : 'to'} this wallet?`)) return
    setBusy(`wallet-${action}`)
    setError('')
    try {
      await request(`/wallet/admin/history/customers/${walletDetails.customer.user_id}/adjust`, { method: 'POST', body: JSON.stringify({ action, amount, reason }) })
      await openWalletCustomer(walletDetails.customer.user_id)
      await fetchWalletCustomers(page)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const selectedPlan = details?.plans?.find((p) => p.membership_id === selectedMembershipId) || details?.plans?.[0]

  async function changeMembership(action) {
    if (!selectedPlan || busy) return
    setBusy(`membership-${selectedPlan.membership_id}`)
    setError('')
    try {
      const body = { action }
      if (action === 'extend' || action === 'reduce') body.days = Number(days)
      if (action === 'set_expiry') body.expiresAt = expiry
      await request(`/payments/memberships/${selectedPlan.membership_id}`, { method: 'PATCH', body: JSON.stringify(body) })
      await openCustomer(details.customer.user_id)
      await fetchCustomers(page)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    if (selectedPlan) {
      setSelectedMembershipId(selectedPlan.membership_id)
      setExpiry(selectedPlan.expires_at ? new Date(selectedPlan.expires_at).toISOString().slice(0, 10) : '')
    }
  }, [details?.plans?.length])

  const pstats = paymentMeta.stats || {}
  const tstats = topupMeta.stats || {}
  const wstats = walletMeta.stats || {}
  const paymentType = (p) => String(p?.purchase_type || p?.payment_type || '').toLowerCase()
  const membershipPayments = payments.filter((p) => !['lead', 'investment'].includes(paymentType(p)))
  const leadPayments = payments.filter((p) => paymentType(p) === 'lead')
  const investmentPayments = payments.filter((p) => paymentType(p) === 'investment')
  const toggleApproval = (type, id) => setExpandedApproval((s) => ({ ...s, [`${type}-${id}`]: !s[`${type}-${id}`] }))
  const isApprovalOpen = (type, id) => Boolean(expandedApproval[`${type}-${id}`])

  const paymentRows = (items, emptyText = 'No membership payment requests found.') => {
    if (items.length === 0) return <tr><td colSpan="7" className="payment-empty">{emptyText}</td></tr>
    return items.flatMap((p) => {
      const open = isApprovalOpen('payment', p.id)
      return [
        <tr key={`payment-${p.id}`} className={`approval-row ${open ? 'is-expanded' : ''}`}>
          <td>#{p.id}</td>
          <td><b>{p.business_name || p.user_name || '—'}</b><small>{p.user_email}</small></td>
          <td><b>{p.membership_plan_name || 'Purchase'}</b><small>{p.membership_plan_type || p.payment_type || 'purchase'}</small></td>
          <td><strong>{money(p.amount)}</strong></td>
          <td><span className={`pay-status ${p.status}`}>{p.status}</span></td>
          <td><button type="button" className="approval-details-button" onClick={() => toggleApproval('payment', p.id)}>{open ? 'Hide' : 'View'} details</button></td>
          <td>{p.status === 'pending' ? <div className="pay-actions"><button disabled={busy !== null} onClick={() => updatePayment(p.id, 'paid')}>{busy === `payment-${p.id}` ? 'Working…' : 'Approve'}</button><button disabled={busy !== null} onClick={() => updatePayment(p.id, 'rejected')}>Reject</button></div> : '—'}</td>
        </tr>,
        open && <tr key={`payment-details-${p.id}`} className="approval-details-row"><td colSpan="7"><div className="approval-details-grid"><div><span>Payment method</span><b>{p.payment_method || '—'}</b></div><div><span>Total amount</span><b>{money(p.amount)}</b></div><div><span>Wallet used</span><b>{money(p.wallet_amount)}</b></div><div><span>Direct due</span><b>{money(p.external_amount)}</b></div><div><span>Reference / UTR</span><b>{p.manual_reference || p.gateway_payment_id || '—'}</b></div><div><span>Payment status</span><b>{p.status}</b></div><div><span>Membership</span><b>{p.membership_status || '—'}</b></div><div><span>Membership expiry</span><b>{dateOnly(p.membership_expires_at)}</b></div><div className="approval-proof"><span>Payment proof</span>{p.proof_url ? <button className="proof-button" onClick={() => openProof(p.proof_url)}>View proof</button> : <b>—</b>}</div></div></td></tr>
      ]
    })
  }

  const topupRows = (items) => {
    if (items.length === 0) return <tr><td colSpan="7" className="payment-empty">No wallet top-up requests found.</td></tr>
    return items.flatMap((t) => {
      const open = isApprovalOpen('topup', t.id)
      return [
        <tr key={`topup-${t.id}`} className={`approval-row ${open ? 'is-expanded' : ''}`}>
          <td>#{t.id}</td>
          <td><b>{t.business_name || t.user_name || '—'}</b><small>{t.user_email}</small></td>
          <td><strong>{money(t.amount)}</strong></td>
          <td><strong>{money(t.wallet_balance)}</strong></td>
          <td><span className={`pay-status ${t.status}`}>{t.status}</span></td>
          <td><button type="button" className="approval-details-button" onClick={() => toggleApproval('topup', t.id)}>{open ? 'Hide' : 'View'} details</button></td>
          <td>{t.status === 'pending' ? <div className="pay-actions"><button disabled={busy !== null} onClick={() => updateTopup(t.id, 'approved')}>{busy === `topup-${t.id}` ? 'Working…' : 'Approve'}</button><button disabled={busy !== null} onClick={() => updateTopup(t.id, 'rejected')}>Reject</button></div> : '—'}</td>
        </tr>,
        open && <tr key={`topup-details-${t.id}`} className="approval-details-row"><td colSpan="7"><div className="approval-details-grid"><div><span>Recharge amount</span><b>{money(t.amount)}</b></div><div><span>Wallet balance</span><b>{money(t.wallet_balance)}</b></div><div><span>Payment method</span><b>{t.payment_method || 'manual'}</b></div><div><span>Reference / UTR</span><b>{t.reference || '—'}</b></div><div><span>Status</span><b>{t.status}</b></div><div><span>Reviewed by</span><b>{t.reviewer_name || '—'}</b></div><div className="approval-proof"><span>Payment proof</span>{t.proof_url ? <button className="proof-button" onClick={() => openProof(t.proof_url)}>View proof</button> : <b>—</b>}</div></div></td></tr>
      ]
    })
  }

  const transactionTypeLabel = (t) => t.reference_type === 'wallet_topup' ? 'Recharge' : t.type === 'refund' ? 'Refund' : t.type === 'debit' ? 'Purchase debit' : t.reference_type ? `${t.reference_type}${t.reference_id ? ` #${t.reference_id}` : ''}` : 'Wallet credit'

  const openProof = (proof) => {
    if (!proof) return
    const win = window.open()
    if (win) {
      const safe = String(proof).replaceAll('"', '&quot;')
      win.document.write(`<title>Payment Proof</title><style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:95vw;max-height:95vh;object-fit:contain}iframe{width:95vw;height:95vh;border:0;background:#fff}</style>${String(proof).startsWith('data:application/pdf') ? `<iframe src="${safe}"></iframe>` : `<img src="${safe}" alt="Payment proof"/>`}`)
      win.document.close()
    }
  }

  return (
    <section className="admin-payments-page">
      <div className="payments-heading"><h1>Payments</h1></div>
      <div className="payment-tabs">
        <button className={tab === 'approvals' ? 'active' : ''} onClick={() => { setTab('approvals'); setStatus('all') }}>Approvals</button>
        <button className={tab === 'membership' ? 'active' : ''} onClick={() => { setTab('membership'); setStatus('all') }}>Membership Payments</button>
        <button className={tab === 'wallet' ? 'active' : ''} onClick={() => { setTab('wallet'); setStatus('all') }}>Wallet History</button>
      </div>
      {tab === 'approvals' ? (
        <div className="payment-cards"><div><span>Payment requests</span><b>{pstats.pending ?? 0}</b></div><div><span>Wallet top-up requests</span><b>{tstats.pending ?? 0}</b></div><div><span>Paid purchases</span><b>{pstats.paid ?? 0}</b></div><div><span>Approved recharge value</span><b>{money(tstats.approved_amount)}</b></div></div>
      ) : tab === 'membership' ? (
        <div className="payment-cards"><div><span>Businesses / users</span><b>{customerMeta.total}</b></div><div><span>With active membership</span><b>{customers.filter((c) => Number(c.active_membership_count) > 0).length}</b></div><div><span>Total plans</span><b>{customers.reduce((n, c) => n + Number(c.membership_count || 0), 0)}</b></div><div><span>Search results</span><b>{customers.length}</b></div></div>
      ) : (
        <div className="payment-cards"><div><span>Total wallet balance</span><b>{money(wstats.total_wallet_balance)}</b></div><div><span>Total recharged</span><b>{money(wstats.total_recharge_amount)}</b></div><div><span>Total debits</span><b>{money(wstats.total_debit_amount)}</b></div><div><span>Total refunds</span><b>{money(wstats.total_refund_amount)}</b></div></div>
      )}
      <div className="payment-panel">
        <div className="payment-toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} placeholder={tab === 'wallet' ? 'Search user, business, mobile or recharge reference...' : 'Search user, business, mobile, plan or UTR...'} />{tab === 'approvals' && <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>}<button onClick={() => load(1)}>Search</button></div>
        {error && <div className="payment-error">{error}</div>}
        {tab === 'approvals' ? (
          <>
            <div className="approval-switcher" role="tablist" aria-label="Approval type"><button type="button" className={approvalType === 'wallet' ? 'active' : ''} onClick={() => { setApprovalType('wallet'); setExpandedApproval({}) }}><span>Wallet</span><b>{tstats.pending ?? 0}</b></button><button type="button" className={approvalType === 'leads' ? 'active' : ''} onClick={() => { setApprovalType('leads'); setExpandedApproval({}) }}><span>Leads</span></button><button type="button" className={approvalType === 'membership' ? 'active' : ''} onClick={() => { setApprovalType('membership'); setExpandedApproval({}) }}><span>Membership</span><b>{pstats.pending ?? 0}</b></button><button type="button" className={approvalType === 'investment' ? 'active' : ''} onClick={() => { setApprovalType('investment'); setExpandedApproval({}) }}><span>Investment</span></button></div>
            {approvalType === 'wallet' ? <><div className="payment-section-title"><h3>Wallet recharge approvals</h3></div><div className="payment-table-wrap approval-table-wrap"><table><thead><tr><th>ID</th><th>BUSINESS / USER</th><th>RECHARGE</th><th>WALLET</th><th>STATUS</th><th>DETAILS</th><th>ACTION</th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="payment-empty">Loading...</td></tr> : topupRows(topups)}</tbody></table></div></>
              : approvalType === 'leads' ? <><div className="payment-section-title"><h3>Lead payment approvals</h3></div><div className="payment-table-wrap approval-table-wrap"><table><thead><tr><th>ID</th><th>BUSINESS / USER</th><th>PLAN / PURCHASE</th><th>AMOUNT</th><th>STATUS</th><th>DETAILS</th><th>ACTION</th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="payment-empty">Loading...</td></tr> : paymentRows(leadPayments, 'No lead payment requests found.')}</tbody></table></div></>
              : approvalType === 'membership' ? <><div className="payment-section-title"><h3>Membership payment approvals</h3></div><div className="payment-table-wrap approval-table-wrap"><table><thead><tr><th>ID</th><th>BUSINESS / USER</th><th>PLAN / PURCHASE</th><th>AMOUNT</th><th>STATUS</th><th>DETAILS</th><th>ACTION</th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="payment-empty">Loading...</td></tr> : paymentRows(membershipPayments)}</tbody></table></div></>
              : <><div className="payment-section-title"><h3>Investment payment approvals</h3></div><div className="payment-table-wrap approval-table-wrap"><table><thead><tr><th>ID</th><th>BUSINESS / USER</th><th>PLAN / PURCHASE</th><th>AMOUNT</th><th>STATUS</th><th>DETAILS</th><th>ACTION</th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="payment-empty">Loading...</td></tr> : paymentRows(investmentPayments, 'No investment payment requests found.')}</tbody></table></div></>}
          </>
        ) : tab === 'membership' ? (
          <div className="payment-table-wrap membership-summary-table"><table><thead><tr><th>BUSINESS / USER</th><th>MOBILE</th><th>LOCATION</th><th>LAST PAYMENT</th><th>ACTION</th></tr></thead><tbody>{loading ? <tr><td colSpan="5" className="payment-empty">Loading...</td></tr> : customers.length === 0 ? <tr><td colSpan="5" className="payment-empty">No membership customers found.</td></tr> : customers.map((c) => <tr key={c.user_id}><td><b>{c.business_name || c.user_name || '—'}</b><small>{c.user_email}</small></td><td>{c.phone || '—'}</td><td>{c.location || '—'}</td><td>{date(c.last_payment_at)}</td><td><button className="details-button" onClick={() => openCustomer(c.user_id)}>View details</button></td></tr>)}</tbody></table></div>
        ) : (
          <div className="payment-table-wrap membership-summary-table wallet-summary-table"><table><thead><tr><th>BUSINESS / USER</th><th>MOBILE</th><th>LOCATION</th><th>WALLET BALANCE</th><th>LAST RECHARGE</th><th>ACTION</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="payment-empty">Loading...</td></tr> : walletCustomers.length === 0 ? <tr><td colSpan="6" className="payment-empty">No wallet history found.</td></tr> : walletCustomers.map((c) => <tr key={c.user_id}><td><b>{c.business_name || c.user_name || '—'}</b><small>{c.user_email}</small></td><td>{c.phone || '—'}</td><td>{c.location || '—'}</td><td><strong>{money(c.wallet_balance)}</strong></td><td>{date(c.last_recharge_at)}</td><td><button className="details-button" onClick={() => openWalletCustomer(c.user_id)}>View details</button></td></tr>)}</tbody></table></div>
        )}
      </div>
      {tab !== 'approvals' && ((tab === 'membership' ? customerMeta.pages : walletMeta.pages) > 1) && <div className="payment-toolbar"><button disabled={page <= 1 || loading} onClick={() => load(page - 1)}>Previous</button><span>Page {page} of {tab === 'membership' ? customerMeta.pages : walletMeta.pages}</span><button disabled={page >= (tab === 'membership' ? customerMeta.pages : walletMeta.pages) || loading} onClick={() => load(page + 1)}>Next</button></div>}
      {details && <div className="payment-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetails(null) }}><div className="payment-modal membership-detail-modal" role="dialog" aria-modal="true"><div className="payment-modal-head"><div><span className="eyebrow">MEMBERSHIP DETAILS</span><h2>{details.customer.business_name || details.customer.user_name || 'User'}</h2><p>{details.customer.user_email}</p><small>{details.customer.phone || '—'}</small><small>{details.customer.location || '—'}</small></div><button className="modal-close" onClick={() => setDetails(null)}>×</button></div><div className="membership-plan-list"><div className="membership-modal-title"><h3>Membership plans</h3><span>{details.plans?.length || 0} plans</span></div>{details.plans?.length ? <div className="membership-plan-grid">{details.plans.map((p) => <button type="button" className={`membership-plan-card ${p.membership_id === selectedMembershipId ? 'active' : ''}`} key={p.membership_id} onClick={() => setSelectedMembershipId(p.membership_id)}><b>{p.plan_name}</b><span>{p.plan_type || 'standard'}</span><strong>{money(p.amount)}</strong><small>{p.starts_at ? dateOnly(p.starts_at) : '—'} → {p.expires_at ? dateOnly(p.expires_at) : '—'}</small></button>)}</div> : <div className="payment-empty">No membership plans found.</div>}</div>{selectedPlan && <div className="membership-management-panel"><div className="membership-modal-title"><h3>Manage membership</h3><span>{selectedPlan.plan_name}</span></div><div className="membership-management-grid"><div><label>Extension / reduction (days)</label><input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} /><div className="membership-action-row"><button disabled={busy !== null} onClick={() => changeMembership('extend')}>Extend</button><button disabled={busy !== null} onClick={() => changeMembership('reduce')}>Reduce</button></div></div><div><label>Expiry date</label><input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /><button disabled={busy !== null || !expiry} onClick={() => changeMembership('set_expiry')}>Set expiry date</button></div></div></div>}{details.history && <div className="membership-history"><div className="membership-modal-title"><h3>Membership history</h3><span>{details.history.length} events</span></div>{details.history.length === 0 ? <div className="payment-empty">No membership history yet.</div> : <div className="membership-history-list">{details.history.map((h, i) => <div className="membership-history-item" key={`${h.event_source}-${h.event_at}-${h.membership_id}-${i}`}><div><b>{h.plan_name}</b><small>{h.action || h.event_source} · {date(h.event_at)}</small></div><div><span className={`pay-status ${h.membership_status === 'active' || h.payment_status === 'paid' ? 'paid' : h.membership_status === 'cancelled' || h.payment_status === 'rejected' ? 'rejected' : 'pending'}`}>{h.membership_status || h.payment_status || '—'}</span>{h.amount !== null && h.amount !== undefined && <small>{money(h.amount)}{h.manual_reference ? ` · ${h.manual_reference}` : ''}</small>}</div></div>)}</div>}</div>}</div></div>}
      {walletDetails && <div className="payment-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setWalletDetails(null) }}><div className="payment-modal wallet-detail-modal" role="dialog" aria-modal="true"><div className="payment-modal-head"><div><span className="eyebrow">WALLET DETAILS</span><h2>{walletDetails.customer.business_name || walletDetails.customer.user_name || 'User'}</h2><p>{walletDetails.customer.user_email}</p><small>{walletDetails.customer.phone || '—'}</small><small>{walletDetails.customer.location || '—'}</small></div><button className="modal-close" onClick={() => setWalletDetails(null)}>×</button></div><div className="wallet-balance-hero"><span>Current wallet balance</span><b>{money(walletDetails.wallet.balance)}</b></div><div className="wallet-adjustment-panel"><div className="membership-modal-title"><h3>Balance controls</h3><span>Admin wallet adjustment</span></div><div className="wallet-adjustment-grid"><input type="number" min="0.01" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Amount" /><input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Reason / note" /><button disabled={busy !== null} onClick={() => adjustWallet('credit')}>Add balance</button><button disabled={busy !== null} onClick={() => adjustWallet('debit')}>Deduct balance</button><button disabled={busy !== null} onClick={() => adjustWallet('refund')}>Refund balance</button></div><small className="wallet-adjustment-note">Every manual change creates a wallet transaction with the admin reason. Deduct cannot exceed the current balance.</small></div><div className="wallet-detail-cards"><div><span>Total recharged</span><b>{money(walletDetails.totals.total_recharged)}</b></div><div><span>Total credits</span><b>{money(walletDetails.totals.total_credits)}</b></div><div><span>Total debits</span><b>{money(walletDetails.totals.total_debits)}</b></div><div><span>Total refunds</span><b>{money(walletDetails.totals.total_refunds)}</b></div></div><div className="wallet-history-section"><div className="membership-modal-title"><h3>Recharge history</h3><span>{walletDetails.recharges.length} records</span></div>{walletDetails.recharges.length === 0 ? <div className="payment-empty">No recharge records yet.</div> : <div className="wallet-history-table"><table><thead><tr><th>DATE</th><th>AMOUNT</th><th>REFERENCE</th><th>STATUS</th><th>PROOF</th></tr></thead><tbody>{walletDetails.recharges.map((r) => <tr key={`recharge-${r.id}`}><td>{date(r.created_at)}</td><td><strong>{money(r.amount)}</strong></td><td>{r.reference || '—'}</td><td><span className={`pay-status ${r.status}`}>{r.status}</span></td><td>{r.proof_url ? <button className="proof-button" onClick={() => openProof(r.proof_url)}>View proof</button> : '—'}</td></tr>)}</tbody></table></div>}</div><div className="wallet-history-section"><div className="membership-modal-title"><h3>Wallet transactions</h3><span>{walletDetails.transactions.length} records</span></div>{walletDetails.transactions.length === 0 ? <div className="payment-empty">No wallet transactions yet.</div> : <div className="wallet-history-table"><table><thead><tr><th>DATE</th><th>TYPE</th><th>AMOUNT</th><th>BALANCE AFTER</th><th>REFERENCE</th><th>DESCRIPTION</th></tr></thead><tbody>{walletDetails.transactions.map((t) => <tr key={`wallet-tx-${t.id}`}><td>{date(t.created_at)}</td><td><span className={`wallet-tx-type ${t.type}`}>{transactionTypeLabel(t)}</span></td><td><strong className={t.type === 'debit' ? 'wallet-debit' : t.type === 'refund' || t.type === 'credit' ? 'wallet-credit' : ''}>{t.type === 'debit' ? '−' : '+'}{money(t.amount)}</strong></td><td>{money(t.balance_after)}</td><td>{t.payment_id ? `Payment #${t.payment_id}` : t.reference_id ? `${t.reference_type || 'Reference'} #${t.reference_id}` : '—'}</td><td>{t.description || '—'}</td></tr>)}</tbody></table></div>}</div></div></div>}
    </section>
  )
}
