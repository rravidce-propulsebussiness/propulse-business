import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { getToken, clearSession } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminInvestmentsPremium.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const MATURITY_OPTIONS = [
  { value: 'immediate', label: 'Immediate · testing' },
  { value: '7', label: 'Weekly · 7 days' },
  { value: '14', label: 'Biweekly · 14 days' },
  { value: '30', label: 'Monthly · 30 days' },
  { value: '90', label: 'Quarterly · 90 days' },
  { value: '180', label: 'Half-yearly · 180 days' },
  { value: '365', label: 'Yearly · 365 days' },
  { value: 'custom', label: 'Custom' },
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
  const [commissionPercent, setCommissionPercent] = useState('5')
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [commissionMessage, setCommissionMessage] = useState('')

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
      const share = Number(result.investor_revenue_share_percent)
      setCommissionPercent(String(Number.isFinite(share) ? Math.max(0, Math.min(100, 100 - share)) : 5))
    } catch (e) {
      setError(e.message || 'Unable to load investment settings.')
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

  const saveCommercialSettings = async ({ days, commission }) => {
    if (!settings) return
    const nextDays = Number(days)
    const nextCommission = Number(commission)
    if (!Number.isInteger(nextDays) || nextDays < 0 || nextDays > 3650) throw new Error('Maturity must be a whole number between 0 and 3650 days.')
    if (!Number.isFinite(nextCommission) || nextCommission < 0 || nextCommission > 100) throw new Error('Commission must be between 0% and 100%.')
    return request('/admin/commercial/investor-settings', {
      method: 'PUT',
      body: JSON.stringify({
        globalLimit: settings.global_limit,
        defaultIndustryLimit: settings.default_industry_limit,
        customerIndustryLimit: settings.customer_industry_limit,
        minInvestment: settings.min_investment,
        maxInvestment: settings.max_investment == null ? '' : settings.max_investment,
        enabled: Boolean(settings.is_enabled ?? settings.enabled),
        requiresPro: Boolean(settings.requires_pro),
        investmentCycleDays: nextDays,
        autoReinvest: settings.auto_reinvest == null ? false : Boolean(settings.auto_reinvest),
        investorRevenueSharePercent: 100 - nextCommission,
      }),
    })
  }

  const saveMaturity = async () => {
    if (!settings) return
    setSettingsBusy(true)
    setSettingsMessage('')
    setError('')
    try {
      const updated = await saveCommercialSettings({ days: maturityDays, commission: commissionPercent })
      const days = Number(maturityDays)
      setSettings(updated)
      setMaturityDays(String(days))
      setMaturityPreset(days === 0 ? 'immediate' : MATURITY_OPTIONS.some(option => option.value === String(days)) ? String(days) : 'custom')
      setCommissionPercent(String(100 - Number(updated.investor_revenue_share_percent ?? 95)))
      setSettingsMessage('Saved')
      await load(true)
    } catch (e) {
      setError(e.message || 'Unable to save investment settings.')
    } finally {
      setSettingsBusy(false)
    }
  }

  const saveCommission = async () => {
    if (!settings) return
    const value = Number(commissionPercent)
    if (!Number.isFinite(value) || value < 0 || value > 100) return setError('Commission must be between 0% and 100%.')
    setSettingsBusy(true)
    setCommissionMessage('')
    setError('')
    try {
      const days = Number(settings.investment_cycle_days ?? maturityDays ?? 30)
      const updated = await saveCommercialSettings({ days, commission: value })
      setSettings(updated)
      setCommissionPercent(String(value))
      setCommissionMessage('Saved')
      await load(true)
    } catch (e) {
      setError(e.message || 'Unable to save commission.')
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
    } finally { setLinkedLoading(false) }
  }

  const openSpend = async cycle => {
    setSpendModal(cycle)
    setSpendData(null)
    setSpendLoading(true)
    setSpendForm({ amount: '', platform: '', campaign: '', spendDate: '', reference: '', notes: '' })
    try { setSpendData(await request(`/investments/admin/${cycle.id}/ad-spend`)) }
    catch (e) { setError(e.message || 'Unable to load ad spend.') }
    finally { setSpendLoading(false) }
  }

  const submitSpend = async event => {
    event.preventDefault()
    if (!spendModal) return
    if (!Number(spendForm.amount) || Number(spendForm.amount) <= 0) return setError('Enter a valid ad spend amount.')
    setSpendBusy(true)
    setError('')
    try {
      await request(`/investments/admin/${spendModal.id}/ad-spend`, { method: 'POST', body: JSON.stringify(spendForm) })
      setSpendData(await request(`/investments/admin/${spendModal.id}/ad-spend`))
      setSpendForm({ amount: '', platform: '', campaign: '', spendDate: '', reference: '', notes: '' })
      await load(true)
    } catch (e) { setError(e.message || 'Unable to record ad spend.') }
    finally { setSpendBusy(false) }
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
    const automatic = Boolean(payoutModal.reinvestment_enabled)
    setError('')
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
    } catch (e) { setError(e.message || 'Unable to settle investor earnings.') }
    finally { setPayoutBusy(false) }
  }

  const stats = data.stats || {}

  return (
    <main className="admin-investments-page">
      <header className="admin-investments-head">
        <h1>Investments</h1>
        <div className="admin-commission-card">
          <div className="admin-commission-copy"><span>ProPulse commission</span><small>Applied to lead revenue</small></div>
          <div className="admin-commission-input"><input type="number" min="0" max="100" step="0.1" value={commissionPercent} onChange={e => setCommissionPercent(e.target.value)} disabled={settingsLoading || settingsBusy} aria-label="ProPulse commission percentage" /><b>%</b></div>
          <button type="button" className="admin-commission-save" onClick={saveCommission} disabled={settingsLoading || settingsBusy}>{settingsBusy ? 'Saving…' : 'Save'}</button>
          {commissionMessage && <span className="admin-commission-saved">{commissionMessage}</span>}
        </div>
      </header>

      {error && <div className="admin-investments-error">{error}</div>}

      <section className="admin-investment-stats">
        <article className="capital-stat"><span>Investor Capital</span><strong>{money(stats.total_invested)}</strong><small>Money personally contributed</small></article>
        <article className="ads-stat"><span>Ad Balance</span><strong>{money(stats.ad_remaining)}</strong><small>Currently available to spend</small></article>
        <article className="revenue-stat"><span>Lead Revenue</span><strong>{money(stats.allocated_revenue)}</strong><small>Investor earnings generated</small></article>
        <article className="payable-stat"><span>Ready to Transfer</span><strong>{money(stats.payable_now)}</strong><small>{stats.matured_unpaid ?? 0} matured cycles</small></article>
      </section>

      <section className="admin-money-flow">
        <div className="flow-title"><b>Capital flow</b></div>
        <div className="flow-steps">
          <div><i>1</i><strong>Investor adds capital</strong><small>Up to the configured maximum</small></div><em>→</em>
          <div><i>2</i><strong>We run ads</strong><small>Capital becomes ad budget</small></div><em>→</em>
          <div><i>3</i><strong>Leads are sold</strong><small>Revenue is recorded</small></div><em>→</em>
          <div><i>4</i><strong>Earnings</strong><small>Transfer or reinvest</small></div>
        </div>
      </section>

      <section className="admin-maturity-panel">
        <div><div className="admin-settings-kicker">SETTINGS</div><h2>Investment maturity</h2><p>Controls when realized earnings become eligible for transfer or reinvestment.</p></div>
        <div className="admin-maturity-controls">
          <label><span>Period</span><select value={maturityPreset} onChange={e => selectMaturity(e.target.value)} disabled={settingsLoading || settingsBusy}>{MATURITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          {maturityPreset === 'custom' && <label><span>Days</span><input type="number" min="0" max="3650" value={maturityDays} onChange={e => setMaturityDays(e.target.value)} disabled={settingsLoading || settingsBusy} /></label>}
          <button type="button" onClick={saveMaturity} disabled={settingsLoading || settingsBusy}>{settingsBusy ? 'Saving…' : 'Save'}</button>
        </div>
        <div className="admin-maturity-current"><span>Current</span><strong>{settingsLoading ? 'Loading…' : Number(settings?.investment_cycle_days ?? maturityDays ?? 30) === 0 ? 'Immediate' : `${Number(settings?.investment_cycle_days ?? maturityDays ?? 30)} days`}</strong>{settingsMessage && <small>{settingsMessage}</small>}</div>
      </section>

      <section className="admin-investment-panel">
        <div className="admin-investment-toolbar">
          <div className="admin-investment-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search investor…" /></div>
          <select value={industryId} onChange={e => setIndustryId(e.target.value)}><option value="">All industries</option>{industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="matured">Matured</option><option value="paid">Paid</option><option value="pending">Pending</option></select>
          <button type="button" onClick={() => load()}>Search</button>
        </div>

        <div className="admin-investor-table-head"><span>INVESTOR</span><span>CAPITAL</span><span>AD BALANCE</span><span>EARNINGS</span><span>READY</span><span>STATUS</span><span>ACTION</span></div>

        {loading ? <div className="admin-investment-empty">Loading investors…</div> : !data.investors.length ? <div className="admin-investment-empty">No investors match the selected filters.</div> : (
          <div className="admin-investor-list">
            {data.investors.map(investor => {
              const open = Boolean(expanded[investor.user_id])
              const cycles = investorCycles.get(investor.user_id) || []
              const latestCycle = cycles[0]
              return (
                <article className={`admin-investor-card ${open ? 'open' : ''}`} key={investor.user_id}>
                  <div className="admin-investor-summary">
                    <button type="button" className="admin-investor-summary-main" onClick={() => toggle(investor.user_id)}>
                      <span className="admin-investor-primary"><span className="admin-investor-chevron">{open ? '⌄' : '›'}</span><span className="admin-investor-avatar">{String(investor.user_name || 'I').slice(0, 1).toUpperCase()}</span><span className="admin-investor-identity"><strong>{investor.user_name || 'Investor'}</strong><small>{investor.user_email}</small></span></span>
                      <div><b>{money(investor.total_invested)}</b><small>capital</small></div>
                      <div><b className="green-text">{money(investor.ad_remaining)}</b><small>available</small></div>
                      <div><b className="revenue-text">{money(investor.allocated_revenue)}</b><small>earned</small></div>
                      <div><b className={Number(investor.payable_now) > 0 ? 'payable-text' : ''}>{money(investor.payable_now)}</b><small>ready</small></div>
                      <div><span className={`admin-investment-status ${latestCycle?.status || 'active'}`}>{latestCycle?.status || 'active'}</span></div>
                    </button>
                    <button type="button" className="admin-view-button" onClick={() => toggle(investor.user_id)}>{open ? 'Hide' : 'View'}</button>
                  </div>

                  {open && <div className="admin-investor-details">
                    <div className="investor-detail-head"><div><span className="detail-kicker">INVESTOR ACCOUNT</span><h2>{investor.user_name || 'Investor'}</h2><p>{investor.user_email}</p></div><div className="capital-limit"><span>Contributed capital</span><strong>{money(investor.total_invested)}</strong><small>Maximum is controlled by investment settings</small></div></div>
                    <div className="money-dashboard">
                      <section><span>Investor capital</span><strong>{money(investor.total_invested)}</strong><small>Personal money contributed</small></section>
                      <section><span>Ad balance</span><strong className="green-text">{money(investor.ad_remaining)}</strong><small>Available for the next ad spend</small></section>
                      <section><span>Ad spend</span><strong>{money(investor.ad_spent)}</strong><small>Actually spent on advertising</small></section>
                      <section><span>Lead earnings</span><strong className="revenue-text">{money(investor.allocated_revenue)}</strong><small>Investor share after commission</small></section>
                      <section><span>Ready to transfer</span><strong className="payable-text">{money(investor.payable_now)}</strong><small>Eligible after maturity</small></section>
                      <section><span>Auto reinvest</span><strong>{cycles.some(cycle => cycle.reinvestment_enabled) ? 'ON' : 'OFF'}</strong><small>Only earnings are reinvested</small></section>
                    </div>
                    <div className="admin-cycle-list">
                      {cycles.map(cycle => {
                        const gross = Number(cycle.linked_gross_sales || 0)
                        const earnings = Number(cycle.allocated_revenue || 0)
                        const commission = Math.max(0, gross - earnings)
                        return <div className="simple-cycle" key={cycle.id}>
                          <div className="simple-cycle-top"><div><span>AD / EARNINGS CYCLE #{cycle.id}</span><h3>{cycle.industry_name} <span className={`admin-investment-status ${cycle.status}`}>{cycle.status}</span></h3><small>Started {date(cycle.starts_at || cycle.created_at)} · Maturity {date(cycle.matures_at)}</small></div><div className="cycle-reinvest"><span>Auto reinvest</span><b className={cycle.reinvestment_enabled ? 'on' : 'off'}>{cycle.reinvestment_enabled ? 'ON' : 'OFF'}</b></div></div>
                          <div className="simple-flow"><div><span>Capital</span><b>{money(cycle.amount)}</b></div><i>→</i><div><span>Ad spent</span><b>{money(cycle.ad_spent)}</b></div><i>→</i><div><span>Ad balance</span><b className="green-text">{money(cycle.ad_remaining)}</b></div><i>→</i><div><span>Lead earnings</span><b className="revenue-text">{money(cycle.allocated_revenue)}</b></div></div>
                          <div className="simple-cycle-foot"><span>{cycle.allocated_sales || cycle.linked_paid_sales || 0} lead sale(s) · Gross sales {money(gross)} · ProPulse commission {money(commission)}</span><div><button className="outline-action" type="button" onClick={() => showLinked(investor)}>View leads</button><button className="blue-action" type="button" onClick={() => openSpend(cycle)}>＋ Spend</button>{Number(cycle.payable_now) > 0 && <button className="green-action" type="button" onClick={() => openPayout(cycle)}>{cycle.reinvestment_enabled ? '↻ Reinvest' : 'Transfer'} {money(cycle.payable_now)}</button>}</div></div>
                        </div>
                      })}
                    </div>
                  </div>}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {linked && <div className="admin-investment-overlay"><section className="admin-investment-modal"><button className="admin-investment-modal-close" type="button" onClick={() => setLinked(null)}>×</button><span className="admin-investments-kicker">LEAD SALES</span><h2>{linked.investor.user_name}'s leads</h2><p>{linked.items.length} linked lead{linked.items.length === 1 ? '' : 's'}.</p>{linkedLoading ? <div className="admin-investment-empty">Loading leads…</div> : !linked.items.length ? <div className="admin-investment-empty">No linked leads found.</div> : <div className="admin-linked-lead-list">{linked.items.map(lead => <article className="admin-linked-lead-card" key={lead.id}><div><strong>{lead.name || 'Lead'}</strong><span>{lead.industry_name}{lead.service_name ? ` · ${lead.service_name}` : ''}</span><small>{[lead.city_name, lead.state_name].filter(Boolean).join(', ') || 'Location not set'} · {date(lead.created_at)}</small></div><div><span>Sale amount</span><b>{money(lead.gross_sale_amount)}</b></div><div><span>Paid sales</span><b>{lead.paid_sale_count}</b></div></article>)}</div>}</section></div>}

      {spendModal && <div className="admin-investment-overlay"><section className="admin-investment-modal admin-spend-modal"><button className="admin-investment-modal-close" type="button" onClick={() => !spendBusy && setSpendModal(null)}>×</button><span className="admin-investments-kicker">AD SPEND</span><h2>Spend from Cycle #{spendModal.id}</h2><p>Enter the actual advertising amount. The backend prevents spending above the available ad funds.</p>{spendLoading ? <div className="admin-investment-empty">Loading ad spend…</div> : <><div className="spend-summary"><div><span>Ad allocation</span><b>{money(spendData?.investment?.amount_in_ads ?? spendModal.current_ad_allocation)}</b></div><div><span>Spent</span><b>{money(spendData?.investment?.ad_spent ?? spendModal.ad_spent)}</b></div><div><span>Balance</span><b className="green-text">{money(spendData?.investment?.ad_remaining ?? spendModal.ad_remaining)}</b></div><div><span>Future capacity</span><b>{money(spendData?.investment?.funds_available_for_ads ?? spendModal.funds_available_for_ads)}</b></div></div><form className="spend-form" onSubmit={submitSpend}><label>Amount<input type="number" min="0.01" step="0.01" value={spendForm.amount} onChange={e => setSpendForm(v => ({ ...v, amount: e.target.value }))} placeholder="₹0.00" required /></label><label>Platform<input value={spendForm.platform} onChange={e => setSpendForm(v => ({ ...v, platform: e.target.value }))} placeholder="Meta, Google, etc." /></label><label>Campaign<input value={spendForm.campaign} onChange={e => setSpendForm(v => ({ ...v, campaign: e.target.value }))} placeholder="Campaign name" /></label><label>Spend date<input type="date" value={spendForm.spendDate} onChange={e => setSpendForm(v => ({ ...v, spendDate: e.target.value }))} /></label><label>Reference<input value={spendForm.reference} onChange={e => setSpendForm(v => ({ ...v, reference: e.target.value }))} placeholder="Campaign / invoice reference" /></label><label>Notes<textarea value={spendForm.notes} onChange={e => setSpendForm(v => ({ ...v, notes: e.target.value }))} placeholder="Optional notes" /></label><button className="admin-payout-confirm" type="submit" disabled={spendBusy}>{spendBusy ? 'Saving…' : 'Save ad spend'}</button></form><div className="spend-history">{spendData?.spends?.length ? spendData.spends.map(item => <div key={item.id}><span>{date(item.spend_date || item.created_at)} · {item.platform || 'Ads'}</span><b>{money(item.amount)}</b></div>) : <p>No ad spend records yet.</p>}</div></>}</section></div>}

      {payoutModal && <div className="admin-investment-overlay"><section className="admin-investment-modal admin-payout-modal"><button className="admin-investment-modal-close" type="button" onClick={() => !payoutBusy && setPayoutModal(null)}>×</button><span className="admin-investments-kicker">{payoutModal.reinvestment_enabled ? 'REINVEST EARNINGS' : 'TRANSFER EARNINGS'}</span><h2>{payoutModal.reinvestment_enabled ? 'Reinvest investor earnings' : 'Transfer investor earnings'}</h2><p>{payoutModal.reinvestment_enabled ? 'Only realized earnings fund the next advertising cycle. Original investor capital is never moved into reinvestment.' : 'Transfer the investor earnings to their bank, then record the UTR and proof.'}</p><div className="admin-payout-amount"><span>{payoutModal.reinvestment_enabled ? 'Amount to reinvest' : 'Amount to transfer'}</span><strong>{money(payoutModal.payable_now)}</strong></div>{payoutModal.reinvestment_enabled ? <button className="admin-payout-confirm" type="button" disabled={payoutBusy} onClick={submitPayout}>{payoutBusy ? 'Creating cycle…' : 'Confirm reinvestment'}</button> : <><label>Transfer reference / UTR<input value={transferReference} onChange={e => setTransferReference(e.target.value)} placeholder="Enter UTR or bank reference" /></label><label>Transfer proof<input type="file" accept="image/*,.pdf" onChange={e => setProofFile(e.target.files?.[0] || null)} /></label>{proofFile && <small className="admin-proof-name">Attached: {proofFile.name}</small>}<button className="admin-payout-confirm" type="button" disabled={payoutBusy} onClick={submitPayout}>{payoutBusy ? 'Saving transfer…' : 'Confirm transfer'}</button></>}</section></div>}
    </main>
  )
}
