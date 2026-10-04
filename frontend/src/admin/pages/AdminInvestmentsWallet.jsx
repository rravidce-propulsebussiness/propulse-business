import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InvestorActionModals from './InvestorActionModals'
import './InvestorActionModals.css'
import './AdminInvestmentsPremium.css'
import useAdminRequest from '../hooks/useAdminRequest'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const MATURITY_OPTIONS = [
  { value: 'immediate', label: 'Immediate · testing' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' },
  { value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: '180', label: '180 days' }, { value: '365', label: '365 days' }, { value: 'custom', label: 'Custom' },
]

export default function AdminInvestmentsWallet() {
  const navigate = useNavigate()
  const [data, setData] = useState({ investors: [], portfolio: {}, pagination: {page:1,pages:1,total:0,limit:30} })
  const [page,setPage]=useState(1)
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('all'); const [industryId, setIndustryId] = useState(''); const searchRef = useRef('')
  const [industries, setIndustries] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const [account, setAccount] = useState(null); const [linked, setLinked] = useState(null); const [linkedLoading, setLinkedLoading] = useState(false); const [linkedInvestor,setLinkedInvestor]=useState(null); const [menuUserId, setMenuUserId] = useState(null)
  const [actionState,setActionState]=useState({type:null,investor:null})
  const [settings, setSettings] = useState(null); const [maturityPreset, setMaturityPreset] = useState('30'); const [maturityDays, setMaturityDays] = useState('30'); const [commissionPercent, setCommissionPercent] = useState('5')
  const [settingsLoading, setSettingsLoading] = useState(true); const [settingsBusy, setSettingsBusy] = useState(false); const [settingsMessage, setSettingsMessage] = useState(''); const [commissionMessage, setCommissionMessage] = useState('')

  const request = useAdminRequest()
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ search: searchRef.current.trim(), status, industryId, page:String(page), limit:'30' })
      const dashboard = await request(`/admin/commercial/investment-dashboard?${params}`)
      setData({ investors: dashboard.investors || [], portfolio: dashboard.portfolio || {}, pagination: dashboard.pagination || {page:1,pages:1,total:0,limit:30} })
    } catch (e) {
      if (!silent) setError(e.message || 'Unable to load investor accounts.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [request, status, industryId, page])
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
    const records = Array.isArray(item.investments) ? item.investments : Array.isArray(item.cycles) ? item.cycles : [];
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
    const cycleStatus = String(statusRecord.status || item.current_cycle_status || item.status || 'pending').toLowerCase();
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
      gross: generated,
      transferable,
      payable: transferable,
      payoutReserved,
      payoutTransferred,
      bankTransfer: transferable,
      adBalance: availableForAds,
      status: cycleStatus,
      accountStatus: cycleStatus,
      cycleId,
      cycleStartedAt: statusRecord.started_at || statusRecord.created_at || item.created_at || null,
      active: ['active','exit_requested','waiting_for_leads'].includes(cycleStatus),
      autoInvest: Boolean(statusRecord.auto_invest ?? statusRecord.cycle_auto_invest ?? item.auto_invest),
      joinedAt: item.created_at || statusRecord.created_at || null
    };
  }), [data.investors]);

  const totals = useMemo(() => {
    const portfolio=data.portfolio||{}
    return {
      capital:Number(portfolio.capital||0),
      availableForAds:Number(portfolio.availableForAds||0),
      generated:Number(portfolio.generated||0),
      transferable:Number(portfolio.transferable||0),
      reserved:Number(portfolio.reserved||0),
      transferred:Number(portfolio.transferred||0),
      adSpent:Number(portfolio.adSpent||0),
      ready:Number(portfolio.ready||0),
      active:investors.filter(investor=>investor.active).length
    }
  }, [data.portfolio, investors])

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
  const closeAccount = () => { setAccount(null); setLinked(null); setLinkedInvestor(null) }
  const openPayout = async investor => { const amount = Number(investor.bankTransfer || 0); if (amount <= 0) { setError('No investor earnings are ready for bank transfer.'); return } const reference = window.prompt(`Enter bank transfer UTR/reference for ${money(amount)}:`); if (!reference) return; const proofUrl = window.prompt('Enter transfer proof URL (optional):') || ''; try { await request(`/investments/admin/${investor.user_id}/payout`, { method: 'POST', body: JSON.stringify({ amount, transferReference: reference.trim(), proofUrl, forceTransfer: true }) }); await load(true); if (account?.user_id === investor.user_id) closeAccount() } catch (e) { setError(e.message || 'Unable to transfer investor money.') } }
  const openSpend = investor => {
    if(!investor?.active||!investor?.autoInvest||Number(investor.availableForAds||0)<=0){
      setError('No active Auto-Invest advertising balance is available for this investor.')
      return
    }
    setActionState({type:'spend',investor})
  }
  const closeActions=()=>setActionState({type:null,investor:null})
  const handleSpend=async payload=>{
    const investor=actionState.investor
    if(!investor?.user_id||Number(payload?.amount||0)<=0)return
    try{
      await request(`/investments/admin/investor/${investor.user_id}/managed-ad-spend`,{method:'POST',body:JSON.stringify(payload)})
      closeActions()
      if(account?.user_id===investor.user_id)closeAccount()
      await load(true)
    }catch(e){setError(e.message||'Unable to record ad spend.')}
  }
  const loadLinkedPage = async (investor,page=1) => { setLinkedLoading(true); try { const result=await request(`/investments/admin/investor/${investor.user_id}/linked-leads?page=${page}&limit=50`); setLinked(result); setLinkedInvestor(investor) } catch (e) { setError(e.message || 'Unable to load linked leads.') } finally { setLinkedLoading(false) } }
  const openLinked = investor => loadLinkedPage(investor,1)
  const runSearch = () => { if(page!==1)setPage(1); else load() }

  return <>
    <main className="admin-investments-page">
      <section className="investments-hero">
        <div className="investments-hero-copy">
          <span>INVESTOR FINANCE / CYCLE MANAGEMENT</span>
          <h1>Investments</h1>
          <p>Monitor investor capital, ad allocation, generated earnings and transfer-ready balances from the existing investment ledger.</p>
          <div className="investments-hero-meta">
            <span><b>{Number(data.pagination?.total||0)}</b> investor accounts</span>
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
            <span>ProPulse <b>{commissionPercent}%</b></span>
            <span>Investor <b>{Math.max(0,100-Number(commissionPercent||0))}%</b></span>
            <span>Settlement <b>{Number(maturityDays) === 0 ? 'Immediate' : maturityDays + ' days'}</b></span>
          </div>
        </div>
        <div className="admin-settings-grid">
          <article className="settings-card">
            <div className="settings-card-head"><div className="settings-icon">%</div><div><span>REVENUE SHARE</span><h3>ProPulse commission</h3><p>Platform share retained from eligible investment-generated revenue.</p></div></div>
            <div className="settings-value-preview"><span>INVESTOR RECEIVES</span><strong>{Math.max(0,100-Number(commissionPercent||0))}%</strong></div>
            <div className="settings-bottom">
              <label className="settings-field"><span>Commission percentage</span><div className="percent-input"><input type="number" min="0" max="100" step="0.01" value={commissionPercent} onChange={e=>setCommissionPercent(e.target.value)}/><b>%</b></div></label>
              <button type="button" onClick={saveCommission} disabled={settingsLoading || settingsBusy}>{settingsBusy?'Saving…':'Save share'}</button>
            </div>
            {commissionMessage && <div className="settings-success"><i>✓</i>{commissionMessage}</div>}
          </article>

          <article className="settings-card">
            <div className="settings-card-head"><div className="settings-icon clock">◷</div><div><span>SETTLEMENT WINDOW</span><h3>Maturity period</h3><p>Controls the default maturity/settlement period for the existing investment cycle flow.</p></div></div>
            <div className="maturity-row">
              <label className="settings-field"><span>Settlement period</span><select value={maturityPreset} onChange={e=>{setMaturityPreset(e.target.value);if(e.target.value!=='custom')setMaturityDays(e.target.value==='immediate'?'0':e.target.value)}}><option value="immediate">Immediate · testing</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">365 days</option><option value="custom">Custom</option></select></label>
              {maturityPreset==='custom'&&<label className="settings-field days-field"><span>Days</span><input type="number" min="0" max="3650" step="1" value={maturityDays} onChange={e=>setMaturityDays(e.target.value)}/></label>}
              <button type="button" onClick={saveMaturity} disabled={settingsLoading || settingsBusy}>{settingsBusy?'Saving…':'Save period'}</button>
            </div>
            <div className="settings-info"><i>i</i><span>This updates the existing investor cycle settings; it does not create a second maturity system.</span></div>
            {settingsMessage && <div className="settings-success"><i>✓</i>{settingsMessage}</div>}
          </article>
        </div>
      </section>

      <section className="admin-investor-list">
        <div className="admin-list-head">
          <div className="investors-title"><span>INVESTOR LEDGER</span><h2>Investor accounts</h2><p>Open an account for cycle history, linked leads and existing investment actions.</p></div>
          <div className="admin-list-filters">
            <input value={search} onChange={e=>{setSearch(e.target.value);searchRef.current=e.target.value}} placeholder="Search investor name or email"/>
            <select value={status} onChange={e=>{setPage(1);setStatus(e.target.value)}}><option value="all">All statuses</option><option value="active">Active</option><option value="matured">Matured</option><option value="exit_requested">Exit requested</option><option value="waiting_for_leads">Waiting for leads</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select>
            <select value={industryId} onChange={e=>{setPage(1);setIndustryId(e.target.value)}}><option value="">All industries</option>{industries.map(industry=><option key={industry.id} value={industry.id}>{industry.name}</option>)}</select>
            <button type="button" onClick={runSearch}>Search</button>
          </div>
        </div>

        {loading ? <div className="admin-empty"><div className="investment-loader"/>Loading investor ledger…</div> :
        !investors.length ? <div className="admin-empty"><div className="empty-investments-icon">₹</div><div><strong>No investor accounts found</strong><span>Try another filter or search.</span></div></div> :
        <div className="investor-table-wrap">
          <div className="investor-table-head"><span>#</span><span>Investor</span><span>Capital</span><span>Ads available</span><span>Generated</span><span>Transferable</span><span>Cycle</span><span>Status</span><span>Action</span></div>
          {investors.map((investor,index)=><div className={['investor-table-row',investor.transferable>0?'needs-transfer':''].filter(Boolean).join(' ')} key={investor.user_id || index}>
            <span className="row-number">{String(((Number(data.pagination?.page||1)-1)*Number(data.pagination?.limit||30))+index+1).padStart(2,'0')}</span>
            <div className="row-investor"><span className="row-avatar">{String(investor.user_name||'?').charAt(0).toUpperCase()}</span><div><strong>{investor.user_name || ('Investor #' + investor.user_id)}</strong><small>{investor.user_email || '—'}</small><em>{investor.industry_name || 'No industry assigned'}</em></div></div>
            <div className="row-money"><strong>{money(investor.contributed)}</strong><small>Total invested</small></div>
            <div className="row-money ads"><strong>{money(investor.availableForAds)}</strong><small>{money(investor.adSpent)} spent</small></div>
            <div className="row-money generated"><strong>{money(investor.generated)}</strong><small>Generated</small></div>
            <div className={['row-money','transferable',investor.transferable>0?'ready':''].filter(Boolean).join(' ')}><strong>{money(investor.transferable)}</strong><small>{investor.payoutReserved>0 ? money(investor.payoutReserved) + ' reserved' : 'Available to transfer'}</small></div>
            <div className="cycle-cell"><strong>{investor.cycleId ? '#' + investor.cycleId : '—'}</strong><small>{investor.cycleStartedAt ? date(investor.cycleStartedAt) : 'No active cycle'}</small></div>
            <span className={'status-pill ' + investor.status}>{String(investor.status||'pending').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
            <div className="row-actions">
              <button className="view-btn" type="button" onClick={()=>showAccount(investor)}><span>↗</span>Open account</button>
              <div className="action-menu-wrap"><button className="more-btn" type="button" onClick={()=>setMenuUserId(current=>current===investor.user_id?null:investor.user_id)}>•••</button>{menuUserId===investor.user_id&&<div className="investment-actions-menu"><button type="button" onClick={()=>showAccount(investor)}>Cycle history</button><button type="button" onClick={()=>openLinked(investor)}>Linked leads</button><button type="button" onClick={()=>openSpend(investor)}>Spend on ads</button>{investor.bankTransfer>0&&<button type="button" onClick={()=>openPayout(investor)}>Record transfer</button>}</div>}</div>
            </div>
          </div>)}
          <div className="table-footer"><span>Showing <b>{investors.length}</b> of <b>{Number(data.pagination?.total||0)}</b> investor accounts</span><div className="ledger-note">{Number(data.pagination?.pages||1)>1&&<><button type="button" disabled={Number(data.pagination?.page||1)<=1||loading} onClick={()=>setPage(value=>Math.max(1,value-1))}>← Previous</button><span>Page {Number(data.pagination?.page||1)} of {Number(data.pagination?.pages||1)}</span><button type="button" disabled={Number(data.pagination?.page||1)>=Number(data.pagination?.pages||1)||loading} onClick={()=>setPage(value=>Math.min(Number(data.pagination?.pages||1),value+1))}>Next →</button></>}</div></div>
        </div>}
      </section>
    </main>
    {account && <div className="admin-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeAccount() }}><section className="admin-modal investor-history-modal" onMouseDown={e => e.stopPropagation()}>
      <div className="investor-history-head"><div className="investor-history-head-left"><span className="investor-history-avatar">{String(account.user_name || account.name || account.full_name || 'I').slice(0, 1).toUpperCase()}</span><div><h2>{account.user_name || account.name || account.full_name || `Investor #${account.user_id}`} · Transaction History</h2><p>{account.user_email || account.email || `Account ID ${account.user_id}`} · {account.active ? `Cycle #${account.cycleId || '—'} · ${account.autoInvest ? 'Auto-Invest' : 'Non-Auto'} · Current cycle` : 'No active cycle · History only'}</p></div></div><button className="investor-history-close" onClick={closeAccount}>×</button></div>
      <div className="investor-history-summary">
        <div className="history-summary-card"><span>CURRENT FUNDS</span><strong>{money(account.active ? (account.autoInvest ? account.availableForAds : account.transferable) : 0)}</strong><small>{account.active ? (account.autoInvest ? 'Current-cycle funds available for advertising' : 'Current-cycle earnings available for transfer') : 'No active-cycle balance'}</small></div>
        <div className="history-summary-card"><span>TOTAL INVESTED</span><strong>{money(account.active ? account.contributed : 0)}</strong><small>{account.active ? 'Current-cycle investor capital; principal is never withdrawable' : 'No active-cycle investment'}</small></div>
        <div className="history-summary-card blue"><span>AD SPENT</span><strong>{money(account.active ? account.adSpent : 0)}</strong><small>{account.active ? 'Current-cycle advertising spend' : 'No current-cycle ad spend'}</small></div>
        <div className="history-summary-card blue"><span>AVAILABLE FOR ADS</span><strong>{money(account.active && account.autoInvest ? account.availableForAds : 0)}</strong><small>{account.active && account.autoInvest ? 'Available for Auto-Invest ad spending' : 'No active Auto-Invest advertising balance'}</small></div>
        <div className="history-summary-card orange"><span>TRANSFER TO BANK</span><strong>{money(account.active ? account.transferable : 0)}</strong><small>{account.active ? (account.autoInvest ? 'Earnings eligible for transfer after ad-spend reservations' : 'Earnings currently available for transfer') : 'No active-cycle earnings available for transfer'}</small></div>
        <div className="history-summary-card green"><span>GENERATED EARNINGS</span><strong>{money(account.active ? account.generated : 0)}</strong><small>{account.active ? 'Investor earnings from sold leads in the current cycle' : 'No active-cycle lead earnings'}</small></div>
      </div>
      <div className="investor-history-body"><div className="history-caption"><h3>Transaction History</h3><span>{account.history?.length || 0} transactions · scroll to view all</span></div><div className="history-table"><div className="history-table-head"><span>#</span><span>Type</span><span>Amount</span><span>Balance After</span><span>Description</span><span>Date</span></div>{account.history?.length ? account.history.map(row => <div className="history-table-row" key={`${row.type}-${row.index}-${row.reference}`}><span className="history-index">{row.index}</span><div className="history-type"><span className={`history-icon ${row.type}`}>{row.type === 'investment' ? '+' : row.type === 'spend' || row.type === 'paid' ? '−' : row.type === 'revenue' ? '₹' : '↻'}</span><strong>{row.title}</strong></div><span className={`history-amount ${row.amount >= 0 ? 'credit' : 'debit'}`}>{row.amount >= 0 ? '+' : '−'}{money(Math.abs(row.amount))}</span><span className="history-balance">{money(row.balance)}</span><span className="history-description">{row.description} <small>{row.reference}</small></span><span className="history-date">{dateTime(row.date)}</span></div>) : <div className="history-empty">No transactions recorded for this investor yet.</div>}</div><div className="history-note"><i>i</i><span><strong>Fund routing:</strong> auto-invest earnings are shown in Available for Ads; earnings from investments without auto-invest are shown in Transfer to Bank. A completed reinvestment is already included in the advertising balance and is never counted twice.</span></div></div>
      <div className="investor-history-actions"><span className="action-status">{account.active ? (account.autoInvest ? 'Available for Ads' : 'Ready to Transfer') : 'No Active Cycle'} <strong>{money(account.active ? (account.autoInvest ? account.availableForAds : account.transferable) : 0)}</strong> · {account.active ? 'Current cycle' : 'History only'}{account.cycleId ? <> <strong>#{account.cycleId}</strong></> : null}</span><button type="button" className="spend-action" disabled={!account.active || !account.autoInvest || Number(account.availableForAds||0)<=0} onClick={()=>openSpend(account)}>Spend on Ads</button></div>
    </section></div>}
    <InvestorActionModals spendOpen={actionState.type==='spend'} transferOpen={false} availableForAds={Number(actionState.investor?.availableForAds||0)} transferable={0} payoutAccount={null} onCloseSpend={closeActions} onCloseTransfer={closeActions} onSpend={handleSpend} onTransfer={undefined}/>
    {linked && <div className="admin-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) {setLinked(null);setLinkedInvestor(null)} }}><section className="admin-modal account-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => {setLinked(null);setLinkedInvestor(null)}}>×</button><h2>Linked Leads</h2><p>Leads assigned to this investor and their revenue allocation.</p>{linkedLoading ? <div className="admin-empty">Loading…</div> : <><div className="lead-table"><div className="lead-table-head"><span>Lead</span><span>Buyers</span><span>Gross sales</span><span>Status</span><span>Investor Revenue</span></div>{(linked.leads || []).map(lead => <div className="lead-table-row" key={lead.id}><span><strong>#{lead.id}</strong><small>{lead.service_name || lead.industry_name || 'Lead'}</small></span><span>{lead.purchased_buyer_count || 0}/{lead.buyer_capacity || 1}</span><span>{money(lead.gross_sale_amount)}</span><span>{lead.status}</span><span>{money(lead.investor_revenue)}</span></div>)}</div>{Number(linked.pages||0)>1&&<div className="linked-leads-pagination"><button type="button" disabled={linkedLoading||Number(linked.page)<=1} onClick={()=>loadLinkedPage(linkedInvestor,Number(linked.page)-1)}>← Previous</button><span>Page <b>{linked.page}</b> of <b>{linked.pages}</b> · {linked.total} leads</span><button type="button" disabled={linkedLoading||Number(linked.page)>=Number(linked.pages)} onClick={()=>loadLinkedPage(linkedInvestor,Number(linked.page)+1)}>Next →</button></div>}</>}</section></div>}
  </>
}
