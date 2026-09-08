import { useEffect, useState } from 'react'
import { authRequest } from '../utils/auth'
import './InvestorPayoutTransfers.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function InvestorPayoutTransfers(){
  const [items,setItems]=useState([])
  useEffect(()=>{let active=true;authRequest('/investments').then(value=>{const rows=Array.isArray(value)?value:Array.isArray(value?.data)?value.data:[];if(active)setItems(rows.filter(item=>String(item.status).toLowerCase()==='paid'&&Number(item.payout_amount||0)>0&&item.payout_transfer_reference))}).catch(()=>{});return()=>{active=false}},[])
  return <section className="investor-payout-transfers"><div className="investor-payout-transfers-head"><div><span>TRANSFER HISTORY</span><h2>Your payout transfers</h2><p>See the amount transferred to you, the transfer reference and the proof uploaded by Propulse.</p></div><b>{items.length} PAID</b></div>{!items.length?<div className="investor-payout-empty">No payout transfers recorded yet.</div>:<div className="investor-payout-list">{items.map(item=><article className="investor-payout-row" key={item.id}><div><strong>{item.industry_name||'Investment cycle'}</strong><small>Cycle #{item.id} · {date(item.payout_transferred_at||item.updated_at)}</small></div><div><span>AMOUNT PAID</span><b>{money(item.payout_amount)}</b></div><div><span>TRANSFER / UTR</span><b>{item.payout_transfer_reference}</b></div><div>{item.payout_proof_url?.startsWith('data:application/pdf')?<a href={item.payout_proof_url} target="_blank" rel="noreferrer">View proof ↗</a>:item.payout_proof_url?<a href={item.payout_proof_url} target="_blank" rel="noreferrer"><img src={item.payout_proof_url} alt="Payout transfer proof"/></a>:<span className="investor-payout-no-proof">No proof</span>}</div></article>)}</div>}</section>
}
