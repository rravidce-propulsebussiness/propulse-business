import { useCallback, useEffect, useState } from 'react'
import './AdminInvestorWithdrawals.css'
import useAdminRequest from '../hooks/useAdminRequest'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const cleanStatus = value => String(value || 'pending').toLowerCase()
const label = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

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
  if (snapshot.method === 'bank') {
    const tail = snapshot.account_number ? String(snapshot.account_number).slice(-4) : ''
    return [snapshot.bank_name, tail ? `••••${tail}` : ''].filter(Boolean).join(' · ') || 'Bank account'
  }
  return request.payout_method || 'Payout account'
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read the screenshot.'))
    reader.readAsDataURL(file)
  })
}

const MAX_PROOF_FILE_BYTES = 6 * 1024 * 1024
const PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function AdminInvestorWithdrawals() {
  const [requests, setRequests] = useState([])
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [reference, setReference] = useState('')
  const [proofData, setProofData] = useState('')
  const [proofName, setProofName] = useState('')
  const [existingProofUrl, setExistingProofUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 })
  const [metrics, setMetrics] = useState({ totalCount: 0, totalAmount: 0, pendingCount: 0, pendingAmount: 0, paidCount: 0, paidAmount: 0, rejectedCount: 0, rejectedAmount: 0 })

  const request = useAdminRequest()

  const load = useCallback(async (silent = false, nextPage = 1) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({
        status,
        search: query.trim(),
        page: String(nextPage),
        limit: '50',
      })
      const data = await request(`/investments/admin/transfer-requests?${qs}`)
      setRequests(Array.isArray(data) ? data : (data.items || []))
      setPagination({
        page: Number(data?.page || nextPage),
        limit: Number(data?.limit || 50),
        total: Number(data?.total || 0),
        pages: Number(data?.pages || 1),
      })
      setMetrics(data?.stats || { totalCount: 0, totalAmount: 0, pendingCount: 0, pendingAmount: 0, paidCount: 0, paidAmount: 0, rejectedCount: 0, rejectedAmount: 0 })
      setPage(Number(data?.page || nextPage))
    } catch (e) {
      setError(e.message || 'Unable to load withdrawal requests.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [request, query, status])
  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) load(false, 1) })
    return () => { active = false }
  }, [load])

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') load(true, page) }
    const timer = window.setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [load, page])

  const visibleRequests = requests

  async function openRequest(requestItem) {
    setSelected(requestItem)
    setReference(requestItem.transfer_reference || '')
    setProofData('')
    setProofName('')
    setExistingProofUrl('')
    setNotes(requestItem.notes || '')
    setError('')
    setSuccess('')
    if (cleanStatus(requestItem.status) === 'pending') return
    try {
      const proof = await request(`/investments/admin/transfer-requests/${requestItem.id}/proof`)
      setExistingProofUrl(proof?.proof_url || '')
    } catch (e) {
      setError(e.message || 'Unable to load transfer proof.')
    }
  }

  function closeRequest() {
    if (busy) return
    setSelected(null)
    setProofData('')
    setProofName('')
    setExistingProofUrl('')
  }

  async function handleProofFile(file) {
    if (!file) return
    if (!PROOF_TYPES.includes(file.type)) {
      setError('Transfer proof must be a PNG, JPG, or WebP screenshot.')
      return
    }
    if (file.size > MAX_PROOF_FILE_BYTES) {
      setError('Transfer proof image is too large. Please use an image under 6 MB.')
      return
    }
    try {
      setError('')
      setProofData(await fileToDataUrl(file))
      setProofName(file.name || 'Payment proof')
      setExistingProofUrl('')
    } catch (e) {
      setError(e.message || 'Unable to read the screenshot.')
    }
  }

  function handleProofInput(event) {
    handleProofFile(event.target.files?.[0])
  }

  function handleProofPaste(event) {
    const imageItem = Array.from(event.clipboardData?.items || []).find(item => item.type.startsWith('image/'))
    if (!imageItem) return
    event.preventDefault()
    const file = imageItem.getAsFile()
    if (file) handleProofFile(file)
  }

  async function processRequest(action) {
    if (!selected || busy) return
    if (action === 'paid') {
      if (!reference.trim()) { setError('Transfer reference / UTR is required.'); return }
      if (!proofData) { setError('Upload a screenshot of the completed bank/UPI transfer.'); return }
      if (!window.confirm(`Confirm that ${money(selected.amount)} was actually transferred to ${selected.user_name || selected.user_email || 'this investor'}?`)) return
    } else if (!window.confirm(`Reject withdrawal #${selected.id} and release its reserved earnings?`)) return

    setBusy(action)
    setError('')
    setSuccess('')
    try {
      await request(`/investments/admin/transfer-requests/${selected.id}/process`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          transferReference: reference.trim() || undefined,
          proofUrl: proofData || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      setSuccess(action === 'paid'
        ? `Withdrawal #${selected.id} marked paid successfully.`
        : `Withdrawal #${selected.id} rejected and its reservation released.`)
      setSelected(null)
      await load(true, page)
    } catch (e) {
      setError(e.message || 'Unable to process withdrawal request.')
    } finally {
      setBusy(null)
    }
  }

  function submitSearch(event) {
    event?.preventDefault()
    setPage(1)
    setQuery(search.trim())
  }

  const snapshot = payoutSnapshot(selected)
  const selectedStatus = cleanStatus(selected?.status)

  return <main className="admin-withdrawals-page">
    <section className="admin-withdrawals-hero">
      <div className="admin-withdrawals-hero-copy">
        <span>INVESTOR FINANCE / WITHDRAWAL CONTROL</span>
        <h1>Investor withdrawals</h1>
        <p>Review investor earnings withdrawal requests, verify the saved payout destination, and record completed transfers against the existing financial ledger.</p>
        <div className="admin-withdrawals-hero-meta">
          <span><b>{metrics.pendingCount}</b> pending requests</span>
          <span><b>{money(metrics.pendingAmount)}</b> awaiting transfer</span>
          <span><b>{metrics.paidCount}</b> completed payouts</span>
        </div>
      </div>
      <div className="admin-withdrawals-hero-actions">
        <button type="button" className="secondary" onClick={() => navigate('/admin/investments')}>
          <span>←</span><div><b>Investments</b><small>Return to investor portfolio</small></div>
        </button>
        <button type="button" className="primary" onClick={() => load(false, page)} disabled={loading}>
          <span>↻</span><div><b>{loading ? 'Refreshing…' : 'Refresh queue'}</b><small>Reload withdrawal ledger</small></div>
        </button>
      </div>
    </section>

    <section className="admin-withdrawals-stats">
      <article className="attention"><div className="stat-icon">!</div><div><span>PENDING TRANSFER</span><strong>{money(metrics.pendingAmount)}</strong><small>{metrics.pendingCount} request{metrics.pendingCount === 1 ? '' : 's'} awaiting action</small></div></article>
      <article><div className="stat-icon">✓</div><div><span>PAID</span><strong>{money(metrics.paidAmount)}</strong><small>{metrics.paidCount} completed payout{metrics.paidCount === 1 ? '' : 's'}</small></div></article>
      <article><div className="stat-icon">↩</div><div><span>REJECTED</span><strong>{money(metrics.rejectedAmount)}</strong><small>{metrics.rejectedCount} request{metrics.rejectedCount === 1 ? '' : 's'} released</small></div></article>
      <article><div className="stat-icon">#</div><div><span>TOTAL REQUESTS</span><strong>{metrics.totalCount}</strong><small>{money(metrics.totalAmount)} requested in this search</small></div></article>
    </section>

    {error && <div className="admin-withdrawals-alert error"><div><b>Action needed</b><span>{error}</span></div><button type="button" onClick={() => setError('')}>×</button></div>}
    {success && <div className="admin-withdrawals-alert success"><div><b>Completed</b><span>{success}</span></div><button type="button" onClick={() => setSuccess('')}>×</button></div>}

    <section className="admin-withdrawals-panel">
      <div className="admin-withdrawals-panel-head">
        <div>
          <span>TRANSFER REQUEST LEDGER</span>
          <h2>Withdrawal queue</h2>
          <p>Investment principal is excluded. Only ledger-eligible investor earnings can enter this queue.</p>
        </div>
        <form className="admin-withdrawals-search" onSubmit={submitSearch}>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search investor name or email" aria-label="Search withdrawal requests" />
          <button type="submit">Search</button>
          {query && <button type="button" className="clear" onClick={() => { setSearch(''); setQuery('') }}>Clear</button>}
        </form>
      </div>

      <div className="admin-withdrawals-toolbar">
        <div className="admin-withdrawal-tabs">
          {[
            ['pending', 'Pending', metrics.pendingCount],
            ['paid', 'Paid', metrics.paidCount],
            ['rejected', 'Rejected', metrics.rejectedCount],
            ['all', 'All', metrics.totalCount],
          ].map(([key, text, count]) => <button key={key} type="button" className={status === key ? 'active' : ''} onClick={() => { setPage(1); setStatus(key) }}>{text}<b>{count}</b></button>)}
        </div>
        <span className="admin-withdrawals-auto-refresh">Auto-refreshes every 60 seconds</span>
      </div>

      {loading ? <div className="admin-withdrawals-empty"><div className="withdrawal-loader" />Loading withdrawal ledger…</div> :
      visibleRequests.length === 0 ? <div className="admin-withdrawals-empty"><div className="empty-withdrawal-icon">₹</div><strong>No {status === 'all' ? '' : `${status} `}withdrawal requests</strong><span>New investor withdrawal requests will appear here automatically.</span></div> :
      <div className="admin-withdrawals-table-wrap">
        <table className="admin-withdrawals-table">
          <thead><tr><th>REQUEST</th><th>INVESTOR</th><th>AMOUNT</th><th>TYPE / CYCLE</th><th>DESTINATION</th><th>REQUESTED</th><th>STATUS</th><th>TRANSFER REF</th><th>ACTION</th></tr></thead>
          <tbody>{visibleRequests.map(item => {
            const itemStatus = cleanStatus(item.status)
            return <tr key={item.id} className={itemStatus === 'pending' ? 'pending-row' : ''}>
              <td><strong>#{item.id}</strong><span>Withdrawal</span></td>
              <td><div className="withdrawal-investor"><span className="withdrawal-avatar">{String(item.user_name || item.user_email || '?').charAt(0).toUpperCase()}</span><div><strong>{item.user_name || 'Investor'}</strong><small>{item.user_email || '—'}</small></div></div></td>
              <td><strong className="withdrawal-amount-cell">{money(item.amount)}</strong><span>Eligible earnings</span></td>
              <td><strong>{item.withdrawal_type === 'FINAL_EXIT' ? 'Final exit' : 'Partial'}</strong><span>{item.cycle_id ? `Cycle #${item.cycle_id}` : 'No cycle'}</span></td>
              <td><strong>{String(item.payout_method || '—').toUpperCase()}</strong><span>{destinationLabel(item)}</span></td>
              <td><strong className="date-value">{date(item.requested_at)}</strong></td>
              <td><span className={`withdrawal-status ${itemStatus}`}>{label(itemStatus)}</span></td>
              <td><strong>{item.transfer_reference || '—'}</strong><span>{item.processed_at ? `Processed ${date(item.processed_at)}` : 'Not processed'}</span></td>
              <td><button className={`inspect-btn ${itemStatus === 'pending' ? 'review' : ''}`} type="button" onClick={() => openRequest(item)}>{itemStatus === 'pending' ? 'Review & transfer' : 'View details'}</button></td>
            </tr>
          })}</tbody>
        </table>
        {pagination.pages > 1 && <div className="admin-withdrawals-pagination">
          <button type="button" disabled={loading || page <= 1} onClick={() => load(false, page - 1)}>← Previous</button>
          <span>Page <b>{page}</b> of <b>{pagination.pages}</b> · {pagination.total} records</span>
          <button type="button" disabled={loading || page >= pagination.pages} onClick={() => load(false, page + 1)}>Next →</button>
        </div>}
      </div>}
    </section>

    {selected && <div className="admin-withdrawal-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeRequest() }}>
      <section className="admin-withdrawal-modal" role="dialog" aria-modal="true" aria-labelledby="withdrawal-modal-title">
        <header className="admin-withdrawal-modal-head">
          <div><span>INVESTOR WITHDRAWAL #{selected.id}</span><h2 id="withdrawal-modal-title">{selected.user_name || 'Investor'}</h2><p>{selected.user_email || '—'} · Requested {date(selected.requested_at)}</p></div>
          <button type="button" onClick={closeRequest} disabled={Boolean(busy)} aria-label="Close">×</button>
        </header>

        <div className="admin-withdrawal-modal-body">
          <div className="admin-withdrawal-summary-grid">
            <article className="amount"><span>REQUESTED</span><strong>{money(selected.amount)}</strong><small>Ledger-eligible earnings</small></article>
            <article><span>WITHDRAWAL TYPE</span><strong>{selected.withdrawal_type === 'FINAL_EXIT' ? 'Final exit' : 'Partial'}</strong><small>{selected.cycle_id ? `Cycle #${selected.cycle_id}` : 'No cycle recorded'}</small></article>
            <article><span>STATUS</span><strong className={`summary-status ${selectedStatus}`}>{label(selectedStatus)}</strong><small>{selected.processed_at ? date(selected.processed_at) : 'Awaiting admin action'}</small></article>
          </div>

          <section className="withdrawal-destination-card">
            <div className="destination-icon">{snapshot?.method === 'upi' ? 'UPI' : '▣'}</div>
            <div className="destination-main">
              <span>SAVED PAYOUT DESTINATION</span>
              <strong>{snapshot?.method === 'upi' ? (snapshot.upi_id || 'UPI account') : (snapshot?.bank_name || snapshot?.account_holder_name || 'Bank account')}</strong>
              <small>{snapshot?.method === 'upi'
                ? 'Transfer to the saved UPI ID'
                : [snapshot?.account_holder_name, snapshot?.account_number, snapshot?.ifsc_code].filter(Boolean).join(' · ') || 'Account details unavailable'}</small>
            </div>
          </section>

          <div className="admin-withdrawal-detail-grid">
            <article><span>METHOD</span><strong>{String(selected.payout_method || snapshot?.method || '—').toUpperCase()}</strong></article>
            <article><span>ACCOUNT</span><strong>{snapshot?.method === 'upi' ? snapshot.upi_id || '—' : snapshot?.account_number ? `••••${String(snapshot.account_number).slice(-4)}` : '—'}</strong></article>
            <article><span>HOLDER</span><strong>{snapshot?.account_holder_name || (snapshot?.method === 'upi' ? 'UPI account' : '—')}</strong></article>
            <article><span>IFSC / BANK</span><strong>{snapshot?.ifsc_code || snapshot?.bank_name || (snapshot?.method === 'upi' ? 'UPI' : '—')}</strong></article>
          </div>

          {selectedStatus === 'pending' ? <div className="admin-withdrawal-form">
            <div className="withdrawal-form-heading"><span>TRANSFER CONFIRMATION</span><h3>Record completed payment</h3><p>Enter details only after the actual bank/UPI transfer has succeeded.</p></div>

            <label>Transfer reference / UTR
              <input value={reference} onChange={event => setReference(event.target.value)} placeholder="Enter bank/UPI transaction reference" />
            </label>

            <label>Transfer proof screenshot
              <div className="withdrawal-proof-upload" tabIndex="0" onPaste={handleProofPaste}>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProofInput} aria-label="Upload transfer proof screenshot" />
                <div className="proof-upload-icon">↑</div>
                <div><strong>{proofName || (proofData ? 'Screenshot selected' : 'Upload payment screenshot')}</strong><span>PNG, JPG or WebP · max 6 MB · paste also supported</span></div>
                <b>Choose file</b>
              </div>
              {proofData && <div className="withdrawal-proof-selected"><img src={proofData} alt="Selected transfer proof preview" /><div><strong>Proof ready</strong><span>{proofName || 'Payment screenshot'}</span></div></div>}
            </label>

            <label>Admin notes <em>optional</em>
              <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Add a finance processing note" rows="3" />
            </label>

            <div className="admin-withdrawal-warning"><i>!</i><span><b>Payment safety:</b> marking this request paid permanently settles the reservation. The backend re-checks the current ledger and rejects duplicate transfer references.</span></div>
          </div> : <div className="admin-withdrawal-processed">
            <div className="processed-icon">{selectedStatus === 'paid' ? '✓' : '↩'}</div>
            <div><strong>This request is already {selectedStatus}.</strong><span>{selected.transfer_reference ? `Transfer reference: ${selected.transfer_reference}` : 'No transfer reference recorded.'}</span><span>{selected.processed_at ? `Processed: ${date(selected.processed_at)}` : ''}</span>{selected.notes && <span>Note: {selected.notes}</span>}{existingProofUrl && <a className="withdrawal-proof-link" href={existingProofUrl} target="_blank" rel="noreferrer">View transfer proof ↗</a>}</div>
          </div>}
        </div>

        <footer className="admin-withdrawal-modal-foot">
          <button className="secondary" type="button" onClick={closeRequest} disabled={Boolean(busy)}>Close</button>
          {selectedStatus === 'pending' && <>
            <button className="reject" type="button" onClick={() => processRequest('reject')} disabled={Boolean(busy)}>{busy === 'reject' ? 'Rejecting…' : 'Reject & release'}</button>
            <button className="pay" type="button" onClick={() => processRequest('paid')} disabled={Boolean(busy)}>{busy === 'paid' ? 'Processing…' : 'Confirm transfer paid'}</button>
          </>}
        </footer>
      </section>
    </div>}
  </main>
}
