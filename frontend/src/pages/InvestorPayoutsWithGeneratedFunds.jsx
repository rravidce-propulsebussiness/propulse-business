import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authRequest } from '../utils/auth'
import InvestorInvestmentSection from './InvestorInvestmentSection'
import './InvestorGeneratedFunds.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function InvestorPayoutsWithGeneratedFunds(){
  const [funds,setFunds]=useState(null),[loading,setLoading]=useState(true),[showTransfer,setShowTransfer]=useState(false),[amount,setAmount]=useState(''),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const load=()=>{setLoading(true);authRequest('/investments/funds').then(setFunds).catch(e=>setError(e.message||'Unable to load payout balance')).finally(()=>setLoading(false))}
  useEffect(()=>{load()},[])
  const requests=funds?.requests||[]
  const available=Number(funds?.transferable ?? 0)
  const account=funds?.payout_account
  const openTransfer=()=>{setError('');setMessage('');if(!account){setError('Add a Bank Account or UPI before requesting a transfer.');return}if(available<=0){setError('There are no non-auto-invest earnings available for transfer.');return}setAmount(available.toFixed(2));setShowTransfer(true)}
  const submit=async e=>{e.preventDefault();setError('');setMessage('');const value=Number(amount);if(!Number.isFinite(value)||value<=0)return setError('Enter a valid transfer amount.');if(value>available)return setError(`You can transfer up to ${money(available)}.`);try{setBusy(true);await authRequest('/investments/funds/transfer-request',{method:'POST',body:JSON.stringify({amount:value,notes})});setShowTransfer(false);setMessage('Transfer request submitted. Propulse will process it to your saved payout account.');load()}catch(e){setError(e.message||'Unable to submit transfer request.')}finally{setBusy(false)}}
  return <><InvestorInvestmentSection type="payouts"/><section className="investor-generated-funds investor-generated-payout-history"><div className="investor-generated-head"><div><span className="investor-generated-kicker">GENERATED FUNDS TRANSFERS</span><h2>Lead-sale revenue transfers</h2><p>Only earnings from investments with Auto-Invest turned off can be transferred to your saved Bank Account or UPI.</p></div><div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}><Link className="investor-section-invest" to="/profile/payout-account">{account?'Manage payout account':'＋ Add Bank / UPI'}</Link><button type="button" className="investor-section-invest" onClick={openTransfer} disabled={loading||available<=0}>{loading?'Loading…':`Transfer ${money(available)}`}</button></div></div>
    {message&&<div className="investor-generated-loading">{message}</div>}{error&&<div className="investor-generated-loading">{error}</div>}
    {account&&<div className="investor-transfer-row"><div><strong>Saved payout account</strong><small>{account.method==='upi'?`UPI · ${account.upi_id}`:`${account.bank_name} · ${account.account_number_masked} · ${account.ifsc_code}`}</small></div><b>{money(available)}</b><span>READY TO TRANSFER</span></div>}
    {requests.length?<div className="investor-transfer-history">{requests.map(item=><div className="investor-transfer-row" key={item.id}><div><strong>Request #{item.id}</strong><small>{date(item.requested_at)}{item.processed_at?` · Processed ${date(item.processed_at)}`:''}</small></div><b>{money(item.amount)}</b><span className={`investor-transfer-status ${item.status}`}>{item.status}</span><small>{item.transfer_reference?`UTR: ${item.transfer_reference}`:'Transfer reference pending'}</small></div>)}</div>:<div className="investor-generated-loading">No generated-funds transfer requests yet.</div>}
  </section>
  {showTransfer&&<div className="investor-transfer-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setShowTransfer(false)}><form className="investor-transfer-modal" onSubmit={submit}><button type="button" className="investor-transfer-close" onClick={()=>setShowTransfer(false)}>×</button><span className="investor-generated-kicker">TRANSFER EARNINGS</span><h2>Send earnings to your payout account</h2><p>{account?.method==='upi'?`UPI · ${account.upi_id}`:`${account?.bank_name} · ${account?.account_number_masked}`}</p><label>Amount<input type="number" min="1" max={available} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><small>Available: {money(available)}</small><label>Note (optional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows="3" placeholder="Optional note for Propulse"/></label><button disabled={busy}>{busy?'Submitting…':'Request transfer'}</button></form></div>}
  </>
}
