import { useEffect, useState } from 'react'
import { authRequest } from '../utils/auth'
import './InvestorGeneratedFunds.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function InvestorGeneratedFunds(){
  const [data,setData]=useState(null),[amount,setAmount]=useState(''),[notes,setNotes]=useState(''),[open,setOpen]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
  const load=async()=>{setLoading(true);try{setData(await authRequest('/investments/funds'));setError('')}catch(e){setError(e.message||'Unable to load generated funds')}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  const available=Number(data?.available||0)
  const submit=async()=>{const value=Number(amount);if(!Number.isFinite(value)||value<=0)return setError('Enter a valid transfer amount.');if(value>available)return setError(`You can request up to ${money(available)}.`);setBusy(true);setError('');setMessage('');try{await authRequest('/investments/funds/transfer-request',{method:'POST',body:JSON.stringify({amount:value,notes})});setAmount('');setNotes('');setOpen(false);setMessage('Transfer request raised successfully. Propulse will process the generated funds transfer.');await load()}catch(e){setError(e.message||'Unable to raise transfer request')}finally{setBusy(false)}}
  if(loading)return <section className="investor-generated-funds"><div className="investor-generated-loading">Loading investment funds…</div></section>
  return <section className="investor-generated-funds">
    <div className="investor-generated-head"><div><span className="investor-generated-kicker">INVESTMENT FUNDS</span><h2>Capital deployed in ads & generated earnings</h2><p>Your investment capital is controlled by the investment cycle. Only revenue generated from paid lead sales is transferable.</p></div><button type="button" className="investor-transfer-button" onClick={()=>{setOpen(true);setError('');setMessage('')}} disabled={available<=0}>Transfer funds</button></div>
    {message&&<div className="investor-generated-message">{message}</div>}
    {error&&<div className="investor-generated-error">{error}</div>}
    <div className="investor-generated-grid">
      <article><span>AMOUNT IN ADS</span><strong>{money(data?.amount_in_ads)}</strong><small>Amount currently deployed into advertising by Propulse.</small></article>
      <article><span>TOTAL INVESTMENT CAPITAL</span><strong>{money(data?.total_invested)}</strong><small>Total active and matured investment capital. This is not a transfer balance.</small></article>
      <article><span>UNALLOCATED INVESTMENT CAPITAL</span><strong>{money(data?.unallocated_investment_capital)}</strong><small>Investment capital not currently in ads. Protected and not transferable as lead-sale revenue.</small></article>
      <article className="available"><span>AVAILABLE GENERATED BALANCE</span><strong>{money(available)}</strong><small>Lead-sale revenue available to request for transfer.</small></article>
      <article><span>TRANSFER RESERVED</span><strong>{money(data?.reserved)}</strong><small>Generated funds held for pending transfer requests.</small></article>
    </div>
    {data?.requests?.length>0&&<div className="investor-transfer-history"><div className="investor-transfer-history-head"><b>TRANSFER REQUESTS</b><span>{data.requests.length}</span></div>{data.requests.slice(0,6).map(item=><div className="investor-transfer-row" key={item.id}><div><strong>Request #{item.id}</strong><small>{date(item.requested_at)}</small></div><b>{money(item.amount)}</b><span className={`investor-transfer-status ${item.status}`}>{item.status}</span>{item.transfer_reference&&<small>UTR: {item.transfer_reference}</small>}</div>)}</div>}
    {open&&<div className="investor-funds-overlay"><section className="investor-funds-modal"><button type="button" className="investor-funds-close" onClick={()=>!busy&&setOpen(false)}>×</button><span className="investor-generated-kicker">TRANSFER GENERATED FUNDS</span><h2>Raise a transfer request</h2><p>This transfer uses revenue earned from selling leads. It does <b>not</b> withdraw or reduce any investment capital, including the unallocated amount.</p><div className="investor-transfer-available"><span>Available to transfer</span><strong>{money(available)}</strong></div><label>Amount to transfer<input type="number" min="1" max={available} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter amount"/></label><label>Note (optional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any note for the Propulse finance team" rows="3"/></label><button type="button" className="investor-transfer-submit" disabled={busy||!amount} onClick={submit}>{busy?'Submitting…':'Raise transfer request'}</button></section></div>}
  </section>
}
