import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { getToken, clearSession } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminInvestmentsPremium.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [linked, setLinked] = useState(null)
  const [account, setAccount] = useState(null)
  const [linkedLoading, setLinkedLoading] = useState(false)
  const [menu, setMenu] = useState(null)
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
      const days = Number(result.investment_cycle_days ?? 30)
      setMaturityPreset(days === 0 ? 'immediate' : MATURITY_OPTIONS.some(option => option.value === String(days)) ? String(days) : 'custom')
      setMaturityDays(String(days))
      const share = Number(result.investor_revenue_share_percent)
      setCommissionPercent(String(Number.isFinite(share) ? Math.max(0, Math.min(100, 100 - share)) : 5))
    } catch (e) { setError(e.message || 'Unable to load investment settings.') }
    finally { setSettingsLoading(false) }
  }

  useEffect(() => { load(); loadSettings() }, [status, industryId])

  const investors = useMemo(() => data.investors.map(item => {
    const records = Array.isArray(item.cycles) ? item.cycles.filter(x => x.status !== 'cancelled') : []
    const contributed = records.filter(x => !x.is_reinvestment).reduce((sum, x) => sum + Number(x.amount || 0), 0)
    const totalFunding = records.reduce((sum, x) => sum + Number(x.amount || 0), 0)
    const adSpent = records.reduce((sum, x) => sum + Number(x.ad_spent || 0), 0)
    const adBalance = Math.max(0, totalFunding - adSpent)
    const gross = Number(item.linked_gross_sales || 0)
    const earnings = Number(item.allocated_revenue || 0)
    const commission = Math.max(0, gross - earnings)
    const reinvestedPaid = records.reduce((sum, x) => {
      const reference = String(x.payout_transfer_reference || '').trim().toUpperCase()
      return sum + (reference.startsWith('REINVESTMENT-') ? Number(x.paid_to_investor || 0) : 0)
    }, 0)
    const payable = Math.max(0, Number(item.payable_now || 0) - reinvestedPaid)
    const statusRecord = records.find(x => x.status === 'active') || records.find(x => x.status === 'matured') || records.find(x => x.status === 'pending') || records[0]
    const accountStatus = statusRecord?.status || 'active'
    const joinedAt = records.reduce((oldest, row) => !oldest || new Date(row.created_at) < new Date(oldest) ? row.created_at : oldest, null)
    return { ...item, records, contributed, totalFunding, adSpent, adBalance, gross, earnings, commission, payable, accountStatus, joinedAt }
  }), [data.investors])

  const totals = useMemo(() => investors.reduce((out, investor) => {
    out.capital += investor.contributed
    out.adBalance += investor.adBalance
    out.gross += investor.gross
    out.payable += investor.payable
    return out
  }, { capital: 0, adBalance: 0, gross: 0, payable: 0 }), [investors])

  const saveCommercialSettings = async ({ days, commission }) => {
    if (!settings) return
    const nextDays = Number(days), nextCommission = Number(commission)
    if (!Number.isInteger(nextDays) || nextDays < 0 || nextDays > 3650) throw new Error('Settlement period must be between 0 and 3650 days.')
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

  const saveCommission = async () => {
    const value = Number(commissionPercent)
    if (!Number.isFinite(value) || value < 0 || value > 100) return setError('Commission must be between 0% and 100%.')
    setSettingsBusy(true); setCommissionMessage(''); setError('')
    try {
      const updated = await saveCommercialSettings({ days: Number(settings?.investment_cycle_days ?? maturityDays ?? 30), commission: value })
      setSettings(updated); setCommissionMessage('Saved'); await load(true)
    } catch (e) { setError(e.message || 'Unable to save commission.') } finally { setSettingsBusy(false) }
  }

  const saveMaturity = async () => {
    setSettingsBusy(true); setSettingsMessage(''); setError('')
    try {
      const updated = await saveCommercialSettings({ days: maturityDays, commission: commissionPercent })
      setSettings(updated); setSettingsMessage('Saved'); await load(true)
    } catch (e) { setError(e.message || 'Unable to save settlement period.') } finally { setSettingsBusy(false) }
  }

  const showAccount = investor => {
    setMenu(null)
    const flow = []
    const sorted = [...investor.records].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    let adBalance = 0
    let earningsBalance = 0
    sorted.forEach(record => {
      const funding = Number(record.amount || 0)
      const spend = Number(record.ad_spent || 0)
      if (funding > 0) {
        adBalance += funding
        flow.push({ type: record.is_reinvestment ? 'reinvest' : 'investment', date: record.created_at, title: record.is_reinvestment ? 'Earnings reinvested' : 'Investment added', amount: funding, balance: adBalance, balanceLabel: 'Ad balance', note: record.is_reinvestment ? 'Investor earnings added back to advertising balance' : 'Investor contributed capital' })
      }
      if (spend > 0) {
        adBalance = Math.max(0, adBalance - spend)
        flow.push({ type: 'spend', date: record.updated_at || record.created_at, title: 'Ads spent', amount: -spend, balance: adBalance, balanceLabel: 'Ad balance', note: 'Actual advertising spend' })
      }
      const revenue = Number(record.allocated_revenue || 0)
      if (revenue > 0) {
        earningsBalance += revenue
        flow.push({ type: 'revenue', date: record.updated_at || record.created_at, title: 'Lead sold', amount: revenue, balance: earningsBalance, balanceLabel: 'Earnings', note: `${Number(record.allocated_sales || record.linked_paid_sales || 0)} lead sale(s) purchased by a customer account` })
      }
      const reference = String(record.payout_transfer_reference || '').trim().toUpperCase()
      const paid = record.status === 'paid' && !reference.startsWith('REINVESTMENT-') ? Number(record.paid_to_investor || 0) : 0
      if (paid > 0) {
        earningsBalance = Math.max(0, earningsBalance - paid)
        flow.push({ type: 'paid', date: record.updated_at || record.created_at, title: 'Transferred to investor', amount: -paid, balance: earningsBalance, balanceLabel: 'Earnings', note: 'Earnings transferred out' })
      }
    })
    if (investor.earnings > 0 && !flow.some(item => item.type === 'revenue')) {
      earningsBalance += investor.earnings
      flow.push({ type: 'revenue', date: investor.joinedAt, title: 'Lead sold', amount: investor.earnings, balance: earningsBalance, balanceLabel: 'Earnings', note: 'Lead sales purchased by customer accounts generated investor earnings' })
    }
    setAccount({ investor, flow })
  }

  const showLinked = async investor => {
    setMenu(null); setLinked({ investor, items: [] }); setLinkedLoading(true)
    try {
      const items = await request(`/investments/admin/investor/${investor.user_id}/linked-leads`)
      setLinked({ investor, items: Array.isArray(items) ? items : items?.data || [] })
    } catch (e) { setError(e.message || 'Unable to load investor leads.'); setLinked(null) }
    finally { setLinkedLoading(false) }
  }

  const pickFundingRecord = investor => [...investor.records].sort((a, b) => (Number(b.funds_available_for_ads || 0) + Number(b.ad_remaining || 0)) - (Number(a.funds_available_for_ads || 0) + Number(a.ad_remaining || 0)))[0]

  const openSpend = async investor => {
    setMenu(null)
    const target = pickFundingRecord(investor)
    if (!target) return setError('No advertising funding record is available for this investor.')
    setSpendModal({ investor, target }); setSpendData(null); setSpendLoading(true)
    setSpendForm({ amount: '', platform: '', campaign: '', spendDate: '', reference: '', notes: '' })
    try { setSpendData(await request(`/investments/admin/${target.id}/ad-spend`)) }
    catch (e) { setError(e.message || 'Unable to load ad spending.') }
    finally { setSpendLoading(false) }
  }

  const submitSpend = async event => {
    event.preventDefault(); if (!spendModal) return
    if (!Number(spendForm.amount) || Number(spendForm.amount) <= 0) return setError('Enter a valid ad spend amount.')
    setSpendBusy(true); setError('')
    try { await request(`/investments/admin/${spendModal.target.id}/ad-spend`, { method: 'POST', body: JSON.stringify(spendForm) }); await load(true); setSpendModal(null) }
    catch (e) { setError(e.message || 'Unable to record ad spend.') } finally { setSpendBusy(false) }
  }

  const openPayout = investor => {
    setMenu(null)
    const target = investor.records.find(x => Number(x.payable_now || 0) > 0)
    if (!target) return setError('No earnings are currently ready for transfer.')
    setPayoutModal({ investor, target, forceTransfer: true }); setTransferReference(''); setProofFile(null); setError('')
  }

  const submitPayout = async () => {
    if (!payoutModal) return
    const automatic = !payoutModal.forceTransfer && Boolean(payoutModal.target.reinvestment_enabled)
    if (!automatic) {
      if (!transferReference.trim()) return setError('Enter the transfer reference / UTR.')
      if (!proofFile) return setError('Attach the transfer screenshot or proof.')
      if (proofFile.size > 5 * 1024 * 1024) return setError('Transfer proof must be 5 MB or smaller.')
    }
    setPayoutBusy(true); setError('')
    try {
      const proofUrl = automatic ? null : await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read transfer proof')); reader.readAsDataURL(proofFile) })
      await request(`/investments/admin/${payoutModal.target.id}/payout`, { method: 'POST', body: JSON.stringify({ transferReference: automatic ? '' : transferReference.trim(), proofUrl, forceTransfer: Boolean(payoutModal.forceTransfer) }) })
      setPayoutModal(null); setTransferReference(''); setProofFile(null); await load()
    } catch (e) { setError(e.message || 'Unable to settle investor earnings.') } finally { setPayoutBusy(false) }
  }

  return <main className="admin-investments-page">
    <header className="admin-investments-head">
      <div className="admin-title-block"><div className="admin-breadcrumb"><span>Admin</span><b>/</b><strong>Investments</strong></div><h1>Investments</h1></div>
      <div className="system-health"><i /> System healthy</div>
    </header>

    {error && <div className="admin-investments-error">{error}</div>}

    <section className="admin-investment-stats">
      <article className="stat-capital"><span>Investor Capital</span><strong>{money(totals.capital)}</strong><small>Money personally contributed</small></article>
      <article className="stat-balance"><span>Ad Balance</span><strong>{money(totals.adBalance)}</strong><small>Currently available to spend</small></article>
      <article className="stat-revenue"><span>Lead Revenue</span><strong>{money(totals.gross)}</strong><small>Revenue from linked lead sales</small></article>
      <article className="stat-transfer"><span>Ready to Transfer</span><strong>{money(totals.payable)}</strong><small>{investors.filter(x => x.payable > 0).length} investors with earnings ready</small></article>
    </section>

    <section className="admin-settings-grid">
      <article className="settings-card commission-settings">
        <div className="settings-card-head"><div className="settings-icon">%</div><div><h2>ProPulse Commission</h2><p>Set the platform commission taken from investor earnings.</p></div></div>
        <label className="settings-field"><span>Commission Percentage</span><div className="percent-input"><input type="number" min="0" max="100" step="0.1" value={commissionPercent} onChange={e => setCommissionPercent(e.target.value)} disabled={settingsLoading || settingsBusy} /><b>%</b></div></label>
        <div className="settings-bottom"><div className="settings-info"><i>i</i><span>Investors receive <strong>{100 - Number(commissionPercent || 0)}%</strong> of earnings after commission.</span></div><button onClick={saveCommission} disabled={settingsLoading || settingsBusy}>{settingsBusy ? 'Saving…' : 'Save'}</button></div>
      </article>

      <article className="settings-card maturity-settings">
        <div className="settings-card-head"><div className="settings-icon clock">◷</div><div><h2>Investment Maturity</h2><p>Controls when realized earnings become eligible for transfer or reinvestment.</p></div></div>
        <div className="maturity-row"><label className="settings-field"><span>Period</span><select value={maturityPreset} onChange={e => { setMaturityPreset(e.target.value); if (e.target.value === 'immediate') setMaturityDays('0'); else if (e.target.value !== 'custom') setMaturityDays(e.target.value) }} disabled={settingsLoading || settingsBusy}>{MATURITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{maturityPreset === 'custom' && <label className="settings-field days-field"><span>Days</span><input type="number" min="0" max="3650" value={maturityDays} onChange={e => setMaturityDays(e.target.value)} /></label>}<button onClick={saveMaturity} disabled={settingsLoading || settingsBusy}>{settingsBusy ? 'Saving…' : 'Save'}</button></div>
        <div className="settings-info maturity-info"><i>i</i><span>Earnings will be available for transfer or reinvestment based on the selected period.</span></div>
      </article>
    </section>

    <section className="admin-investor-list">
      <div className="admin-list-head"><div className="investors-title"><div className="investors-icon">♧</div><div><h2>Investors</h2></div></div><div className="admin-list-filters"><input placeholder="Search investor…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} /><select value={industryId} onChange={e => setIndustryId(e.target.value)}><option value="">All industries</option>{industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="matured">Matured</option><option value="paid">Paid</option><option value="pending">Pending</option></select><button onClick={() => load()}>Search</button></div></div>
      {loading ? <div className="admin-empty">Loading investors…</div> : !investors.length ? <div className="admin-empty">No investor accounts found.</div> : <>
        <div className="investor-table-head"><span>#</span><span>Investor</span><span>Capital</span><span>Ad Balance</span><span>Lead Revenue</span><span>Ready to Transfer</span><span>Status</span><span>Joined</span><span>Actions</span></div>
        <div className="investor-table-body">{investors.map((investor, index) => <article className="investor-table-row" key={investor.user_id}>
          <span className="row-number">{index + 1}</span>
          <div className="row-investor"><div className="row-avatar">{String(investor.user_name || 'I').trim().charAt(0).toUpperCase()}</div><div><strong>{investor.user_name || 'Investor'}</strong><small>{investor.user_email || '—'}</small></div></div>
          <strong className="row-money">{money(investor.contributed)}</strong>
          <strong className="row-money">{money(investor.adBalance)}</strong>
          <strong className="row-money">{money(investor.gross)}</strong>
          <strong className="row-money">{money(investor.payable)}</strong>
          <span><b className={`status-pill ${investor.accountStatus}`}>{investor.accountStatus}</b></span>
          <span className="joined-date">{date(investor.joinedAt)}</span>
          <div className="row-actions"><button className="view-btn" onClick={() => showAccount(investor)}>View</button><div className="action-menu-wrap"><button className="more-btn" aria-label="More actions" onClick={() => setMenu(menu === investor.user_id ? null : investor.user_id)}>•••</button>{menu === investor.user_id && <div className="action-menu"><button onClick={() => openSpend(investor)}>Add ad spend</button>{investor.payable > 0 && <button onClick={() => openPayout(investor)}>Transfer investor money</button>}<button onClick={() => showLinked(investor)}>View linked leads</button></div>}</div></div>
        </article>)}</div>
        <div className="table-footer"><span>Showing 1 to {investors.length} of {investors.length} investors</span><div><button disabled>‹</button><b>1</b><button disabled>›</button></div></div>
      </>}
    </section>

    {account && <div className="admin-modal-backdrop" onMouseDown={() => setAccount(null)}><div className="admin-modal account-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAccount(null)}>×</button><div className="admin-settings-kicker">INVESTOR ACCOUNT</div><h2>{account.investor.user_name || 'Investor'}</h2><p>Complete money flow from contributed capital to advertising, lead revenue and transfers.</p><div className="account-summary-grid"><div><span>Capital contributed</span><strong>{money(account.investor.contributed)}</strong></div><div><span>Total ad funding</span><strong>{money(account.investor.totalFunding)}</strong></div><div><span>Ads spent</span><strong>{money(account.investor.adSpent)}</strong></div><div><span>Current ad balance</span><strong>{money(account.investor.adBalance)}</strong></div><div><span>Lead revenue</span><strong className="positive">{money(account.investor.gross)}</strong></div><div><span>Ready to transfer</span><strong className="transfer-value">{money(account.investor.payable)}</strong></div></div><div className="account-transfer-actions">{account.investor.payable > 0 && <button className="success" onClick={() => openPayout(account.investor)}>Transfer investor money</button>}</div><div className="money-flow-head"><h3>Money Flow</h3><span>Every funding and spend movement is shown here</span></div>{!account.flow.length ? <div className="admin-empty">No money movements recorded yet.</div> : <div className="money-flow">{account.flow.map((item, index) => <div className={`money-flow-row ${item.type}`} key={`${item.date}-${item.type}-${index}`}><div className="flow-icon">{item.type === 'investment' ? '+' : item.type === 'reinvest' ? '↻' : item.type === 'spend' ? '−' : item.type === 'revenue' ? '₹' : '↗'}</div><div className="flow-main"><strong>{item.title}</strong><small>{date(item.date)} · {item.note}</small></div><strong className="flow-amount">{item.amount >= 0 ? '+' : ''}{money(item.amount)}</strong><div className="flow-balance"><span>{item.balanceLabel}</span><strong>{money(item.balance)}</strong></div></div>)}</div>}<div className="account-footer-note"><span>Investor capital is separate from earnings. Advertising balance tracks invested and reinvested funding; earnings balance tracks lead revenue and actual transfers.</span></div></div></div>}
    {linked && <div className="admin-modal-backdrop" onMouseDown={() => setLinked(null)}><div className="admin-modal leads-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setLinked(null)}>×</button><div className="admin-settings-kicker">INVESTOR LEADS</div><h2>{linked.investor.user_name || 'Investor'}</h2><p>{linked.items.length} linked leads</p>{linkedLoading ? <div className="admin-empty">Loading leads…</div> : !linked.items.length ? <div className="admin-empty">No linked leads found.</div> : <div className="lead-table"><div className="lead-table-head"><span>Lead</span><span>Industry</span><span>Sales</span><span>Gross</span><span>Investor earning</span></div>{linked.items.map(lead => <div className="lead-table-row" key={lead.id}><div><b>#{lead.id} · {lead.name || 'Lead'}</b><small>{lead.state_name || '—'}{lead.city_name ? `, ${lead.city_name}` : ''}</small></div><span>{lead.industry_name || '—'}</span><span>{lead.paid_sale_count || 0}</span><span>{money(lead.gross_sale_amount)}</span><strong>{money(lead.investor_revenue)}</strong></div>)}</div>}</div></div>}
    {spendModal && <div className="admin-modal-backdrop" onMouseDown={() => setSpendModal(null)}><div className="admin-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSpendModal(null)}>×</button><div className="admin-settings-kicker">ADVERTISING</div><h2>Spend investor ad balance</h2><p>{spendModal.investor.user_name || 'Investor'} · Account balance {money(spendModal.investor.adBalance)}</p>{spendLoading ? <div className="admin-empty">Loading ad balance…</div> : <form onSubmit={submitSpend}><div className="spend-available"><span>Current funding available</span><strong>{money(Number(spendData?.investment?.funds_available_for_ads || 0) + Number(spendData?.investment?.ad_remaining || 0))}</strong></div><label>Amount<input autoFocus type="number" min="0.01" step="0.01" value={spendForm.amount} onChange={e => setSpendForm(v => ({ ...v, amount: e.target.value }))} required /></label><div className="modal-grid"><label>Platform<input value={spendForm.platform} onChange={e => setSpendForm(v => ({ ...v, platform: e.target.value }))} placeholder="Meta, Google…" /></label><label>Campaign<input value={spendForm.campaign} onChange={e => setSpendForm(v => ({ ...v, campaign: e.target.value }))} /></label></div><label>Reference<input value={spendForm.reference} onChange={e => setSpendForm(v => ({ ...v, reference: e.target.value }))} /></label><label>Notes<textarea value={spendForm.notes} onChange={e => setSpendForm(v => ({ ...v, notes: e.target.value }))} /></label><div className="modal-actions"><button type="button" onClick={() => setSpendModal(null)}>Cancel</button><button className="primary" disabled={spendBusy}>{spendBusy ? 'Saving…' : 'Record ad spend'}</button></div></form>}</div></div>}
    {payoutModal && <div className="admin-modal-backdrop" onMouseDown={() => setPayoutModal(null)}><div className="admin-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setPayoutModal(null)}>×</button><div className="admin-settings-kicker">EARNINGS TRANSFER</div><h2>Transfer investor money</h2><p>{payoutModal.investor.user_name || 'Investor'} · {money(payoutModal.target.payable_now)} ready to transfer</p><div className="auto-reinvest-box"><strong>Cash transfer override</strong><span>This action transfers the realized earnings to the investor. It will not reinvest them, even when auto-reinvest is ON.</span></div><label>Transfer reference / UTR<input value={transferReference} onChange={e => setTransferReference(e.target.value)} placeholder="Enter UTR" /></label><label>Transfer proof<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e => setProofFile(e.target.files?.[0] || null)} /></label><div className="modal-actions"><button onClick={() => setPayoutModal(null)}>Cancel</button><button className="success" onClick={submitPayout} disabled={payoutBusy}>{payoutBusy ? 'Processing…' : 'Confirm transfer'}</button></div></div></div>}
  </main>
}
