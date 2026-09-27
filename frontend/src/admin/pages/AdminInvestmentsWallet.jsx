import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { getToken, clearSession } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminInvestmentsPremium.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const MATURITY_OPTIONS = [
  { value: 'immediate', label: 'Immediate · testing' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' },
  { value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: '180', label: '180 days' }, { value: '365', label: '365 days' }, { value: 'custom', label: 'Custom' },
]

const historyStyles = `
.investor-history-modal{width:min(980px,100%);height:min(900px,calc(100vh - 40px));max-height:calc(100vh - 40px);padding:0;overflow:hidden;display:flex;flex-direction:column;background:#fff;border:1px solid #dce7f2}.investor-history-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 26px;border-bottom:1px solid #e4ebf3;flex:0 0 auto}.investor-history-head-left{display:flex;align-items:center;gap:13px;min-width:0}.investor-history-avatar{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#edf5fd;color:#165394;font-size:14px;font-weight:900;flex:0 0 44px}.investor-history-head h2{margin:0;color:#123d7b;font-size:20px;font-weight:850}.investor-history-head p{margin:4px 0 0;color:#7a8da5;font-size:10px}.investor-history-close{width:34px;height:34px;border:1px solid #dce6ef;border-radius:9px;background:#fff;color:#5c718b;font-size:20px;cursor:pointer}.investor-history-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;padding:16px 26px;background:#f8fbfe;border-bottom:1px solid #e5edf5;flex:0 0 auto}.history-summary-card{padding:13px 14px;border:1px solid #dce8f3;border-radius:10px;background:#fff}.history-summary-card span{display:block;color:#7287a2;font-size:9px;font-weight:850}.history-summary-card strong{display:block;margin-top:6px;color:#123f7b;font-size:18px;font-weight:850;white-space:nowrap}.history-summary-card.green strong{color:#07985a}.history-summary-card.orange strong{color:#dd542f}.history-summary-card.blue strong{color:#1679df}.history-summary-card small{display:block;margin-top:4px;color:#8a9bb0;font-size:8px;line-height:1.3}.investor-history-body{padding:0 26px 76px;min-height:0;overflow-y:auto;overflow-x:hidden;flex:1;scroll-padding-bottom:76px}.history-caption{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 0 12px;position:sticky;top:0;background:#fff;z-index:2}.history-caption h3{margin:0;color:#123d7b;font-size:14px;font-weight:850}.history-caption span{color:#7a8ea8;font-size:9px}.history-table{border:1px solid #dce7f1;border-radius:11px;overflow:visible;background:#fff}.history-table-head,.history-table-row{display:grid;grid-template-columns:42px minmax(155px,1.3fr) 120px 120px minmax(210px,2fr) 145px;gap:10px;align-items:center}.history-table-head{min-height:42px;padding:0 14px;background:#f3f7fb;color:#7388a3;font-size:9px;font-weight:900;position:sticky;top:53px;z-index:1;border-radius:10px 10px 0 0}.history-table-row{min-height:67px;padding:8px 14px;border-top:1px solid #e8eef4;background:#fff}.history-table-row:last-child{border-radius:0 0 10px 10px}.history-index{color:#4c6786;font-size:9px}.history-type{display:flex;align-items:center;gap:9px;min-width:0}.history-icon{display:grid;place-items:center;width:29px;height:29px;border-radius:9px;font-size:15px;font-weight:900;flex:0 0 29px}.history-icon.investment{background:#eaf3ff;color:#1679df}.history-icon.spend{background:#fff0eb;color:#ed5b36}.history-icon.revenue{background:#e8faf1;color:#0a9b5c}.history-icon.reinvest{background:#e8f8f2;color:#08a16a}.history-icon.paid{background:#fff0eb;color:#dd542f}.history-type strong{display:block;color:#173f78;font-size:10px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.history-amount{font-size:11px;font-weight:900;white-space:nowrap}.history-amount.credit{color:#07985a}.history-amount.debit{color:#df5030}.history-balance{color:#153f78;font-size:11px;font-weight:850;white-space:nowrap}.history-description{color:#617894;font-size:9px;line-height:1.4}.history-description small{color:#91a0b2}.history-date{color:#496785;font-size:9px;line-height:1.4}.history-empty{padding:46px 20px;text-align:center;color:#8497ae;font-size:11px}.history-note{display:flex;align-items:flex-start;gap:9px;margin-top:14px;padding:12px 14px;border-radius:9px;background:#edf5fe;color:#5e7898;font-size:9px;line-height:1.5}.history-note i{display:grid;place-items:center;width:17px;height:17px;border:2px solid #1684eb;border-radius:50%;color:#1684eb;font-style:normal;font-size:9px;font-weight:900;flex:0 0 17px}@media(max-width:980px){.investor-history-summary{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:820px){.investor-history-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.history-table{overflow:auto}.history-table-head,.history-table-row{min-width:800px}.investor-history-head,.investor-history-body{padding-left:16px;padding-right:16px}.investor-history-summary{padding-left:16px;padding-right:16px}}
`

export default function AdminInvestmentsWallet() {
  const navigate = useNavigate()
  const [data, setData] = useState({ investors: [] })
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('all'); const [industryId, setIndustryId] = useState(''); const searchRef = useRef('')
  const [industries, setIndustries] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const [account, setAccount] = useState(null); const [linked, setLinked] = useState(null); const [linkedLoading, setLinkedLoading] = useState(false); const [menuUserId, setMenuUserId] = useState(null)
  const [settings, setSettings] = useState(null); const [maturityPreset, setMaturityPreset] = useState('30'); const [maturityDays, setMaturityDays] = useState('30'); const [commissionPercent, setCommissionPercent] = useState('5')
  const [settingsLoading, setSettingsLoading] = useState(true); const [settingsBusy, setSettingsBusy] = useState(false); const [settingsMessage, setSettingsMessage] = useState(''); const [commissionMessage, setCommissionMessage] = useState('')

  const request = useCallback(async (path, options = {}) => {
    if (!getToken()) {
      clearSession()
      navigate('/login', { replace: true })
      throw new Error('Your admin session has expired. Please sign in again.')
    }
    return apiRequest(path, options)
  }, [navigate])
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ search: searchRef.current.trim(), status, industryId })
      const dashboard = await request(`/admin/commercial/investment-dashboard?${params}`)
      setData({ investors: dashboard.investors || [] })
    } catch (e) {
      if (!silent) setError(e.message || 'Unable to load investor accounts.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [request, status, industryId])
  const loadIndustries = useCallback(async () => {
    try {
      const industryData = await request('/industries')
      setIndustries(Array.isArray(industryData) ? industryData : industryData?.data || [])
    } catch (e) {
      setError(e.message || 'Unable to load industries.')
    }
  }, [request])
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const result = await request('/admin/commercial/investor-settings')
      setSettings(result)
      const days = Number(result.investment_cycle_days ?? 30)
      setMaturityPreset(days === 0 ? 'immediate' : MATURITY_OPTIONS.some(x => x.value === String(days)) ? String(days) : 'custom')
      setMaturityDays(String(days))
      const share = Number(result.investor_revenue_share_percent)
      setCommissionPercent(String(Number.isFinite(share) ? Math.max(0, Math.min(100, 100 - share)) : 5))
    } catch (e) {
      setError(e.message || 'Unable to load investment settings.')
    } finally {
      setSettingsLoading(false)
    }
  }, [request])
  useEffect(() => { let active=true; queueMicrotask(()=>{if(active)load()}); return()=>{active=false} }, [load])
  useEffect(() => { let active=true; queueMicrotask(()=>{if(active)loadIndustries()}); return()=>{active=false} }, [loadIndustries])
  useEffect(() => { let active=true; queueMicrotask(()=>{if(active)loadSettings()}); return()=>{active=false} }, [loadSettings])

  const investors = useMemo(() => data.investors.map(item => {
    const records = Array.isArray(item.investments) ? item.investments : [];
    const contributedFallback = records.reduce((sum, row) => sum + Number(row.invested_amount || row.amount || 0), 0);
    const ledger = item.ledger || {};
    const statusRecord = records.find(row => ['active','exit_requested','waiting_for_leads'].includes(String(row.status || '').toLowerCase())) || records[0] || {};
    const contributed = Number(ledger.total_invested ?? item.total_invested ?? contributedFallback);
    const availableForAds = Number(ledger.available_for_ads ?? item.ad_wallet_balance ?? item.ad_available ?? 0);
    const adSpent = Number(ledger.ad_spent ?? item.ad_spent ?? 0);
    const generated = Number(ledger.generated ?? item.total_generated ?? item.generated_amount ?? 0);
    const transferable = Number(ledger.transferable ?? item.payable_now ?? item.transferable ?? 0);
    const payoutReserved = Number(ledger.payout_reserved ?? item.payout_reserved ?? 0);
    const payoutTransferred = Number(ledger.payout_transferred ?? item.payout_transferred ?? 0);
    const cycleStatus = String(statusRecord.status || item.status || 'pending').toLowerCase();
    const cycleId = statusRecord.cycle_id || item.current_cycle_id || null;
    return {
      ...item,
      records,
      user_id: Number(item.user_id || item.id || 0),
      user_name: item.user_name || item.name || item.investor_name || 'Investor',
      user_email: item.user_email || item.email || '',
      industry_name: item.industry_name || statusRecord.industry_name || '',
      contributed,
      availableForAds,
      adSpent,
      generated,
      transferable,
      payoutReserved,
      payoutTransferred,
      bankTransfer: transferable,
      adBalance: availableForAds,
      status: cycleStatus,
      cycleId,
      cycleStartedAt: statusRecord.started_at || statusRecord.created_at || item.created_at || null,
      active: ['active','exit_requested','waiting_for_leads'].includes(cycleStatus),
      joinedAt: item.created_at || statusRecord.created_at || null
    };
  }), [data.investors]);

  const totals = useMemo(() => investors.reduce((acc, investor) => {
    acc.capital += investor.contributed;
    acc.availableForAds += investor.availableForAds;
    acc.generated += investor.generated;
    acc.transferable += investor.transferable;
    acc.reserved += investor.payoutReserved;
    acc.transferred += investor.payoutTransferred;
    acc.adSpent += investor.adSpent;
    if (investor.active) acc.active += 1;
    if (investor.transferable > 0) acc.ready += 1;
    return acc;
  }, {capital:0,availableForAds:0,generated:0,transferable:0,reserved:0,transferred:0,adSpent:0,active:0,ready:0}), [investors]);

  const saveSettings = async (days, commission) => { if (!settings) return; const d = Number(days), c = Number(commission); if (!Number.isInteger(d) || d < 0 || d > 3650) throw new Error('Settlement period must be between 0 and 3650 days.'); if (!Number.isFinite(c) || c < 0 || c > 100) throw new Error('Commission must be between 0% and 100%.'); return request('/admin/commercial/investor-settings', { method: 'PUT', body: JSON.stringify({ globalLimit: settings.global_limit, defaultIndustryLimit: settings.default_industry_limit, customerIndustryLimit: settings.customer_industry_limit, minInvestment: settings.min_investment, maxInvestment: settings.max_investment == null ? '' : settings.max_investment, enabled: Boolean(settings.is_enabled ?? settings.enabled), requiresPro: Boolean(settings.requires_pro), investmentCycleDays: d, autoReinvest: settings.auto_reinvest == null ? false : Boolean(settings.auto_reinvest), investorRevenueSharePercent: 100 - c }) }) }
  const saveCommission = async () => { setSettingsBusy(true); setCommissionMessage(''); setError(''); try { const updated = await saveSettings(Number(settings?.investment_cycle_days ?? maturityDays ?? 30), commissionPercent); setSettings(updated); setCommissionMessage('Saved'); await load(true) } catch (e) { setError(e.message || 'Unable to save commission.') } finally { setSettingsBusy(false) } }
  const saveMaturity = async () => { setSettingsBusy(true); setSettingsMessage(''); setError(''); try { const updated = await saveSettings(maturityDays, commissionPercent); setSettings(updated); setSettingsMessage('Saved'); await load(true) } catch (e) { setError(e.message || 'Unable to save settlement period.') } finally { setSettingsBusy(false) } }

  const buildHistory = investor => {
    const records = [...investor.records].sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || Number(a.id) - Number(b.id)); const childByParent = new Map(records.filter(x => x.parent_investment_id != null).map(x => [Number(x.parent_investment_id), x])); const events = []
    const push = (e, order) => events.push({ ...e, _order: order })
    records.forEach(record => { const funding = Number(record.amount || 0); const spend = Number(record.ad_spent || 0); const revenue = Number(record.allocated_revenue || 0); const ref = String(record.payout_transfer_reference || '').trim().toUpperCase(); const child = childByParent.get(Number(record.id));
      if (!record.is_reinvestment && funding > 0) push({ type: 'investment', date: record.created_at, title: 'Investment added', amount: funding, description: 'Investor contributed capital', reference: `#INV-${record.id}` }, 10)
      if (spend > 0) push({ type: 'spend', date: record.updated_at || record.created_at, title: 'Ads spent', amount: -spend, description: 'Actual advertising spend', reference: `#ADS-${record.id}` }, 20)
      if (revenue > 0) push({ type: 'revenue', date: record.updated_at || record.created_at, title: 'Lead sold', amount: revenue, description: `${Number(record.allocated_sales || record.linked_paid_sales || 0)} lead sale(s) purchased by a customer`, reference: `#SALE-${record.id}` }, 30)
      if (ref.startsWith('REINVESTMENT-') && child) { const amount = Number(child.amount || 0); if (amount > 0) push({ type: 'reinvest', date: child.created_at || record.updated_at || record.created_at, title: 'Reinvested', amount: -amount, description: 'Earnings moved back into advertising', reference: `#REINV-${child.id}` }, 40) }
      else if (record.status === 'paid' && Number(record.paid_to_investor || 0) > 0) { const amount = Number(record.paid_to_investor || 0); push({ type: 'paid', date: record.updated_at || record.created_at, title: 'Transferred to investor', amount: -amount, description: 'Earnings transferred to investor account', reference: `#TRF-${record.id}` }, 50) }
    })
    let balance = 0; return events.sort((a, b) => new Date(a.date) - new Date(b.date) || a._order - b._order).map((e, i) => { balance = Math.round((balance + e.amount + Number.EPSILON) * 100) / 100; return { ...e, balance, index: i + 1 } }).reverse()
  }
  const showAccount = investor => { setLinked(null); setAccount({ ...investor, history: buildHistory(investor) }) }
  const closeAccount = () => { setAccount(null); setLinked(null) }
  const openPayout = async investor => { const amount = Number(investor.bankTransfer || 0); if (amount <= 0) { setError('No investor earnings are ready for bank transfer.'); return } const reference = window.prompt(`Enter bank transfer UTR/reference for ${money(amount)}:`); if (!reference) return; const proofUrl = window.prompt('Enter transfer proof URL (optional):') || ''; try { await request(`/investments/admin/${investor.user_id}/payout`, { method: 'POST', body: JSON.stringify({ amount, transferReference: reference.trim(), proofUrl, forceTransfer: true }) }); await load(true); if (account?.user_id === investor.user_id) closeAccount() } catch (e) { setError(e.message || 'Unable to transfer investor money.') } }
  const addSpend = async investor => { const available = Number(investor.adBalance || 0); const raw = window.prompt(`Enter actual ad spend (available ${money(available)}):`); if (raw == null) return; const amount = Number(raw); if (!Number.isFinite(amount) || amount <= 0) return; try { await request(`/investments/admin/${investor.user_id}/ad-spend`, { method: 'POST', body: JSON.stringify({ investmentId: investor.records.find(x => Number(x.ad_available || 0) > 0)?.id || investor.records.find(x => x.status === 'active' || x.status === 'matured')?.id, amount }) }); await load(true); if (account?.user_id === investor.user_id) showAccount(investor) } catch (e) { setError(e.message || 'Unable to record ad spend.') } }
  const openLinked = async investor => { setLinkedLoading(true); try { setLinked(await request(`/investments/admin/investor/${investor.user_id}/linked-leads`)) } catch (e) { setError(e.message || 'Unable to load linked leads.') } finally { setLinkedLoading(false) } }
  const runSearch = () => load()

  return <>
    <style>{historyStyles}</style>
    <main className="admin-investments-page">
      <section className="investments-hero">
        <div className="investments-hero-copy">
          <span>INVESTOR FINANCE / CYCLE MANAGEMENT</span>
          <h1>Investments</h1>
          <p>Monitor investor capital, ad allocation, generated earnings and transfer-ready balances from the existing investment ledger.</p>
          <div className="investments-hero-meta">
            <span><b>{investors.length}</b> investor accounts</span>
            <span><b>{totals.active}</b> active cycles</span>
            <span><b>{totals.ready}</b> ready for transfer</span>
          </div>
        </div>
        <div className="investments-hero-actions">
          <button type="button" className="secondary" onClick={() => navigate('/admin/investor-withdrawals')}>
            <span>₹</span><div><b>Withdrawal queue</b><small>Review investor transfer requests</small></div>
          </button>
          <button type="button" className="primary" onClick={load} disabled={loading}>
            <span>↻</span><div><b>{loading ? 'Refreshing…' : 'Refresh portfolio'}</b><small>Reload balances and cycles</small></div>
          </button>
        </div>
      </section>

      {error && <div className="admin-investments-error"><div><b>Action needed</b><span>{error}</span></div><button type="button" onClick={() => setError('')}>×</button></div>}

      <section className="admin-investment-stats">
        <article><div className="stat-icon">₹</div><div><span>INVESTOR CAPITAL</span><strong>{money(totals.capital)}</strong><small>Capital recorded in the investor ledger</small></div></article>
        <article className="stat-balance"><div className="stat-icon">A</div><div><span>AVAILABLE FOR ADS</span><strong>{money(totals.availableForAds)}</strong><small>{money(totals.adSpent)} already spent on ads</small></div></article>
        <article className="stat-revenue"><div className="stat-icon">↗</div><div><span>GENERATED EARNINGS</span><strong>{money(totals.generated)}</strong><small>Earnings generated across investor accounts</small></div></article>
        <article className="stat-transfer"><div className="stat-icon">→</div><div><span>READY TO TRANSFER</span><strong>{money(totals.transferable)}</strong><small>{money(totals.reserved)} currently reserved for payouts</small></div></article>
        <article className="stat-paid"><div className="stat-icon">✓</div><div><span>TRANSFERRED</span><strong>{money(totals.transferred)}</strong><small>Completed investor payout value</small></div></article>
      </section>

      <section className="investments-rules-panel">
        <div className="investments-section-heading">
          <div><span>PORTFOLIO RULES</span><h2>Investment settings</h2><p>Configure the existing revenue share and settlement policy used by investor cycles.</p></div>
          <div className="rule-summary">
            <span>ProPulse <b>{settings.platformCommissionPercent}%</b></span>
            <span>Investor <b>{Math.max(0,100-Number(settings.platformCommissionPercent||0))}%</b></span>
            <span>Settlement <b>{settings.maturityValue} {settings.maturityUnit}</b></span>
          </div>
        </div>
        <div className="admin-settings-grid">
          <article className="settings-card">
            <div className="settings-card-head"><div className="settings-icon">%</div><div><span>REVENUE SHARE</span><h3>ProPulse commission</h3><p>Platform share retained from eligible investment-generated revenue.</p></div></div>
            <div className="settings-value-preview"><span>INVESTOR RECEIVES</span><strong>{Math.max(0,100-Number(settings.platformCommissionPercent||0))}%</strong></div>
            <div className="settings-bottom">
              <label className="settings-field"><span>Commission percentage</span><div className="percent-input"><input type="number" min="0" max="100" step="0.01" value={settings.platformCommissionPercent} onChange={e=>setSettings(v=>({...v,platformCommissionPercent:e.target.value}))}/><b>%</b></div></label>
              <button type="button" onClick={()=>saveSettings('commission')} disabled={settingsBusy==='commission'}>{settingsBusy==='commission'?'Saving…':'Save share'}</button>
            </div>
            {settingsMessage.commission && <div className="settings-success"><i>✓</i>{settingsMessage.commission}</div>}
          </article>

          <article className="settings-card">
            <div className="settings-card-head"><div className="settings-icon clock">◷</div><div><span>SETTLEMENT WINDOW</span><h3>Maturity period</h3><p>Controls the default maturity/settlement period for the existing investment cycle flow.</p></div></div>
            <div className="maturity-row">
              <label className="settings-field"><span>Period unit</span><select value={settings.maturityUnit} onChange={e=>setSettings(v=>({...v,maturityUnit:e.target.value}))}><option value="days">Days</option><option value="months">Months</option></select></label>
              <label className="settings-field days-field"><span>Value</span><input type="number" min="1" step="1" value={settings.maturityValue} onChange={e=>setSettings(v=>({...v,maturityValue:e.target.value}))}/></label>
              <button type="button" onClick={()=>saveSettings('maturity')} disabled={settingsBusy==='maturity'}>{settingsBusy==='maturity'?'Saving…':'Save period'}</button>
            </div>
            <div className="settings-info"><i>i</i><span>This updates the existing investor cycle settings; it does not create a second maturity system.</span></div>
            {settingsMessage.maturity && <div className="settings-success"><i>✓</i>{settingsMessage.maturity}</div>}
          </article>
        </div>
      </section>

      <section className="admin-investor-list">
        <div className="admin-list-head">
          <div className="investors-title"><span>INVESTOR LEDGER</span><h2>Investor accounts</h2><p>Open an account for cycle history, linked leads and existing investment actions.</p></div>
          <div className="admin-list-filters">
            <input ref={searchRef} defaultValue={search} onChange={e=>setSearch(e.target.value)} placeholder="Search investor name or email"/>
            <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="matured">Matured</option><option value="exit_requested">Exit requested</option><option value="waiting_for_leads">Waiting for leads</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select>
            <select value={industryId} onChange={e=>setIndustryId(e.target.value)}><option value="">All industries</option>{data.industries.map(industry=><option key={industry.id} value={industry.id}>{industry.name}</option>)}</select>
            <select value={limit} onChange={e=>setLimit(Number(e.target.value))}><option value={25}>25 rows</option><option value={50}>50 rows</option><option value={100}>100 rows</option></select>
            <button type="button" onClick={runSearch}>Search</button>
          </div>
        </div>

        {loading ? <div className="admin-empty"><div className="investment-loader"/>Loading investor ledger…</div> :
        !investors.length ? <div className="admin-empty"><div className="empty-investments-icon">₹</div><div><strong>No investor accounts found</strong><span>Try another filter or search.</span></div></div> :
        <div className="investor-table-wrap">
          <div className="investor-table-head"><span>#</span><span>Investor</span><span>Capital</span><span>Ads available</span><span>Generated</span><span>Transferable</span><span>Cycle</span><span>Status</span><span>Action</span></div>
          {investors.map((investor,index)=><div className={['investor-table-row',investor.transferable>0?'needs-transfer':''].filter(Boolean).join(' ')} key={investor.user_id || index}>
            <span className="row-number">{String(index+1).padStart(2,'0')}</span>
            <div className="row-investor"><span className="row-avatar">{String(investor.user_name||'?').charAt(0).toUpperCase()}</span><div><strong>{investor.user_name || ('Investor #' + investor.user_id)}</strong><small>{investor.user_email || '—'}</small><em>{investor.industry_name || 'No industry assigned'}</em></div></div>
            <div className="row-money"><strong>{money(investor.contributed)}</strong><small>Total invested</small></div>
            <div className="row-money ads"><strong>{money(investor.availableForAds)}</strong><small>{money(investor.adSpent)} spent</small></div>
            <div className="row-money generated"><strong>{money(investor.generated)}</strong><small>Generated</small></div>
            <div className={['row-money','transferable',investor.transferable>0?'ready':''].filter(Boolean).join(' ')}><strong>{money(investor.transferable)}</strong><small>{investor.payoutReserved>0 ? money(investor.payoutReserved) + ' reserved' : 'Available to transfer'}</small></div>
            <div className="cycle-cell"><strong>{investor.cycleId ? '#' + investor.cycleId : '—'}</strong><small>{investor.cycleStartedAt ? date(investor.cycleStartedAt) : 'No active cycle'}</small></div>
            <span className={'status-pill ' + investor.status}>{title(investor.status)}</span>
            <div className="row-actions">
              <button className="view-btn" type="button" onClick={()=>openHistory(investor)}><span>↗</span>Open account</button>
              {menuUserId===investor.user_id && <div className="investment-actions-menu">
                <button type="button" onClick={()=>openHistory(investor)}>Cycle history</button>
                <button type="button" onClick={()=>openLinked(investor)}>Linked leads</button>
                <button type="button" onClick={()=>addSpend(investor)}>Spend on ads</button>
                <button type="button" onClick={()=>openPayout(investor)}>Record transfer</button>
              </div>}
            </div>
          </div>)}
          <div className="table-footer"><span>Showing <b>{investors.length}</b> investor accounts from the current dashboard view</span><span className="ledger-note">Balances shown from the existing investment ledger</span></div>
        </div>}
      </section>
    </main>
    {account && <div className="admin-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeAccount() }}><section className="admin-modal investor-history-modal" onMouseDown={e => e.stopPropagation()}>
      <div className="investor-history-head"><div className="investor-history-head-left"><span className="investor-history-avatar">{String(account.user_name || account.name || account.full_name || 'I').slice(0, 1).toUpperCase()}</span><div><h2>{account.user_name || account.name || account.full_name || `Investor #${account.user_id}`} · Transaction History</h2><p>{account.user_email || account.email || `Account ID ${account.user_id}`} · One running balance for all money movement</p></div></div><button className="investor-history-close" onClick={closeAccount}>×</button></div>
      <div className="investor-history-summary"><div className="history-summary-card"><span>Current Balance</span><strong>{money(account.history?.[0]?.balance || 0)}</strong><small>Running balance after the latest transaction</small></div><div className="history-summary-card"><span>Total Invested</span><strong>{money(account.contributed)}</strong><small>Investor-contributed capital</small></div><div className="history-summary-card blue"><span>Available for Ads</span><strong>{money(account.availableForAds)}</strong><small>Includes pending auto-invest earnings</small></div><div className="history-summary-card orange"><span>Transfer to Bank</span><strong>{money(account.bankTransfer)}</strong><small>Non-auto-invest earnings ready for bank transfer</small></div><div className="history-summary-card green"><span>Total Lead Revenue</span><strong>{money(account.gross)}</strong><small>Linked paid lead sales</small></div></div>
      <div className="investor-history-body"><div className="history-caption"><h3>Transaction History</h3><span>{account.history?.length || 0} transactions · scroll to view all</span></div><div className="history-table"><div className="history-table-head"><span>#</span><span>Type</span><span>Amount</span><span>Balance After</span><span>Description</span><span>Date</span></div>{account.history?.length ? account.history.map(row => <div className="history-table-row" key={`${row.type}-${row.index}-${row.reference}`}><span className="history-index">{row.index}</span><div className="history-type"><span className={`history-icon ${row.type}`}>{row.type === 'investment' ? '+' : row.type === 'spend' || row.type === 'paid' ? '−' : row.type === 'revenue' ? '₹' : '↻'}</span><strong>{row.title}</strong></div><span className={`history-amount ${row.amount >= 0 ? 'credit' : 'debit'}`}>{row.amount >= 0 ? '+' : '−'}{money(Math.abs(row.amount))}</span><span className="history-balance">{money(row.balance)}</span><span className="history-description">{row.description} <small>{row.reference}</small></span><span className="history-date">{dateTime(row.date)}</span></div>) : <div className="history-empty">No transactions recorded for this investor yet.</div>}</div><div className="history-note"><i>i</i><span><strong>Fund routing:</strong> auto-invest earnings are shown in Available for Ads; earnings from investments without auto-invest are shown in Transfer to Bank. A completed reinvestment is already included in the advertising balance and is never counted twice.</span></div></div>
    </section></div>}
    {linked && <div className="admin-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setLinked(null) }}><section className="admin-modal account-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setLinked(null)}>×</button><h2>Linked Leads</h2><p>Leads assigned to this investor and their revenue allocation.</p>{linkedLoading ? <div className="admin-empty">Loading…</div> : <div className="lead-table"><div className="lead-table-head"><span>Lead</span><span>Buyer</span><span>Amount</span><span>Status</span><span>Investor Revenue</span></div>{(linked.leads || []).map(lead => <div className="lead-table-row" key={lead.id}><span><strong>#{lead.id}</strong><small>{lead.service_name || lead.industry_name || 'Lead'}</small></span><span>{lead.buyer_name || '—'}</span><span>{money(lead.amount)}</span><span>{lead.status}</span><span>{money(lead.investor_revenue)}</span></div>)}</div>}</section></div>}
  </>
}
