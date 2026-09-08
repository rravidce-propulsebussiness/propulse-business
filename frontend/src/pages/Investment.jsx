import { useEffect, useMemo, useState } from 'react'
import './Investment.css'
import { authRequest, getToken } from '../utils/auth'
import { API_BASE_URL } from '../utils/api'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const list = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : Array.isArray(value?.rows) ? value.rows : []
const idOf = (value) => String(value?.id ?? value?._id ?? '')
const nameOf = (value) => String(value?.name ?? value?.state_name ?? value?.city_name ?? '').trim()
const cityState = (value) => String(value?.state_id ?? value?.stateId ?? value?.state?.id ?? '')
const unique = (items) => { const seen = new Set(); return items.filter(item => { const id = idOf(item); if (!id || seen.has(id)) return false; seen.add(id); return true }) }

export default function Investment() {
  const [access, setAccess] = useState(null)
  const [rules, setRules] = useState([])
  const [locationRules, setLocationRules] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [mine, setMine] = useState([])
  const [soldLeads, setSoldLeads] = useState([])
  const [wallet, setWallet] = useState(null)
  const [industryId, setIndustryId] = useState('')
  const [stateId, setStateId] = useState('')
  const [cityId, setCityId] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reinvestingId, setReinvestingId] = useState(null)
  const [payment, setPayment] = useState(null)
  const [receivingDetails, setReceivingDetails] = useState([])
  const [paymentError, setPaymentError] = useState('')
  const [directSubmitting, setDirectSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...(options.headers || {}) } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) { const error = new Error(data.error || `Request failed (${response.status})`); error.code = data.code; error.status = response.status; throw error }
    return data
  }

  const load = async () => {
    setLoadError('')
    try {
      const a = await request('/investments/access')
      setAccess(a)
      const results = await Promise.allSettled([
        request('/investments/rules'),
        request('/investments/location-rules'),
        request('/investments'),
        request('/states'),
        request('/cities'),
        request('/wallet'),
        request('/investments/sold-leads'),
      ])
      const [r, lr, inv, s, c, w, sold] = results
      if (r.status === 'fulfilled') {
        const normalizedRules = list(r.value)
        setRules(normalizedRules)
        setIndustryId(value => value || String(normalizedRules[0]?.industry_id ?? ''))
      }
      if (lr.status === 'fulfilled') setLocationRules(list(lr.value))
      if (inv.status === 'fulfilled') setMine(list(inv.value))
      if (s.status === 'fulfilled') setStates(unique(list(s.value)))
      if (c.status === 'fulfilled') setCities(unique(list(c.value)))
      if (w.status === 'fulfilled') setWallet(w.value)
      if (sold.status === 'fulfilled') setSoldLeads(list(sold.value))
      const failed = results.filter(result => result.status === 'rejected')
      if (failed.length) console.warn('Some investment data failed to load:', failed.map(result => result.reason?.message || 'Request failed'))
    } catch (error) {
      setLoadError(error.message || 'Unable to load the investment workspace.')
      setAccess(null)
    }
  }

  useEffect(() => { load() }, [])

  const selected = rules.find(rule => String(rule.industry_id) === String(industryId))
  const visibleStates = useMemo(() => unique(states), [states])
  const cityOptions = useMemo(() => unique(cities.filter(city => cityState(city) === String(stateId))), [cities, stateId])
  const selectedState = states.find(state => idOf(state) === String(stateId))
  const stateHasCityRules = useMemo(() => locationRules.some(rule => Number(rule.industry_id) === Number(industryId) && String(rule.state_id) === String(stateId) && rule.city_id != null), [locationRules, industryId, stateId])
  const selectedLocationRule = useMemo(() => {
    if (!access?.locationLimitsEnabled || !industryId || !stateId) return null
    const exact = cityId && locationRules.find(rule => Number(rule.industry_id) === Number(industryId) && String(rule.state_id) === String(stateId) && String(rule.city_id) === String(cityId))
    return exact || locationRules.find(rule => Number(rule.industry_id) === Number(industryId) && String(rule.state_id) === String(stateId) && rule.city_id == null) || null
  }, [access?.locationLimitsEnabled, industryId, stateId, cityId, locationRules])
  const locationLimitCompleted = Boolean(selectedLocationRule && Number(selectedLocationRule.remaining_count) <= 0)
  const walletBalance = Number(wallet?.balance || 0)
  const investmentAmount = Number(amount || 0)
  const walletCanPay = investmentAmount > 0 && walletBalance >= investmentAmount
  const insufficient = investmentAmount > 0 && walletBalance < investmentAmount
  const active = mine.filter(item => ['active', 'matured'].includes(String(item.status).toLowerCase()))
  const pending = mine.filter(item => String(item.status).toLowerCase() === 'pending')
  const totalInvested = mine.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const totalRealized = mine.reduce((sum, item) => sum + Number(item.realized_revenue || 0), 0)
  const waiting = mine.filter(item => item.reinvestment_available)

  const validLocation = () => {
    if (!industryId) throw Error('Select an industry.')
    if (!selected) throw Error('Investment rule is unavailable for this industry.')
    if (access?.locationLimitsEnabled && !stateId) throw Error('Select an investment state.')
    if (access?.locationLimitsEnabled && !selectedLocationRule) throw Error('Investment is not available for this industry and location.')
    if (locationLimitCompleted) throw Error('Investor limit completed for this location.')
    if (stateHasCityRules && !cityId && !locationRules.some(rule => Number(rule.industry_id) === Number(industryId) && String(rule.state_id) === String(stateId) && rule.city_id == null)) throw Error('Select a city for this location.')
    if (investmentAmount <= 0) throw Error('Enter an investment amount.')
    if (investmentAmount < Number(selected.minimum_amount) || investmentAmount > Number(selected.maximum_amount)) throw Error(`Investment must be between ${money(selected.minimum_amount)} and ${money(selected.maximum_amount)}.`)
  }

  const invest = async () => {
    setBusy(true); setMessage(''); setActionError('')
    try { validLocation(); if (!walletCanPay) throw Error('Your wallet balance is not enough. Use direct payment to continue.'); await request('/investments/checkout', { method: 'POST', body: JSON.stringify({ industryId: Number(industryId), stateId: stateId ? Number(stateId) : null, cityId: cityId ? Number(cityId) : null, amount: investmentAmount, useWallet: true }) }); setAmount(''); setMessage('Investment cycle created successfully from your wallet.'); await load() }
    catch (error) { setActionError(error.message) } finally { setBusy(false) }
  }

  const openDirectPayment = async () => {
    setBusy(true); setMessage(''); setActionError(''); setPaymentError('')
    try { validLocation(); if (walletCanPay) throw Error('Your wallet can cover this investment. Use wallet payment instead.'); const details = list(await authRequest('/payment-receiving-details')); if (!details.length) throw Error('Direct payment is not configured yet. Please contact Propulse support.'); setReceivingDetails(details); const result = await request('/investments/checkout', { method: 'POST', body: JSON.stringify({ industryId: Number(industryId), stateId: stateId ? Number(stateId) : null, cityId: cityId ? Number(cityId) : null, amount: investmentAmount, useWallet: false }) }); setPayment(result); setAmount('') }
    catch (error) { setActionError(error.message) } finally { setBusy(false) }
  }

  const submitDirect = async () => {
    setPaymentError('')
    const reference = document.getElementById('investment-payment-utr')?.value?.trim()
    const file = document.getElementById('investment-payment-proof')?.files?.[0]
    if (!reference) return setPaymentError('Enter the payment reference / UTR first.')
    if (!file) return setPaymentError('Upload the payment screenshot or PDF first.')
    if (file.size > 5 * 1024 * 1024) return setPaymentError('Payment proof must be 5 MB or smaller.')
    if (!payment?.payment?.id) return setPaymentError('Payment session is unavailable. Please try again.')
    try {
      setDirectSubmitting(true)
      const proofUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read payment proof')); reader.readAsDataURL(file) })
      await authRequest(`/payments/${payment.payment.id}/reference`, { method: 'POST', body: JSON.stringify({ manualReference: reference, proofUrl, notes: `Investment direct payment · ${payment.investment?.id || 'new cycle'}` }) })
      setPayment(null); setMessage('Direct payment submitted for verification. Your investment will activate after Propulse approves the payment.'); await load()
    } catch (error) { setPaymentError(error.message || 'Unable to submit payment. Please try again.') } finally { setDirectSubmitting(false) }
  }

  const reinvest = async (item) => {
    setReinvestingId(item.id); setMessage('')
    try { await request(`/investments/${item.id}/reinvest`, { method: 'POST' }); setMessage(`${money(item.payout_amount)} was reinvested into a new cycle.`); await load() }
    catch (error) { setMessage(error.message) } finally { setReinvestingId(null) }
  }

  if (!access) return <main className="investment-page"><div className="investment-shell"><div className="investment-card investment-loading">{loadError ? `Unable to load investor workspace: ${loadError}` : 'Loading investor workspace…'}</div></div></main>
  if (!access.canInvest) return <main className="investment-page"><div className="investment-shell"><section className="investment-hero"><span className="investment-kicker">PROPULSE INVESTOR</span><h1>Invest in growth powered by real lead demand.</h1><p>{access.requiresPro ? 'An active Pro membership is required before you can invest.' : 'Investment is currently unavailable.'}</p></section></div></main>

  return <main className="investment-page"><div className="investment-shell">
    <section className="investment-hero">
      <div className="investment-hero-copy"><span className="investment-kicker">PROPULSE INVESTOR · GROWTH CYCLES</span><h1>Invest. Grow business. Get leads sold. Earn from real returns.</h1><p>Fund eligible lead-generation cycles. Propulse uses the investment to generate and sell leads, and your cycle participates only in revenue actually realized from eligible paid lead sales.</p></div>
      <div className="investment-hero-flow"><div><b>01</b><span>Invest</span></div><i>→</i><div><b>02</b><span>Leads sell</span></div><i>→</i><div><b>03</b><span>Revenue realized</span></div><i>→</i><div><b>04</b><span>Wallet payout</span></div></div>
    </section>
    {message && <div className="investment-message">{message}</div>}
    <section className="investment-summary" id="available">
      <div className="investment-summary-main"><span>AMOUNT AVAILABLE</span><strong>{money(walletBalance)}</strong><a href="/wallet">Open wallet →</a></div>
      <div className="investment-stat"><span>INVESTED</span><strong>{money(totalInvested)}</strong></div>
      <div className="investment-stat"><span>ACTIVE CYCLES</span><strong>{active.length}</strong></div>
      <div className="investment-stat"><span>SOLD LEADS</span><strong>{soldLeads.length}</strong></div>
      <div className="investment-stat"><span>REALIZED</span><strong>{money(totalRealized)}</strong></div>
    </section>
    {pending.length > 0 && <section className="investment-pending-note"><b>{pending.length} investment payment{pending.length > 1 ? 's' : ''} awaiting verification</b><span>Your submitted direct payment remains pending until Propulse verifies it.</span></section>}
    {waiting.length > 0 && <section className="reinvestment-choice-card"><div className="choice-card-heading"><div><span className="investment-kicker">PAYOUT READY</span><h2>Choose what happens next</h2><p>Your realized payout is in your wallet. Keep it available or reinvest it into the next cycle.</p></div><span className="choice-count">{waiting.length} READY</span></div><div className="choice-list">{waiting.map(item => <div className="choice-row" key={item.id}><div className="choice-row-main"><div className="choice-industry"><strong>{item.industry_name}</strong><span>Cycle #{item.id} · Settled</span></div><div className="choice-amount"><span>Realized payout</span><strong>{money(item.payout_amount)}</strong></div></div><div className="choice-actions"><button type="button" className="reinvest-button" disabled={reinvestingId === item.id} onClick={() => reinvest(item)}>{reinvestingId === item.id ? 'Creating cycle…' : `↻ Reinvest ${money(item.payout_amount)}`}</button><span className="keep-wallet">Keep in wallet</span></div></div>)}</div></section>}
    <section className="investment-grid" id="invested">
      <div className="investment-card investment-form-card"><div className="card-heading"><span className="investment-kicker">INVEST</span><h2>Start a growth cycle</h2><p>Select an eligible industry and location. If your wallet covers the amount, pay instantly. Otherwise, pay directly by bank/UPI.</p></div>
        <label>Industry<select value={industryId} onChange={event => { setIndustryId(event.target.value); setStateId(''); setCityId(''); setAmount(''); setActionError('') }}><option value="">Select industry</option>{rules.map(rule => <option key={rule.id || rule.industry_id} value={rule.industry_id}>{rule.industry_name}</option>)}</select></label>
        {access.locationLimitsEnabled && <><label>State<select value={stateId} onChange={event => { setStateId(event.target.value); setCityId(''); setActionError('') }}><option value="">Select state</option>{visibleStates.map(state => <option key={idOf(state)} value={idOf(state)}>{nameOf(state)}</option>)}</select></label><label>City<select value={cityId} disabled={!stateId} onChange={event => { setCityId(event.target.value); setActionError('') }}><option value="">{stateHasCityRules ? 'Select city / state-wide rule' : 'All cities'}</option>{cityOptions.map(city => <option key={idOf(city)} value={idOf(city)}>{nameOf(city)}</option>)}</select></label>{selectedLocationRule && <div className="investment-range"><span>Investor capacity <b>{locationLimitCompleted ? 'LIMIT COMPLETED' : `${selectedLocationRule.remaining_count} of ${selectedLocationRule.investor_limit} slots remaining`}</b></span><span>{selectedLocationRule.city_name ? `${selectedLocationRule.city_name}, ${selectedLocationRule.state_name}` : `${nameOf(selectedState)} · all cities`}</span></div>}</>}
        {selected && <div className="investment-range"><span>Minimum <b>{money(selected.minimum_amount)}</b></span><span>Maximum <b>{money(selected.maximum_amount)}</b></span></div>}
        <label>Investment amount<input type="number" min={selected?.minimum_amount || 1} max={Number(selected?.maximum_amount || Number.MAX_SAFE_INTEGER)} value={amount} disabled={locationLimitCompleted} onChange={event => { setAmount(event.target.value); setActionError('') }} placeholder="Enter amount" /></label>
        <div className="investment-wallet-action"><div><span>Available now</span><strong>{money(walletBalance)}</strong></div>{walletCanPay && <span className="investment-wallet-ready">✓ Wallet can cover this</span>}{insufficient && <span className="investment-wallet-short">Short by {money(investmentAmount - walletBalance)} · direct payment available</span>}</div>
        {actionError && <div className="investment-action-error" role="alert">{actionError}</div>}
        <div className="investment-action-buttons">{walletCanPay ? <button type="button" className="investment-submit" disabled={busy} onClick={invest}>{busy ? 'Processing…' : 'Invest from Wallet →'}</button> : <button type="button" className="investment-submit investment-submit-direct" disabled={busy} onClick={openDirectPayment}>{busy ? 'Preparing payment…' : 'Pay Directly →'}</button>}</div>
        <div className="investor-note"><b>Revenue-based investment</b><span>Returns depend on eligible paid lead sales actually realized by Propulse. Investment does not guarantee a fixed return.</span></div>
      </div>
      <div className="investment-card"><div className="section-heading"><div><span className="investment-kicker">ACTIVE RULES</span><h2>Eligible industries</h2><p>Each industry has its own investment range and investor capacity.</p></div></div><div className="investment-rules">{rules.length ? rules.map(rule => <div className="investment-rule" key={rule.id || rule.industry_id}><div><strong>{rule.industry_name}</strong><span>{money(rule.minimum_amount)} — {money(rule.maximum_amount)}</span></div><small>{Number(rule.maturity_days || 0)} day cycle</small></div>) : <div className="empty-state">No investment rules are currently configured.</div>}</div></div>
    </section>
    <section className="investment-card sold-leads-card" id="sold-leads"><div className="section-heading"><div><span className="investment-kicker">REVENUE GENERATED</span><h2>Lead sales linked to your investment</h2><p>These are leads sold from the demand generated through your eligible investment cycle.</p></div></div>{soldLeads.length ? <div className="sold-leads-list">{soldLeads.map(item => <article className="sold-lead-row" key={item.id}><div className="sold-lead-main"><strong>Lead #{item.id}</strong><span>{item.industry_name}{item.service_name ? ` · ${item.service_name}` : ''}</span><small>{[item.city_name, item.state_name].filter(Boolean).join(', ') || 'Location not set'}</small></div><div className="sold-lead-metric"><span>BUYERS</span><b>{item.buyer_count}</b></div><div className="sold-lead-metric"><span>GROSS SALES</span><b>{money(item.gross_sale_amount)}</b></div><div className="sold-lead-metric sold-lead-return"><span>YOUR REVENUE</span><b>{money(item.investor_revenue)}</b></div></article>)}</div> : <div className="empty-state">No linked lead sales yet.</div>}</section>
    <section className="investment-card investment-history" id="history"><div className="section-heading"><div><span className="investment-kicker">HISTORY</span><h2>Your investment cycles</h2><p>Track active, pending and settled cycles.</p></div><span className="history-count">{mine.length} CYCLES</span></div>{mine.length ? <div className="investment-list">{mine.map(item => <article className="investment-item" key={item.id}><div className="investment-item-main"><div><strong>{item.industry_name}</strong><span className="cycle-label">Cycle #{item.id} · {[item.city_name, item.state_name].filter(Boolean).join(', ') || 'Location not set'}</span></div><span className={`investment-badge investment-badge-${String(item.status).toLowerCase()}`}>{item.status}</span></div><div className="investment-item-meta"><span>Invested <b>{money(item.amount)}</b></span><span>Realized <b>{money(item.realized_revenue)}</b></span><span>Payout <b>{money(item.payout_amount)}</b></span><span>Matures <b>{item.matures_at ? new Date(item.matures_at).toLocaleDateString('en-IN') : '—'}</b></span></div></article>)}</div> : <div className="empty-state">No investment cycles yet.</div>}</section>
    {payment && <div className="investment-payment-overlay" onClick={() => !directSubmitting && setPayment(null)}><section className="investment-payment-modal" onClick={event => event.stopPropagation()}><button className="investment-payment-close" type="button" disabled={directSubmitting} onClick={() => setPayment(null)}>×</button><span className="investment-kicker">DIRECT PAYMENT</span><h2>Complete investment payment</h2><p>Transfer the exact amount shown below, then submit your UTR and payment proof.</p><div className="investment-payment-amount"><span>AMOUNT TO PAY</span><strong>{money(payment.externalAmount ?? payment.payment?.external_amount ?? payment.payment?.amount)}</strong></div>{payment.walletAmount > 0 && <div className="investment-payment-status">Wallet used: {money(payment.walletAmount)} · Direct payment: {money(payment.externalAmount)}</div>}{receivingDetails.length > 0 && <div className="investment-receiving-list">{receivingDetails.map((item,index) => <article className="investment-receiving-card" key={item.id || index}><strong>{item.account_name || item.bank_name || item.upi_id || 'Payment account'}</strong><span>{[item.bank_name,item.account_number,item.ifsc,item.upi_id].filter(Boolean).join(' · ')}</span>{item.qr_code_url && <img src={item.qr_code_url} alt="Payment QR code"/>}<small>Verify the receiving details before transferring.</small></article>)}</div>}<label className="investment-payment-field">Payment reference / UTR<input id="investment-payment-utr" type="text" placeholder="Enter UTR / transaction reference"/></label><label className="investment-payment-field">Payment proof<input id="investment-payment-proof" type="file" accept="image/*,.pdf"/></label>{paymentError && <div className="investment-payment-error">{paymentError}</div>}<button className="investment-payment-submit" type="button" disabled={directSubmitting} onClick={submitDirect}>{directSubmitting ? 'Submitting payment…' : 'Submit payment for verification'}</button></section></div>}
  </div></main>
}