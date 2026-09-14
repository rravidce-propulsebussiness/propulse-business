import {useEffect,useState} from 'react'
import {authRequest} from '../utils/auth'

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const dt=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const OPEN=['ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS']

function CycleCard({cycle}){
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[statement,setStatement]=useState(null),[error,setError]=useState('')
  const load=async()=>{
    if(statement){setOpen(!open);return}
    setLoading(true);setError('')
    try{const data=await authRequest(`/investments/cycles/${cycle.id}/statement`);setStatement(data);setOpen(true)}catch(e){setError(e.message||'Unable to load cycle history')}finally{setLoading(false)}
  }
  const c=statement?.cycle||cycle,inv=statement?.investment||{},ads=statement?.ads||{},leads=statement?.leads||{},rev=statement?.revenue||{},payouts=statement?.payouts||{}
  const sales=Array.isArray(statement?.sales_detail)?statement.sales_detail:[]
  return <article style={{border:'1px solid #dce7f1',borderRadius:14,background:'#fff',overflow:'hidden',marginBottom:14}}>
    <div style={{padding:'18px 20px',display:'flex',justifyContent:'space-between',gap:18,alignItems:'center',flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,fontWeight:900,color:'#17457f',textTransform:'uppercase'}}>Cycle #{cycle.id} · {cycle.auto_invest?'Auto-Invest':'Non-Auto'}</div><h2 style={{margin:'6px 0 5px',fontSize:18,color:'#173f78'}}>{OPEN.includes(String(cycle.status||'').toUpperCase())?'Current Investment Cycle':'Closed Investment Cycle'}</h2><div style={{fontSize:11,color:'#7b90a6'}}>{String(cycle.status||'').replaceAll('_',' ')} · Started {dt(cycle.started_at)} · Maturity {dt(cycle.maturity_at)}</div></div>
      <button type="button" onClick={load} disabled={loading} style={{height:38,padding:'0 15px',border:'1px solid #d9e3ed',borderRadius:9,background:'#f7fbff',color:'#1762aa',fontWeight:900,cursor:'pointer'}}>{loading?'Loading…':open?'Hide Full History':'View Full History'}</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,padding:'0 20px 18px'}}>
      {[['INVESTED',cycle.principal],['AD SPENT',cycle.ad_spent],['GROSS REVENUE',cycle.gross_revenue],['INVESTOR EARNINGS',cycle.investor_earnings]].map(([label,val])=><div key={label} style={{padding:'11px 12px',border:'1px solid #e8eef4',borderRadius:9,background:'#fbfdff'}}><span style={{fontSize:8,fontWeight:900,color:'#8195ab'}}>{label}</span><strong style={{display:'block',marginTop:5,fontSize:15,color:label==='AD SPENT'?'#176fcb':'#173f78'}}>{money(val)}</strong></div>)}
    </div>
    {error&&<div style={{margin:'0 20px 18px',padding:10,borderRadius:8,background:'#fff3f0',color:'#b9432c',fontSize:11}}>{error}</div>}
    {open&&<div style={{borderTop:'1px solid #e7eef5',padding:'18px 20px 22px',background:'#f8fbfe'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8}}>
        {[['Linked Leads',leads.linked],['Leads Sold',leads.sold],['Paid Sales',rev.sales],['Pending Withdrawals',payouts.pending]].map(([label,val])=><div key={label} style={{padding:11,border:'1px solid #e3ebf3',borderRadius:9,background:'#fff'}}><span style={{fontSize:8,color:'#8195ab',fontWeight:900}}>{label}</span><strong style={{display:'block',marginTop:5,color:'#173f78'}}>{label.includes('Withdrawals')?money(val):Number(val||0)}</strong></div>)}
      </div>
      {sales.length>0&&<div style={{marginTop:16}}><div style={{fontSize:11,fontWeight:900,color:'#173f78',marginBottom:8}}>Lead-Sale History</div><div style={{overflowX:'auto',border:'1px solid #e3ebf3',borderRadius:9,background:'#fff'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:680}}><thead><tr>{['Lead','Shares','Sale Amount','Investor Earnings','Sold At'].map(h=><th key={h} style={{padding:9,textAlign:'left',fontSize:8,color:'#7890aa',background:'#f2f7fb'}}>{h}</th>)}</tr></thead><tbody>{sales.map(s=><tr key={`${s.lead_id}-${s.sold_at}`}><td style={{padding:9,fontSize:9,color:'#173f78'}}>#{s.lead_id}</td><td style={{padding:9,fontSize:9}}>{Number(s.shares||1)} · {Number(s.shares||1)===1?'Single':'Shared'}</td><td style={{padding:9,fontSize:9,color:'#07985a',fontWeight:900}}>{money(s.amount)}</td><td style={{padding:9,fontSize:9,color:'#176fcb',fontWeight:900}}>{money(s.investor_earnings)}</td><td style={{padding:9,fontSize:9,color:'#617894'}}>{dt(s.sold_at)}</td></tr>)}</tbody></table></div></div>}
      <div style={{marginTop:16,display:'grid',gap:6}}><div style={{fontSize:11,fontWeight:900,color:'#173f78'}}>Cycle Financial Summary</div><div style={{fontSize:10,color:'#617894'}}>Total invested: <b>{money(inv.principal||cycle.principal)}</b> · Ad spend: <b>{money(ads.spent||cycle.ad_spent)}</b> · Gross revenue: <b>{money(rev.gross_sales||rev.generated||cycle.gross_revenue)}</b> · Investor earnings: <b>{money(rev.investor_earnings||cycle.investor_earnings)}</b></div><div style={{fontSize:10,color:'#617894'}}>Payout paid: <b>{money(payouts.paid||cycle.payout_transferred)}</b> · Pending: <b>{money(payouts.pending||cycle.payout_reserved)}</b> · Expired leads: <b>{Number(leads.expired||cycle.expired_leads||0)}</b> · Closed: <b>{Number(leads.closed||0)}</b></div></div>
      {c.admin_closed_reason&&<div style={{marginTop:14,padding:10,borderLeft:'3px solid #1762aa',background:'#fff',fontSize:10,color:'#637a93'}}><b>Closure reason:</b> {c.admin_closed_reason}</div>}
    </div>}
  </article>
}

export default function InvestorCycleHistory(){
  const [cycles,setCycles]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const load=async()=>{setLoading(true);setError('');try{const data=await authRequest('/investments/cycles');setCycles(Array.isArray(data)?data:[])}catch(e){setError(e.message||'Unable to load investment cycles')}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  const current=cycles.find(c=>OPEN.includes(String(c.status||'').toUpperCase()))
  const previous=cycles.filter(c=>!current||Number(c.id)!==Number(current.id))
  if(loading)return <main style={{minHeight:'100vh',padding:'50px 6%',fontFamily:'inherit'}}><div style={{padding:30,border:'1px solid #dce7f1',borderRadius:14}}>Loading cycle history…</div></main>
  return <main style={{minHeight:'100vh',padding:'38px 5%',background:'#f7faff',fontFamily:'inherit'}}><div style={{maxWidth:1200,margin:'0 auto'}}><div style={{marginBottom:22}}><span style={{fontSize:10,fontWeight:900,color:'#1762aa',letterSpacing:1}}>INVESTMENT HISTORY</span><h1 style={{margin:'6px 0',fontSize:30,color:'#173f78'}}>Your investment cycles</h1><p style={{margin:0,fontSize:12,color:'#71869d'}}>Each investment cycle is completely separate. Current-cycle money, earnings, advertising spend and withdrawals are never mixed with previous cycles.</p></div>{error&&<div style={{padding:12,marginBottom:16,borderRadius:9,background:'#fff3f0',color:'#b9432c'}}>{error}</div>}{current?<><div style={{fontSize:13,fontWeight:900,color:'#173f78',marginBottom:8}}>Current Cycle</div><CycleCard cycle={current}/></>:<div style={{padding:16,border:'1px solid #dce7f1',borderRadius:12,background:'#fff',marginBottom:18}}>No active cycle.</div>}{previous.length>0&&<><div style={{fontSize:13,fontWeight:900,color:'#173f78',margin:'22px 0 8px'}}>Previous Cycle History</div>{previous.map(c=><CycleCard key={c.id} cycle={c}/>)}</>}{cycles.length===0&&<div style={{padding:20,border:'1px solid #dce7f1',borderRadius:12,background:'#fff'}}>No investment cycles yet.</div>}</div></main>
}
