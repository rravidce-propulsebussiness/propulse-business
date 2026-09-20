import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { authRequest } from '../utils/auth'
import './InvestmentWithGeneratedFunds.css'

const money = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const dt = v => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const st = v => String(v || '').toUpperCase()
const OPEN = new Set(['ACTIVE', 'EXIT_REQUESTED', 'WAITING_FOR_LEADS'])
const INVESTED = new Set(['ACTIVE', 'MATURED', 'PAID'])
const list = value => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : Array.isArray(value?.rows) ? value.rows : []

export default function InvestmentCycleDashboard() {
  const location = useLocation()
  const [cycle, setCycle] = useState(null), [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [rules, setRules] = useState([]), [wallet, setWallet] = useState(null), [access, setAccess] = useState(null), [payoutAccount, setPayoutAccount] = useState(null), [funds, setFunds] = useState(null)
  const [showInvest, setShowInvest] = useState(() => new URLSearchParams(window.location.search).get('new') === '1'), [showWithdraw, setShowWithdraw] = useState(false)
  const [amount, setAmount] = useState(''), [withdrawAmount, setWithdrawAmount] = useState(''), [autoInvestChoice, setAutoInvestChoice] = useState(true), [busy, setBusy] = useState(false), [withdrawBusy, setWithdrawBusy] = useState(false)
  const [message, setMessage] = useState(''), [actionError, setActionError] = useState(''), [directPayment, setDirectPayment] = useState(null), [receiving, setReceiving] = useState([]), [paymentReference, setPaymentReference] = useState(''), [paymentProof, setPaymentProof] = useState(null), [paymentBusy, setPaymentBusy] = useState(false)

  const load = async (initial = false) => {
    if (initial) setLoading(true)
    try {
      const [cycleResult, investmentResult, rulesResult, accessResult, walletResult, fundsResult, accountResult] = await Promise.all([authRequest('/investments/cycle'), authRequest('/investments'), authRequest('/investments/rules'), authRequest('/investments/access'), authRequest('/wallet'), authRequest('/investments/funds'), authRequest('/investor/payout-account')])
      const candidate = cycleResult?.cycle || null
      const activeCycle = candidate && OPEN.has(st(candidate.status)) ? candidate : null
      const investmentRows = list(investmentResult)
      setCycle(activeCycle)
      setRows(activeCycle ? investmentRows.filter(r => Number(r?.cycle_id) === Number(activeCycle.id) && INVESTED.has(st(r?.status))) : [])
      setRules(list(rulesResult)); setAccess(accessResult || null); setWallet(walletResult || null); setFunds(fundsResult || null); setPayoutAccount(accountResult || null)
      if (activeCycle) setAutoInvestChoice(Boolean(activeCycle.auto_invest))
      setError('')
    } catch (e) { if (initial) setError(e?.message || 'Unable to load the current investment cycle') }
    finally { if (initial) setLoading(false) }
  }

  useEffect(() => {
    let cancelled = false
    const initialLoad = async () => { if (!cancelled) await load(true) }
    initialLoad()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const shouldOpen = new URLSearchParams(location.search).get('new') === '1'
    if (!shouldOpen) return
    setShowInvest(true)
    window.history.replaceState({}, '', location.pathname)
  }, [location.search])

  const config = useMemo(() => {
    const activeRules = rules.filter(rule => rule && rule.is_active !== false)
    if (!activeRules.length) return null
    const mins = activeRules.map(r => Number(r.minimum_amount)).filter(Number.isFinite)
    const maxs = activeRules.map(r => Number(r.maximum_amount)).filter(Number.isFinite)
    return { minimum: mins.length ? Math.min(...mins) : 1, maximum: maxs.length ? Math.max(...maxs) : undefined }
  }, [rules])

  if (loading) return <section className="cycle-dashboard-loading">Loading investment dashboard…</section>

  const active = Boolean(cycle), auto = active ? Boolean(cycle.auto_invest) : Boolean(autoInvestChoice)
  const actual = active ? rows.filter(r => r?.parent_investment_id == null).reduce((s, r) => s + Number(r?.amount || 0), 0) : 0
  const reinvest = active ? rows.filter(r => r?.parent_investment_id != null).reduce((s, r) => s + Number(r?.amount || 0), 0) : 0
  const total = active ? (actual + reinvest || Number(cycle.total_invested ?? cycle.principal ?? 0)) : 0
  const earnings = active ? Number(cycle.investor_earnings ?? cycle.generated ?? 0) : 0
  const transferable = active ? Number(cycle.transferable ?? cycle.withdrawable_earnings ?? funds?.transferable ?? funds?.withdrawable_earnings ?? 0) : 0
  const spent = active ? Number(cycle.ad_spent ?? funds?.ad_spent ?? 0) : 0
  const reinvestedEarnings = active ? Math.max(0, spent - total) : 0
  const unmatured = active ? Math.max(0, earnings - reinvestedEarnings) : 0
  const linked = active ? Number(cycle.total_leads ?? 0) : 0, sold = active ? Number(cycle.sold_leads ?? 0) : 0, final = active ? Number(cycle.final_leads ?? 0) : 0, pending = active ? Number(cycle.pending_leads ?? 0) : 0
  const paid = active ? Number(cycle.payout_transferred ?? 0) : 0, reserved = active ? Number(cycle.payout_reserved ?? 0) : 0
  const closing = active && ['EXIT_REQUESTED', 'WAITING_FOR_LEADS'].includes(st(cycle.status)), walletBalance = Number(wallet?.balance || 0), withdrawValue = Number(withdrawAmount || 0)

  const openInvest = () => { setAmount(''); setActionError(''); setMessage(''); setAutoInvestChoice(active ? auto : true); setShowInvest(true) }
  const submitWalletInvestment = async () => {
    setActionError(''); const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setActionError('Enter an investment amount greater than zero.')
    if (config?.minimum && value < config.minimum) return setActionError(`Investment must be at least ${money(config.minimum)}.`)
    if (config?.maximum && value > config.maximum) return setActionError(`Investment cannot exceed ${money(config.maximum)}.`)
    if (active && autoInvestChoice !== auto) return setActionError(`This cycle is ${auto ? 'Auto-Invest ON' : 'Auto-Invest OFF'}. Additional investments must keep the same mode.`)
    if (closing) return setActionError('Your current cycle is closing. Please wait for it to finish.')
    if (walletBalance < value) return startDirectPayment(value)
    try { setBusy(true); await authRequest('/investments/checkout', { method: 'POST', body: JSON.stringify({ amount: value, useWallet: true, reinvestmentEnabled: active ? auto : autoInvestChoice }) }); setShowInvest(false); setAmount(''); setMessage(active ? 'Investment added to your current cycle.' : 'Investment cycle started successfully.'); await load(false) }
    catch (e) { setActionError(e?.message || 'Unable to complete investment.') } finally { setBusy(false) }
  }
  const startDirectPayment = async value => {
    setActionError(''); const amountValue = Number(value)
    try { setBusy(true); const details = list(await authRequest('/payment-receiving-details')); if (!details.length) throw new Error('Direct payment is not configured yet. Please contact Propulse support.'); const draft = await authRequest('/investments/checkout', { method: 'POST', body: JSON.stringify({ amount: amountValue, useWallet: false, reinvestmentEnabled: active ? auto : autoInvestChoice }) }); setReceiving(details); setDirectPayment(draft); setShowInvest(false); setActionError('') }
    catch (e) { setActionError(e?.message || 'Unable to prepare direct payment.') } finally { setBusy(false) }
  }
  const submitPaymentProof = async () => {
    if (!directPayment?.payment?.id) return setActionError('Payment session is unavailable.')
    if (!paymentReference.trim()) return setActionError('Enter the payment reference / UTR.')
    if (!paymentProof) return setActionError('Upload the payment screenshot or PDF.')
    if (paymentProof.size > 5 * 1024 * 1024) return setActionError('Payment proof must be 5 MB or smaller.')
    try { setPaymentBusy(true); const proofUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read payment proof.')); reader.readAsDataURL(paymentProof) }); await authRequest(`/payments/${directPayment.payment.id}/reference`, { method: 'POST', body: JSON.stringify({ manualReference: paymentReference.trim(), proofUrl, notes: 'Propulse managed investment direct payment' }) }); setDirectPayment(null); setReceiving([]); setPaymentReference(''); setPaymentProof(null); setMessage('Payment submitted for verification. Your investment will activate after payment approval.') }
    catch (e) { setActionError(e?.message || 'Unable to submit payment proof.') } finally { setPaymentBusy(false) }
  }
  const openWithdrawal = () => { setWithdrawAmount(transferable > 0 ? transferable.toFixed(2) : ''); setActionError(''); setMessage(''); setShowWithdraw(true) }
  const submitWithdrawal = async () => {
    setActionError(''); if (!payoutAccount) return setActionError('Please add your Bank Account or UPI before requesting a withdrawal.'); if (closing) return setActionError('Your current investment cycle is closing. Please wait before requesting a withdrawal.'); if (!Number.isFinite(withdrawValue) || withdrawValue <= 0) return setActionError('Enter a withdrawal amount greater than zero.'); if (withdrawValue > transferable + 1e-6) return setActionError('Withdrawal amount exceeds your available earnings.')
    try { setWithdrawBusy(true); await authRequest('/investments/funds/transfer-request', { method: 'POST', body: JSON.stringify({ amount: withdrawValue, withdrawalType: 'PARTIAL' }) }); setShowWithdraw(false); setWithdrawAmount(''); setMessage('Withdrawal request submitted. The requested amount is reserved while Propulse processes the transfer.'); await load(false) }
    catch (e) { setActionError(e?.message || 'Unable to submit withdrawal request.') } finally { setWithdrawBusy(false) }
  }

  return <section className="cycle-dashboard">
    <div className="cycle-dashboard-top"><div><span className="cycle-kicker">{active ? 'CURRENT INVESTMENT CYCLE' : 'INVESTMENT WORKSPACE'}</span><h1>{active ? `Cycle #${cycle.id} · ${auto ? 'Auto-Invest ON' : 'Auto-Invest OFF'}` : 'No Active Investment Cycle'}</h1><p>{active ? `${st(cycle.status).replaceAll('_', ' ')} · Started ${dt(cycle.started_at)} · Maturity ${dt(cycle.maturity_at)}` : 'Your previous cycle is closed. Current-cycle balances are ₹0. Previous-cycle investment, advertising, lead sales and withdrawals are available in History.'}</p></div><div className="cycle-dashboard-actions">{active ? <><button type="button" onClick={openInvest} disabled={closing}>＋ Invest</button>{auto && !closing && <button type="button" className="secondary" onClick={() => setMessage('Use the Withdrawal action after eligible earnings are generated.')}>Request Final Exit</button>}</> : <button type="button" onClick={openInvest}>＋ Invest</button>}<button type="button" className="withdraw-dashboard-button" onClick={openWithdrawal}>Withdrawals →</button></div></div>
    {message && <div className="investor-section-success" style={{ marginTop: 12 }}>{message}</div>}{error && <div className="investor-section-error" style={{ marginTop: 12 }}>{error}</div>}{actionError && <div className="investor-section-error" style={{ marginTop: 12 }}>{actionError}</div>}
    <div className="cycle-dashboard-grid"><article className="primary"><span>ACTUAL INVESTMENT</span><strong>{money(actual)}</strong><small>{active ? 'Original capital contributed in this cycle.' : 'No active-cycle investment.'}</small></article><article><span>REINVESTMENT</span><strong>{money(reinvest)}</strong><small>{active ? 'Capital reinvested into this current cycle.' : 'No active-cycle reinvestment.'}</small></article><article><span>TOTAL INVESTMENT</span><strong>{money(total)}</strong><small>{active ? 'Actual investment + reinvestment for this cycle.' : 'No active-cycle investment.'}</small></article><article><span>MY EARNINGS</span><strong>{money(earnings)}</strong><small>{active ? 'My realized earnings from paid lead sales in this cycle.' : 'No active-cycle earnings.'}</small></article><article><span>ADS SPENT</span><strong>{money(spent)}</strong><small>{active ? 'Actual advertising spend recorded in this cycle.' : 'No current-cycle ad spend.'}</small></article><article><span>AVAILABLE FOR BANK TRANSFER</span><strong>{money(transferable)}</strong><small>{active ? 'Eligible current-cycle earnings available for withdrawal.' : 'No active-cycle earnings available for transfer.'}</small>{active && transferable > 0 && !closing && <button type="button" className="cycle-withdraw-button" onClick={openWithdrawal}>Withdraw Earnings</button>}</article><article><span>UNMATURED FUND</span><strong>{money(unmatured)}</strong><small>{active ? 'Lead-sale earnings not yet used for advertising or available for bank transfer.' : 'No active-cycle unmatured earnings.'}</small></article></div>
    <div className="cycle-dashboard-leadbar"><div><b>Linked Leads</b><span>{linked}</span></div><div><b>Leads Sold</b><span>{sold}</span></div><div><b>Final Leads</b><span>{final}</span></div><div><b>Pending Leads</b><span>{pending}</span></div><div><b>Transfer Paid</b><span>{money(paid)}</span></div><div><b>Transfer Reserved</b><span>{money(reserved)}</span></div></div>
    <div className="cycle-dashboard-nav"><Link to="/investment/leads">Linked Leads</Link><Link to="/investment/history">History</Link><Link to="/investment/payouts">Withdrawals</Link><Link to="/investment/faq">FAQ</Link></div>
    <div className="cycle-dashboard-note">{active ? <><b>Current Cycle Only</b><span>{auto ? 'Auto-Invest eligible earnings can be used for advertising; bank transfer shows only transferable earnings.' : 'This dashboard shows only this active cycle. Previous cycles remain under History.'}</span></> : <><b>Previous Cycle Closed</b><span>All current-cycle balances are ₹0. Previous investment, advertising, lead sales and withdrawals remain available under History.</span></>}</div>

    {showInvest && <div className="investor-action-overlay" onMouseDown={e => e.target === e.currentTarget && !busy && setShowInvest(false)}><section className="investor-action-modal"><button className="investor-action-close" type="button" disabled={busy} onClick={() => !busy && setShowInvest(false)}>×</button><span className="cycle-kicker">{active ? 'ADD TO CURRENT CYCLE' : 'INVEST'}</span><h2>{active ? 'Add investment' : 'Start your investment'}</h2><p>Choose the amount. Propulse manages targeting and advertising internally.</p>{!active && <div className="investor-mode-toggle"><button type="button" className={autoInvestChoice ? 'selected' : ''} onClick={() => setAutoInvestChoice(true)}><b>Auto-Invest ON</b><small>Earnings can fund future ads.</small></button><button type="button" className={!autoInvestChoice ? 'selected' : ''} onClick={() => setAutoInvestChoice(false)}><b>Auto-Invest OFF</b><small>Earnings become transferable.</small></button></div>}{active && <div className="investor-mode-lock">Current cycle: <b>{auto ? 'Auto-Invest ON' : 'Auto-Invest OFF'}</b></div>}<label>Investment amount<input type="number" min={config?.minimum || 1} max={config?.maximum || undefined} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" /></label><div className="investor-wallet-row"><span>Wallet balance</span><b>{money(walletBalance)}</b></div><button type="button" className="dashboard-primary-link investor-modal-primary" disabled={busy || !amount} onClick={submitWalletInvestment}>{busy ? 'Processing…' : walletBalance >= Number(amount || 0) ? 'Invest from Wallet →' : 'Continue to Direct Payment →'}</button></section></div>}

    {directPayment && <div className="investor-action-overlay"><section className="investor-action-modal"><button className="investor-action-close" type="button" disabled={paymentBusy} onClick={() => !paymentBusy && setDirectPayment(null)}>×</button><span className="cycle-kicker">DIRECT PAYMENT</span><h2>Complete your investment payment</h2><p>Transfer the investment amount to a Propulse receiving account below, then submit the reference and proof. Admin will verify it manually.</p><div className="receiving-list">{receiving.map((item, index) => <div className="receiving-card" key={item.id || index}><b>{item.bank_name || item.account_name || 'Propulse Account'}</b><span>{item.account_number || item.upi_id || item.account_no || ''}</span><small>{item.ifsc_code || item.branch_name || item.note || ''}</small></div>)}</div><div className="investor-payment-amount">Investment amount <b>{money(directPayment?.payment?.amount ?? directPayment?.payment?.external_amount ?? directPayment?.investment?.amount)}</b></div><label>Payment reference / UTR<input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} /></label><label>Payment screenshot / PDF<input type="file" accept="image/*,.pdf" onChange={e => setPaymentProof(e.target.files?.[0] || null)} /></label><button type="button" className="dashboard-primary-link investor-modal-primary" disabled={paymentBusy} onClick={submitPaymentProof}>{paymentBusy ? 'Submitting…' : 'Submit Payment for Verification →'}</button></section></div>}

    {showWithdraw && <div className="investor-action-overlay" onMouseDown={e => e.target === e.currentTarget && !withdrawBusy && setShowWithdraw(false)}><section className="investor-action-modal"><button className="investor-action-close" type="button" disabled={withdrawBusy} onClick={() => !withdrawBusy && setShowWithdraw(false)}>×</button><span className="cycle-kicker">WITHDRAW EARNINGS</span><h2>Request withdrawal</h2><p>Only eligible investor earnings can be withdrawn. Your invested principal is never included.</p>{payoutAccount ? <div className="investor-mode-lock"><b>{payoutAccount.method === 'upi' ? 'UPI' : 'Bank Account'}</b><small>{payoutAccount.method === 'upi' ? payoutAccount.upi_id : `${payoutAccount.account_holder_name} · ${payoutAccount.bank_name} · ${payoutAccount.account_number_masked} · ${payoutAccount.ifsc_code}`}</small></div> : <div className="investor-section-error">No payout account saved. <Link to="/profile/payout-account" onClick={() => setShowWithdraw(false)}>Add Bank Account / UPI</Link></div>}<div className="investor-wallet-row"><span>Available to withdraw</span><b>{money(transferable)}</b></div><label>Withdrawal amount<input type="number" min="0.01" max={transferable || undefined} step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} /></label><button type="button" className="dashboard-primary-link investor-modal-primary" disabled={withdrawBusy || !payoutAccount || withdrawValue <= 0 || withdrawValue > transferable + 1e-6 || closing} onClick={submitWithdrawal}>{withdrawBusy ? 'Submitting…' : 'Submit Withdrawal Request →'}</button></section></div>}
  </section>
}
