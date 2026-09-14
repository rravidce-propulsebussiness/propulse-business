import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import Investment from './Investment'
import {authRequest} from '../utils/auth'
import './InvestmentWithGeneratedFunds.css'

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const dt=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const statusLabel=v=>String(v||'').replaceAll('_',' ')

function Dashboard(){
 const [cycle,setCycle]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=async()=>{setLoading(true);setError('');try{const data=await authRequest('/investments/cycle');setCycle(data?.cycle||null)}catch(e){setError(e.message||'Unable to load current investment cycle')}finally{setLoading(false)}}
 useEffect(()=>{load();const timer=setInterval(load,5000);return()=>clearInterval(timer)},[])
 const openInvest=()=>document.querySelector('.legacy-investment .investment-hero-action button')?.click()
 const withdraw=()=>document.querySelector('.legacy-investment .investment-withdraw-card button')?.click()
 const exit=()=>document.querySelector('.legacy-investment .investment-pending-card button')?.click()
 if(loading&&!cycle)return <section className="cycle-dashboard-loading">Loading current cycle…</section>
 if(!cycle)return <section className="cycle-dashboard-empty"><span>INVESTOR WORKSPACE</span><h1>Start your first investment cycle</h1><p>Your current-cycle dashboard will appear here after your first investment.</p><button type="button" onClick={openInvest}>＋ Invest Now</button></section>
 const auto=Boolean(cycle.auto_invest),closing=['EXIT_REQUESTED','WAITING_FOR_LEADS'].includes(String(cycle.status||'').toUpperCase())
 const primary=auto?Number(cycle.available_for_ads||0):Number(cycle.transferable||cycle.withdrawable_earnings||0)
 return <section className="cycle-dashboard">
   <div className="cycle-dashboard-top"><div><span className="cycle-kicker">CURRENT INVESTMENT CYCLE</span><h1>Cycle #{cycle.id} · {auto?'Auto-Invest':'Non-Auto'}</h1><p>{statusLabel(cycle.status)} · Started {dt(cycle.started_at)} · Maturity {dt(cycle.maturity_at)}</p></div><div className="cycle-dashboard-actions"><button type="button" onClick={openInvest} disabled={closing}>＋ Add Investment</button>{auto&&!closing&&<button type="button" className="secondary" onClick={exit}>Request Final Exit</button>}{!auto&&primary>0&&<button type="button" className="secondary" onClick={withdraw}>Withdraw Earnings</button>}<Link className="secondary link" to="/investment/history">View History →</Link></div></div>
   <div className="cycle-dashboard-grid">
    <article className="primary"><span>TOTAL INVESTED</span><strong>{money(cycle.total_invested||cycle.principal)}</strong><small>Principal in this cycle only. Principal is never withdrawable.</small></article>
    <article><span>AVAILABLE FOR ADS</span><strong>{money(cycle.available_for_ads)}</strong><small>{auto?'Current-cycle advertising funds.':'Non-Auto principal is not available for advertising.'}</small></article>
    <article><span>AD SPENT</span><strong>{money(cycle.ad_spent)}</strong><small>Actual advertising spend recorded in this cycle.</small></article>
    <article><span>{auto?'AVAILABLE FOR ADS':'AVAILABLE TO WITHDRAW'}</span><strong>{money(primary)}</strong><small>{auto?'Eligible current-cycle funds for Auto-Invest advertising.':'Eligible realized earnings ready for bank/UPI withdrawal.'}</small>{!auto&&primary>0&&<button type="button" onClick={withdraw}>Withdraw Earnings</button>}</article>
    <article><span>LEAD REVENUE</span><strong>{money(cycle.investor_earnings||cycle.generated)}</strong><small>Investor earnings credited from paid lead sales in this cycle.</small></article>
    <article><span>LEADS SOLD</span><strong>{Number(cycle.sold_leads||0)}</strong><small>{Number(cycle.single_share_sales||0)} single-share sales · {Number(cycle.shared_sales||0)} shared sales · {Number(cycle.shares_sold||0)} shares.</small></article>
   </div>
   <div className="cycle-dashboard-leadbar"><div><b>Linked Leads</b><span>{Number(cycle.total_leads||0)}</span></div><div><b>Final Leads</b><span>{Number(cycle.final_leads||0)}</span></div><div><b>Pending Leads</b><span>{Number(cycle.pending_leads||0)}</span></div><div><b>Gross Lead Revenue</b><span>{money(cycle.gross_revenue)}</span></div><div><b>Transfer Paid</b><span>{money(cycle.payout_transferred)}</span></div><div><b>Transfer Reserved</b><span>{money(cycle.payout_reserved)}</span></div></div>
   <div className="cycle-dashboard-nav"><Link to="/investment/leads">Linked Leads</Link><Link to="/investment/sold-leads">Sold Leads</Link><Link to="/investment/history">History</Link><Link to="/investment/payouts">Payouts</Link><Link to="/investment/faq">FAQ</Link></div>
 </section>
}

export default function InvestmentWithGeneratedFunds(){
 return <><Dashboard/><div className="legacy-investment"><Investment/></div></>
}
