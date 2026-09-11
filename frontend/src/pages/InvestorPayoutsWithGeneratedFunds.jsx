import { useEffect, useState } from 'react'
import { authRequest } from '../utils/auth'
import InvestorInvestmentSection from './InvestorInvestmentSection'
import './InvestorGeneratedFunds.css'

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})`
const date=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'

export default function InvestorPayoutsWithGeneratedFunds(){
 const [funds,setFunds]=useState(null)
 useEffect(()=>{authRequest('/investments/funds').then(setFunds).catch(()=>setFunds({requests:[]}))},[])
 const requests=funds?.requests||[]
 return <><InvestorInvestmentSection type="payouts"/><section className="investor-generated-funds investor-generated-payout-history"><div className="investor-generated-head"><div><span className="investor-generated-kicker">GENERATED FUNDS TRANSFERS</span><h2>Lead-sale revenue transfer requests</h2><p>These transfers use revenue generated from paid lead sales. They are separate from your invested advertising capital.</p></div></div>{requests.length?<div className="investor-transfer-history">{requests.map(item=><div className="investor-transfer-row" key={item.id}><div><strong>Request #{item.id}</strong><small>{date(item.requested_at)}{item.processed_at?` - Processed ${date(item.processed_at)}`:''}</small></div><b>{money(item.amount)}</b><span className={`investor-transfer-status ${item.status}`}>{item.status}</span><small>{item.transfer_reference?`UTR: ${item.transfer_reference}`:'Transfer reference pending'}</small></div>)}</div>:<div className="investor-generated-loading">No generated-funds transfer requests yet.</div>}</section></>
}
