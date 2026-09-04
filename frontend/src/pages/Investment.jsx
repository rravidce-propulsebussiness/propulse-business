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

  const req = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Request failed')
    return data
  }

  const load = async () => {
    try {
      const [accessData, ruleData, investmentData] = await Promise.all([
        req('/investments/access'),
        req('/investments/rules'),
        req('/investments')
      ])
      setAccess(accessData)
      setRules(Array.isArray(ruleData) ? ruleData : [])
      setMine(Array.isArray(investmentData) ? investmentData : [])
      if (!industryId && ruleData?.[0]) setIndustryId(String(ruleData[0].industry_id))
    } catch (error) {
      setMessage(error.message)
    }
  }

  useEffect(() => { load() }, [])

  const selected = rules.find((rule) => String(rule.industry_id) === String(industryId))
  const activeInvestments = useMemo(() => mine.filter((item) => ['active', 'matured'].includes(String(item.status).toLowerCase())), [mine])
  const paidInvestments = useMemo(() => mine.filter((item) => String(item.status).toLowerCase() === 'paid'), [mine])
  const totalInvested = useMemo(() => mine.reduce((sum, item) => sum + Number(item.amount || 0), 0), [mine])
  const totalRealized = useMemo(() => mine.reduce((sum, item) => sum + Number(item.realized_revenue || 0), 0), [mine])
  const reinvested = useMemo(() => mine.filter((item) => item.parent_investment_id || item.reinvested_to_id), [mine])

  const invest = async () => {
    setBusy(true)
    setMessage('')
    try {
      await req('/investments', {
        method: 'POST',
        body: JSON.stringify({ industryId: Number(industryId), amount: Number(amount) })
      })
      setAmount('')
      setMessage('Investment created successfully.')
      await load()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (!access) return <main className="investment-page"><div className="investment-shell"><div className="investment-card">Loading investor dashboard…</div></div></main>

  if (!access.canInvest) {
    return (
      <main className="investment-page">
        <div className="investment-shell">
          <section className="investment-hero">
            <span className="investment-kicker">PROPULSE INVESTOR</span>
            <h1>Turn eligible lead sales into an investment cycle.</h1>
            <p>{access.requiresPro ? 'An active Pro membership is required before you can invest.' : 'Investment is currently unavailable.'}</p>
            <a className="investment-back" href="/membership">← View Pro Membership</a>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="investment-page">
      <div className="investment-shell">
        <section className="investment-hero">
          <span className="investment-kicker">PROPULSE INVESTOR</span>
          <h1>Invest in lead generation. Reinvest what you actually realize.</h1>
          <p>Fund eligible lead generation and participate in revenue actually collected from leads sold during your cycle. This is not a fixed-return product.</p>
          <div className="investment-disclosure">
            <div><strong>01 · ACTUAL SALES</strong><span>Your outcome follows eligible lead-sale revenue actually realized.</span></div>
            <div><strong>02 · NO GUARANTEE</strong><span>If fewer leads sell, your realized payout can be lower than your investment.</span></div>
            <div><strong>03 · REINVEST</strong><span>When eligible, the realized payout automatically starts the next investment cycle.</span></div>
          </div>
          <a className="investment-back" href="/membership">← Back to Membership</a>
        </section>

        {message && <div className="investment-message">{message}</div>}

        <section className="investment-status">
          <div className="investment-status-grid">
            <div className="investment-stat"><span>ACTIVE / MATURING</span><strong>{activeInvestments.length}</strong></div>
            <div className="investment-stat"><span>TOTAL INVESTED</span><strong>{money(totalInvested)}</strong></div>
            <div className="investment-stat"><span>REALIZED REVENUE</span><strong>{money(totalRealized)}</strong></div>
            <div className="investment-stat"><span>REINVESTED CYCLES</span><strong>{reinvested.length}</strong></div>
          </div>
        </section>

        <section className="investment-grid">
          <div className="investment-card">
            <div className="card-heading"><span className="investment-kicker">START A CYCLE</span><h2>Make an investment</h2><p>Choose an eligible industry and fund it from your Propulse wallet.</p></div>
            <label>Industry<select value={industryId} onChange={(event) => { setIndustryId(event.target.value); setAmount('') }}><option value="">Select industry</option>{rules.map((rule) => <option key={rule.id} value={rule.industry_id}>{rule.industry_name}</option>)}</select></label>
            {selected && <div className="investment-range"><span>Minimum <b>{money(selected.minimum_amount)}</b></span><span>Maximum <b>{money(selected.maximum_amount)}</b></span></div>}
            <label>Investment amount<input type="number" min={selected?.minimum_amount || 1} max={selected?.maximum_amount || undefined} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter amount" /></label>
            <button className="investment-submit" disabled={busy || !industryId || !amount} onClick={invest}>{busy ? 'Processing…' : 'Invest from Wallet →'}</button>
            <div className="investor-note"><b>What happens next?</b><span>Your capital is used for the selected eligible industry. At maturity, only revenue actually allocated from paid lead sales is settled.</span></div>
          </div>

          <div className="investment-card">
            <div className="card-heading"><span className="investment-kicker">ELIGIBLE INDUSTRIES</span><h2>Where you can invest</h2><p>Each industry has its own investment range and revenue-share rule.</p></div>
            <div className="investment-rules">{rules.map((rule) => <div className="investment-rule" key={rule.id}><div><strong>{rule.industry_name}</strong><span>{money(rule.minimum_amount)} – {money(rule.maximum_amount)}</span></div><small>{Number(rule.investor_revenue_share_percent ?? 100)}% of realized eligible lead-sale revenue</small></div>)}</div>
          </div>
        </section>

        <section className="investment-card investment-history">
          <div className="history-heading"><div><span className="investment-kicker">CYCLE HISTORY</span><h2>Your investments & reinvestments</h2><p>Every realized payout and automatic reinvestment is shown as a separate cycle.</p></div><span className="history-count">{mine.length} CYCLES</span></div>
          {!mine.length ? <div className="empty-state">No investment cycles yet. Your first eligible investment will appear here.</div> : (
            <div className="investment-list">
              {mine.map((item) => {
                const isChild = Boolean(item.parent_investment_id)
                const hasChild = Boolean(item.reinvested_to_id)
                const payout = Number(item.payout_amount || 0)
                return (
                  <div className="investment-item" key={item.id}>
                    <div className="investment-item-main">
                      <div><strong>{item.industry_name}</strong><span className="cycle-label">Cycle #{item.id}{isChild ? ' · Auto-reinvested cycle' : ''}</span></div>
                      <span className="investment-badge">{item.status}</span>
                    </div>
                    <div className="investment-item-meta"><span>Invested <b>{money(item.amount)}</b></span><span>Realized <b>{money(item.realized_revenue)}</b></span><span>Payout <b>{money(payout)}</b></span>{item.matures_at && <span>Matures <b>{new Date(item.matures_at).toLocaleDateString('en-IN')}</b></span>}</div>
                    {hasChild && <div className="reinvestment-panel"><div><strong>↻ REINVESTMENT CREATED</strong><span>₹{payout.toLocaleString('en-IN', { maximumFractionDigits: 2 })} realized proceeds were moved into the next cycle.</span></div><a href={`#cycle-${item.reinvested_to_id}`}>View next cycle →</a></div>}
                    {isChild && <div className="reinvestment-panel reinvestment-muted"><div><strong>↻ FUNDED BY REINVESTMENT</strong><span>This cycle was created from the realized proceeds of the previous cycle.</span></div></div>}
                    <div id={`cycle-${item.id}`} />
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
