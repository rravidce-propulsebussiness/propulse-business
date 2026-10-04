import {useCallback,useEffect,useMemo,useState} from 'react'
import {authRequest} from '../../utils/auth'
import './AdminFinancialIntegrity.css'

const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(value||0))
const date=value=>value?new Date(value).toLocaleString():'—'
const label=value=>String(value||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,x=>x.toUpperCase())
const moneyKey=key=>/(amount|balance|difference|earnings|capital|spent|source|commitment|credited|debited|paid|reserved|adjusted)/i.test(key)&&!/(count|id|status|sources)/i.test(key)
const display=(key,value)=>{
  if(Array.isArray(value))return value.join(', ')
  if(value===null||value===undefined||value==='')return '—'
  if(moneyKey(key)&&Number.isFinite(Number(value)))return money(value)
  return String(value)
}

function CheckCard({check}){
  const[open,setOpen]=useState(check.count>0)
  return <article className={'integrity-check '+(check.count?check.severity:'clean')}>
    <button type="button" className="integrity-check-head" onClick={()=>setOpen(v=>!v)}>
      <span className="integrity-check-state">{check.count?check.severity==='critical'?'!':'△':'✓'}</span>
      <div><strong>{check.title}</strong><small>{check.description}</small></div>
      <b>{check.count}</b>
      <i>{open?'−':'+'}</i>
    </button>
    {open&&<div className="integrity-check-body">
      {check.count===0?<div className="integrity-empty">No mismatches found in this check.</div>:
        <div className="integrity-items">{check.items.map((item,index)=><div className="integrity-item" key={index}>
          {Object.entries(item).map(([key,value])=><div key={key}><span>{label(key)}</span><strong>{display(key,value)}</strong></div>)}
        </div>)}</div>}
    </div>}
  </article>
}

export default function AdminFinancialIntegrity(){
  const[data,setData]=useState(null)
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')

  const load=useCallback(async(force=false)=>{
    setLoading(true)
    try{
      setData(await authRequest('/admin/financial-integrity'+(force?'?refresh=1':'')))
      setError('')
    }catch(err){setError(err.message||'Unable to run reconciliation')}
    finally{setLoading(false)}
  },[])

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load(false)});return()=>{active=false}},[load])

  const groups=useMemo(()=>{
    const checks=data?.checks||[]
    return{
      wallet:checks.filter(x=>['wallet_balance','approved_topup'].includes(x.type)),
      payments:checks.filter(x=>['payment_split','payment_wallet_debit'].includes(x.type)),
      partners:checks.filter(x=>x.type.startsWith('partner_')),
      investors:checks.filter(x=>x.type.startsWith('investor_'))
    }
  },[data])

  const status=data?.status||'checking'
  const overview=data?.overview||{}
  const monitoring=data?.monitoring||{}
  const latestAutomatedRun=monitoring.latestRun||null
  const activeAlerts=Array.isArray(monitoring.activeAlerts)?monitoring.activeAlerts:[]
  const recentRuns=Array.isArray(monitoring.recentRuns)?monitoring.recentRuns:[]

  return <main className="admin-financial-integrity">
    <section className="integrity-hero">
      <div><span>SYSTEM / FINANCIAL CONTROL</span><h1>Financial integrity</h1><p>Read-only reconciliation across wallet ledgers, payments, Lead Partner earnings/payouts and investor transfers. This page detects drift; it never changes money records.</p></div>
      <div className="integrity-hero-actions">
        <div className={'integrity-status '+status}><i/><span>{status==='clean'?'All checks clean':status==='critical'?'Critical mismatch found':status==='warning'?'Review warnings':'Checking…'}</span></div>
        <button type="button" onClick={()=>load(true)} disabled={loading}>{loading?'Reconciling…':'Run fresh reconciliation'}</button>
      </div>
    </section>

    {error&&<div className="integrity-error"><strong>Reconciliation failed</strong><span>{error}</span></div>}

    <section className="integrity-summary">
      <article><span>Total issues</span><strong>{data?.totalIssues??'—'}</strong><small>{data?.cached?'Cached result · '+data.cacheAgeSeconds+'s old':'Fresh scan'}</small></article>
      <article className="critical"><span>Critical</span><strong>{data?.critical??'—'}</strong><small>Ledger or allocation mismatches</small></article>
      <article className="warning"><span>Warnings</span><strong>{data?.warnings??'—'}</strong><small>Missing payout evidence / metadata</small></article>
      <article><span>Last reconciliation</span><strong className="small">{date(data?.checkedAt)}</strong><small>Manual refresh bypasses the 60s cache</small></article>
    </section>

    <section className="integrity-automation">
      <header>
        <div><span>AUTOMATION</span><h2>Automated reconciliation</h2><p>Persistent run history and Admin alerts from the scheduled production reconciliation worker.</p></div>
        <b className={(monitoring.criticalAlertCount||monitoring.warningAlertCount)?'attention':'clean'}>{monitoring.activeAlertCount||0} active alert{Number(monitoring.activeAlertCount||0)===1?'':'s'}</b>
      </header>
      <div className="integrity-automation-metrics">
        <div><span>Latest automated run</span><strong>{latestAutomatedRun?('#'+latestAutomatedRun.id+' · '+latestAutomatedRun.status):'Not run yet'}</strong><small>{latestAutomatedRun?.completedAt?date(latestAutomatedRun.completedAt):'Worker will run when the schedule is due.'}</small></div>
        <div><span>Critical Admin alerts</span><strong>{monitoring.criticalAlertCount||0}</strong><small>Financial mismatches or failed automated scans</small></div>
        <div><span>Warning Admin alerts</span><strong>{monitoring.warningAlertCount||0}</strong><small>Operational evidence or metadata issues</small></div>
        <div><span>Build checked</span><strong>{latestAutomatedRun?.buildCommit||'—'}</strong><small>Deployment commit recorded with the run</small></div>
      </div>
      <div className="integrity-automation-lists">
        <div>
          <h3>Active Admin alerts</h3>
          {activeAlerts.length?<div className="integrity-alert-list">{activeAlerts.map(alert=><article key={alert.id} className={alert.severity}><span>{alert.severity}</span><div><strong>{alert.title}</strong><small>{alert.message}</small></div><b>{date(alert.lastSeenAt)}</b></article>)}</div>:<div className="integrity-automation-empty">No active financial alerts.</div>}
        </div>
        <div>
          <h3>Recent automated runs</h3>
          {recentRuns.length?<div className="integrity-run-list">{recentRuns.slice(0,6).map(run=><article key={run.id}><span>#{run.id}</span><strong className={run.status}>{run.status}</strong><small>{run.critical} critical · {run.warnings} warnings</small><b>{date(run.completedAt||run.startedAt)}</b></article>)}</div>:<div className="integrity-automation-empty">No automated reconciliation history yet.</div>}
        </div>
      </div>
    </section>

    <section className="integrity-money-grid">
      <div><span>Wallet balances</span><strong>{money(overview.walletBalance)}</strong></div>
      <div><span>Paid payments</span><strong>{money(overview.paidPayments)}</strong></div>
      <div><span>Approved top-ups</span><strong>{money(overview.approvedTopups)}</strong></div>
      <div><span>Partner earnings</span><strong>{money(overview.partnerEarnings)}</strong></div>
      <div><span>Partner payouts paid</span><strong>{money(overview.partnerPaid)}</strong></div>
      <div><span>Investor revenue allocated</span><strong>{money(overview.investorAllocated)}</strong></div>
      <div><span>Investor requests paid</span><strong>{money(overview.investorPaid)}</strong></div>
    </section>

    <section className="integrity-explainer"><b>How to use this page</b><span>Zero critical issues is the release target. A warning can be operationally reviewable, but a critical mismatch should be investigated before processing more money.</span></section>

    {[
      ['Wallet ledger','Stored balances and approved top-up credits',groups.wallet],
      ['Payments','Payment split and wallet debit invariants',groups.payments],
      ['Lead Partner money','Earnings, reservations, payouts and transfer evidence',groups.partners],
      ['Investor money','Withdrawal evidence, transfer references and available-funds commitments',groups.investors]
    ].map(([title,subtitle,checks])=><section className="integrity-section" key={title}>
      <header><div><span>RECONCILIATION</span><h2>{title}</h2><p>{subtitle}</p></div><b>{checks.reduce((sum,x)=>sum+x.count,0)} issues</b></header>
      <div className="integrity-checks">{checks.map(check=><CheckCard key={check.type} check={check}/>)}</div>
    </section>)}
  </main>
}
