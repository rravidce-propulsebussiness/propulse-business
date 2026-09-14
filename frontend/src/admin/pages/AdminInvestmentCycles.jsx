import { useEffect, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { clearSession, getToken } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminInvestmentCycles.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function AdminInvestmentCycles() {
  const navigate = useNavigate()
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function request(path, options = {}) {
    if (!getToken()) {
      clearSession()
      navigate('/login', { replace: true })
      throw new Error('Your admin session has expired. Please sign in again.')
    }
    return apiRequest(path, options)
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await request('/investments/admin/cycles')
      setCycles(Array.isArray(data) ? data : (Array.isArray(data?.cycles) ? data.cycles : []))
    } catch (e) {
      setError(e.message || 'Unable to load investment cycles.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openFinish(cycle) {
    setSelected(cycle)
    setReason('')
    setError('')
  }

  async function finishCycle() {
    if (!selected || busy) return
    const trimmed = reason.trim()
    if (!trimmed) { setError('A reason is required before finishing a cycle.'); return }
    if (!window.confirm(`Finish cycle #${selected.id}? Unresolved leads in this cycle will be marked ADMIN_CLOSED. This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      await request(`/investments/admin/cycles/${selected.id}/finish`, {
        method: 'POST',
        body: JSON.stringify({ reason: trimmed }),
      })
      setSelected(null)
      await load()
    } catch (e) {
      setError(e.message || 'Unable to finish the investment cycle.')
    } finally { setBusy(false) }
  }

  async function closeCycle(cycle) {
    if (busy) return
    if (Number(cycle.pending_leads ?? 0) !== 0) {
      setError('This cycle still has unresolved leads and cannot be normally closed.')
      return
    }
    if (!window.confirm(`Close cycle #${cycle.id}? This is the normal lifecycle closure and will not modify lead records.`)) return
    setBusy(true)
    setError('')
    try {
      await request(`/investments/admin/cycles/${cycle.id}/close`, { method: 'POST' })
      await load()
    } catch (e) {
      setError(e.message || 'Unable to close the investment cycle.')
    } finally { setBusy(false) }
  }

  return <section className="admin-cycles-page">
    <div className="admin-cycles-header">
      <div><span className="admin-cycles-kicker">INVESTMENT OPERATIONS</span><h1>Investment Cycles</h1><p>Monitor investor cycles and close completed or manually resolved cycles without deleting their associated leads.</p></div>
      <button className="admin-cycles-refresh" onClick={load} disabled={loading || busy}>↻ Refresh</button>
    </div>

    {error && <div className="admin-cycles-alert">{error}</div>}

    <div className="admin-cycles-table-wrap">
      {loading ? <div className="admin-cycles-empty">Loading investment cycles…</div> : cycles.length === 0 ? <div className="admin-cycles-empty"><strong>No investment cycles found</strong><span>Cycles will appear here after the cycle migration is active.</span></div> : <table className="admin-cycles-table">
        <thead><tr><th>Cycle</th><th>Investor</th><th>Mode</th><th>Principal</th><th>Leads</th><th>Started</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{cycles.map(cycle => {
          const finalLeads = Number(cycle.final_leads ?? cycle.finalLeadCount ?? 0)
          const pendingLeads = Number(cycle.pending_leads ?? cycle.pendingLeadCount ?? 0)
          const totalLeads = Number(cycle.lead_count ?? cycle.total_leads ?? finalLeads + pendingLeads)
          const closed = String(cycle.status || '').toUpperCase() === 'CLOSED'
          const matured = !cycle.maturity_at || new Date(cycle.maturity_at) <= new Date()
          const autoInvest = Boolean(cycle.auto_invest)
          const canClose = !closed && pendingLeads === 0 && ((autoInvest && String(cycle.status || '').toUpperCase() === 'EXIT_REQUESTED') || (!autoInvest && matured))
          return <tr key={cycle.id}>
            <td><strong>#{cycle.id}</strong><span>{cycle.withdrawal_count != null ? `${cycle.withdrawal_count} withdrawals` : 'Investment cycle'}</span></td>
            <td><strong>{cycle.user_name || cycle.name || 'Investor'}</strong><span>{cycle.user_email || cycle.email || `User #${cycle.user_id}`}</span></td>
            <td><span className={`cycle-mode ${autoInvest ? 'auto' : 'manual'}`}>{autoInvest ? 'AUTO-INVEST' : 'NON-AUTO'}</span></td>
            <td><strong>{money(cycle.principal ?? cycle.total_principal ?? cycle.total_invested)}</strong><span>{cycle.investment_count != null ? `${cycle.investment_count} investments` : ''}</span></td>
            <td><strong>{totalLeads}</strong><span>{finalLeads} final · {pendingLeads} pending</span></td>
            <td>{date(cycle.started_at)}</td>
            <td><span className={`cycle-status ${String(cycle.status || '').toLowerCase()}`}>{cycle.status || '—'}</span></td>
            <td className="admin-cycle-actions">
              {canClose && <button className="close-cycle-btn" onClick={() => closeCycle(cycle)} disabled={busy}>Close Cycle</button>}
              {!closed && <button className="finish-cycle-btn" onClick={() => openFinish(cycle)} disabled={busy}>Mark as Finished</button>}
            </td>
          </tr>
        })}</tbody>
      </table>}
    </div>

    {selected && <div className="admin-cycle-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setSelected(null) }}>
      <div className="admin-cycle-modal" role="dialog" aria-modal="true" aria-labelledby="finish-cycle-title">
        <div className="admin-cycle-modal-head"><div><span>CYCLE #{selected.id}</span><h2 id="finish-cycle-title">Mark cycle as finished</h2><p>{selected.user_name || selected.name || 'Investor'} · {selected.user_email || selected.email || `User #${selected.user_id}`}</p></div><button onClick={() => setSelected(null)} disabled={busy} aria-label="Close">×</button></div>
        <div className="admin-cycle-warning"><strong>This is an administrative closure.</strong><span>Any unresolved leads associated with this cycle will be marked <b>ADMIN_CLOSED</b>. Existing final leads remain unchanged, and no lead data is deleted.</span></div>
        <label>Reason for manual closure<textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Example: Testing cycle completion" rows="4" autoFocus /></label>
        <div className="admin-cycle-modal-foot"><button className="secondary" onClick={() => setSelected(null)} disabled={busy}>Cancel</button><button className="finish-confirm" onClick={finishCycle} disabled={busy || !reason.trim()}>{busy ? 'Finishing…' : 'Confirm & Finish Cycle'}</button></div>
      </div>
    </div>}
  </section>
}
