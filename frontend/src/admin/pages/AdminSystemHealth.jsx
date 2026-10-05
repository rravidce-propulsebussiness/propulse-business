import {useCallback,useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {authRequest} from '../../utils/auth'
import './AdminSystemHealth.css'

const fmtDate=value=>{
  if(!value)return '—'
  const date=new Date(value)
  return Number.isNaN(date.getTime())?'—':date.toLocaleString()
}
const fmtDuration=seconds=>{
  const value=Math.max(0,Number(seconds)||0)
  const days=Math.floor(value/86400)
  const hours=Math.floor((value%86400)/3600)
  const minutes=Math.floor((value%3600)/60)
  if(days)return days+'d '+hours+'h'
  if(hours)return hours+'h '+minutes+'m'
  return minutes+'m'
}
const stateTone=value=>['healthy','connected','ready','fresh','current','verified','not_required'].includes(String(value||'').toLowerCase())?'good':['attention','warning','degraded','pending','stale','not_run'].includes(String(value||'').toLowerCase())?'warn':'bad'
const statusLabel=value=>value==='healthy'?'Healthy':value==='attention'?'Needs attention':value==='degraded'?'Degraded':value||'Unavailable'

function HealthCard({label,value,note,tone='good',metric}){
  return <article className={'system-health-card '+tone}>
    <div className="system-health-card-top"><span>{label}</span><i/></div>
    <strong>{value}</strong>
    {metric&&<b>{metric}</b>}
    <small>{note}</small>
  </article>
}

function ActiveIssues({data}){
  const issues=Array.isArray(data?.issues)?data.issues:[]
  const degraded=Number(data?.summary?.degradedCount)||0
  const attention=Number(data?.summary?.attentionCount)||0
  if(!data||issues.length===0)return <section className="system-health-issue-summary healthy">
    <div className="system-health-issue-heading">
      <span className="system-health-issue-icon">✓</span>
      <div><small>OPERATIONAL STATUS</small><h2>All monitored systems are healthy</h2><p>No active operational issues were detected in the latest check.</p></div>
    </div>
  </section>
  return <section className={'system-health-issue-summary '+(degraded?'degraded':'attention')}>
    <div className="system-health-issue-heading">
      <span className="system-health-issue-icon">{degraded?'!':'i'}</span>
      <div>
        <small>{degraded?'WHY THE SYSTEM IS DEGRADED':'OPERATIONAL ATTENTION'}</small>
        <h2>{issues.length} active issue{issues.length===1?'':'s'}</h2>
        <p>{degraded?`${degraded} critical operational signal${degraded===1?' is':'s are'} affecting overall health.`:`${attention} non-critical signal${attention===1?' needs':'s need'} review; core platform health remains available.`}</p>
      </div>
      <div className="system-health-issue-counts">
        {degraded>0&&<span className="bad">{degraded} degraded</span>}
        {attention>0&&<span className="warn">{attention} attention</span>}
      </div>
    </div>
    <div className="system-health-issue-list">
      {issues.slice(0,8).map((issue,index)=><article key={issue.code||index} className={issue.severity==='degraded'?'bad':'warn'}>
        <i/>
        <div>
          <strong>{issue.title}</strong>
          <p>{issue.message}</p>
        </div>
        {issue.actionUrl&&<Link to={issue.actionUrl}>{issue.actionLabel||'Review'} <span>→</span></Link>}
      </article>)}
    </div>
  </section>
}

function SheetHealth({title,subtitle,data}){
  const problems=Array.isArray(data?.recentProblems)?data.recentProblems:[]
  const issueCount=(Number(data?.failing)||0)+(Number(data?.connectionErrors)||0)
  const tone=stateTone(data?.status||'healthy')
  return <section className="system-health-panel sheet-health-panel">
    <header>
      <div><span>SHEET AUTOMATION</span><h2>{title}</h2><p>{subtitle}</p></div>
      <span className={'system-health-pill '+tone}>{statusLabel(data?.status||'healthy')}</span>
    </header>
    <div className="sheet-health-metrics">
      <div><span>Active connections</span><strong>{Number(data?.active)||0}</strong></div>
      <div><span>Rows failing</span><strong>{Number(data?.failing)||0}</strong></div>
      <div><span>Connection errors</span><strong>{Number(data?.connectionErrors)||0}</strong></div>
      <div><span>Last successful sync</span><strong>{fmtDate(data?.lastSyncedAt)}</strong></div>
    </div>
    {problems.length>0?<div className="system-health-problems">
      {problems.map(item=><article key={item.id} className={item.persistent?'persistent':''}>
        <span>Connection #{item.id}</span>
        <strong>{item.failureCount?item.failureCount+' failed attempt'+(item.failureCount===1?'':'s'):item.failedRows+' invalid row'+(item.failedRows===1?'':'s')}</strong>
        <small>{item.error||'Row-level validation failures need review.'}</small>
        <b>{item.nextRetryAt?'Retry '+fmtDate(item.nextRetryAt):fmtDate(item.errorAt||item.lastSyncedAt)}</b>
      </article>)}
    </div>:<div className="system-health-empty">No active sync problems reported.</div>}
    {issueCount>0&&<div className="system-health-sheet-note">Temporary connection errors and invalid rows are shown as attention. A connection becomes platform-degrading after {Number(data?.persistentFailureThreshold)||3} consecutive sync failures.</div>}
  </section>
}

export default function AdminSystemHealth(){
  const[data,setData]=useState(null)
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')
  const[autoRefresh,setAutoRefresh]=useState(true)

  const load=useCallback(async({silent=false}={})=>{
    if(!silent)setLoading(true)
    try{
      const result=await authRequest('/admin/system-health')
      setData(result)
      window.dispatchEvent(new CustomEvent('propulse:system-health',{detail:{status:result?.status}}))
      setError('')
    }catch(err){
      setError(err.message||'Unable to load system health')
    }finally{
      if(!silent)setLoading(false)
    }
  },[])

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[load])
  useEffect(()=>{
    if(!autoRefresh)return undefined
    const timer=setInterval(()=>load({silent:true}),30000)
    return()=>clearInterval(timer)
  },[autoRefresh,load])

  const overallTone=stateTone(data?.status)
  const pool=data?.database?.pool||{}
  const financial=data?.financialIntegrity||{}
  const backups=data?.backups||{}
  const poolNote=useMemo(()=>{
    if(!data)return 'Waiting for runtime metrics'
    if(Number(pool.waiting)>0)return pool.waiting+' request'+(pool.waiting===1?' is':'s are')+' waiting for a DB connection'
    return `${pool.busy||0} busy · ${pool.idle||0} idle · ${pool.total||0} open · max ${pool.max||0}`
  },[data,pool.busy,pool.idle,pool.max,pool.total,pool.waiting])

  return <main className="admin-system-health">
    <section className="system-health-hero">
      <div>
        <span>SYSTEM / PRODUCTION OPERATIONS</span>
        <h1>System health</h1>
        <p>One operational view for runtime, PostgreSQL, persistent storage, workers, migrations, financial controls and automated lead sources.</p>
      </div>
      <div className="system-health-hero-actions">
        <label><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/> Auto refresh · 30s</label>
        <button type="button" onClick={()=>load()} disabled={loading}>{loading?'Refreshing…':'Refresh now'}</button>
      </div>
    </section>

    {error&&<div className="system-health-error"><strong>Health data unavailable</strong><span>{error}</span></div>}
    <ActiveIssues data={data}/>

    <section className="system-health-overview">
      <HealthCard label="Overall" value={loading&&!data?'Checking…':statusLabel(data?.status)} note={data?'Checked '+fmtDate(data.checkedAt):'Waiting for backend'} tone={overallTone} metric={data?.summary?.issueCount?data.summary.issueCount+' active issue'+(data.summary.issueCount===1?'':'s'):null}/>
      <HealthCard label="Database" value={data?.database?.status||'—'} note={poolNote} tone={stateTone(data?.database?.status)} metric={data?(pool.utilizationPercent||0)+'% active utilization':null}/>
      <HealthCard label="Email delivery" value={data?.email?.status||'—'} note={!data?.email?.configured?'Email provider is not configured':data?.email?.senderMode==='resend_test'?'Resend test sender configured — use a verified domain in production':'Custom sender domain configured'} tone={stateTone(data?.email?.status)} metric={data?.email?.senderMode==='custom_domain'?'VERIFIED-DOMAIN MODE':data?.email?.senderMode==='resend_test'?'TEST SENDER':null}/>
      <HealthCard label="Upload storage" value={data?.storage?.status||'—'} note={data?.storage?.persistentConfigured?'Persistent storage configured':'Using application-local storage'} tone={stateTone(data?.storage?.status)}/>
      <HealthCard label="Private objects" value={data?.storage?.privateObjects?.status||'—'} note={data?.storage?.privateObjects?.driver==='s3'?(data?.storage?.privateObjects?.status==='ready'?'S3-compatible private storage ready':data?.storage?.privateObjects?.error||'S3-compatible storage unavailable'):'Private proofs currently use local durable storage'} tone={stateTone(data?.storage?.privateObjects?.status)} metric={data?.storage?.privateObjects?.driver?.toUpperCase()||null}/>
      <HealthCard label="Legacy upload refs" value={data?.storage?.legacyReferences?.unavailable?'unavailable':Number(data?.storage?.legacyReferences?.total||0)>0?'attention':'clear'} note={data?.storage?.legacyReferences?.unavailable?'Could not inspect stored upload references':Number(data?.storage?.legacyReferences?.total||0)>0?[
        data.storage.legacyReferences.companyProofs?data.storage.legacyReferences.companyProofs+' company proof':'',
        data.storage.legacyReferences.homepageMedia?data.storage.legacyReferences.homepageMedia+' homepage media':'',
        data.storage.legacyReferences.projectMedia?data.storage.legacyReferences.projectMedia+' project media':'',
        data.storage.legacyReferences.privateProofs?data.storage.legacyReferences.privateProofs+' private proof':''
      ].filter(Boolean).join(' · '):'No pre-R2 local upload references remain'} tone={data?.storage?.legacyReferences?.unavailable?'degraded':Number(data?.storage?.legacyReferences?.total||0)>0?'attention':'healthy'} metric={data?.storage?.legacyReferences?.total!=null?data.storage.legacyReferences.total+' refs':null}/>
      <HealthCard label="Background worker" value={data?.worker?.status||'—'} note={data?.worker?.required===false?'Not required — scheduled jobs run in the web process':data?.worker?.lastSeenAt?'Heartbeat '+fmtDate(data.worker.lastSeenAt):'No heartbeat available'} tone={stateTone(data?.worker?.status)} metric={data?.worker?.required!==false&&data?.worker?.ageSeconds!=null?data.worker.ageSeconds+'s old':null}/>
      <HealthCard label="Migrations" value={data?.migrations?.status||'—'} note={data?(data.migrations?.applied||0)+' applied · '+(data.migrations?.pending??'—')+' pending':'Waiting for migration state'} tone={stateTone(data?.migrations?.status)}/>
      <HealthCard label="Financial reconciliation" value={financial.status||'—'} note={financial.lastCompletedAt?'Last automated run '+fmtDate(financial.lastCompletedAt):'No automated reconciliation recorded'} tone={stateTone(financial.status)} metric={data?(Number(financial.criticalAlerts||0)+Number(financial.warningAlerts||0))+' active alerts':null}/>
      <HealthCard label="Backup verification" value={backups.status||'—'} note={backups.database?.lastVerifiedAt?'DB restore verified '+fmtDate(backups.database.lastVerifiedAt):(backups.required?'Production verification required':'Verification not required locally')} tone={stateTone(backups.status)} metric={data?(backups.verifiedCount||0)+'/2 verified':null}/>
    </section>

    <section className="system-health-grid">
      <section className="system-health-panel runtime-panel">
        <header><div><span>RUNTIME</span><h2>Application process</h2><p>Current deployed process metrics. No secrets or environment values are exposed.</p></div><span className={'system-health-pill '+overallTone}>{data?.build?.environment||'—'}</span></header>
        <div className="runtime-health-grid">
          <div><span>Build</span><strong>{data?.build?.commit||'—'}</strong><small>Git commit / deployment identity</small></div>
          <div><span>Node</span><strong>{data?.build?.node||'—'}</strong><small>Runtime version</small></div>
          <div><span>Uptime</span><strong>{data?fmtDuration(data.runtime?.uptimeSeconds):'—'}</strong><small>Current web process</small></div>
          <div><span>RSS memory</span><strong>{data?.runtime?.memoryMb?.rss??'—'}{data?' MB':''}</strong><small>Resident process memory</small></div>
          <div><span>Heap</span><strong>{data?.runtime?.memoryMb?.heapUsed??'—'}{data?' MB':''}</strong><small>of {data?.runtime?.memoryMb?.heapTotal??'—'} MB allocated</small></div>
          <div><span>DB connections</span><strong>{pool.busy??'—'} busy</strong><small>{pool.idle??'—'} idle · {pool.waiting??'—'} waiting · {pool.max??'—'} max</small></div>
        </div>
      </section>

      <section className="system-health-panel worker-panel">
        <header><div><span>BACKGROUND AUTOMATION</span><h2>Worker heartbeat</h2><p>The sheet-sync worker must remain fresh in dedicated-worker production.</p></div><span className={'system-health-pill '+stateTone(data?.worker?.status)}>{data?.worker?.status||'—'}</span></header>
        <div className="worker-health-timeline">
          <div><span>Last heartbeat</span><strong>{fmtDate(data?.worker?.lastSeenAt)}</strong></div>
          <div><span>Heartbeat age</span><strong>{data?.worker?.ageSeconds!=null?data.worker.ageSeconds+' seconds':'—'}</strong></div>
          <div><span>Freshness limit</span><strong>{data?.worker?.maxAgeSeconds!=null?data.worker.maxAgeSeconds+' seconds':'—'}</strong></div>
          <div><span>Worker started</span><strong>{fmtDate(data?.worker?.startedAt)}</strong></div>
        </div>
      </section>
    </section>

    <section className="system-health-sheets-grid">
      <SheetHealth title="Lead Partner sheets" subtitle="Live Lead Partner inventory sources and import validation health." data={data?.sheets?.leadPartner}/>
      <SheetHealth title="Admin sheets" subtitle="Admin-managed lead sources and automatic sync health." data={data?.sheets?.admin}/>
    </section>

    <section className="system-health-release">
      <div><span>RELEASE CHECK</span><h2>Deployment signals</h2></div>
      <div className="system-health-release-items">
        <span className={data?.database?.status==='connected'?'ok':'bad'}>Database</span>
        <span className={data?.storage?.status==='ready'?'ok':'bad'}>Storage</span>
        <span className={data?.email?.status==='ready'?'ok':data?.email?.status==='attention'?'warn':'bad'}>Email delivery</span>
        <span className={data?.storage?.privateObjects?.status==='ready'?'ok':'bad'}>Private objects</span>
        <span className={data?.worker?.status==='fresh'?'ok':'bad'}>Worker</span>
        <span className={data?.migrations?.status==='current'?'ok':'bad'}>Migrations</span>
        <span className={data?.sheets?.leadPartner?.status==='healthy'&&data?.sheets?.admin?.status==='healthy'?'ok':data?.sheets?.leadPartner?.status==='degraded'||data?.sheets?.admin?.status==='degraded'?'bad':'warn'}>Sheet connections</span>
        <span className={financial.status==='healthy'?'ok':['warning','stale','not_run'].includes(financial.status)?'warn':'bad'}>Financial reconciliation</span>
        <span className={backups.status==='healthy'?'ok':['not_run','stale'].includes(backups.status)?'warn':'bad'}>Backup verification</span>
      </div>
    </section>
  </main>
}
