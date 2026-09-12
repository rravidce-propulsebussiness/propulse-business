import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../utils/api'
import { clearSession, getToken } from '../../utils/auth'
import './AdminInvestmentAdAllocations.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function AdminInvestmentAdAllocations() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [spendModal, setSpendModal] = useState(null)
  const [spendData, setSpendData] = useState(null)
  const [spendLoading, setSpendLoading] = useState(false)
  const [spendAmount, setSpendAmount] = useState('')
  const [platform, setPlatform] = useState('')
  const [campaign, setCampaign] = useState('')
  const [spendDate, setSpendDate] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const request = async (path, options = {}) => {
    if (!getToken()) {
      clearSession()
      navigate('/login', { replace: true })
      throw new Error('Admin session expired')
    }
    return apiRequest(path, options)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await request('/admin/commercial/investment-dashboard?search=&status=all&industryId=')
      const rows = result?.items || []
      setItems(rows)
      setDrafts(Object.fromEntries(rows.map(item => [item.id, String(Number(item.amount_in_ads || 0))])))
    } catch (e) {
      setError(e.message || 'Unable to load investment cycles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totals = useMemo(() => items.reduce((out, item) => {
    if (String(item.status).toLowerCase() === 'cancelled') return out
    out.invested += Number(item.amount || 0)
    out.allocated += Number(item.amount_in_ads || 0)
    out.spent += Number(item.ad_spent || 0)
    out.remaining += Number(item.ad_remaining || 0)
    return out
  }, { invested: 0, allocated: 0, spent: 0, remaining: 0 }), [items])

  const save = async item => {
    const value = Number(drafts[item.id])
    if (!Number.isFinite(value) || value < 0) return setError('Amount in ads must be zero or greater.')
    if (value > Number(item.amount)) return setError(`Ad allocation cannot exceed ${money(item.amount)} for cycle #${item.id}.`)
    if (value < Number(item.ad_spent || 0)) return setError(`Ad allocation cannot be lower than already spent amount ${money(item.ad_spent)}.`)
    setBusy(x => ({ ...x, [`save-${item.id}`]: true }))
    setError(''); setMessage('')
    try {
      const result = await request(`/investments/admin/${item.id}/ad-amount`, { method: 'PUT', body: JSON.stringify({ amount: value }) })
      setItems(rows => rows.map(x => x.id === item.id ? { ...x, amount_in_ads: Number(result.amount_in_ads || value), ad_remaining: Math.max(0, value - Number(x.ad_spent || 0)), ad_spend_status: result.ad_spend_status || x.ad_spend_status } : x))
      setMessage(`Cycle #${item.id}: ad budget allocated at ${money(value)}.`)
    } catch (e) {
      setError(e.message || 'Unable to update ad allocation')
    } finally {
      setBusy(x => ({ ...x, [`save-${item.id}`]: false }))
    }
  }

  const openSpend = async item => {
    setSpendModal(item)
    setSpendData(null)
    setSpendAmount('')
    setPlatform(''); setCampaign(''); setSpendDate(''); setReference(''); setNotes('')
    setSpendLoading(true); setError('')
    try {
      const data = await request(`/investments/admin/${item.id}/ad-spend`)
      setSpendData(data)
    } catch (e) {
      setError(e.message || 'Unable to load ad spending')
      setSpendModal(null)
    } finally {
      setSpendLoading(false)
    }
  }

  const closeSpend = () => {
    setSpendModal(null); setSpendData(null)
    setSpendAmount(''); setPlatform(''); setCampaign(''); setSpendDate(''); setReference(''); setNotes('')
  }

  const recordSpend = async () => {
    if (!spendModal) return
    const amount = Number(spendAmount)
    const remaining = Number(spendData?.investment?.ad_remaining || 0)
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter a valid ad spend amount greater than zero.')
    if (amount > remaining) return setError(`Spend cannot exceed the remaining ad budget of ${money(remaining)}.`)
    setBusy(x => ({ ...x, [`spend-${spendModal.id}`]: true }))
    setError(''); setMessage('')
    try {
      const result = await request(`/investments/admin/${spendModal.id}/ad-spend`, {
        method: 'POST',
        body: JSON.stringify({ amount, platform, campaign, spendDate: spendDate || undefined, reference, notes })
      })
      const fresh = await request(`/investments/admin/${spendModal.id}/ad-spend`)
      setSpendData(fresh)
      setItems(rows => rows.map(x => x.id === spendModal.id ? { ...x, ad_spent: result.ad_spent, ad_remaining: result.ad_remaining, ad_spend_status: result.ad_spend_status } : x))
      setSpendAmount(''); setPlatform(''); setCampaign(''); setSpendDate(''); setReference(''); setNotes('')
      setMessage(`Cycle #${spendModal.id}: ${money(amount)} recorded as ad spend.`)
    } catch (e) {
      setError(e.message || 'Unable to record ad spend')
    } finally {
      setBusy(x => ({ ...x, [`spend-${spendModal.id}`]: false }))
    }
  }

  return (
    <main className="admin-ad-allocation-page">
      <header>
        <div>
          <span className="admin-ad-kicker">INVESTOR OPERATIONS</span>
          <h1>Investment Ad Allocations</h1>
          <p>Allocate investor capital to advertising, then record the real advertising spend against that reserved budget. The system never lets recorded spend exceed the allocation.</p>
        </div>
        <button type="button" onClick={load}>↻ Refresh</button>
      </header>

      {error && <div className="admin-ad-error">{error}</div>}
      {message && <div className="admin-ad-message">{message}</div>}

      <section className="admin-ad-summary">
        <article><span>TOTAL INVESTED</span><strong>{money(totals.invested)}</strong></article>
        <article><span>AD BUDGET ALLOCATED</span><strong>{money(totals.allocated)}</strong></article>
        <article><span>SPENT ON ADS</span><strong>{money(totals.spent)}</strong></article>
        <article><span>AD BUDGET REMAINING</span><strong>{money(totals.remaining)}</strong></article>
      </section>

      <section className="admin-ad-panel">
        {loading ? <div className="admin-ad-empty">Loading investment cycles…</div> : !items.length ? <div className="admin-ad-empty">No investment cycles found.</div> : (
          <div className="admin-ad-table-wrap">
            <table>
              <thead><tr><th>Investor</th><th>Cycle</th><th>Investment</th><th>Ad budget</th><th>Spent on ads</th><th>Remaining</th><th>Ad status</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(item => {
                  const invested = Number(item.amount || 0)
                  const allocated = Number(item.amount_in_ads || 0)
                  const spent = Number(item.ad_spent || 0)
                  const remaining = Math.max(0, Number(item.ad_remaining ?? allocated - spent))
                  const cancelled = String(item.status).toLowerCase() === 'cancelled'
                  const saving = Boolean(busy[`save-${item.id}`])
                  const spending = Boolean(busy[`spend-${item.id}`])
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.user_name || item.investor_name || 'Investor'}</strong><small>{item.user_email || ''}</small></td>
                      <td><b>#{item.id}</b><small>{item.industry_name || 'Investment'} - {item.city_name || item.state_name || 'Location not set'}</small><small>{date(item.created_at)}</small></td>
                      <td><b>{money(invested)}</b></td>
                      <td>
                        <div className="admin-ad-input-wrap"><span>₹</span><input type="number" min="0" max={invested} step="0.01" value={drafts[item.id] ?? String(allocated)} disabled={cancelled || saving} onChange={e => setDrafts(x => ({ ...x, [item.id]: e.target.value }))}/></div>
                        <small>Reserved for ads</small>
                        <button type="button" className="admin-ad-save-button" disabled={cancelled || saving} onClick={() => save(item)}>{saving ? 'Saving…' : 'Save allocation'}</button>
                      </td>
                      <td><strong>{money(spent)}</strong><small>{allocated > 0 ? `${Math.min(100, (spent / allocated) * 100).toFixed(0)}% used` : 'No allocation'}</small></td>
                      <td><strong className={remaining === 0 && allocated > 0 ? 'admin-ad-zero' : ''}>{money(remaining)}</strong><small>{remaining === 0 && allocated > 0 ? 'Budget fully spent' : 'Available to spend'}</small></td>
                      <td><span className={`admin-ad-status ${item.ad_spend_status || 'allocated'}`}>{item.ad_spend_status === 'spending' ? 'Spending' : item.ad_spend_status === 'spent' ? 'Spent' : 'Allocated'}</span><small>Investment: {item.status}</small></td>
                      <td><button type="button" className="admin-ad-spend-button" disabled={cancelled || allocated <= 0 || remaining <= 0 || spending} onClick={() => openSpend(item)}>{spending ? 'Working…' : remaining <= 0 && allocated > 0 ? 'Fully spent' : 'Record ad spend'}</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {spendModal && (
        <div className="admin-ad-overlay" onMouseDown={e => e.target === e.currentTarget && closeSpend()}>
          <section className="admin-ad-modal" onMouseDown={e => e.stopPropagation()}>
            <button type="button" className="admin-ad-close" onClick={closeSpend}>×</button>
            <span className="admin-ad-kicker">AD SPENDING LEDGER</span>
            <h2>Cycle #{spendModal.id} advertising</h2>
            <p>{spendModal.user_name || 'Investor'} · {spendModal.industry_name || 'Investment'} · {spendModal.city_name || spendModal.state_name || 'Location not set'}</p>

            {spendLoading ? <div className="admin-ad-empty">Loading spend history…</div> : spendData && <>
              <div className="admin-ad-modal-stats">
                <div><span>ALLOCATED</span><strong>{money(spendData.investment.amount_in_ads)}</strong></div>
                <div><span>SPENT</span><strong>{money(spendData.investment.ad_spent)}</strong></div>
                <div><span>REMAINING</span><strong>{money(spendData.investment.ad_remaining)}</strong></div>
              </div>

              {Number(spendData.investment.ad_remaining) > 0 ? <div className="admin-ad-spend-form">
                <h3>Record money spent on ads</h3>
                <div className="admin-ad-form-grid">
                  <label>Spend amount<input type="number" min="0.01" max={spendData.investment.ad_remaining} step="0.01" value={spendAmount} onChange={e => setSpendAmount(e.target.value)} placeholder="0.00"/></label>
                  <label>Platform<input value={platform} onChange={e => setPlatform(e.target.value)} placeholder="Meta, Google, etc."/></label>
                  <label>Campaign<input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="Campaign name"/></label>
                  <label>Spend date<input type="datetime-local" value={spendDate} onChange={e => setSpendDate(e.target.value)}/></label>
                  <label>Reference<input value={reference} onChange={e => setReference(e.target.value)} placeholder="Invoice / transaction reference"/></label>
                  <label>Notes<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes"/></label>
                </div>
                <button type="button" className="admin-ad-confirm" disabled={busy[`spend-${spendModal.id}`]} onClick={recordSpend}>{busy[`spend-${spendModal.id}`] ? 'Recording…' : 'Record spend'}</button>
              </div> : <div className="admin-ad-spent-banner"><strong>Advertising budget fully spent</strong><span>The allocated ad budget has been completely consumed. This cycle is marked <b>Spent</b>.</span></div>}

              <div className="admin-ad-history"><h3>Spend history</h3>{!spendData.spends.length ? <div className="admin-ad-empty">No ad spend recorded yet.</div> : <div className="admin-ad-history-list">{spendData.spends.map(spend => <article key={spend.id}><div><strong>{money(spend.amount)}</strong><span>{dateTime(spend.spend_date)}</span></div><div><b>{spend.platform || 'Advertising'}</b><span>{spend.campaign || 'No campaign name'}</span></div><div><span>{spend.reference || 'No reference'}</span><small>{spend.notes || ''}</small></div></article>)}</div>}</div>
            </>}
          </section>
        </div>
      )}
    </main>
  )
}
