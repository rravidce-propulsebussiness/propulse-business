import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import Investment from './Investment'
import {authRequest} from '../utils/auth'
import './InvestmentWithGeneratedFunds.css'

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const dt=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const statusLabel=v=>String(v||'').replaceAll('_',' ')
const OPEN=['ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS']
const list=v=>Array.isArray(v)?v:Array.isArray(v?.data)?v.data:Array.isArray(v?.rows)?v.rows:[]

function Dashboard(){
 const [cycle,setCycle]=useState(null),[funds,setFunds]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=async()=>{
  setLoading(true);setError('')
  try{
   const [cycleResult,fundsResult,investmentsResult]=await Promise.all([
    authRequest('/investments/cycle').catch(()=>null),
    authRequest('/investments/funds').catch(()=>null),
    authRequest('/investments').catch(()=>null)
   ])
   const rows=list(investmentsResult)
   const currentFromApi=cycleResult?.cycle||null
   const fallbackRow=rows.find(row=>row?.cycle_id!=null)
   const fallbackCycle=fallbackRow?{
    id:Number(fallbackRow.cycle_id),
    status:fallbackRow.cycle_status||'CLOSED',
    auto_invest:Boolean(fallbackRow.cycle_auto_invest),
    started_at:fallbackRow.cycle_started_at,
    maturity_at:fallbackRow.cycle_maturity_at,
    principal:rows.filter(row=>Number(row.cycle_id)===Number(fallbackRow.cycle_id)).reduce((sum,row)=>sum+Number(row.amount||0),0),
    total_invested:rows.filter(row=>Number(row.cycle_id)===Number(fallbackRow.cycle_id)).reduce((sum,row)=>sum+Number(row.amount||0),0)
   }:null
   setCycle(currentFromApi||fallbackCycle)
   setFunds(fundsResult||null)
  }catch(e){setError(e.message||'Unable to load investor dashboard')}
  finally{setLoading(false)}
 }
 useEffect(()=>{load();const timer=setInterval(load,5000);return()=>clearInterval(timer)},[])
 const openInvest=()=>document.querySelector('.legacy-investment .investment-hero-action button')?.click()
 const withdraw=()=>document.querySelector('.legacy-investment .investment-withdraw-card button')?.click()
 const exit=()=>document.querySelector('.legacy-investment .investment-pending-card button')?.click()
 if(loading&&!cycle)return <section className="cycle-dashboard-loading">Loading investment dashboard…</section>
 if(!cycle)return <section className="cycle-dashboard-empty"><span>INVESTOR WORKSPACE</span><h1>No investment cycle yet</h1><p>Start your first investment to create your current investment cycle.</p><button type="button" onClick={openInvest}>＋ Invest Now</button></section>
 const auto=Boolean(cycle.auto_invest),status=String(cycle.status||'').toUpperCase(),closing=['EXIT_REQUESTED','WAITING_FOR_LEADS'].includes(status)
 const availableAds=Number(cycle.available_for_ads??funds?.available_for_ads??0)
 const adSpent=Number(cycle.ad_spent??funds?.ad_spent??funds?.total_ad_spent??0)
 const generated=Number(cycle.generated??cycle.investor_earnings??funds?.generated??0)
 const investorEarnings=Number(cycle.investor_earnings??funds?.generated??generated)
 const withdrawable=Number(cycle.transferable??cycle.withdrawable_earnings??funds?.transferable??funds?.withdrawable_earnings??0)
 const totalInvested=Number(cycle.total_invested??cycle.principal??funds?.total_invested??0)
 const soldLeads=Number(cycle.sold_leads??0),singleSales=Number(cycle.single_share_sales??0),sharedSales=Number(cycle.shared_sales??0),sharesSold=Number(cycle.shares_sold??0)
 const primary=auto?availableAds:withdrawable
 return <section className="cycle-dashboard">
  <div className="cycle-dashboard-top">
   <div><span className="cycle-kicker">CURRENT INVESTMENT CYCLE</span><h1>Cycle #{cycle.id} · {auto?'Auto-Invest ON':'Auto-Invest OFF'}</h1><p>{statusLabel(status)} · Started {dt(cycle.started_at)} · Maturity {dt(cycle.maturity_at)}</p></div>
   <div className="cycle-dashboard-actions"><button type="button" onClick={openInvest} disabled={closing}>＋ Add Investment</button>{auto&&!closing&&<button type="button" className="secondary" onClick={exit}>Request Final Exit</button>}{!auto&&primary>0&&<button type="button" className="secondary" onClick={withdraw}>Withdraw Earnings</button>}<Link className="secondary link" to="/investment/history">History →</Link></div>
  </div>
  {error&&<div className="investor-section-error" style={{marginTop:12}}>{error}</div>}
  <div className="cycle-dashboard-grid">
   <article className="primary"><span>TOTAL INVESTED</span><strong>{money(totalInvested)}</strong><small>Capital invested in this cycle only. Principal is never withdrawable.</small></article>
   <article><span>AVAILABLE FOR ADS</span><strong>{money(availableAds)}</strong><small>{auto?'Eligible current-cycle funds for Auto-Invest advertising.':'Non-Auto principal is not available for advertising.'}</small></article>
   <article><span>AD SPENT</span><strong>{money(adSpent)}</strong><small>Actual advertising spend recorded in this cycle.</small></article>
   <article><span>{auto?'AVAILABLE FOR ADS':'AVAILABLE TO WITHDRAW'}</span><strong>{money(primary)}</strong><small>{auto?'Current-cycle Auto-Invest balance.':'Eligible realized earnings available for bank/UPI withdrawal.'}</small>{!auto&&primary>0&&<button type="button" onClick={withdraw}>Withdraw Earnings</button>}</article>
   <article><span>INVESTOR EARNINGS</span><strong>{money(investorEarnings)}</strong><small>Investor share credited from paid lead sales in this cycle.</small></article>
   <article><span>GROSS LEAD REVENUE</span><strong>{money(cycle.gross_revenue||0)}</strong><small>{soldLeads} sold leads · {singleSales} single-share sales · {sharedSales} shared sales · {sharesSold} total shares.</small></article>
  </div>
  <div className="cycle-dashboard-leadbar"><div><b>Linked Leads</b><span>{Number(cycle.total_leads||0)}</span></div><div><b>Leads Sold</b><span>{soldLeads}</span></div><div><b>Final Leads</b><span>{Number(cycle.final_leads||0)}</span></div><div><b>Pending Leads</b><span>{Number(cycle.pending_leads||0)}</span></div><div><b>Transfer Paid</b><span>{money(cycle.payout_transferred||0)}</span></div><div><b>Transfer Reserved</b><span>{money(cycle.payout_reserved||0)}</span></div></div>
  <div className="cycle-dashboard-nav"><Link to="/investment/leads">Linked Leads</Link><Link to="/investment/history">History</Link><Link to="/investment/faq">FAQ</Link></div>
 </section>
}

export default function InvestmentWithGeneratedFunds(){return <><Dashboard/><div className="legacy-investment"><Investment/></div></>}
