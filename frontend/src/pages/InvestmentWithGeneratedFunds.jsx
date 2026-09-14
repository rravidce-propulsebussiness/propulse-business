import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Investment from './Investment'
import { authRequest } from '../utils/auth'
import './InvestmentWithGeneratedFunds.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const normalizeStatus = value => String(value || '').toUpperCase()
const openStatuses = new Set(['ACTIVE', 'EXIT_REQUESTED', 'WAITING_FOR_LEADS'])
const investedStatuses = new Set(['ACTIVE', 'MATURED', 'PAID'])

function Dashboard() {
  const [cycle, setCycle] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (initial = false) => {
    if (initial) setLoading(true)
    try {
      const [cycleResult, investmentsResult] = await Promise.all([
        authRequest('/investments/cycle'),
        authRequest('/investments')
      ])
      const candidate = cycleResult?.cycle || null
      const activeCycle = candidate && openStatuses.has(normalizeStatus(candidate.status)) ? candidate : null
      const investmentRows = Array.isArray(investmentsResult) ? investmentsResult : Array.isArray(investmentsResult?.data) ? investmentsResult.data : Array.isArray(investmentsResult?.rows) ? investmentsResult.rows : []
      setCycle(activeCycle)
      setRows(activeCycle ? investmentRows.filter(row => Number(row?.cycle_id) === Number(activeCycle.id) && investedStatuses.has(normalizeStatus(row?.status))) : [])
      setError('')
    } catch (err) {
      setError(err?.message || 'Unable to load the current investment cycle')
    } finally {
      if (initial) setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => { if (!cancelled) await load(true) }
    run()
    const timer = setInterval(() => { if (!cancelled) load(false) }, 15000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  const openInvest = () => document.querySelector('.legacy-investment .investment-hero-action button')?.click()
  const exit = () => document.querySelector('.legacy-investment .investment-pending-card button')?.click()

  if (loading) return <section className="cycle-dashboard-loading">Loading investment dashboard…</section>

  const active = Boolean(cycle)
  const autoInvest = active && Boolean(cycle.auto_invest)
  const actualInvestment = active ? rows.filter(row => row?.parent_investment_id == null).reduce((sum, row) => sum + Number(row?.amount || 0), 0) : 0
  const reinvestment = active ? rows.filter(row => row?.parent_investment_id != null).reduce((sum, row) => sum + Number(row?.amount || 0), 0) : 0
  const computedTotal = actualInvestment + reinvestment
  const totalInvested = active ? (computedTotal || Number(cycle.total_invested ?? cycle.principal ?? 0)) : 0
  const investorEarnings = active ? Number(cycle.investor_earnings ?? cycle.generated ?? 0) : 0
  const transferable = active ? Number(cycle.transferable ?? cycle.withdrawable_earnings ?? 0) : 0
  const adSpent = active ? Number(cycle.ad_spent ?? 0) : 0
  const unmaturedFund = active
    ? rows.filter(row => normalizeStatus(row?.status) === 'ACTIVE' && row?.matures_at && new Date(row.matures_at).getTime() > Date.now()).reduce((sum, row) => sum + Number(row?.amount || 0), 0)
    : 0
  const linkedLeads = active ? Number(cycle.total_leads ?? 0) : 0
  const soldLeads = active ? Number(cycle.sold_leads ?? 0) : 0
  const finalLeads = active ? Number(cycle.final_leads ?? 0) : 0
  const pendingLeads = active ? Number(cycle.pending_leads ?? 0) : 0
  const transferPaid = active ? Number(cycle.payout_transferred ?? 0) : 0
  const transferReserved = active ? Number(cycle.payout_reserved ?? 0) : 0
  const closing = active && ['EXIT_REQUESTED', 'WAITING_FOR_LEADS'].includes(normalizeStatus(cycle.status))

  return (
    <section className="cycle-dashboard">
      <div className="cycle-dashboard-top">
        <div>
          <span className="cycle-kicker">{active ? 'CURRENT INVESTMENT CYCLE' : 'INVESTMENT WORKSPACE'}</span>
          <h1>{active ? `Cycle #${cycle.id} · ${autoInvest ? 'Auto-Invest ON' : 'Auto-Invest OFF'}` : 'No Active Investment Cycle'}</h1>
          <p>{active ? `${String(cycle.status || '').replaceAll('_', ' ')} · Started ${dateTime(cycle.started_at)} · Maturity ${dateTime(cycle.maturity_at)}` : 'Your previous cycle is closed. Current-cycle balances are ₹0. Previous-cycle investment, advertising, lead sales and withdrawals are available in History.'}</p>
        </div>
        <div className="cycle-dashboard-actions">
          {active ? <>
            <button type="button" onClick={openInvest} disabled={closing}>＋ Add Investment</button>
            {autoInvest && !closing && <button type="button" className="secondary" onClick={exit}>Request Final Exit</button>}
          </> : <button type="button" onClick={openInvest}>＋ Start Investment</button>}
          <Link className="secondary link" to="/investment/history">History →</Link>
          {active && transferable > 0 && !closing && <Link className="withdraw-dashboard-button" to="/investment/payouts">Withdraw Earnings →</Link>}
        </div>
      </div>

      {error && <div className="investor-section-error" style={{ marginTop: 12 }}>{error}</div>}

      <div className="cycle-dashboard-grid">
        <article className="primary"><span>ACTUAL INVESTMENT</span><strong>{money(actualInvestment)}</strong><small>{active ? 'Original capital contributed in this cycle.' : 'No active-cycle investment.'}</small></article>
        <article><span>REINVESTMENT</span><strong>{money(reinvestment)}</strong><small>{active ? 'Capital reinvested into this current cycle.' : 'No active-cycle reinvestment.'}</small></article>
        <article><span>TOTAL INVESTMENT</span><strong>{money(totalInvested)}</strong><small>{active ? 'Actual investment + reinvestment for this cycle.' : 'No active-cycle investment.'}</small></article>
        <article><span>MY EARNINGS</span><strong>{money(investorEarnings)}</strong><small>{active ? 'My realized earnings from paid lead sales in this cycle.' : 'No active-cycle earnings.'}</small></article>
        <article><span>ADS SPENT</span><strong>{money(adSpent)}</strong><small>{active ? 'Actual advertising spend recorded in this cycle.' : 'No current-cycle ad spend.'}</small></article>
        <article><span>AVAILABLE FOR BANK TRANSFER</span><strong>{money(transferable)}</strong><small>{active ? 'Eligible current-cycle earnings available for withdrawal.' : 'No active-cycle earnings available for transfer.'}</small>{active && transferable > 0 && !closing && <Link className="cycle-withdraw-button" to="/investment/payouts">Withdraw Earnings</Link>}</article>
        <article><span>UNMATURED FUND</span><strong>{money(unmaturedFund)}</strong><small>{active ? 'Current-cycle investment capital whose maturity date has not yet been reached.' : 'No active-cycle unmatured funds.'}</small></article>
      </div>

      <div className="cycle-dashboard-leadbar">
        <div><b>Linked Leads</b><span>{linkedLeads}</span></div><div><b>Leads Sold</b><span>{soldLeads}</span></div><div><b>Final Leads</b><span>{finalLeads}</span></div><div><b>Pending Leads</b><span>{pendingLeads}</span></div><div><b>Transfer Paid</b><span>{money(transferPaid)}</span></div><div><b>Transfer Reserved</b><span>{money(transferReserved)}</span></div>
      </div>

      <div className="cycle-dashboard-nav"><Link to="/investment/leads">Linked Leads</Link><Link to="/investment/history">History</Link><Link to="/investment/payouts">Withdrawals</Link><Link to="/investment/faq">FAQ</Link></div>

      <div className="cycle-dashboard-note">{active
        ? <><b>Current Cycle Only</b><span>{autoInvest ? 'Auto-Invest eligible earnings can be used for advertising; bank transfer shows only transferable earnings.' : 'This dashboard shows only this active cycle. Previous cycles remain under History.'}</span></>
        : <><b>Previous Cycle Closed</b><span>All current-cycle balances are ₹0. Previous investment, advertising, lead sales and withdrawals remain available under History.</span></>}</div>
    </section>
  )
}

export default function InvestmentWithGeneratedFunds() {
  return <><Dashboard /><div className="legacy-investment" aria-hidden="true"><Investment /></div></>
}
