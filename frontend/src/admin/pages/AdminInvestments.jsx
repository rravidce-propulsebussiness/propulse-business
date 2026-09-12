import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { getToken, clearSession } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminInvestmentsPremium.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const MATURITY_OPTIONS = [
  { value: 'immediate', label: 'Immediate · testing' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '365 days' },
  { value: 'custom', label: 'Custom' },
]

export default function AdminInvestments() {
  const navigate = useNavigate()
  const [data, setData] = useState({ investors: [] })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [industryId, setIndustryId] = useState('')
  const [industries, setIndustries] = useState([])
  const [expanded, setExpanded] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [linked, setLinked] = useState(null)
  const [linkedLoading, setLinkedLoading] = useState(false)
  const [spendModal, setSpendModal] = useState(null)
  const [spendData, setSpendData] = useState(null)
  const [spendLoading, setSpendLoading] = useState(false)
  const [spendBusy, setSpendBusy] = useState(false)
  const [spendForm, setSpendForm] = useState({ amount: '', platform: '', campaign: '', spendDate: '', reference: '', notes: '' })
  const [payoutModal, setPayoutModal] = useState(null)
  const [transferReference, setTransferReference] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [payoutBusy, setPayoutBusy] = useState(false)
  const [settings, setSettings] = useState(null)
  const [maturityPreset, setMaturityPreset] = useState('30')
  const [maturityDays, setMaturityDays] = useState('30')
  const [commissionPercent, setCommissionPercent] = useState('5')
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [commissionMessage, setCommissionMessage] = useState('')

  const request = async (path, options = {}) => {
    if (!getToken()) { clearSession(); navigate('/login', { replace: true }); throw new Error('Your admin session has expired. Please sign in again.') }
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
      setData({ investors: dashboard.investors || [] })
      if (!industries.length) setIndustries(Array.isArray(industryData) ? industryData : industryData?.data || [])
    } catch (e) { if (!silent) setError(e.message || 'Unable to load investor accounts.') }
    finally { if (!silent) setLoading(false) }
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
    } catch (e) { setError(e.message || 'Unable to load investment settings.') }
    finally { setSettingsLoading(false) }
  }

  useEffect(() => { load(); loadSettings() }, [status, industryId])

  const investors = useMemo(() => data.investors.map(item => {
    const adBalance = Number(item.ad_remaining || 0) + Number(item.funds_available_for_ads || 0)
    const gross = Number(item.linked_gross_sales || 0)
    const earnings = Number(item.allocated_revenue || 0)
    const commission = Math.max(0, gross - earnings)
    const records = Array.isArray(item.cycles) ? item.cycles : []
    const auto = records.length ? (records.every(x => Boolean(x.reinvestment_enabled)) ? 'ON' : records.some(x => Boolean(x.reinvestment_enabled)) ? 'Mixed' : 'OFF') : 'OFF'
    return { ...item, adBalance, gross, earnings, commission, auto, records }
  }), [data.investors])

  const totals = useMemo(() => investors.reduce((out, investor) => {
    out.capital += Number(investor.total_invested || 0)
    out.adBalance += investor.adBalance
    out.adSpend += Number(investor.ad_spent || 0)
    out.gross += investor.gross
    out.earnings += investor.earnings
    out.payable += Number(investor.payable_now || 0)
    out.leads += Number(investor.linked_leads || 0)
    return out
  }, { capital: 0, adBalance: 0, adSpend: 0, gross: 0, earnings: 0, payable: 0, leads: 0 }), [investors])

  const saveCommercialSettings = async ({ days, commission }) => {
    if (!settings) return
    const nextDays = Number(days), nextCommission = Number(commission)
    if (!Number.isInteger(nextDays) || nextDays < 0 || nextDays > 3650) throw new Error('Settlement period must be between 0 and 3650 days.')
    if (!Number.isFinite(nextCommission) || nextCommission < 0 || nextCommission > 100) throw new Error('Commission must be between 0% and 100%.')
    return request('/admin/commercial/investor-settings', { method: 'PUT', body: JSON.stringify({
      globalLimit: settings.global_limit, defaultIndustryLimit: settings.default_industry_limit, customerIndustryLimit: settings.customer_industry_limit,
      minInvestment: settings.min_investment, maxInvestment: settings.max_investment == null ? '' : settings.max_investment,
      enabled: Boolean(settings.is_enabled ?? settings.enabled), requiresPro: Boolean(settings.requires_pro), investmentCycleDays: nextDays,
      autoReinvest: settings.auto_reinvest == null ? false : Boolean(settings.auto_reinvest), investorRevenueSharePercent: 100 - nextCommission,
    }) })
  }

  const saveSettings = async () => {
    setSettingsBusy(true); setSettingsMessage(''); setError('')
    try { const updated = await saveCommercialSettings({ days: maturityDays, commission: commissionPercent }); setSettings(updated); setSettingsMessage('Saved'); setCommissionPercent(String(100 - Number(updated.investor_revenue_share_percent ?? 95))); await load(true) }
    catch (e) { setError(e.message || 'Unable to save settings.') } finally { setSettingsBusy(false) }
  }

  const saveCommission = async () => {
    const value = Number(commissionPercent)
    if (!Number.isFinite(value) || value < 0 || value > 100) return setError('Commission must be between 0% and 100%.')
    setSettingsBusy(true); setCommissionMessage(''); setError('')
    try { const updated = await saveCommercialSettings({ days: Number(settings?.investment_cycle_days ?? maturityDays ?? 30), commission: value }); setSettings(updated); setCommissionMessage('Saved'); await load(true) }
    catch (e) { setError(e.message || 'Unable to save commission.') } finally { setSettingsBusy(false) }
  }

  const showLinked = async investor => {
    setLinked({ investor, items: [] }); setLinkedLoading(true)
    try { const items = await request(`/investments/admin/investor/${investor.user_id}/linked-leads`); setLinked({ investor, items: Array.isArray(items) ? items : items?.data || [] }) }
    catch (e) { setError(e.message || 'Unable to load investor leads.'); setLinked(null) } finally { setLinkedLoading(false) }
  }

  const pickFundingRecord = investor => investor.records
    .filter(x => x.status !== 'cancelled')
    .sort((a, b) => (Number(b.funds_available_for_ads || 0) + Number(b.ad_remaining || 0)) - (Number(a.funds_available_for_ads || 0) + Number(a.ad_remaining || 0)))[0]

  const openSpend = async investor => {
    const target = pickFundingRecord(investor)
    if (!target) return setError('No advertising funding record is available for this investor.')
    setSpendModal({ investor, target }); setSpendData(null); setSpendLoading(true); setSpendForm({ amount: '', platform: '', campaign: '', spendDate: '', reference: '', notes: '' })
    try { setSpendData(await request(`/investments/admin/${target.id}/ad-spend`)) } catch (e) { setError(e.message || 'Unable to load ad spending.') } finally { setSpendLoading(false) }
  }

  const submitSpend = async event => {
    event.preventDefault(); if (!spendModal) return
    if (!Number(spendForm.amount) || Number(spendForm.amount) <= 0) return setError('Enter a valid ad spend amount.')
    setSpendBusy(true); setError('')
    try { await request(`/investments/admin/${spendModal.target.id}/ad-spend`, { method: 'POST', body: JSON.stringify(spendForm) }); await load(true); setSpendModal(null); setSpendData(null) }
    catch (e) { setError(e.message || 'Unable to record ad spend.') } finally { setSpendBusy(false) }
  }

  const openPayout = investor => {
    const target = investor.records.find(x => Number(x.payable_now || 0) > 0)
    if (!target) return setError('No earnings are currently ready for transfer.')
    setPayoutModal({ investor, target }); setTransferReference(''); setProofFile(null); setError('')
  }

  const submitPayout = async () => {
    if (!payoutModal) return
    const automatic = Boolean(payoutModal.target.reinvestment_enabled)
    if (!automatic) { if (!transferReference.trim()) return setError('Enter the transfer reference / UTR.'); if (!proofFile) return setError('Attach the transfer screenshot or proof.'); if (proofFile.size > 5 * 1024 * 1024) return setError('Transfer proof must be 5 MB or smaller.') }
    setPayoutBusy(true); setError('')
    try {
      const proofUrl = automatic ? null : await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read transfer proof')); reader.readAsDataURL(proofFile) })
      await request(`/investments/admin/${payoutModal.target.id}/payout`, { method: 'POST', body: JSON.stringify({ transferReference: automatic ? '' : transferReference.trim(), proofUrl }) })
      setPayoutModal(null); setTransferReference(''); setProofFile(null); await load()
    } catch (e) { setError(e.message || 'Unable to settle investor earnings.') } finally { setPayoutBusy(false) }
  }

  return <main className="admin-investments-page">
    <header className="admin-investments-head"><div><div className="admin-kicker">INVESTOR MANAGEMENT</div><h1>Investments</h1><p>One account for investor capital, advertising, lead sales and earnings.</p></div><div className="admin-commission-card"><div><span>ProPulse commission</span><small>Fee on lead sales</small></div><div className="admin-commission-input"><input type="number" min="0" max="100" step="0.1" value={commissionPercent} onChange={e => setCommissionPercent(e.target.value)} disabled={settingsLoading || settingsBusy} /><b>%</b></div><button onClick={saveCommission} disabled={settingsLoading || settingsBusy}>{settingsBusy ? 'Saving…' : 'Save'}</button>{commissionMessage && <small className="saved">{commissionMessage}</small>}</div></header>
    {error && <div className="admin-investments-error">{error}</div>}
    <section className="admin-investment-stats">
      <article><span>Investor Capital</span><strong>{money(totals.capital)}</strong><small>Personally contributed</small></article>
      <article><span>Available for Ads</span><strong>{money(totals.adBalance)}</strong><small>Ready to advertise</small></article>
      <article><span>Ad Spend</span><strong>{money(totals.adSpend)}</strong><small>Actually spent</small></article>
      <article><span>Lead Revenue</span><strong>{money(totals.gross)}</strong><small>{totals.leads} linked leads</small></article>
      <article><span>Investor Earnings</span><strong>{money(totals.earnings)}</strong><small>After commission</small></article>
      <article><span>Ready to Transfer</span><strong>{money(totals.payable)}</strong><small>Eligible earnings</small></article>
    </section>
    <section className="admin-money-flow"><div className="flow-heading"><span>HOW IT WORKS</span><h2>One clear money trail</h2></div><div className="flow-steps"><div><i>1</i><b>Investor adds capital</b><small>Up to the configured maximum</small></div><em>→</em><div><i>2</i><b>We run ads</b><small>Capital becomes ad budget</small></div><em>→</em><div><i>3</i><b>Leads are sold</b><small>Sales stay linked to the investor</small></div><em>→</em><div><i>4</i><b>Earnings</b><small>Transfer or auto reinvest</small></div></div></section>
    <section className="admin-maturity-panel"><div><div className="admin-settings-kicker">SETTLEMENT SETTINGS</div><h2>Earnings settlement</h2><p>Controls when realized earnings can be transferred or reinvested.</p></div><div className="admin-maturity-controls"><label><span>Period</span><select value={maturityPreset} onChange={e => { setMaturityPreset(e.target.value); if (e.target.value === 'immediate') setMaturityDays('0'); else if (e.target.value !== 'custom') setMaturityDays(e.target.value) }} disabled={settingsLoading || settingsBusy}>{MATURITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{maturityPreset === 'custom' && <label><span>Days</span><input type="number" min="0" max="3650" value={maturityDays} onChange={e => setMaturityDays(e.target.value)} /></label>}<button onClick={saveSettings} disabled={settingsLoading || settingsBusy}>{settingsBusy ? 'Saving…' : 'Save'}</button></div><div className="admin-maturity-current"><span>Current</span><strong>{settingsLoading ? 'Loading…' : Number(settings?.investment_cycle_days ?? maturityDays ?? 30) === 0 ? 'Immediate' : `${Number(settings?.investment_cycle_days ?? maturityDays ?? 30)} days`}</strong>{settingsMessage && <small>{settingsMessage}</small>}</div></section>
    <section className="admin-investor-list"><div className="admin-list-head"><div><div className="admin-settings-kicker">INVESTOR ACCOUNTS</div><h2>Capital & earnings</h2></div><div className="admin-list-filters"><input placeholder="Search investor, email or industry…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} /><select value={industryId} onChange={e => setIndustryId(e.target.value)}><option value="">All industries</option>{industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="matured">Matured</option><option value="paid">Paid</option><option value="pending">Pending</option></select><button onClick={() => load()}>Search</button></div></div>
      {loading ? <div className="admin-empty">Loading investor accounts…</div> : !investors.length ? <div className="admin-empty">No investor accounts found.</div> : <div className="investor-rows">{investors.map(investor => <article className={`investor-account ${expanded[investor.user_id] ? 'is-open' : ''}`} key={investor.user_id}>
        <div className="investor-main"><button className="investor-chevron" onClick={() => setExpanded(v => ({ ...v, [investor.user_id]: !v[investor.user_id] }))}>{expanded[investor.user_id] ? '⌃' : '⌄'}</button><div className="investor-avatar">{String(investor.user_name || 'I').trim().charAt(0).toUpperCase()}</div><div className="investor-identity"><strong>{investor.user_name || 'Investor'}</strong><span>{investor.user_email || '—'}</span><small>Investor account</small></div><div className="investor-metric"><span>Capital</span><b>{money(investor.total_invested)}</b></div><div className="investor-metric"><span>Ad balance</span><b className="green">{money(investor.adBalance)}</b></div><div className="investor-metric"><span>Lead revenue</span><b>{money(investor.gross)}</b></div><div className="investor-metric"><span>Earnings</span><b className="green">{money(investor.earnings)}</b></div><div className="investor-auto"><span>Auto reinvest</span><b className={investor.auto === 'ON' ? 'on' : investor.auto === 'Mixed' ? 'mixed' : ''}>{investor.auto}</b></div><div className="investor-actions"><button onClick={() => showLinked(investor)}>Leads</button><button className="primary" onClick={() => openSpend(investor)}>+ Spend</button>{Number(investor.payable_now) > 0 && <button className="success" onClick={() => openPayout(investor)}>Transfer</button>}</div></div>
        {expanded[investor.user_id] && <div className="investor-details"><div className="detail-grid"><div><span>Personal capital</span><strong>{money(investor.total_invested)}</strong><small>Counts toward the investor's maximum</small></div><div><span>Available ad balance</span><strong>{money(investor.adBalance)}</strong><small>Can fund future advertising</small></div><div><span>Total ad spend</span><strong>{money(investor.ad_spent)}</strong><small>Actual advertising spend</small></div><div><span>Gross lead sales</span><strong>{money(investor.gross)}</strong><small>{investor.sold_linked_leads || 0} sold leads</small></div><div><span>ProPulse commission</span><strong>{money(investor.commission)}</strong><small>Gross sales minus investor earnings</small></div><div><span>Investor earnings</span><strong className="green-text">{money(investor.earnings)}</strong><small>Generated from linked lead sales</small></div><div><span>Ready to transfer</span><strong className="orange-text">{money(investor.payable_now)}</strong><small>Currently eligible</small></div><div><span>Auto reinvest</span><strong>{investor.auto}</strong><small>Reinvests eligible earnings into advertising</small></div></div><div className="detail-actions"><button onClick={() => showLinked(investor)}>View linked leads</button><button onClick={() => openSpend(investor)}>Add ad spend</button>{Number(investor.payable_now) > 0 && <button className="success" onClick={() => openPayout(investor)}>Transfer / settle earnings</button>}</div></div>}
      </article>)}</div>}
    </section>

    {linked && <div className="admin-modal-backdrop" onMouseDown={() => setLinked(null)}><div className="admin-modal leads-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setLinked(null)}>×</button><div className="admin-settings-kicker">INVESTOR LEADS</div><h2>{linked.investor.user_name || 'Investor'}</h2><p>{linked.items.length} linked leads</p>{linkedLoading ? <div className="admin-empty">Loading leads…</div> : !linked.items.length ? <div className="admin-empty">No linked leads found.</div> : <div className="lead-table"><div className="lead-table-head"><span>Lead</span><span>Industry</span><span>Sales</span><span>Gross</span><span>Investor earning</span></div>{linked.items.map(lead => <div className="lead-table-row" key={lead.id}><div><b>#{lead.id} · {lead.name || 'Lead'}</b><small>{lead.state_name || '—'}{lead.city_name ? `, ${lead.city_name}` : ''}</small></div><span>{lead.industry_name || '—'}</span><span>{lead.paid_sale_count || 0}</span><span>{money(lead.gross_sale_amount)}</span><strong>{money(lead.investor_revenue)}</strong></div>)}</div>}</div></div>}
    {spendModal && <div className="admin-modal-backdrop" onMouseDown={() => setSpendModal(null)}><div className="admin-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSpendModal(null)}>×</button><div className="admin-settings-kicker">ADVERTISING</div><h2>Spend investor ad balance</h2><p>{spendModal.investor.user_name || 'Investor'} · Account balance {money(spendModal.investor.adBalance)}</p>{spendLoading ? <div className="admin-empty">Loading ad balance…</div> : <form onSubmit={submitSpend}><div className="spend-available"><span>Current funding available</span><strong>{money(Number(spendData?.investment?.funds_available_for_ads || 0) + Number(spendData?.investment?.ad_remaining || 0))}</strong></div><label>Amount<input autoFocus type="number" min="0.01" step="0.01" value={spendForm.amount} onChange={e => setSpendForm(v => ({ ...v, amount: e.target.value }))} required /></label><div className="modal-grid"><label>Platform<input value={spendForm.platform} onChange={e => setSpendForm(v => ({ ...v, platform: e.target.value }))} placeholder="Meta, Google…" /></label><label>Campaign<input value={spendForm.campaign} onChange={e => setSpendForm(v => ({ ...v, campaign: e.target.value }))} /></label></div><label>Reference<input value={spendForm.reference} onChange={e => setSpendForm(v => ({ ...v, reference: e.target.value }))} /></label><label>Notes<textarea value={spendForm.notes} onChange={e => setSpendForm(v => ({ ...v, notes: e.target.value }))} /></label><div className="modal-actions"><button type="button" onClick={() => setSpendModal(null)}>Cancel</button><button className="primary" disabled={spendBusy}>{spendBusy ? 'Saving…' : 'Record ad spend'}</button></div></form>}</div></div>}
    {payoutModal && <div className="admin-modal-backdrop" onMouseDown={() => setPayoutModal(null)}><div className="admin-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setPayoutModal(null)}>×</button><div className="admin-settings-kicker">EARNINGS SETTLEMENT</div><h2>{payoutModal.target.reinvestment_enabled ? 'Reinvest investor earnings' : 'Transfer investor earnings'}</h2><p>{payoutModal.investor.user_name || 'Investor'} · {money(payoutModal.target.payable_now)} ready</p>{payoutModal.target.reinvestment_enabled ? <div className="auto-reinvest-box"><strong>Auto reinvest is ON</strong><span>Eligible earnings will be moved back into advertising instead of being transferred to the bank.</span></div> : <><label>Transfer reference / UTR<input value={transferReference} onChange={e => setTransferReference(e.target.value)} /></label><label>Transfer proof<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e => setProofFile(e.target.files?.[0] || null)} /></label></>}<div className="modal-actions"><button onClick={() => setPayoutModal(null)}>Cancel</button><button className="success" onClick={submitPayout} disabled={payoutBusy}>{payoutBusy ? 'Processing…' : payoutModal.target.reinvestment_enabled ? 'Reinvest earnings' : 'Confirm transfer'}</button></div></div></div>}
  </main>
}
