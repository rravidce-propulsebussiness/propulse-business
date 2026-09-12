import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { getToken, clearSession } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminInvestments.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const MATURITY_OPTIONS = [
  { value: 'immediate', label: 'Immediate', hint: 'Mature now · testing' },
  { value: '7', label: 'Weekly', hint: '7 days' },
  { value: '14', label: 'Biweekly', hint: '14 days' },
  { value: '30', label: 'Monthly', hint: '30 days' },
  { value: '90', label: 'Quarterly', hint: '90 days' },
  { value: '180', label: 'Half-yearly', hint: '180 days' },
  { value: '365', label: 'Yearly', hint: '365 days' },
  { value: 'custom', label: 'Custom', hint: 'Choose days' },
]

export default function AdminInvestments() {
  const navigate = useNavigate()
  const [data, setData] = useState({ stats: {}, investors: [], items: [] })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [industryId, setIndustryId] = useState('')
  const [industries, setIndustries] = useState([])
  const [expanded, setExpanded] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [linked, setLinked] = useState(null)
  const [linkedLoading, setLinkedLoading] = useState(false)
  const [payoutModal, setPayoutModal] = useState(null)
  const [transferReference, setTransferReference] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [payoutBusy, setPayoutBusy] = useState(false)
  const [spendModal, setSpendModal] = useState(null)
  const [spendData, setSpendData] = useState(null)
  const [spendLoading, setSpendLoading] = useState(false)
  const [spendBusy, setSpendBusy] = useState(false)
  const [spendForm, setSpendForm] = useState({ amount: '', platform: '', campaign: '', spendDate: '', reference: '', notes: '' })
  const [settings, setSettings] = useState(null)
  const [maturityPreset, setMaturityPreset] = useState('30')
  const [maturityDays, setMaturityDays] = useState('30')
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')

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

  const loadSettings = async () => {
    setSettingsLoading(true)
    try {
      const result = await request('/admin/commercial/investor-settings')
      setSettings(result)
      const days = Number(result.investment_cycle_days)
      const known = days === 0 || MATURITY_OPTIONS.some(option => option.value === String(days))
      setMaturityPreset(days === 0 ? 'immediate' : known ? String(days) : 'custom')
      setMaturityDays(String(days || 0))
    } catch (e) {
      setError(e.message || 'Unable to load investment maturity settings.')
    } finally {
      setSettingsLoading(false)
    }
  }

  useEffect(() => { load(); loadSettings() }, [status, industryId])
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

  const toggle = userId => setExpanded(value => ({ ...value, [userId]: !value[userId] }))

  const selectMaturity = value => {
    setMaturityPreset(value)
    if (value === 'immediate') setMaturityDays('0')
    else if (value !== 'custom') setMaturityDays(value)
  }

  const saveMaturity = async () => {
    if (!settings) return
    const days = Number(maturityDays)
    if (!Number.isInteger(days) || days < 0 || days > 3650) {
      setError('Maturity must be a whole number between 0 and 3650 days.')
      return
    }
    setSettingsBusy(true)
    setSettingsMessage('')
    setError('')
    try {
      const updated = await request('/admin/commercial/investor-settings', {
        method: 'PUT',
        body: JSON.stringify({
          globalLimit: settings.global_limit,
          defaultIndustryLimit: settings.default_industry_limit,
          customerIndustryLimit: settings.customer_industry_limit,
          minInvestment: settings.min_investment,
          maxInvestment: settings.max_investment == null ? '' : settings.max_investment,
          enabled: Boolean(settings.is_enabled ?? settings.enabled),
          requiresPro: Boolean(settings.requires_pro),
          investmentCycleDays: days,
          autoReinvest: settings.auto_reinvest == null ? false : Boolean(settings.auto_reinvest),
          investorRevenueSharePercent: settings.investor_revenue_share_percent == null ? 100 : settings.investor_revenue_share_percent,
        }),
      })
      setSettings(updated)
      setMaturityDays(String(days))
      setMaturityPreset(days === 0 ? 'immediate' : MATURITY_OPTIONS.some(option => option.value === String(days)) ? String(days) : 'custom')
      setSettingsMessage(days === 0 ? 'Saved: immediate maturity. Active cycles can mature now for testing.' : `Saved: ${days} days. Active cycles were updated for testing.`)
      await load(true)
    } catch (e) {
      setError(e.message || 'Unable to save maturity settings.')
    } finally {
      setSettingsBusy(false)
    }
  }

  const showLinked = async investor => {
    setLinked({ investor, items: [] })
    setLinkedLoading(true)
    try {
      const items = await request(`/investments/admin/investor/${investor.user_id}/linked-leads`)
      setLinked({ investor, items: Array.isArray(items) ? items : items?.data || [] })
    } catch (e) {
      setError(e.message || 'Unable to load linked leads.')
      setLinked(null)
    } finally {
      setLinkedLoading(false)
    }
  }

  const openSpend = async cycle => {
    setSpendModal(cycle)
    setSpendData(null)
    setSpendLoading(true)
    setSpendForm({ amount: '', platform: '', campaign: '', spendDate: '', reference: '', notes: '' })
    try {
      const result = await request(`/investments/admin/${cycle.id}/ad-spend`)
      setSpendData(result)
    } catch (e) {
      setError(e.message || 'Unable to load ad spend.')
    } finally {
      setSpendLoading(false)
    }
  }

  const submitSpend = async event => {
    event.preventDefault()
    if (!spendModal) return
    if (!Number(spendForm.amount) || Number(spendForm.amount) <= 0) return setError('Enter a valid ad spend amount.')
    setSpendBusy(true)
    setError('')
    try {
      await request(`/investments/admin/${spendModal.id}/ad-spend`, { method: 'POST', body: JSON.stringify(spendForm) })
      const result = await request(`/investments/admin/${spendModal.id}/ad-spend`)
      setSpendData(result)
      setSpendForm({ amount: '', platform: '', campaign: '', spendDate: '', reference: '', notes: '' })
      await load(true)
    } catch (e) {
      setError(e.message || 'Unable to record ad spend.')
    } finally {
      setSpendBusy(false)
    }
  }

  const openPayout = cycle => {
    if (Number(cycle.payable_now) <= 0) return
    setPayoutModal(cycle)
    setTransferReference('')
    setProofFile(null)
    setError('')
  }

  const submitPayout = async () => {
    if (!payoutModal) return
    setError('')
    const automatic = Boolean(payoutModal.reinvestment_enabled)
    if (!automatic) {
      if (!transferReference.trim()) return setError('Enter the transfer reference / UTR.')
      if (!proofFile) return setError('Attach the transfer screenshot or proof.')
      if (proofFile.size > 5 * 1024 * 1024) return setError('Transfer proof must be 5 MB or smaller.')
    }
    setPayoutBusy(true)
    try {
      const proofUrl = automatic ? null : await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Unable to read transfer proof'))
        reader.readAsDataURL(proofFile)
      })
      await request(`/investments/admin/${payoutModal.id}/payout`, {
        method: 'POST',
        body: JSON.stringify({ transferReference: automatic ? '' : transferReference.trim(), proofUrl }),
      })
      setPayoutModal(null)
      setTransferReference('')
      setProofFile(null)
      await load()
    } catch (e) {
      setError(e.message || 'Unable to settle investor return.')
    } finally {
      setPayoutBusy(false)
    }
  }

  const stats = data.stats || {}

  return (
    <main className="admin-investments-page">
      <header className="admin-investments-head">
        <div>
          <span className="admin-investments-kicker">INVESTOR OPERATIONS</span>
          <h1>Investments</h1>
          <p>Manage investor capital, ad spend, lead sales, earnings and reinvestment cycles.</p>
        </div>
      </header>

      {error && <div className="admin-investments-error">{error}</div>}

      <section className="admin-investment-stats">
        <article><span>Total Invested</span><strong>{money(stats.total_invested)}</strong><small>{stats.investors ?? 0} investors</small></article>
        <article><span>Historical Ad Spend</span><strong>{money(stats.ad_spent)}</strong><small>Actual spend across cycles</small></article>
        <article className="revenue-stat"><span>Revenue Generated</span><strong>{money(stats.allocated_revenue)}</strong><small>From paid lead sales</small></article>
        <article className="payable"><span>Earnings Ready</span><strong>{money(stats.payable_now)}</strong><small>{stats.matured_unpaid ?? 0} matured cycles</small></article>
      </section>

      <section className="admin-investment-note">
        <div className="note-icon">i</div>
        <div><b>How the money is separated</b><span>Original capital funds ad allocations. Historical ad spend is never reused as available capital. Only realized earnings can be paid out or reinvested after a cycle matures.</span></div>
      </section>

      <section className="admin-maturity-panel">
        <div className="admin-maturity-copy">
          <span className="admin-settings-kicker">CYCLE SETTINGS</span>
          <h2>Investment maturity</h2>
          <p>Choose the default duration for investment cycles. Use Immediate only for testing. Saving a duration updates active cycles immediately; pending cycles use it when activated.</p>
        </div>
        <div className="admin-maturity-controls">
          <label><span>Period</span><select value={maturityPreset} onChange={e => selectMaturity(e.target.value)} disabled={settingsLoading || settingsBusy}>{MATURITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label} · {option.hint}</option>)}</select></label>
          {maturityPreset === 'custom' && <label><span>Days</span><input type="number" min="0" max="3650" value={maturityDays} onChange={e => setMaturityDays(e.target.value)} disabled={settingsLoading || settingsBusy} /></label>}
          <button type="button" className="admin-maturity-save" onClick={saveMaturity} disabled={settingsLoading || settingsBusy}>{settingsBusy ? 'Saving…' : 'Save maturity'}</button>
        </div>
        <div className="admin-maturity-current"><b>Current default</b><strong>{settingsLoading ? 'Loading…' : Number(settings?.investment_cycle_days ?? maturityDays ?? 30) === 0 ? 'Immediate' : `${Number(settings?.investment_cycle_days ?? maturityDays ?? 30)} days`}</strong>{settingsMessage && <span>{settingsMessage}</span>}</div>
      </section>

      <section className="admin-investment-panel">
        <div className="admin-investment-toolbar">
          <div className="admin-investment-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search investors…" /></div>
          <select value={industryId} onChange={e => setIndustryId(e.target.value)}><option value="">All industries</option>{industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All Status</option><option value="active">Active</option><option value="matured">Matured</option><option value="paid">Paid</option><option value="pending">Pending</option></select>
          <button type="button" onClick={() => load()}>Search</button>
        </div>

        <div className="admin-investor-table-head"><span>INVESTOR</span><span>CAPITAL</span><span>AD SPEND</span><span>EARNINGS</span><span>READY</span><span>STATUS</span><span>ACTIONS</span></div>

        {loading ? <div className="admin-investment-empty">Loading investor records…</div> : !data.investors.length ? <div className="admin-investment-empty">No investor records match the selected filters.</div> : (
          <div className="admin-investor-list">
            {data.investors.map(investor => {
              const open = Boolean(expanded[investor.user_id])
              const cycles = investorCycles.get(investor.user_id) || []
              const latestCycle = cycles[0]
              return (
                <article className={`admin-investor-card ${open ? 'open' : ''}`} key={investor.user_id}>
                  <div className="admin-investor-summary">
                    <button type="button" className="admin-investor-summary-main" onClick={() => toggle(investor.user_id)}>
                      <span className="admin-investor-primary"><span className="admin-investor-chevron">{open ? '⌄' : '›'}</span><span className="admin-investor-identity"><span className="admin-investor-avatar">{String(investor.user_name || 'I').slice(0, 1).toUpperCase()}</span><span><strong>{investor.user_name || 'Investor'}</strong><small>{investor.user_email}</small></span></span></span>
                      <div><b>{money(investor.total_invested)}</b></div>
                      <div><b>{money(investor.ad_spent)}</b></div>
                      <div><b className="revenue-text">{money(investor.allocated_revenue)}</b></div>
                      <div><b className={Number(investor.payable_now) > 0 ? 'payable-text' : ''}>{money(investor.payable_now)}</b></div>
                      <div><span className={`admin-investment-status ${latestCycle?.status || 'active'}`}>{latestCycle?.status || 'active'}</span></div>
                    </button>
                    <button type="button" className="admin-view-button" onClick={() => toggle(investor.user_id)}>{open ? 'Hide details' : 'View details'}</button>
                  </div>

                  {open && (
                    <div className="admin-investor-details">
                      {cycles.map(cycle => {
                        const allocation = Number(cycle.current_ad_allocation || 0)
                        const spent = Number(cycle.current_ad_spent || 0)
                        const adPercent = allocation > 0 ? Math.min(100, (spent / allocation) * 100) : 0
                        return (
                          <div className="admin-cycle-focus" key={cycle.id}>
                            <div className="admin-cycle-focus-head">
                              <div><span className="cycle-eyebrow">INVESTMENT CYCLE</span><h2>Investment Cycle #{cycle.id} <span className={`admin-investment-status ${cycle.status}`}>{cycle.status}</span></h2><p>{cycle.industry_name} · Started {date(cycle.starts_at || cycle.created_at)}</p></div>
                              <div className="admin-cycle-meta"><div><span>Maturity</span><strong>{date(cycle.matures_at)}</strong></div><div><span>Duration</span><strong>{Number(cycle.maturity_days || 0)} days</strong></div><div><span>Auto reinvest</span><b className={cycle.reinvestment_enabled ? 'switch-on' : 'switch-off'}>{cycle.reinvestment_enabled ? 'ON' : 'OFF'}</b></div></div>
                            </div>
                            <div className="admin-cycle-cards">
                              <section className="cycle-card investment-card"><h3><i>₹</i> Capital</h3><div><span>Original investment</span><b>{money(cycle.amount)}</b></div><div><span>Historical ad spend</span><b>{money(cycle.ad_spent)}</b></div><div><span>Current ad allocation</span><b>{money(cycle.current_ad_allocation)}</b></div><div><span>Available for future ads</span><b className="green-text">{money(cycle.funds_available_for_ads)}</b></div><aside>Original capital remains separate from earnings. Future ad capacity = original capital − historical ad spend − current unspent allocation.</aside></section>
                              <section className="cycle-card ads-card"><h3><i>↗</i> Ad Spend</h3><div><span>Current allocation</span><b>{money(cycle.current_ad_allocation)}</b></div><div><span>Spent from current allocation</span><b>{money(cycle.current_ad_spent)}</b></div><div><span>Current budget remaining</span><b className="green-text">{money(cycle.ad_remaining)}</b></div><div className="progress-row"><div><span style={{ width: `${adPercent}%` }} /></div><b>{Math.round(adPercent)}%</b></div><aside>Historical spend stays in the ledger. Only the active allocation is available to spend now.</aside></section>
                              <section className="cycle-card revenue-card"><h3><i>✓</i> Earnings</h3><div><span>Revenue generated</span><b>{money(cycle.allocated_revenue)}</b></div><div><span>Ready for settlement</span><b className="green-text">{money(cycle.payable_now)}</b></div><div><span>Already settled</span><b>{money(cycle.paid_to_investor)}</b></div><div><span>Paid sales</span><b>{cycle.allocated_sales || cycle.linked_paid_sales || 0}</b></div><aside>Earnings come from eligible paid lead sales. They do not increase the original investment capital.</aside></section>
                              <section className="cycle-card reinvest-card"><h3><i>↻</i> Reinvestment</h3><div><span>Auto reinvest earnings</span><b className={cycle.reinvestment_enabled ? 'switch-on' : 'switch-off'}>{cycle.reinvestment_enabled ? 'ON' : 'OFF'}</b></div><div><span>Eligible amount</span><b>{money(cycle.payable_now)}</b></div><div><span>Next cycle funding</span><b>{money(cycle.reinvestment_enabled ? cycle.payable_now : 0)}</b></div><aside>{cycle.reinvestment_enabled ? `Only ${money(cycle.payable_now)} of realized earnings will fund the next cycle. Original capital is never reinvested.` : 'Automatic reinvestment is disabled for this investment.'}</aside></section>
                            </div>
                            <div className="admin-cycle-actions">
                              <button type="button" className="outline-action" onClick={() => showLinked(investor)}>◉ View linked leads</button>
                              <button type="button" className="blue-action" onClick={() => openSpend(cycle)}>＋ Add ad spend</button>
                              {Number(cycle.payable_now) > 0 && <button type="button" className="green-action" onClick={() => openPayout(cycle)}>↻ {cycle.reinvestment_enabled ? 'Reinvest' : 'Pay'} {money(cycle.payable_now)}</button>}
                            </div>
                            <div className="admin-transaction-history">
                              <div className="transaction-title"><h3>Cycle ledger</h3><span>Capital · Ads · Earnings</span></div>
                              <div className="transaction-table-wrap"><table><thead><tr><th>DATE</th><th>TYPE</th><th>DESCRIPTION</th><th>AMOUNT</th><th>REFERENCE</th></tr></thead><tbody>
                                <tr><td>{date(cycle.starts_at || cycle.created_at)}</td><td>Investment</td><td>Original investment capital</td><td className="amount-positive">{money(cycle.amount)}</td><td>Cycle #{cycle.id}</td></tr>
                                {Number(cycle.ad_spent) > 0 && <tr><td>—</td><td>Ad Spend</td><td>Historical advertising spend</td><td className="amount-negative">-{money(cycle.ad_spent)}</td><td>Ads</td></tr>}
                                {Number(cycle.allocated_revenue) > 0 && <tr><td>—</td><td>Earnings</td><td>Realized paid lead-sale earnings</td><td className="amount-revenue">{money(cycle.allocated_revenue)}</td><td>{cycle.allocated_sales || cycle.linked_paid_sales || 0} sale(s)</td></tr>}
                              </tbody></table></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {linked && <div className="admin-investment-overlay"><section className="admin-investment-modal"><button className="admin-investment-modal-close" type="button" onClick={() => setLinked(null)}>×</button><span className="admin-investments-kicker">LINKED LEADS</span><h2>{linked.investor.user_name}'s linked leads</h2><p>{linked.items.length} lead{linked.items.length === 1 ? '' : 's'} linked to this investor.</p>{linkedLoading ? <div className="admin-investment-empty">Loading linked leads…</div> : !linked.items.length ? <div className="admin-investment-empty">No linked leads found.</div> : <div className="admin-linked-lead-list">{linked.items.map(lead => <article className="admin-linked-lead-card" key={lead.id}><div><strong>{lead.name || 'Lead'}</strong><span>{lead.industry_name}{lead.service_name ? ` · ${lead.service_name}` : ''}</span><small>{[lead.city_name, lead.state_name].filter(Boolean).join(', ') || 'Location not set'} · {date(lead.created_at)}</small></div><div><span>Budget</span><b>{lead.budget || '—'}</b></div><div><span>Sale amount</span><b>{money(lead.gross_sale_amount)}</b></div><div><span>Paid sales</span><b>{lead.paid_sale_count}</b></div></article>)}</div>}</section></div>}

      {spendModal && <div className="admin-investment-overlay"><section className="admin-investment-modal admin-spend-modal"><button className="admin-investment-modal-close" type="button" onClick={() => !spendBusy && setSpendModal(null)}>×</button><span className="admin-investments-kicker">ADS &amp; SPEND</span><h2>Ad spend · Cycle #{spendModal.id}</h2><p>Record actual advertising spend against the current allocation. The backend prevents spending above the active allocation.</p>{spendLoading ? <div className="admin-investment-empty">Loading ad spend…</div> : <><div className="spend-summary"><div><span>Current allocation</span><b>{money(spendData?.investment?.amount_in_ads ?? spendModal.current_ad_allocation)}</b></div><div><span>Historical spent</span><b>{money(spendData?.investment?.ad_spent ?? spendModal.ad_spent)}</b></div><div><span>Current remaining</span><b className="green-text">{money(spendData?.investment?.ad_remaining ?? spendModal.ad_remaining)}</b></div><div><span>Future ad capacity</span><b>{money(spendData?.investment?.funds_available_for_ads ?? spendModal.funds_available_for_ads)}</b></div></div><form className="spend-form" onSubmit={submitSpend}><label>Amount<input type="number" min="0.01" step="0.01" value={spendForm.amount} onChange={e => setSpendForm(v => ({ ...v, amount: e.target.value }))} placeholder="₹0.00" required /></label><label>Platform<input value={spendForm.platform} onChange={e => setSpendForm(v => ({ ...v, platform: e.target.value }))} placeholder="Meta, Google, etc." /></label><label>Campaign<input value={spendForm.campaign} onChange={e => setSpendForm(v => ({ ...v, campaign: e.target.value }))} placeholder="Campaign name" /></label><label>Spend date<input type="date" value={spendForm.spendDate} onChange={e => setSpendForm(v => ({ ...v, spendDate: e.target.value }))} /></label><label>Reference<input value={spendForm.reference} onChange={e => setSpendForm(v => ({ ...v, reference: e.target.value }))} placeholder="Campaign / invoice reference" /></label><label>Notes<textarea value={spendForm.notes} onChange={e => setSpendForm(v => ({ ...v, notes: e.target.value }))} placeholder="Optional notes" /></label><button className="admin-payout-confirm" type="submit" disabled={spendBusy}>{spendBusy ? 'Saving spend…' : 'Save ad spend'}</button></form><div className="spend-history">{spendData?.spends?.length ? spendData.spends.map(item => <div key={item.id}><span>{date(item.spend_date || item.created_at)} · {item.platform || 'Ads'}</span><b>{money(item.amount)}</b></div>) : <p>No ad spend records yet.</p>}</div></>}</section></div>}

      {payoutModal && <div className="admin-investment-overlay"><section className="admin-investment-modal admin-payout-modal"><button className="admin-investment-modal-close" type="button" onClick={() => !payoutBusy && setPayoutModal(null)}>×</button><span className="admin-investments-kicker">{payoutModal.reinvestment_enabled ? 'AUTOMATIC REINVESTMENT' : 'INVESTOR TRANSFER'}</span><h2>{payoutModal.reinvestment_enabled ? 'Reinvest realized earnings' : 'Pay investor earnings'}</h2>{payoutModal.reinvestment_enabled ? <><p>Only realized earnings are used for the next cycle. The original investment capital is never reinvested.</p><div className="admin-payout-amount"><span>Amount to reinvest</span><strong>{money(payoutModal.payable_now)}</strong></div><button className="admin-payout-confirm" type="button" disabled={payoutBusy} onClick={submitPayout}>{payoutBusy ? 'Creating cycle…' : `Confirm reinvestment · ${money(payoutModal.payable_now)}`}</button></> : <><p>Transfer the payable earnings to the investor, then record the UTR/reference and attach the transfer proof.</p><div className="admin-payout-amount"><span>Amount to transfer</span><strong>{money(payoutModal.payable_now)}</strong></div><label>Transfer reference / UTR<input value={transferReference} onChange={e => setTransferReference(e.target.value)} placeholder="Enter UTR or bank transfer reference" /></label><label>Transfer screenshot / proof<input type="file" accept="image/*,.pdf" onChange={e => setProofFile(e.target.files?.[0] || null)} /></label>{proofFile && <small className="admin-proof-name">Attached: {proofFile.name}</small>}<button className="admin-payout-confirm" type="button" disabled={payoutBusy} onClick={submitPayout}>{payoutBusy ? 'Saving transfer…' : 'Confirm transfer & save proof'}</button></>}</section></div>}
    </main>
  )
}
