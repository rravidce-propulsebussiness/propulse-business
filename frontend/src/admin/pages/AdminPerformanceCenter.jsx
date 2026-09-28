import {useCallback,useEffect,useState} from 'react'
import {authRequest} from '../../utils/auth'
import './AdminPerformanceCenter.css'

const fmtDate=value=>{if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString()}
const fmtBytes=value=>{let n=Number(value)||0;const units=['B','KB','MB','GB','TB'];let i=0;while(n>=1024&&i<units.length-1){n/=1024;i++}return (i? n.toFixed(n>=100?0:n>=10?1:2):Math.round(n))+' '+units[i]}
const fmtNumber=value=>new Intl.NumberFormat().format(Number(value)||0)
const fmtMs=value=>{const n=Number(value)||0;return n>=1000?(n/1000).toFixed(n>=10000?1:2)+'s':Math.round(n)+'ms'}
const tone=value=>!value?'good':value==='healthy'?'good':value==='attention'?'warn':'bad'

function Metric({label,value,note,state='good'}){return <article className={'perf-metric '+state}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>}

export default function AdminPerformanceCenter(){
  const[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[auto,setAuto]=useState(true)
  const load=useCallback(async({silent=false}={})=>{if(!silent)setLoading(true);try{setData(await authRequest('/admin/performance'));setError('')}catch(e){setError(e.message||'Unable to load performance data')}finally{if(!silent)setLoading(false)}},[])
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[load])
  useEffect(()=>{if(!auto)return;const t=setInterval(()=>load({silent:true}),30000);return()=>clearInterval(t)},[auto,load])
  const db=data?.database||{},activity=data?.activity||{},pool=data?.pool||{},slow=data?.slowApis||{},indexes=data?.indexes||{},statements=data?.statements||{}
  return <main className="admin-performance">
    <section className="perf-hero">
      <div><span>SYSTEM / PERFORMANCE</span><h1>Database & API performance</h1><p>Operational visibility for PostgreSQL pressure, long transactions, table growth, index usage and slow API routes. This page is read-only.</p></div>
      <div className="perf-actions"><label><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/> Auto refresh · 30s</label><button onClick={()=>load()} disabled={loading}>{loading?'Refreshing…':'Refresh now'}</button></div>
    </section>
    {error&&<div className="perf-error">{error}</div>}
    <section className="perf-metrics">
      <Metric label="Overall" value={loading&&!data?'Checking…':data?.status==='attention'?'Needs attention':'Healthy'} note={data?'Checked '+fmtDate(data.checkedAt):'Waiting for metrics'} state={tone(data?.status)}/>
      <Metric label="Database size" value={data?fmtBytes(db.sizeBytes):'—'} note={db.name||'Current PostgreSQL database'} state={db.unavailable?'bad':'good'}/>
      <Metric label="Cache hit" value={data?(Number(db.cacheHitPercent)||0).toFixed(2)+'%':'—'} note="PostgreSQL block cache hit ratio" state={!db.unavailable&&Number(db.cacheHitPercent)<95?'warn':'good'}/>
      <Metric label="Connection pool" value={data?(pool.utilizationPercent||0)+'% busy':'—'} note={data?`${pool.busy||0} busy · ${pool.idle||0} idle · ${pool.waiting||0} waiting · max ${pool.max||0}`:'Waiting for pool metrics'} state={(pool.waiting||0)>0||Number(pool.utilizationPercent)>=80?'warn':'good'}/>
      <Metric label="Long queries" value={data?fmtNumber(activity.longRunning):'—'} note={data?`Threshold: ${data.thresholds?.longQuerySeconds||5}s`:'Active PostgreSQL queries'} state={Number(activity.longRunning)>0?'warn':'good'}/>
      <Metric label="Idle transactions" value={data?fmtNumber(activity.idleTransactions?.length||0):'—'} note={data?`Threshold: ${data.thresholds?.idleTransactionSeconds||60}s`:'Open idle transactions'} state={(activity.idleTransactions?.length||0)>0?'warn':'good'}/>
    </section>

    <section className="perf-panel">
      <header><div><span>ACTIVE SIGNALS</span><h2>What needs attention</h2><p>Performance observations only; no session is killed and no index is changed automatically.</p></div><b className={'perf-status '+tone(data?.status)}>{data?.signals?.length||0} signal{data?.signals?.length===1?'':'s'}</b></header>
      {data?.signals?.length?<div className="perf-signals">{data.signals.map(item=><article key={item.code}><i/><div><strong>{item.title}</strong><p>{item.message}</p></div></article>)}</div>:<div className="perf-empty">No active performance warning detected.</div>}
    </section>

    <section className="perf-grid">
      <section className="perf-panel">
        <header><div><span>POSTGRESQL ACTIVITY</span><h2>Connections & transactions</h2><p>Current database session pressure, excluding the Performance Center query itself.</p></div></header>
        <div className="perf-kv-grid">
          <div><span>DB backends</span><strong>{fmtNumber(db.backends)}</strong></div>
          <div><span>Active</span><strong>{fmtNumber(activity.active)}</strong></div>
          <div><span>Idle</span><strong>{fmtNumber(activity.idle)}</strong></div>
          <div><span>Waiting</span><strong>{fmtNumber(activity.waiting)}</strong></div>
          <div><span>Commits</span><strong>{fmtNumber(db.transactions?.committed)}</strong></div>
          <div><span>Rollbacks</span><strong>{fmtNumber(db.transactions?.rolledBack)}</strong></div>
          <div><span>Temp files</span><strong>{fmtNumber(db.temp?.files)}</strong><small>{fmtBytes(db.temp?.bytes)}</small></div>
          <div><span>Deadlocks</span><strong>{fmtNumber(db.deadlocks)}</strong><small>since stats reset</small></div>
        </div>
      </section>
      <section className="perf-panel">
        <header><div><span>API LATENCY</span><h2>Slow routes</h2><p>Aggregated from the existing operational monitor for the last {slow.windowDays||7} days.</p></div></header>
        {slow.routes?.length?<div className="perf-table-wrap"><table><thead><tr><th>Route</th><th>Occurrences</th><th>Latest</th><th>Last seen</th></tr></thead><tbody>{slow.routes.map((row,i)=><tr key={(row.method||'')+(row.route||'')+i}><td><b>{row.method||'—'}</b> {row.route||'—'}</td><td>{fmtNumber(row.occurrences)}</td><td>{fmtMs(row.latestDurationMs)}</td><td>{fmtDate(row.lastSeenAt)}</td></tr>)}</tbody></table></div>:<div className="perf-empty">No slow API routes recorded in this window.</div>}
      </section>
    </section>

    {(activity.longQueries?.length>0||activity.idleTransactions?.length>0)&&<section className="perf-grid">
      <section className="perf-panel"><header><div><span>LONG-RUNNING QUERIES</span><h2>Active queries over threshold</h2><p>Query text is intentionally not exposed here.</p></div></header>{activity.longQueries?.length?<div className="perf-table-wrap"><table><thead><tr><th>PID</th><th>Application</th><th>Duration</th><th>Wait</th></tr></thead><tbody>{activity.longQueries.map(row=><tr key={row.pid}><td>{row.pid}</td><td>{row.application||row.backendType||'—'}</td><td>{row.durationSeconds}s</td><td>{row.waitEvent||row.waitType||'Running'}</td></tr>)}</tbody></table></div>:<div className="perf-empty">No long-running queries.</div>}</section>
      <section className="perf-panel"><header><div><span>IDLE TRANSACTIONS</span><h2>Transactions held open</h2><p>These can retain locks or old row versions when left open too long.</p></div></header>{activity.idleTransactions?.length?<div className="perf-table-wrap"><table><thead><tr><th>PID</th><th>Application</th><th>Duration</th><th>Wait</th></tr></thead><tbody>{activity.idleTransactions.map(row=><tr key={row.pid}><td>{row.pid}</td><td>{row.application||row.backendType||'—'}</td><td>{row.durationSeconds}s</td><td>{row.waitEvent||row.waitType||'Idle'}</td></tr>)}</tbody></table></div>:<div className="perf-empty">No old idle transactions.</div>}</section>
    </section>}

    <section className="perf-panel">
      <header><div><span>STORAGE GROWTH</span><h2>Largest application tables</h2><p>Estimated row counts and PostgreSQL statistics are useful for trends, not exact business totals.</p></div><small>Stats reset: {fmtDate(db.statsResetAt)}</small></header>
      {data?.tables?.length?<div className="perf-table-wrap"><table><thead><tr><th>Table</th><th>Total</th><th>Table / indexes</th><th>Rows</th><th>Dead rows</th><th>Scans</th></tr></thead><tbody>{data.tables.map(row=><tr key={row.table}><td><strong>{row.table}</strong></td><td>{fmtBytes(row.totalBytes)}</td><td>{fmtBytes(row.tableBytes)} / {fmtBytes(row.indexBytes)}</td><td>{fmtNumber(row.liveRows)}</td><td className={row.deadRows>=(data.thresholds?.deadTupleMinRows||1000)&&row.deadTuplePercent>=(data.thresholds?.deadTupleWarnPercent||20)?'warn':''}>{fmtNumber(row.deadRows)} · {row.deadTuplePercent}%</td><td>{fmtNumber(row.seqScans)} seq / {fmtNumber(row.indexScans)} idx</td></tr>)}</tbody></table></div>:<div className="perf-empty">Table statistics are unavailable.</div>}
    </section>

    <section className="perf-grid">
      <section className="perf-panel">
        <header><div><span>INDEX OBSERVATIONS</span><h2>Large indexes with zero recorded scans</h2><p>{indexes.note||'Review workload history before changing indexes.'}</p></div></header>
        {indexes.unusedLarge?.length?<div className="perf-list">{indexes.unusedLarge.map(row=><article key={row.index}><div><strong>{row.index}</strong><small>{row.table}</small></div><b>{fmtBytes(row.sizeBytes)}</b></article>)}</div>:<div className="perf-empty">No large zero-scan indexes in the current statistics window.</div>}
      </section>
      <section className="perf-panel">
        <header><div><span>QUERY STATISTICS</span><h2>pg_stat_statements</h2><p>{statements.available?'Top statements by cumulative execution time. Literal values are masked before display.':statements.reason||'Optional extension not available.'}</p></div><b className={'perf-status '+(statements.available?'good':'neutral')}>{statements.available?'AVAILABLE':'OPTIONAL'}</b></header>
        {statements.available&&statements.statements?.length?<div className="perf-statements">{statements.statements.slice(0,10).map(row=><article key={row.queryId}><div><strong>{row.querySample||'Query '+row.queryId}</strong><small>ID {row.queryId} · {fmtNumber(row.calls)} calls · {fmtNumber(row.rows)} rows</small></div><b>{fmtMs(row.meanExecMs)} avg</b></article>)}</div>:<div className="perf-empty">Performance Center does not require pg_stat_statements. Enable it later only when your PostgreSQL host supports it.</div>}
      </section>
    </section>
  </main>
}
