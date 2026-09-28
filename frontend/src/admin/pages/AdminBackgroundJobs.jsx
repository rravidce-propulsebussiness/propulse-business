import {useCallback,useEffect,useMemo,useState} from 'react'
import {authRequest} from '../../utils/auth'
import './AdminBackgroundJobs.css'

const fmtDate=value=>{
  if(!value)return '—'
  const d=new Date(value)
  return Number.isNaN(d.getTime())?'—':d.toLocaleString()
}
const fmtDuration=ms=>{
  const value=Math.max(0,Number(ms)||0)
  if(value<1000)return value+' ms'
  const seconds=value/1000
  if(seconds<60)return seconds.toFixed(seconds<10?1:0)+' s'
  const minutes=Math.floor(seconds/60)
  const remain=Math.round(seconds%60)
  return minutes+'m '+remain+'s'
}
const cadence=ms=>{
  const value=Number(ms)||0
  if(value<60000)return Math.round(value/1000)+' sec'
  if(value<3600000)return Math.round(value/60000)+' min'
  if(value<86400000)return Math.round(value/3600000)+' hr'
  return Math.round(value/86400000)+' day'
}
const tone=status=>{
  const value=String(status||'').toLowerCase()
  if(['succeeded','verified','healthy','ready'].includes(value))return 'good'
  if(['running','skipped','stale','not_run','unknown','overdue'].includes(value))return 'warn'
  return value?'bad':'neutral'
}
const summaryText=summary=>{
  if(!summary||typeof summary!=='object')return 'No run summary'
  const pairs=Object.entries(summary).filter(([,value])=>['number','string','boolean'].includes(typeof value)&&value!==''&&value!==null).slice(0,6)
  return pairs.length?pairs.map(([key,value])=>key.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase())+': '+String(value)).join(' · '):'Completed without counters'
}

function RunRow({run}){
  return <div className="job-run-row">
    <span className={'job-status '+tone(run.status)}>{run.status}</span>
    <div><strong>{fmtDate(run.startedAt)}</strong><small>{run.source}{run.triggeredBy?' · Admin #'+run.triggeredBy:''}</small></div>
    <div><strong>{run.durationMs==null?'—':fmtDuration(run.durationMs)}</strong><small>Duration</small></div>
    <div className="job-run-summary"><strong>{summaryText(run.summary)}</strong><small>{run.error||'Run summary'}</small></div>
  </div>
}

function JobCard({job,onRetry,retrying}){
  const latest=job.latestRun
  const state=job.staleRunning?'stale':job.overdue?'overdue':latest?.status||'not_run'
  return <article className={'background-job-card '+tone(state)}>
    <header>
      <div><span>{job.group}</span><h2>{job.name}</h2><p>{job.description}</p></div>
      <span className={'job-status '+tone(state)}>{job.staleRunning?'stale running':job.overdue&&latest?.status==='succeeded'?'overdue':state}</span>
    </header>
    <div className="background-job-metrics">
      <div><span>Cadence</span><strong>Every {cadence(job.intervalMs)}</strong></div>
      <div><span>Last run</span><strong>{fmtDate(latest?.startedAt)}</strong></div>
      <div><span>Duration</span><strong>{latest?.durationMs==null?'—':fmtDuration(latest.durationMs)}</strong></div>
      <div><span>Next expected</span><strong>{fmtDate(job.nextExpectedAt)}</strong></div>
    </div>
    <div className="background-job-latest">
      <div><span>LAST RESULT</span><strong>{latest?summaryText(latest.summary):'No recorded run yet'}</strong>{latest?.error&&<small>{latest.error}</small>}</div>
      <button type="button" onClick={()=>onRetry(job)} disabled={!job.retrySupported||retrying}>{retrying?'Running…':job.retrySupported?'Retry now':'External job'}</button>
    </div>
    <details>
      <summary>Recent runs <span>{job.recentRuns?.length||0}</span></summary>
      <div className="job-run-list">{(job.recentRuns||[]).length?(job.recentRuns||[]).map(run=><RunRow key={run.id} run={run}/>):<div className="job-empty">No runs recorded yet.</div>}</div>
    </details>
  </article>
}

export default function AdminBackgroundJobs(){
  const[data,setData]=useState(null)
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')
  const[message,setMessage]=useState('')
  const[retrying,setRetrying]=useState('')
  const[autoRefresh,setAutoRefresh]=useState(true)

  const load=useCallback(async({silent=false}={})=>{
    if(!silent)setLoading(true)
    try{
      const result=await authRequest('/admin/jobs?historyLimit=8')
      setData(result)
      setError('')
    }catch(err){setError(err.message||'Unable to load background jobs')}
    finally{if(!silent)setLoading(false)}
  },[])

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[load])
  useEffect(()=>{
    if(!autoRefresh)return undefined
    const timer=setInterval(()=>load({silent:true}),30000)
    return()=>clearInterval(timer)
  },[autoRefresh,load])

  const retry=async job=>{
    if(!job?.retrySupported||retrying)return
    setRetrying(job.key);setError('');setMessage('')
    try{
      const result=await authRequest('/admin/jobs/'+encodeURIComponent(job.key)+'/retry',{method:'POST'})
      const status=result?.jobStatus||result?.status||'completed'
      setMessage(job.name+' '+status+'.')
      await load({silent:true})
    }catch(err){setError(err.message||'Background job failed')}
    finally{setRetrying('')}
  }

  const counts=useMemo(()=>{
    const jobs=data?.jobs||[]
    return{
      total:jobs.length,
      failed:jobs.filter(job=>job.latestRun?.status==='failed'||job.staleRunning).length,
      overdue:jobs.filter(job=>job.overdue).length,
      running:jobs.filter(job=>job.latestRun?.status==='running'&&!job.staleRunning).length
    }
  },[data])

  return <main className="admin-background-jobs">
    <section className="background-jobs-hero">
      <div><span>SYSTEM / AUTOMATION</span><h1>Background jobs</h1><p>Operational history and controlled retries for worker-driven jobs. Manual retries use the same production code path and a database lock.</p></div>
      <div className="background-jobs-actions"><label><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/> Auto refresh · 30s</label><button onClick={()=>load()} disabled={loading}>{loading?'Refreshing…':'Refresh now'}</button></div>
    </section>

    {error&&<div className="background-jobs-alert bad"><strong>Job control error</strong><span>{error}</span><button onClick={()=>setError('')}>×</button></div>}
    {message&&<div className="background-jobs-alert good"><strong>Job completed</strong><span>{message}</span><button onClick={()=>setMessage('')}>×</button></div>}

    <section className="background-jobs-overview">
      <article><span>Managed jobs</span><strong>{counts.total}</strong><small>Safe in-process jobs</small></article>
      <article><span>Running</span><strong>{counts.running}</strong><small>Latest execution state</small></article>
      <article className={counts.failed?'bad':''}><span>Failed / stale</span><strong>{counts.failed}</strong><small>Needs investigation</small></article>
      <article className={counts.overdue?'warn':''}><span>Overdue</span><strong>{counts.overdue}</strong><small>Past expected cadence</small></article>
    </section>

    <section className="background-jobs-worker">
      <div><span>WORKER HEARTBEAT</span><h2>{data?.worker?'Worker reporting':'No active heartbeat'}</h2></div>
      <div><span>Last seen</span><strong>{fmtDate(data?.worker?.last_seen_at||data?.worker?.lastSeenAt)}</strong></div>
      <div><span>Instance</span><strong>{data?.worker?.instance_id||data?.worker?.instanceId||'—'}</strong></div>
      <div><span>PID</span><strong>{data?.worker?.pid||'—'}</strong></div>
    </section>

    <section className="background-jobs-grid">
      {(data?.jobs||[]).map(job=><JobCard key={job.key} job={job} onRetry={retry} retrying={retrying===job.key}/>)}
    </section>

    <section className="external-jobs-panel">
      <header><div><span>EXTERNAL OPERATIONS</span><h2>Backup verification</h2><p>These drills are monitored here but remain intentionally outside HTTP-triggered retries.</p></div></header>
      <div className="external-jobs-grid">
        {(data?.externalJobs||[]).map(job=><article key={job.key}><span className={'job-status '+tone(job.status)}>{job.status}</span><h3>{job.name}</h3><p>{job.description}</p><div><span>Last completed</span><strong>{fmtDate(job.lastCompletedAt)}</strong></div>{job.error&&<small>{job.error}</small>}</article>)}
      </div>
    </section>
  </main>
}
