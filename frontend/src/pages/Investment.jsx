import { useEffect, useMemo, useState } from 'react'
import './Investment.css'
import { getToken } from '../utils/auth'
import { API_BASE_URL } from '../utils/api'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function Investment() {
  const [access, setAccess] = useState(null)
  const [rules, setRules] = useState([])
  const [mine, setMine] = useState([])
  const [industryId, setIndustryId] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [reinvestingId, setReinvestingId] = useState(null)

  const req = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...(options.headers || {}) } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Request failed')
    return data
  }

  const load = async () => {
    try {
      const [accessData, ruleData, investmentData] = await Promise.all([req('/investments/access'), req('/investments/rules'), req('/investments')])
      setAccess(accessData)
      setRules(Array.isArray(ruleData) ? ruleData : [])
      setMine(Array.isArray(investmentData) ? investmentData : [])
      if (!industryId && ruleData?.[0]) setIndustryId(String(ruleData[0].industry_id))
    } catch (error) { setMessage(error.message) }
  }

  useEffect(() => { load() }, [])

  const selected = rules.find((rule) => String(rule.industry_id) === String(industryId))
  const activeInvestments = useMemo(() => mine.filter((item) => ['active', 'matured'].includes(String(item.status).toLowerCase())), [mine])
  const totalInvested = useMemo(() => mine.reduce((sum, item) => sum + Number(item.amount || 0), 0), [mine])
  const totalRealized = useMemo(() => mine.reduce((sum, item) => sum + Number(item.realized_revenue || 0), 0), [mine])
  const reinvested = useMemo(() => mine.filter((item) => item.parent_investment_id), [mine])
  const choicesWaiting = useMemo(() => mine.filter((item) => item.reinvestment_available), [mine])

  const invest = async () => {
    setBusy(true); setMessage('')
    try {
      await req('/investments', { method: 'POST', body: JSON.stringify({ industryId: Number(industryId), amount: Number(amount) }) })
      setAmount(''); setMessage('Investment cycle created successfully.'); await load()
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }

  const reinvest = async (item) => {
    setReinvestingId(item.id); setMessage('')
    try {
      await req(`/investments/${item.id}/reinvest`, { method: 'POST' })
      setMessage(`${money(item.payout_amount)} was reinvested into a new ${item.industry_name} cycle.`)
      await load()
    } catch (error) { setMessage(error.message); await load() }
    finally { setReinvestingId(null) }
  }

  if (!access) return <main className="investment-page"><div className="investment-shell"><div className="investment-card">Loading investor dashboard…</div></div></main>

  if (!access.canInvest) return <main className="investment-page"><div className="investment-shell"><section className="investment-hero"><span className="investment-kicker">PROPULSE INVESTOR</span><h1>Turn eligible lead sales into an investment cycle.</h1><p>{access.requiresPro ? 'An active Pro membership is required before you can invest.' : 'Investment is currently unavailable.'}</p><a className="investment-back" href="/membership">← View Pro Membership</a></section></div></main>

  return (
    <main className="investment-page"><div className="investment-shell">
      <section className="investment-hero">
        <div className="hero-copy"><span className="investment-kicker">PROPULSE INVESTOR · REVENUE CYCLES</span><h1>Your realized revenue. Your choice for the next cycle.</h1><p>Fund eligible lead generation and participate only in revenue actually collected from leads sold during your cycle. At settlement, the realized amount is paid to your wallet. You decide whether to keep it or reinvest it.</p></div>
        <div className="investment-choice-banner"><div className="choice-icon">↻</div><div><strong>Investor-controlled reinvestment</strong><span>No forced reinvestment. No fixed return. You choose after every settled cycle.</span></div></div>
        <div className="investment-disclosure"><div><strong>01 · ACTUAL SALES</strong><span>Your outcome follows eligible lead-sale revenue actually realized.</span></div><div><strong>02 · LOWER SALES = LOWER PAYOUT</strong><span>A cycle can settle below the original investment when fewer leads sell.</span></div><div><strong>03 · CHOOSE</strong><span>Keep the payout in your wallet or reinvest the full realized amount.</span></div></div>
        <a className="investment-back" href="/membership">← Back to Membership</a>
      </section>
      {message && <div className="investment-message">{message}</div>}
      <section className="investment-status"><div className="investment-status-grid"><div className="investment-stat"><span>ACTIVE / MATURING</span><strong>{activeInvestments.length}</strong></div><div className="investment-stat"><span>TOTAL INVESTED</span><strong>{money(totalInvested)}</strong></div><div className="investment-stat"><span>REALIZED REVENUE</span><strong>{money(totalRealized)}</strong></div><div className="investment-stat"><span>REINVESTED CYCLES</span><strong>{reinvested.length}</strong></div></div></section>
      {choicesWaiting.length > 0 && <section className="reinvestment-choice-card"><div className="choice-card-heading"><div><span className="investment-kicker">ACTION REQUIRED</span><h2>Your payout is ready — choose what happens next</h2><p>Each settled cycle gives you control. Reinvestment can be below the normal new-investment minimum because it carries forward your actual realized proceeds.</p></div><span className="choice-count">{choicesWaiting.length} READY</span></div><div className="choice-list">{choicesWaiting.map((item) => <div className="choice-row" key={item.id}><div className="choice-row-main"><div className="choice-industry"><strong>{item.industry_name}</strong><span>Cycle #{item.id} · Settled</span></div><div className="choice-amount"><span>Realized payout</span><strong>{money(item.payout_amount)}</strong></div></div><div className="choice-actions"><button className="reinvest-button" disabled={reinvestingId === item.id} onClick={() => reinvest(item)}>{reinvestingId === item.id ? 'Creating cycle…' : `↻ Reinvest ${money(item.payout_amount)}`}</button><span className="keep-wallet">Keep in wallet</span></div></div>)}</div></section>}
      <section className="investment-grid">
        <div className="investment-card"><div className="card-heading"><span className="investment-kicker">START A CYCLE</span><h2>Make an investment</h2><p>Choose an eligible industry and fund it from your Propulse wallet.</p></div><label>Industry<select value={industryId} onChange={(event) => { setIndustryId(event.target.value); setAmount('') }}><option value="">Select industry</option>{rules.map((rule) => <option key={rule.id} value={rule.industry_id}>{rule.industry_name}</option>)}</select></label>{selected && <div className="investment-range"><span>Minimum <b>{money(selected.minimum_amount)}</b></span><span>Maximum <b>{money(selected.maximum_amount)}</b></span></div>}<label>Investment amount<input type="number" min={selected?.minimum_amount || 1} max={selected?.maximum_amount || undefined} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter amount" /></label><button className="investment-submit" disabled={busy || !industryId || !amount} onClick={invest}>{busy ? 'Processing…' : 'Invest from Wallet →'}</button><div className="investor-note"><b>What happens at maturity?</b><span>Propulse settles the revenue actually allocated from paid lead sales into your wallet. You then choose: keep the payout or reinvest it.</span></div></div>
        <div className="investment-card"><div className="card-heading"><span className="investment-kicker">ELIGIBLE INDUSTRIES</span><h2>Where you can invest</h2><p>Each industry has its own investment range and revenue-share rule.</p></div><div className="investment-rules">{rules.map((rule) => <div className="investment-rule" key={rule.id}><div><strong>{rule.industry_name}</strong><span>{money(rule.minimum_amount)} – {money(rule.maximum_amount)}</span></div><small>{Number(rule.investor_revenue_share_percent ?? 100)}% of realized eligible lead-sale revenue</small></div>)}</div></div>
      </section>
      <section className="investment-card investment-history"><div className="history-heading"><div><span className="investment-kicker">CYCLE HISTORY</span><h2>Your investments & reinvestments</h2><p>Every payout and investor-selected reinvestment stays linked to its original cycle.</p></div><span className="history-count">{mine.length} CYCLES</span></div>{!mine.length ? <div className="empty-state">No investment cycles yet. Your first eligible investment will appear here.</div> : <div className="investment-list">{mine.map((item) => { const isChild = Boolean(item.parent_investment_id); const hasChild = Boolean(item.reinvested_to_id); const payout = Number(item.payout_amount || 0); return <div className="investment-item" key={item.id} id={`cycle-${item.id}`}><div className="investment-item-main"><div><strong>{item.industry_name}</strong><span className="cycle-label">Cycle #{item.id}{isChild ? ' · Funded by investor-selected reinvestment' : ''}</span></div><span className="investment-badge">{item.status}</span></div><div className="investment-item-meta"><span>Invested <b>{money(item.amount)}</b></span><span>Realized <b>{money(item.realized_revenue)}</b></span><span>Payout <b>{money(payout)}</b></span>{item.matures_at && <span>Matures <b>{new Date(item.matures_at).toLocaleDateString('en-IN')}</b></span>}</div>{hasChild && <div className="reinvestment-panel"><div><strong>↻ REINVESTMENT CREATED</strong><span>{money(payout)} realized proceeds moved into cycle #{item.reinvested_to_id} after your choice.</span></div><a href={`#cycle-${item.reinvested_to_id}`}>View next cycle →</a></div>}{isChild && <div className="reinvestment-panel reinvestment-muted"><div><strong>↻ FUNDED BY REINVESTMENT</strong><span>This cycle was created from the realized proceeds of cycle #{item.parent_investment_id}.</span></div></div>}{item.reinvestment_available && <div className="history-choice"><div><strong>Choose your next step</strong><span>{money(payout)} is settled into your wallet and is available to keep or reinvest.</span></div><button className="reinvest-button small" disabled={reinvestingId === item.id} onClick={() => reinvest(item)}>{reinvestingId === item.id ? 'Creating…' : `↻ Reinvest ${money(payout)}`}</button></div>}</div> })}</div>}</section>
    </div></main>
  )
}
