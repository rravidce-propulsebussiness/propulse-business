import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {authRequest} from '../utils/auth'
import './InvestorInvestmentSection.css'

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const date=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const status=v=>String(v||'').toUpperCase()
const openStatuses=new Set(['ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS'])

function EventRows({events=[]}){return <div className="investor-detail-list">{events.length?events.map((e,i)=><article className="investor-history-row" key={`${e.type}-${e.reference_id}-${i}`}><div><strong>{e.description}</strong><span>{date(e.occurred_at)}</span></div><span className="investor-status">{e.type.replaceAll('_',' ').toUpperCase()}</span><div className="investor-history-metrics"><span>AMOUNT <b className={Number(e.amount)>=0?'cycle-positive':'cycle-negative'}>{Number(e.amount)>=0?'+':''}{money(e.amount)}</b></span><span>BALANCE AFTER <b>{money(e.balance_after)}</b></span></div></article>):<div className="investor-section-empty">No financial transactions recorded in this cycle.</div>}</div>}

function Detail({detail}){
 const inv=detail.investment||{},ads=detail.ads||{},leads=detail.leads||{},rev=detail.revenue||{},p=detail.payouts||{}
 return <div className="cycle-history-expanded">
  <div className="investor-lead-stats cycle-history-stats"><div><strong>{money(detail.investments?.filter(x=>!x.parent_investment_id).reduce((s,x)=>s+Number(x.amount||0),0))}</strong><span>ACTUAL INVESTMENT</span></div><div><strong>{money(detail.investments?.filter(x=>x.parent_investment_id).reduce((s,x)=>s+Number(x.amount||0),0))}</strong><span>REINVESTMENT</span></div><div><strong>{money(inv.principal)}</strong><span>TOTAL INVESTMENT</span></div><div><strong>{money(ads.spent)}</strong><span>AD SPENT</span></div><div><strong>{money(rev.gross_sales)}</strong><span>GROSS LEAD REVENUE</span></div><div><strong>{money(rev.investor_earnings)}</strong><span>MY EARNINGS</span></div></div>
  <section className="investor-section-card cycle-history-subcard"><div className="cycle-history-subhead"><h3>Investment &amp; Ad-Spend History</h3><span>Every money movement in this cycle.</span></div><EventRows events={detail.events?.filter(e=>['investment','reinvestment','ad_spend'].includes(e.type))}/></section>
  <section className="investor-section-card cycle-history-subcard"><div className="cycle-history-subhead"><h3>Lead-Sale History</h3><span>Single-share and shared sales remain separate.</span></div>{detail.sales_detail?.length?<div className="cycle-sales-detail">{detail.sales_detail.map(s=><div className="cycle-sales-row" key={s.purchase_id}><div><b>Lead #{s.lead_id} sold</b><small>{date(s.sold_at)}</small></div><span>{s.shares===1?'1 · Single':`${s.shares} · Shared`}</span><strong>{money(s.amount)}</strong><em>Investor {money(s.investor_earnings)}</em></div>)}</div>:<div className="investor-section-empty">No paid lead sales in this cycle.</div>}</section>
  <section className="investor-section-card cycle-history-subcard"><div className="cycle-history-subhead"><h3>Cycle Financial Activity</h3><span>Investor-side running balance for this cycle.</span></div><EventRows events={detail.events}/></section>
  <div className="cycle-history-footer"><span>Linked {leads.linked||0} · Sold {leads.sold||0} · Single {leads.single_share_sales||0} · Shared {leads.shared_sales||0} · Shares {leads.shares_sold||0}</span><span>Paid {money(p.paid)} · Pending {money(p.pending)}</span></div>
 </div>
}

function CycleCard({cycle}){
 const [open,setOpen]=useState(false),[detail,setDetail]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('')
 const toggle=async()=>{if(open){setOpen(false);return}setOpen(true);if(detail)return;setLoading(true);setError('');try{setDetail(await authRequest(`/investments/cycles/${cycle.id}/statement`))}catch(e){setError(e?.message||'Unable to load cycle history')}finally{setLoading(false)}}
 const closed=status(cycle.status)==='CLOSED'
 return <article className="investor-history-cycle"><div className="investor-history-cycle-head"><div><span className="cycle-history-kicker">{closed?'PREVIOUS CYCLE':'CURRENT CYCLE'}</span><h2>Cycle #{cycle.id} · {cycle.auto_invest?'Auto-Invest':'Non-Auto'}</h2><p>{status(cycle.status).replaceAll('_',' ')} · Started {date(cycle.started_at)} · Maturity {date(cycle.maturity_at)}</p></div><div className="investor-history-cycle-action"><span className={`cycle-history-status ${closed?'closed':'open'}`}>{status(cycle.status)}</span><button type="button" onClick={toggle}>{loading?'Loading…':open?'Hide History':'View Full History'}</button></div></div><div className="cycle-history-metrics"><span>TOTAL INVESTED <b>{money(cycle.total_invested)}</b></span><span>AD SPENT <b>{money(cycle.ad_spent)}</b></span><span>GROSS REVENUE <b>{money(cycle.gross_revenue)}</b></span><span>MY EARNINGS <b>{money(cycle.investor_earnings)}</b></span><span>LEADS <b>{cycle.sold_leads}/{cycle.linked_leads}</b></span></div>{error&&<div className="investor-section-error" style={{marginTop:10}}>{error}</div>}{open&&detail&&<Detail detail={detail}/>}</article>
}

export default function InvestorCycleHistory(){
 const [cycles,setCycles]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let alive=true;authRequest('/investments/cycles').then(result=>{if(alive)setCycles(Array.isArray(result)?result:[])}).catch(e=>{if(alive)setError(e?.message||'Unable to load investment cycles')}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[])
 return <main className="investor-section-page"><div className="investor-section-shell"><header className="investor-section-head"><div><span>INVESTMENT HISTORY</span><h1>Investment Cycles</h1><p>Each cycle is completely separate. Open any cycle to review investments, advertising, lead sales, earnings and withdrawals.</p></div><Link className="investor-section-invest" to="/investment?new=1">＋ New Investment</Link></header>{error&&<div className="investor-section-error">{error}</div>}{loading?<div className="investor-section-card">Loading investment cycles…</div>:cycles.length?cycles.map(c=><CycleCard cycle={c} key={c.id}/>):<div className="investor-section-card"><div className="investor-section-empty">No investment cycles yet.</div></div>}</div></main>
}
