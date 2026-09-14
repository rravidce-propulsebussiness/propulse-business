import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import Investment from './Investment'
import {authRequest} from '../utils/auth'
import './InvestmentWithGeneratedFunds.css'

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const dt=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const statusLabel=v=>String(v||'').replaceAll('_',' ')
const OPEN=['ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS']

function Dashboard(){
 const [cycle,setCycle]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=async()=>{
  setLoading(true);setError('')
  try{const result=await authRequest('/investments/cycle');setCycle(result?.cycle||null)}
  catch(e){setCycle(null);setError(e.message||'Unable to load the current investment cycle')}
  finally{setLoading(false)}
 }
 useEffect(()=>{load();const timer=setInterval(load,5000);return()=>clearInterval(timer)},[])
 const openInvest=()=>document.querySelector('.legacy-investment .investment-hero-action button')?.click()
 const withdraw=()=>document.querySelector('.legacy-investment .investment-withdraw-card button')?.click()
 const exit=()=>document.querySelector('.legacy-investment .investment-pending-card button')?.click()
 if(loading)return <section className="cycle-dashboard-loading">Loading investment dashboard…</section>
 const active=cycle&&OPEN.includes(String(cycle.status||'').toUpperCase()),c=active?cycle:null,auto=Boolean(c?.auto_invest),status=statusLabel(c?.status||'NO ACTIVE CYCLE')
 const totalInvested=Number(c?.total_invested??c?.principal??0),investorEarnings=Number(c?.investor_earnings??c?.generated??0)
 const availableAds=auto?Number(c?.available_for_ads??0):0,adSpent=Number(c?.ad_spent??0),transferable=Number(c?.transferable??c?.withdrawable_earnings??0),grossRevenue=Number(c?.gross_revenue??0)
 const soldLeads=Number(c?.sold_leads??0),singleSales=Number(c?.single_share_sales??0),sharedSales=Number(c?.shared_sales??0),sharesSold=Number(c?.shares_sold??0)
 const linkedLeads=Number(c?.total_leads??0),finalLeads=Number(c?.final_leads??0),pendingLeads=Number(c?.pending_leads??0),transferPaid=Number(c?.payout_transferred??0),transferReserved=Number(c?.payout_reserved??0)
 const closing=active&&['EXIT_REQUESTED','WAITING_FOR_LEADS'].includes(String(c.status||'').toUpperCase())
 return <section className="cycle-dashboard">
  <div className="cycle-dashboard-top">
   <div><span className="cycle-kicker">{active?'CURRENT INVESTMENT CYCLE':'INVESTMENT WORKSPACE'}</span><h1>{active?`Cycle #${c.id} · ${auto?'Auto-Invest ON':'Auto-Invest OFF'}`:'No Active Investment Cycle'}</h1><p>{active?`${status} · Started ${dt(c.started_at)} · Maturity ${dt(c.maturity_at)}`:'Your previous cycle is closed. Current-cycle balances are ₹0. Previous-cycle investment, earnings, advertising and withdrawals are available in History.'}</p></div>
   <div className="cycle-dashboard-actions">{active?<><button type="button" onClick={openInvest} disabled={closing}>＋ Add Investment</button>{auto&&!closing&&<button type="button" className="secondary" onClick={exit}>Request Final Exit</button>}{!auto&&transferable>0&&<button type="button" className="secondary" onClick={withdraw}>Withdraw Earnings</button></>:<button type="button" onClick={openInvest}>＋ Start Investment</button>}<Link className="secondary link" to="/investment/history">History →</Link></div>
  </div>
  {error&&<div className="investor-section-error" style={{marginTop:12}}>{error}</div>}
  <div className="cycle-dashboard-grid">
   <article className="primary"><span>TOTAL INVESTED</span><strong>{money(totalInvested)}</strong><small>{active?'Capital invested in this cycle only. Principal is never withdrawable.':'No active-cycle capital.'}</small></article>
   <article><span>INVESTOR EARNINGS</span><strong>{money(investorEarnings)}</strong><small>{active?'Realized investor share from paid lead sales in this cycle.':'No active-cycle earnings.'}</small></article>
   <article><span>AVAILABLE TO TRANSFER</span><strong>{money(transferable)}</strong><small>{active?'Eligible current-cycle earnings available for Bank/UPI transfer.':'No active-cycle earnings available for transfer.'}</small>{active&&!auto&&transferable>0&&<button type="button" onClick={withdraw}>Withdraw Earnings</button>}</article>
   <article><span>AVAILABLE FOR ADS</span><strong>{money(availableAds)}</strong><small>{active&&auto?'Eligible Auto-Invest earnings available for advertising.':'Ads funds are not available without an active Auto-Invest cycle.'}</small></article>
   <article><span>AD SPENT</span><strong>{money(adSpent)}</strong><small>{active?'Actual advertising spend recorded in this cycle.':'No current-cycle ad spend.'}</small></article>
   <article><span>GROSS LEAD REVENUE</span><strong>{money(grossRevenue)}</strong><small>{active?`${soldLeads} sold leads · ${singleSales} single-share sales · ${sharedSales} shared sales · ${sharesSold} total shares.`:'No current-cycle lead revenue.'}</small></article>
  </div>
  <div className="cycle-dashboard-leadbar"><div><b>Linked Leads</b><span>{linkedLeads}</span></div><div><b>Leads Sold</b><span>{soldLeads}</span></div><div><b>Final Leads</b><span>{finalLeads}</span></div><div><b>Pending Leads</b><span>{pendingLeads}</span></div><div><b>Transfer Paid</b><span>{money(transferPaid)}</span></div><div><b>Transfer Reserved</b><span>{money(transferReserved)}</span></div></div>
  <div className="cycle-dashboard-note">{active?<><b>Current Cycle Only</b><span>This dashboard never combines closed-cycle data. Open History to view previous cycles separately.</span></>:<><b>Previous Cycle Closed</b><span>All current-cycle balances are ₹0. Previous investment, advertising, lead sales and withdrawals remain available under History.</span></>}</div>
 </section>
}

export default function InvestmentWithGeneratedFunds(){return <><Dashboard/><div className="legacy-investment"><Investment/></div></>}
