import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { clearSession, getToken } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminInvestorWithdrawals.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function payoutSnapshot(request) {
  const raw = request?.payout_account_snapshot
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return null }
}

function destinationLabel(request) {
  const snapshot = payoutSnapshot(request)
  if (!snapshot) return 'Destination unavailable'
  if (snapshot.method === 'upi') return snapshot.upi_id || 'UPI'
  if (snapshot.method === 'bank') return snapshot.bank_name || 'Bank account'
  return request.payout_method || 'Payout account'
}

export default function AdminInvestorWithdrawals() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [reference, setReference] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function request(path, options = {}) {
    if (!getToken()) {
      clearSession()
      navigate('/login', { replace: true })
      throw new Error('Your admin session has expired. Please sign in again.')
    }
    return apiRequest(path, options)
  }

  async function load(silent = false) {
    if (!silent) setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ status, search: search.trim() })
      const data = await request(`/investments/admin/transfer-requests?${qs}`)
      setRequests(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Unable to load withdrawal requests.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load() }, [status])
  useEffect(() => {
    const timer = window.setTimeout(() => load(), 250)
    return () => window.clearTimeout(timer)
  }, [search])
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 15000)
    return () => window.clearInterval(timer)
  }, [status, search])

  const counts = useMemo(() => ({
    pending: requests.filter(item => item.status === 'pending').length,
    paid: requests.filter(item => item.status === 'paid').length,
    rejected: requests.filter(item => item.status === 'rejected').length,
    total: requests.length,
  }), [requests])

  function openRequest(requestItem) {
    setSelected(requestItem)
    setReference('')
    setProofUrl('')
    setNotes('')
    setError('')
    setSuccess('')
  }

  function closeRequest() {
    if (busy) return
    setSelected(null)
  }

  async function processRequest(action) {
    if (!selected || busy) return
    if (action === 'paid') {
      const transferReference = reference.trim()
      const proof = proofUrl.trim()
      if (!transferReference) { setError('Transfer reference / UTR is required.'); return }
      if (!proof) { setError('Transfer proof URL is required.'); return }
      if (!window.confirm(`Mark ${money(selected.amount)} withdrawal for ${selected.user_name || selected.user_email} as paid?\n\nUse this only after the bank/UPI transfer has actually completed.`)) return
    } else if (!window.confirm(`Reject the ${money(selected.amount)} withdrawal request from ${selected.user_name || selected.user_email}?`)) return

    setBusy(action)
    setError('')
    setSuccess('')
    try {
      await request(`/investments/admin/transfer-requests/${selected.id}/process`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          transferReference: reference.trim() || undefined,
          proofUrl: proofUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      setSuccess(action === 'paid' ? 'Withdrawal marked paid successfully.' : 'Withdrawal request rejected and the reservation released.')
      setSelected(null)
      await load()
    } catch (e) {
      setError(e.message || 'Unable to process withdrawal request.')
    } finally {
      setBusy(null)
    }
  }

  const snapshot = payoutSnapshot(selected)
  const pending = status === 'pending'

  return <section className="admin-withdrawals-page">
    <div className="admin-withdrawals-header">
      <div>
        <span className="admin-withdrawals-kicker">INVESTOR PAYOUTS</span>
        <h1>Withdrawal Requests</h1>
        <p>Review investor earnings withdrawals, verify the saved payout destination, and record the completed transfer. Investment principal is never payable through this workflow.</p>
      </div>
      <button className="admin-withdrawals-refresh" onClick={() => load()} disabled={loading}>↻ Refresh</button>
    </div>

    <div className="admin-withdrawals-stats">
      <article><span>SHOWING</span><strong>{counts.total}</strong><small>{status === 'all' ? 'All requests' : `${status} requests`}</small></article>
      <article className="attention"><span>PENDING</span><strong>{pending ? counts.pending : '—'}</strong><small>Awaiting admin action</small></article>
      <article><span>PAID</span><strong>{status === 'paid' ? counts.paid : '—'}</strong><small>Completed payouts</small></article>
      <article><span>REJECTED</span><strong>{status === 'rejected' ? counts.rejected : '—'}</strong><small>Reservation released</small></article>
    </div>

    <div className="admin-withdrawals-toolbar">
      <div className="admin-withdrawal-tabs">
        {['pending', 'all', 'paid', 'rejected'].map(item => <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{item === 'pending' ? 'Pending' : item === 'all' ? 'All' : item === 'paid' ? 'Paid' : 'Rejected'}</button>)}
      </div>
      <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search investor name or email" aria-label="Search withdrawal requests" />
    </div>

    {error && <div className="admin-withdrawals-alert error">{error}</div>}
    {success && <div className="admin-withdrawals-alert success">{success}</div>}

    <div className="admin-withdrawals-table-wrap">
      {loading ? <div className="admin-withdrawals-empty">Loading withdrawal requests…</div> : requests.length === 0 ? <div className="admin-withdrawals-empty"><strong>No {status === 'all' ? '' : `${status} `}withdrawal requests</strong><span>New investor withdrawal requests will appear here automatically.</span></div> : <table className="admin-withdrawals-table">
        <thead><tr><th>Investor</th><th>Amount</th><th>Destination</th><th>Requested</th><th>Status</th><th /></tr></thead>
        <tbody>{requests.map(item => <tr key={item.id}>
          <td><strong>{item.user_name || 'Investor'}</strong><span>{item.user_email || '—'}</span></td>
          <td><strong>{money(item.amount)}</strong><span>Request #{item.id}</span></td>
          <td><strong>{String(item.payout_method || '—').toUpperCase()}</strong><span>{destinationLabel(item)}</span></td>
          <td>{date(item.requested_at)}</td>
          <td><span className={`withdrawal-status ${item.status}`}>{item.status}</span></td>
          <td><button className="inspect-btn" onClick={() => openRequest(item)}>Inspect</button></td>
        </tr>)}</tbody>
      </table>}
    </div>

    {selected && <div className="admin-withdrawal-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeRequest() }}>
      <div className="admin-withdrawal-modal" role="dialog" aria-modal="true" aria-labelledby="withdrawal-modal-title">
        <div className="admin-withdrawal-modal-head"><div><span>WITHDRAWAL #{selected.id}</span><h2 id="withdrawal-modal-title">{selected.user_name || 'Investor'}</h2><p>{selected.user_email || '—'} · Requested {date(selected.requested_at)}</p></div><button onClick={closeRequest} disabled={Boolean(busy)} aria-label="Close">×</button></div>

        <div className="admin-withdrawal-amount"><span>REQUESTED WITHDRAWAL</span><strong>{money(selected.amount)}</strong><small>Ledger-controlled eligible earnings only. Active invested principal is excluded.</small></div>

        <div className="admin-withdrawal-detail-grid">
          <article><span>METHOD</span><strong>{String(selected.payout_method || snapshot?.method || '—').toUpperCase()}</strong></article>
          <article><span>ACCOUNT</span><strong>{snapshot?.method === 'upi' ? snapshot.upi_id || '—' : snapshot?.account_number ? `••••${String(snapshot.account_number).slice(-4)}` : '—'}</strong></article>
          <article><span>HOLDER</span><strong>{snapshot?.account_holder_name || '—'}</strong></article>
          <article><span>BANK</span><strong>{snapshot?.bank_name || (snapshot?.method === 'upi' ? 'UPI' : '—')}</strong></article>
          {snapshot?.ifsc_code && <article><span>IFSC</span><strong>{snapshot.ifsc_code}</strong></article>}
        </div>

        {selected.status === 'pending' ? <div className="admin-withdrawal-form">
          <label>Transfer reference / UTR<input value={reference} onChange={event => setReference(event.target.value)} placeholder="Enter bank/UPI transaction reference" /></label>
          <label>Transfer proof URL<input value={proofUrl} onChange={event => setProofUrl(event.target.value)} placeholder="https://…" /></label>
          <label>Admin notes<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Optional processing note" rows="3" /></label>
          <div className="admin-withdrawal-warning">Only click <b>Mark as paid</b> after the actual transfer succeeds. The backend checks the current ledger balance, prevents duplicate transfer references, and permanently settles the request.</div>
        </div> : <div className="admin-withdrawal-processed"><strong>This request is already {selected.status}.</strong><span>{selected.transfer_reference ? `Reference: ${selected.transfer_reference}` : 'No transfer reference recorded.'}</span><span>{selected.processed_at ? `Processed: ${date(selected.processed_at)}` : ''}</span></div>}

        <div className="admin-withdrawal-modal-foot"><button className="secondary" onClick={closeRequest} disabled={Boolean(busy)}>Close</button>{selected.status === 'pending' && <><button className="reject" onClick={() => processRequest('reject')} disabled={Boolean(busy)}>{busy === 'reject' ? 'Rejecting…' : 'Reject & Release'}</button><button className="pay" onClick={() => processRequest('paid')} disabled={Boolean(busy)}>{busy === 'paid' ? 'Processing…' : 'Mark as Paid'}</button></>}</div>
      </div>
    </div>}
  </section>
}
