import { useEffect, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { getToken, clearSession } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function InvestmentCycleControls() {
  const navigate = useNavigate()
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const request = async (path, options = {}) => {
    if (!getToken()) {
      clearSession()
      navigate('/login', { replace: true })
      throw new Error('Your admin session has expired. Please sign in again.')
    }
    return apiRequest(path, options)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await request('/investments/admin/cycles')
      setCycles(Array.isArray(data) ? data : (Array.isArray(data?.cycles) ? data.cycles : []))
    } catch (e) {
      setError(e.message || 'Unable to load investment cycle status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const closeCycle = async cycle => {
    if (busyId || String(cycle.status).toUpperCase() === 'CLOSED') return
    if (!window.confirm(`Close cycle #${cycle.id} for ${cycle.user_name || cycle.user_email || 'this investor'}? Unresolved leads will remain unchanged. The cycle will stop accepting new activity.`)) return
    setBusyId(cycle.id)
    setError('')
    try {
      await request(`/investments/admin/cycles/${cycle.id}/close`, { method: 'POST' })
      await load()
    } catch (e) {
      setError(e.message || 'Unable to close the investment cycle.')
    } finally {
      setBusyId(null)
    }
  }

  const finishCycle = async cycle => {
    if (busyId || String(cycle.status).toUpperCase() === 'CLOSED') return
    const reason = window.prompt('Reason for administrative finish:')
    if (!reason?.trim()) return
    setBusyId(cycle.id)
    setError('')
    try {
      await request(`/investments/admin/cycles/${cycle.id}/finish`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      })
      await load()
    } catch (e) {
      setError(e.message || 'Unable to finish the investment cycle.')
    } finally {
      setBusyId(null)
    }
  }

  return <section style={{ margin: '0 0 20px', border: '1px solid #dce7f1', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
    <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid #e5edf5' }}>
      <div><h2 style={{ margin: 0, color: '#123d7b', fontSize: 15, fontWeight: 850 }}>Investment Cycle Management</h2><p style={{ margin: '4px 0 0', color: '#7a8da5', fontSize: 10 }}>Cycle status and manual closure are now managed directly inside Investments.</p></div>
      <button onClick={load} disabled={loading || Boolean(busyId)} style={{ border: '1px solid #d6e3ef', borderRadius: 8, background: '#fff', color: '#17457f', padding: '9px 13px', fontWeight: 800, cursor: 'pointer' }}>↻ Refresh</button>
    </div>
    {error && <div style={{ margin: 12, padding: '10px 12px', borderRadius: 8, background: '#fff1ed', color: '#b9432c', fontSize: 10 }}>{error}</div>}
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 10 }}>
        <thead><tr style={{ background: '#f4f8fc', color: '#7388a3', textAlign: 'left' }}><th style={{ padding: '10px 14px' }}>Cycle</th><th style={{ padding: '10px 14px' }}>Investor</th><th style={{ padding: '10px 14px' }}>Mode</th><th style={{ padding: '10px 14px' }}>Principal</th><th style={{ padding: '10px 14px' }}>Leads</th><th style={{ padding: '10px 14px' }}>Status</th><th style={{ padding: '10px 14px' }}>Actions</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan="7" style={{ padding: 24, textAlign: 'center', color: '#8497ae' }}>Loading cycle status…</td></tr> : cycles.length === 0 ? <tr><td colSpan="7" style={{ padding: 24, textAlign: 'center', color: '#8497ae' }}>No investment cycles found.</td></tr> : cycles.map(cycle => {
          const closed = String(cycle.status || '').toUpperCase() === 'CLOSED'
          const pending = Number(cycle.pending_leads || 0)
          return <tr key={cycle.id} style={{ borderTop: '1px solid #e8eef4' }}>
            <td style={{ padding: '11px 14px' }}><strong>#{cycle.id}</strong></td>
            <td style={{ padding: '11px 14px' }}><strong style={{ display: 'block', color: '#173f78' }}>{cycle.user_name || 'Investor'}</strong><small style={{ color: '#8a9bb0' }}>{cycle.user_email || `User #${cycle.user_id}`}</small></td>
            <td style={{ padding: '11px 14px' }}>{cycle.auto_invest ? 'AUTO-INVEST' : 'NON-AUTO'}</td>
            <td style={{ padding: '11px 14px', fontWeight: 850 }}>{money(cycle.principal)}</td>
            <td style={{ padding: '11px 14px' }}><strong>{Number(cycle.total_leads || 0)}</strong><small style={{ display: 'block', color: '#8a9bb0' }}>{Number(cycle.final_leads || 0)} final · {pending} pending</small></td>
            <td style={{ padding: '11px 14px' }}><span style={{ display: 'inline-block', padding: '6px 9px', borderRadius: 999, background: closed ? '#edf1f5' : '#e9f7ef', color: closed ? '#65778c' : '#16804d', fontWeight: 850 }}>{cycle.status || '—'}</span></td>
            <td style={{ padding: '11px 14px' }}>{closed ? <span style={{ color: '#8497ae' }}>Closed</span> : <div style={{ display: 'flex', gap: 7 }}><button onClick={() => closeCycle(cycle)} disabled={Boolean(busyId)} style={{ border: 0, borderRadius: 7, background: '#174f91', color: '#fff', padding: '8px 10px', fontWeight: 800, cursor: 'pointer' }}>{busyId === cycle.id ? 'Closing…' : 'Close Cycle'}</button><button onClick={() => finishCycle(cycle)} disabled={Boolean(busyId)} style={{ border: '1px solid #d9e3ed', borderRadius: 7, background: '#fff', color: '#526b85', padding: '8px 10px', fontWeight: 800, cursor: 'pointer' }}>Finish</button></div>}</td>
          </tr>
        })}</tbody>
      </table>
    </div>
  </section>
}
