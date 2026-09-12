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
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [allocateModal, setAllocateModal] = useState(null)
  const [allocateAmount, setAllocateAmount] = useState('')
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
      setItems((result?.items || []).filter(item => String(item.status).toLowerCase() !== 'cancelled'))
    } catch (e) {
      setError(e.message || 'Unable to load investment cycles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totals = useMemo(() => items.reduce((out, item) => {
    out.invested += Number(item.amount || 0)
    out.available += Number(item.funds_available_for_ads || 0)
    out.allocated += Number(item.current_ad_allocation || item.amount_in_ads || 0)
    out.spent += Number(item.ad_spent || 0)
    return out
  }, { invested: 0, available: 0, allocated: 0, spent: 0 }), [items])

  const openAllocate = item => {
    setError('')
    setMessage('')
    setAllocateModal(item)
    setAllocateAmount('')
  }

  const closeAllocate = () => {
    setAllocateModal(null)
    setAllocateAmount('')
  }

  const saveAllocation = async () => {
    if (!allocateModal) return
    const amount = Number(allocateAmount)
    const available = Number(allocateModal.funds_available_for_ads || 0)
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an allocation amount greater than zero.')
    if (amount > available) return setError(`Maximum available for this cycle is ${money(available)}.`)
    setBusy(x => ({ ...x, [`allocate-${allocateModal.id}`]: true }))
    setError('')
    setMessage('')
    try {
      await request(`/investments/admin/${allocateModal.id}/ad-amount`, {
        method: 'PUT',
        body: JSON.stringify({ amount })
      })
      closeAllocate()
      setMessage(`₹${amount.toLocaleString('en-IN')} allocated for ads in cycle #${allocateModal.id}.`)
      await load()
    } catch (e) {
      setError(e.message || 'Unable to allocate advertising funds')
    } finally {
      setBusy(x => ({ ...x, [`allocate-${allocateModal.id}`]: false }))
    }
  }

  const openSpend = async item => {
    setSpendModal(item)
    setSpendData(null)
    setSpendAmount('')
    setPlatform('')
    setCampaign('')
    setSpendDate('')
    setReference('')
    setNotes('')
    setSpendLoading(true)
    setError('')
    try {
      setSpendData(await request(`/investments/admin/${item.id}/ad-spend`))
    } catch (e) {
      setError(e.message || 'Unable to load advertising details')
      setSpendModal(null)
    } finally {
      setSpendLoading(false)
    }
  }

  const closeSpend = () => {
    setSpendModal(null)
    setSpendData(null)
    setSpendAmount('')
    setPlatform('')
    setCampaign('')
    setSpendDate('')
    setReference('')
    setNotes('')
  }

  const recordSpend = async () => {
    if (!spendModal || !spendData) return
    const amount = Number(spendAmount)
    const remaining = Number(spendData.investment?.ad_remaining || 0)
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter a spend amount greater than zero.')
    if (amount > remaining) return setError(`Maximum spend for this run is ${money(remaining)}.`)
    setBusy(x => ({ ...x, [`spend-${spendModal.id}`]: true }))
    setError('')
    setMessage('')
    try {
      await request(`/investments/admin/${spendModal.id}/ad-spend`, {
        method: 'POST',
        body: JSON.stringify({ amount, platform, campaign, spendDate: spendDate || undefined, reference, notes })
      })
      const fresh = await request(`/investments/admin/${spendModal.id}/ad-spend`)
      setSpendData(fresh)
      setSpendAmount('')
      setPlatform('')
      setCampaign('')
      setSpendDate('')
      setReference('')
      setNotes('')
      setMessage(`₹${amount.toLocaleString('en-IN')} recorded as ad spend for cycle #${spendModal.id}.`)
      await load()
    } catch (e) {
      setError(e.message || 'Unable to record ad spend')
    } finally {
      setBusy(x => ({ ...x, [`spend-${spendModal.id}`]: false }))
    }
  }

  const getAllocationState = item => {
    const allocated = Number(item.current_ad_allocation ?? item.amount_in_ads ?? 0)
    const spent = Number(item.current_ad_spent || 0)
    const remaining = Math.max(0, Number(item.ad_remaining ?? allocated - spent))
    if (allocated > 0 && remaining <= 0) return 'spent'
    if (allocated > 0 && spent > 0) return 'spending'
    if (allocated > 0) return 'allocated'
    return 'ready'
  }

  return (
    <main className="admin-ad-allocation-page">
      <header className="admin-ad-page-header">
        <h1>Ad Allocations</h1>
      </header>

      {error && <div className="admin-ad-error">{error}</div>}
      {message && <div className="admin-ad-message">{message}</div>}

      <section className="admin-ad-summary">
        <article><span>Total Invested</span><strong>{money(totals.invested)}</strong></article>
        <article><span>Allocated for Ads</span><strong>{money(totals.allocated)}</strong></article>
        <article><span>Spent on Ads</span><strong>{money(totals.spent)}</strong></article>
        <article><span>Available for Ads</span><strong>{money(totals.available)}</strong></article>
      </section>

      <section className="admin-ad-panel">
        {loading ? <div className="admin-ad-empty">Loading…</div> : !items.length ? <div className="admin-ad-empty">No active investment cycles.</div> : (
          <div className="admin-ad-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Cycle</th>
                  <th>Investment</th>
                  <th>Available for Ads</th>
                  <th>Current Ad Allocation</th>
                  <th>Spent on Ads</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const invested = Number(item.amount || 0)
                  const available = Number(item.funds_available_for_ads || 0)
                  const allocated = Number(item.current_ad_allocation ?? item.amount_in_ads ?? 0)
                  const spent = Number(item.current_ad_spent || 0)
                  const remaining = Math.max(0, Number(item.ad_remaining ?? allocated - spent))
                  const state = getAllocationState(item)
                  const allocating = Boolean(busy[`allocate-${item.id}`])
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.user_name || 'Investor'}</strong><small>{item.user_email || ''}</small></td>
                      <td><b>#{item.id}</b><small>{item.industry_name || 'Investment'}{item.city_name ? ` · ${item.city_name}` : item.state_name ? ` · ${item.state_name}` : ''}</small><small>{date(item.created_at)}</small></td>
                      <td><strong>{money(invested)}</strong></td>
                      <td><strong>{money(available)}</strong><small>{available > 0 ? 'Ready to allocate' : 'No funds available'}</small></td>
                      <td>
                        <strong>{money(allocated)}</strong>
                        {allocated > 0 && <div className="admin-ad-progress"><span style={{ width: `${Math.min(100, (spent / allocated) * 100)}%` }} /></div>}
                        <small>{allocated > 0 ? `${Math.round(Math.min(100, (spent / allocated) * 100))}% used · ${money(remaining)} remaining`.replace('$', '') : 'No active ad run'}</small>
                      </td>
                      <td><strong>{money(spent)}</strong><small>{item.ad_spent && Number(item.ad_spent) !== spent ? `${money(item.ad_spent)} total history` : 'Current run'}</small></td>
                      <td><span className={`admin-ad-status ${state}`}>{state === 'spending' ? 'Spending' : state === 'spent' ? 'Spent' : state === 'allocated' ? 'Allocated' : 'Ready'}</span></td>
                      <td>
                        <div className="admin-ad-actions">
                          {available > 0 && state !== 'allocated' && state !== 'spending' ? <button type="button" className="admin-ad-primary" disabled={allocating} onClick={() => openAllocate(item)}>{allocating ? 'Allocating…' : 'Allocate'}</button> : null}
                          {available > 0 && state === 'spent' ? <button type="button" className="admin-ad-primary" disabled={allocating} onClick={() => openAllocate(item)}>{allocating ? 'Allocating…' : 'Allocate Next'}</button> : null}
                          {remaining > 0 ? <button type="button" className="admin-ad-secondary" onClick={() => openSpend(item)}>Add Spend</button> : null}
                          {allocated > 0 ? <button type="button" className="admin-ad-link" onClick={() => openSpend(item)}>View</button> : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {allocateModal && (
        <div className="admin-ad-overlay" onMouseDown={e => e.target === e.currentTarget && closeAllocate()}>
          <section className="admin-ad-modal admin-ad-allocate-modal" onMouseDown={e => e.stopPropagation()}>
            <button type="button" className="admin-ad-close" onClick={closeAllocate}>×</button>
            <h2>Allocate for Ads</h2>
            <div className="admin-ad-investor-info"><div><span>Investor</span><strong>{allocateModal.user_name || 'Investor'}</strong></div><div><span>Cycle</span><strong>#{allocateModal.id} · {allocateModal.industry_name || 'Investment'}</strong></div></div>
            <div className="admin-ad-allocation-balance"><div><span>Total Investment</span><strong>{money(allocateModal.amount)}</strong></div><div><span>Available for Ads</span><strong>{money(allocateModal.funds_available_for_ads)}</strong></div></div>
            <label className="admin-ad-big-label">Amount<input autoFocus type="number" min="0.01" max={allocateModal.funds_available_for_ads} step="0.01" value={allocateAmount} onChange={e => setAllocateAmount(e.target.value)} placeholder="Enter amount"/><small>Maximum: {money(allocateModal.funds_available_for_ads)}</small></label>
            <div className="admin-ad-modal-buttons"><button type="button" className="admin-ad-secondary" onClick={closeAllocate}>Cancel</button><button type="button" className="admin-ad-primary" disabled={busy[`allocate-${allocateModal.id}`]} onClick={saveAllocation}>{busy[`allocate-${allocateModal.id}`] ? 'Allocating…' : 'Allocate'}</button></div>
          </section>
        </div>
      )}

      {spendModal && (
        <div className="admin-ad-overlay" onMouseDown={e => e.target === e.currentTarget && closeSpend()}>
          <section className="admin-ad-modal admin-ad-spend-modal" onMouseDown={e => e.stopPropagation()}>
            <button type="button" className="admin-ad-close" onClick={closeSpend}>×</button>
            <h2>Add Ad Spend</h2>
            <p className="admin-ad-modal-subtitle">{spendModal.user_name || 'Investor'} · Cycle #{spendModal.id} · {spendModal.industry_name || 'Investment'}</p>
            {spendLoading ? <div className="admin-ad-empty">Loading…</div> : spendData && <>
              <div className="admin-ad-spend-summary">
                <div><span>Allocation</span><strong>{money(spendData.investment.amount_in_ads)}</strong></div>
                <div><span>Already Spent</span><strong>{money(spendData.investment.current_ad_spent)}</strong></div>
                <div><span>Remaining</span><strong>{money(spendData.investment.ad_remaining)}</strong></div>
              </div>
              {Number(spendData.investment.ad_remaining) > 0 ? <div className="admin-ad-form-grid">
                <label>Amount<input autoFocus type="number" min="0.01" max={spendData.investment.ad_remaining} step="0.01" value={spendAmount} onChange={e => setSpendAmount(e.target.value)} placeholder="Enter amount"/><small>Maximum: {money(spendData.investment.ad_remaining)}</small></label>
                <label>Platform<select value={platform} onChange={e => setPlatform(e.target.value)}><option value="">Select platform</option><option>Meta Ads</option><option>Google Ads</option><option>Instagram Ads</option><option>Other</option></select></label>
                <label>Campaign Name<input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="e.g. Leads Campaign"/></label>
                <label>Spend Date<input type="datetime-local" value={spendDate} onChange={e => setSpendDate(e.target.value)}/></label>
                <label>Reference<input value={reference} onChange={e => setReference(e.target.value)} placeholder="Invoice / Transaction ID"/></label>
                <label>Notes<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes"/></label>
              </div> : <div className="admin-ad-spent-banner"><strong>This ad run is fully spent.</strong><span>Allocate the next amount from {money(spendData.investment.funds_available_for_ads)} available for ads.</span></div>}
              <div className="admin-ad-modal-buttons"><button type="button" className="admin-ad-secondary" onClick={closeSpend}>Cancel</button>{Number(spendData.investment.ad_remaining) > 0 && <button type="button" className="admin-ad-primary" disabled={busy[`spend-${spendModal.id}`]} onClick={recordSpend}>{busy[`spend-${spendModal.id}`] ? 'Saving…' : 'Save Spend'}</button>}</div>
              <div className="admin-ad-history"><h3>Allocation History</h3>{!spendData.allocations?.length ? <div className="admin-ad-empty">No allocation history.</div> : <div className="admin-ad-history-list">{spendData.allocations.map(allocation => <article key={allocation.id}><div><strong>{money(allocation.amount)}</strong><span>Allocation #{allocation.id}</span></div><div><span className={`admin-ad-status ${allocation.status}`}>{allocation.status === 'spending' ? 'Spending' : allocation.status === 'spent' ? 'Spent' : 'Allocated'}</span><span>Spent {money(allocation.spent)} · Remaining {money(allocation.remaining)}</span></div><div><small>{dateTime(allocation.created_at)}</small></div></article>)}</div>}</div>
              <div className="admin-ad-history"><h3>Ad Spend History</h3>{!spendData.spends?.length ? <div className="admin-ad-empty">No ad spend recorded.</div> : <div className="admin-ad-history-list">{spendData.spends.map(spend => <article key={spend.id}><div><strong>{money(spend.amount)}</strong><span>{dateTime(spend.spend_date)}</span></div><div><b>{spend.platform || 'Advertising'}</b><span>{spend.campaign || 'No campaign name'}</span></div><div><span>{spend.reference || 'No reference'}</span><small>{spend.notes || ''}</small></div></article>)}</div>}</div>
            </>}
          </section>
        </div>
      )}
    </main>
  )
}
