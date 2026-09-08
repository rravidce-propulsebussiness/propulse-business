import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { getToken, clearSession } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminInvestments.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function AdminInvestments() {
  const navigate = useNavigate()
  const [data, setData] = useState({ stats: {}, investors: [], items: [] })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [industryId, setIndustryId] = useState('')
  const [industries, setIndustries] = useState([])
  const [expanded, setExpanded] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const request = async (path, options = {}) => {
    if (!getToken()) {
      clearSession()
      navigate('/login', { replace: true })
      throw new Error('Your admin session has expired. Please sign in again.')
    }
    return apiRequest(path, options)
  }

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ search: search.trim(), status, industryId })
      const [dashboard, industryData] = await Promise.all([
        request(`/admin/commercial/investment-dashboard?${params}`),
        industries.length ? Promise.resolve(industries) : request('/industries'),
      ])
      setData({ stats: dashboard.stats || {}, investors: dashboard.investors || [], items: dashboard.items || [] })
      if (!industries.length) setIndustries(Array.isArray(industryData) ? industryData : industryData?.data || [])
    } catch (e) {
      if (!silent) setError(e.message || 'Unable to load investor analytics.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load() }, [status, industryId])
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 30000)
    return () => window.clearInterval(timer)
  }, [status, industryId, search])

  const investorCycles = useMemo(() => {
    const map = new Map()
    for (const row of data.items) {
      if (!map.has(row.user_id)) map.set(row.user_id, [])
      map.get(row.user_id).push(row)
    }
    return map
  }, [data.items])

  const payout = async investment => {
    if (busy) return
    if (Number(investment.payable_now) <= 0) return
    if (!window.confirm(`Pay ${money(investment.payable_now)} to ${investment.user_name || 'this investor'} through the investor wallet?`)) return
    setBusy(`payout-${investment.id}`)
    setError('')
    try {
      await request(`/investments/admin/${investment.id}/payout`, { method: 'POST' })
      await load()
    } catch (e) {
      setError(e.message || 'Unable to complete investor payout.')
    } finally {
      setBusy(null)
    }
  }

  const toggle = userId => setExpanded(value => ({ ...value, [userId]: !value[userId] }))
  const stats = data.stats || {}

  return <main className="admin-investments-page">
    <header className="admin-investments-head">
      <div>
        <span className="admin-investments-kicker">INVESTOR OPERATIONS</span>
        <h1>Investments</h1>
        <p>Track every investor, capital committed, lead sales, realized revenue and the amount currently payable.</p>
      </div>
      <button className="admin-investments-refresh" type="button" onClick={() => load()}>↻ Refresh</button>
    </header>

    {error && <div className="admin-investments-error">{error}</div>}

    <section className="admin-investment-stats">
      <article><span>Investors</span><strong>{stats.investors ?? 0}</strong></article>
      <article><span>Total invested</span><strong>{money(stats.total_invested)}</strong></article>
      <article><span>Active capital</span><strong>{money(stats.active_invested)}</strong></article>
      <article className="payable"><span>Payable now</span><strong>{money(stats.payable_now)}</strong></article>
      <article><span>Revenue allocated</span><strong>{money(stats.allocated_revenue)}</strong></article>
      <article><span>Already paid</span><strong>{money(stats.paid_to_investors)}</strong></article>
    </section>

    <section className="admin-investment-note">
      <b>How to read the numbers</b>
      <span><strong>Invested</strong> is investor capital. <strong>Revenue allocated</strong> is the investor's share of eligible paid lead-sale revenue. <strong>Payable now</strong> becomes due only after that investment cycle matures and has not already been settled.</span>
    </section>

    <section className="admin-investment-panel">
      <div className="admin-investment-toolbar">
        <div className="admin-investment-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search investor, email, industry or location..." /></div>
        <select value={industryId} onChange={e => setIndustryId(e.target.value)}><option value="">All industries</option>{industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All cycles</option><option value="active">Active</option><option value="matured">Matured</option><option value="paid">Paid</option><option value="pending">Pending</option></select>
        <button type="button" onClick={() => load()}>Search</button>
      </div>

      {loading ? <div className="admin-investment-empty">Loading investor records…</div> : !data.investors.length ? <div className="admin-investment-empty">No investor records match the selected filters.</div> : <div className="admin-investor-list">
        {data.investors.map(investor => {
          const open = Boolean(expanded[investor.user_id])
          const cycles = investorCycles.get(investor.user_id) || []
          return <article className={`admin-investor-card ${open ? 'open' : ''}`} key={investor.user_id}>
            <button type="button" className="admin-investor-summary" onClick={() => toggle(investor.user_id)}>
              <div className="admin-investor-identity"><span className="admin-investor-avatar">{String(investor.user_name || 'I').slice(0, 1).toUpperCase()}</span><div><strong>{investor.user_name || 'Investor'}</strong><small>{investor.user_email}</small></div></div>
              <div><span>INVESTED</span><b>{money(investor.total_invested)}</b></div>
              <div><span>LEADS SOLD</span><b>{investor.sold_linked_leads}</b><small>{investor.linked_leads} linked</small></div>
              <div><span>REVENUE</span><b>{money(investor.allocated_revenue)}</b><small>{investor.allocated_sales} revenue sales</small></div>
              <div><span>PAYABLE NOW</span><b className={investor.payable_now > 0 ? 'payable-text' : ''}>{money(investor.payable_now)}</b></div>
              <i className="admin-investor-chevron">⌄</i>
            </button>

            {open && <div className="admin-investor-details">
              <div className="admin-investor-detail-stats">
                <div><span>Investment cycles</span><b>{investor.investment_count}</b></div>
                <div><span>Active capital</span><b>{money(investor.active_invested)}</b></div>
                <div><span>Linked leads</span><b>{investor.linked_leads}</b></div>
                <div><span>Paid linked leads</span><b>{investor.sold_linked_leads}</b></div>
                <div><span>Linked gross sales</span><b>{money(investor.linked_gross_sales)}</b></div>
                <div><span>Revenue-bearing sales</span><b>{investor.allocated_sales}</b></div>
                <div><span>Already paid</span><b>{money(investor.paid_to_investor)}</b></div>
                <div><span>Current payable</span><b className={investor.payable_now > 0 ? 'payable-text' : ''}>{money(investor.payable_now)}</b></div>
              </div>

              <div className="admin-cycle-title"><h3>Investment cycles</h3><span>{cycles.length} cycle{cycles.length === 1 ? '' : 's'}</span></div>
              <div className="admin-cycle-table-wrap"><table><thead><tr><th>Cycle</th><th>Industry / location</th><th>Invested</th><th>Lead sales</th><th>Revenue allocated</th><th>Status</th><th>Maturity</th><th>Action</th></tr></thead><tbody>{cycles.map(cycle => <tr key={cycle.id}><td><b>#{cycle.id}</b></td><td><strong>{cycle.industry_name}</strong><small>{[cycle.city_name, cycle.state_name].filter(Boolean).join(', ') || '—'}</small></td><td>{money(cycle.amount)}</td><td><b>{cycle.sold_linked_leads}</b><small>{cycle.linked_leads} linked</small></td><td>{money(cycle.allocated_revenue)}</td><td><span className={`admin-investment-status ${cycle.status}`}>{cycle.status}</span></td><td>{date(cycle.matures_at)}</td><td>{cycle.payable_now > 0 ? <button className="admin-payout-button" disabled={busy !== null} onClick={() => payout(cycle)}>{busy === `payout-${cycle.id}` ? 'Paying…' : `Pay ${money(cycle.payable_now)}`}</button> : <span className="admin-no-payout">{cycle.status === 'paid' ? 'Paid' : 'Not due'}</span>}</td></tr>)}</tbody></table></div>
            </div>}
          </article>
        })}
      </div>}
    </section>
  </main>
}
