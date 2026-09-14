import {useEffect,useMemo,useState} from 'react'
import {authRequest} from '../utils/auth'
const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const dt=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const OPEN=['ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS']

function CycleCard({cycle,investments}){
  const [open,setOpen]=useState(false),[summary,setSummary]=useState(cycle),[loading,setLoading]=useState(false),[error,setError]=useState('')
  const rows=investments.filter(i=>Number(i.cycle_id)===Number(cycle.id))
  const load=async()=>{if(open){setOpen(false);return}setLoading(true);setError('');try{const data=await authRequest(`/investments/cycle?cycleId=${cycle.id}`);setSummary(data?.cycle||data||cycle);setOpen(true)}catch(e){setError(e.message||'Unable to load cycle details')}finally{setLoading(false)}}
  const invested=Number(summary.principal??cycle.principal??rows.reduce((s,r)=>s+Number(r.amount||0),0))
  const generated=rows.reduce((s,r)=>s+Number(r.realized_revenue||0),0)
  const paid=rows.reduce((s,r)=>s+Number(r.payout_amount||0),0)
  const status=String(summary.status||cycle.cycle_status||'').toUpperCase()
  return <article className="investor-cycle-card">
    <div className="investor-cycle-card-head"><div><span>Cycle #{cycle.id} · {summary.auto_invest??cycle.cycle_auto_invest?'Auto-Invest':'Non-Auto'}</span><h2>{OPEN.includes(status)?'Current Investment Cycle':'Closed Investment Cycle'}</h2><small>{status.replaceAll('_',' ')} · Started {dt(summary.started_at||cycle.cycle_started_at)} · Maturity {dt(summary.maturity_at||cycle.cycle_maturity_at)}</small></div><button type="button" onClick={load} disabled={loading}>{loading?'Loading…':open?'Hide History':'View Cycle History'}</button></div>
    <div className="investor-cycle-metrics"><div><span>INVESTED</span><b>{money(invested)}</b></div><div><span>INVESTMENT ROWS</span><b>{Number(rows.length||summary.investment_count||0)}</b></div><div><span>GENERATED</span><b>{money(generated)}</b></div><div><span>PAYOUT</span><b>{money(paid)}</b></div></div>
    {open&&<div className="investor-cycle-detail"><div className="investor-cycle-detail-grid"><div><span>Linked Leads</span><b>{Number(summary.total_leads||0)}</b></div><div><span>Final Leads</span><b>{Number(summary.final_leads||0)}</b></div><div><span>Pending Leads</span><b>{Number(summary.pending_leads||0)}</b></div><div><span>Matured</span><b>{summary.matured?'Yes':'No'}</b></div></div><div className="investor-cycle-investments"><strong>Investments in this cycle</strong>{rows.length?rows.map(r=><div key={r.id}><span>Investment #{r.id}</span><span>{money(r.amount)}</span><small>{String(r.status||'').toUpperCase()} · {dt(r.created_at)} · Revenue {money(r.realized_revenue)}</small></div>):<small>No investment rows found.</small>}</div>{error&&<div className="investor-section-error">{error}</div>}<p>Each cycle is isolated. This history does not combine balances, investments or earnings from another cycle.</p></div>}
  </article>
}

export default function InvestorCycleHistory(){
  const [investments,setInvestments]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  useEffect(()=>{let active=true;(async()=>{try{const data=await authRequest('/investments');if(active)setInvestments((Array.isArray(data)?data:[]).filter(x=>String(x.status).toLowerCase()!=='cancelled'))}catch(e){if(active)setError(e.message||'Unable to load investment history')}finally{if(active)setLoading(false)}})();return()=>{active=false}},[])
  const cycles=useMemo(()=>{const map=new Map();for(const row of investments){const id=row.cycle_id??row.id;if(id==null)continue;if(!map.has(id))map.set(id,{id:Number(id),cycle_status:row.cycle_status,cycle_auto_invest:Boolean(row.cycle_auto_invest),cycle_started_at:row.cycle_started_at,cycle_maturity_at:row.cycle_maturity_at});}return Array.from(map.values()).sort((a,b)=>{const ao=OPEN.includes(String(a.cycle_status||'').toUpperCase()),bo=OPEN.includes(String(b.cycle_status||'').toUpperCase());return Number(bo)-Number(ao)||b.id-a.id})},[investments])
  const current=cycles.find(c=>OPEN.includes(String(c.cycle_status||'').toUpperCase())),previous=cycles.filter(c=>!current||c.id!==current.id)
  if(loading)return <main className="investor-section-page"><div className="investor-section-shell"><div className="investor-section-card">Loading investment cycles…</div></div></main>
  return <main className="investor-section-page"><div className="investor-section-shell"><header className="investor-section-head"><div><span>INVESTMENT HISTORY</span><h1>Investment cycles</h1><p>Every cycle is displayed separately. Current-cycle money and previous-cycle history are never combined.</p></div></header>{error&&<div className="investor-section-error">{error}</div>}{current&&<><div className="investor-cycle-section-title">CURRENT CYCLE</div><CycleCard cycle={current} investments={investments}/></>}{previous.length>0&&<><div className="investor-cycle-section-title">PREVIOUS CYCLE HISTORY</div>{previous.map(c=><CycleCard key={c.id} cycle={c} investments={investments}/>)}</>}{cycles.length===0&&<div className="investor-section-card"><div className="investor-section-empty">No investment cycles yet.</div></div>}</div></main>
}
