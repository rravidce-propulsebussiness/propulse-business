import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authRequest } from '../utils/auth'
import './InvestorGeneratedFunds.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function InvestorGeneratedFunds(){
  const [data,setData]=useState(null),[account,setAccount]=useState(null),[amount,setAmount]=useState(''),[notes,setNotes]=useState(''),[open,setOpen]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const [funds,payoutAccount]=await Promise.all([authRequest('/investments/funds'),authRequest('/investor/payout-account')])
      setData(funds);setAccount(payoutAccount)
    }catch(e){setError(e.message||'Unable to load investment funds')}finally{setLoading(false)}
  }
  useEffect(()=>{load()},[])

  const availableForAds=Number(data?.available_for_ads ?? data?.amount_in_ads ?? 0)
  const transferable=Number(data?.transferable ?? 0)
  const reserved=Number(data?.reserved ?? 0)
  const canTransfer=transferable>0 && Boolean(account)

  const openTransfer=()=>{
    setError('');setMessage('')
    if(!account) return setError('Add a Bank Account or UPI before requesting a transfer.')
    if(transferable<=0) return setError('No generated earnings are currently available for transfer.')
    setAmount(transferable.toFixed(2));setOpen(true)
  }

  const submit=async()=>{
    const value=Number(amount)
    if(!Number.isFinite(value)||value<=0)return setError('Enter a valid transfer amount.')
    if(value>transferable)return setError(`You can request up to ${money(transferable)}.`)
    setBusy(true);setError('');setMessage('')
    try{
      await authRequest('/investments/funds/transfer-request',{method:'POST',body:JSON.stringify({amount:value,notes})})
      setAmount('');setNotes('');setOpen(false);setMessage('Transfer request submitted. Propulse will process it to your saved payout account.');await load()
    }catch(e){setError(e.message||'Unable to raise transfer request')}finally{setBusy(false)}
  }

  if(loading)return <section className="investor-generated-funds"><div className="investor-generated-loading">Loading investment funds…</div></section>

  const requests=data?.requests||[]
  return <section className="investor-generated-funds">
    <div className="investor-generated-head">
      <div><span className="investor-generated-kicker">INVESTMENT FUNDS</span><h2>Your money, earnings & transfers</h2><p>Track advertising capital, generated lead-sale earnings and every transfer request from one place.</p></div>
      <div className="investor-generated-actions"><Link className="investor-account-button" to="/profile/payout-account">{account?'Manage Bank / UPI':'＋ Add Bank / UPI'}</Link><button type="button" className="investor-transfer-button" onClick={openTransfer} disabled={!canTransfer}>Transfer {money(transferable)}</button></div>
    </div>

    {message&&<div className="investor-generated-message">{message}</div>}
    {error&&<div className="investor-generated-error">{error}</div>}

    <div className="investor-funds-account-bar">
      <div className="fund-account-icon">₹</div>
      <div><span>PAYOUT ACCOUNT</span>{account?<strong>{account.method==='upi'?`UPI · ${account.upi_id}`:`${account.bank_name} · ${account.account_number_masked}`}</strong>:<strong>No payout account added</strong>}</div>
      <Link to="/profile/payout-account">{account?'Change account':'Add account'} →</Link>
    </div>

    <div className="investor-generated-grid">
      <article className="available"><span>AVAILABLE FOR ADS</span><strong>{money(availableForAds)}</strong><small>Capital and eligible Auto-Invest earnings currently available for Propulse advertising.</small></article>
      <article><span>AD SPENT</span><strong>{money(data?.total_ad_spent)}</strong><small>Total actual advertising spend recorded against your investment.</small></article>
      <article><span>TOTAL INVESTMENT CAPITAL</span><strong>{money(data?.total_invested)}</strong><small>Your investor-contributed capital across investment cycles.</small></article>
      <article><span>GENERATED EARNINGS</span><strong>{money(data?.generated)}</strong><small>Total earnings generated from eligible paid lead sales.</small></article>
      <article className="transferable"><span>READY TO TRANSFER</span><strong>{money(transferable)}</strong><small>Non-Auto-Invest earnings you can request to your saved Bank Account or UPI.</small></article>
      <article><span>TRANSFER RESERVED</span><strong>{money(reserved)}</strong><small>Generated funds reserved against pending transfer requests.</small></article>
    </div>

    <div className="investor-transfer-history">
      <div className="investor-transfer-history-head"><div><b>TRANSFER ACTIVITY</b><small>Track requests, processing and completed payouts</small></div><span>{requests.length}</span></div>
      {requests.length?<div>{requests.map(item=><div className="investor-transfer-row" key={item.id}><div><strong>Request #{item.id}</strong><small>{date(item.requested_at)}{item.processed_at?` · Processed ${date(item.processed_at)}`:''}</small></div><b>{money(item.amount)}</b><span className={`investor-transfer-status ${item.status}`}>{item.status}</span><small>{item.transfer_reference?`UTR: ${item.transfer_reference}`:'Reference pending'}</small></div>)}</div>:<div className="investor-transfer-empty"><span>↗</span><div><strong>No transfer requests yet</strong><small>Your completed and pending transfer activity will appear here.</small></div></div>}
    </div>

    {open&&<div className="investor-funds-overlay" onMouseDown={e=>e.target===e.currentTarget&&!busy&&setOpen(false)}><section className="investor-funds-modal"><button type="button" className="investor-funds-close" onClick={()=>!busy&&setOpen(false)}>×</button><span className="investor-generated-kicker">TRANSFER EARNINGS</span><h2>Request a bank / UPI transfer</h2><p>Your investment capital stays protected. This request transfers only eligible generated earnings.</p><div className="investor-transfer-destination"><span>Sending to</span><strong>{account?.method==='upi'?`UPI · ${account.upi_id}`:`${account?.bank_name} · ${account?.account_number_masked}`}</strong><Link to="/profile/payout-account">Change</Link></div><div className="investor-transfer-available"><span>Ready to transfer</span><strong>{money(transferable)}</strong></div><label>Amount to transfer<input type="number" min="1" max={transferable} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter amount"/></label><label>Note (optional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional note for the Propulse finance team" rows="3"/></label><button type="button" className="investor-transfer-submit" disabled={busy||!amount} onClick={submit}>{busy?'Submitting…':'Submit transfer request'}</button></section></div>}
  </section>
}
