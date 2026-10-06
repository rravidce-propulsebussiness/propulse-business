import {useCallback,useEffect,useMemo,useState} from 'react'
import {authRequest} from '../../utils/auth'
import './AdminOperationalErrors.css'

const fmt=value=>{
  if(!value)return '—'
  const date=new Date(value)
  return Number.isNaN(date.getTime())?'—':date.toLocaleString()
}
const title=value=>String(value||'').replace(/[_:-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase())
const sourceLabel=value=>value==='frontend'?'Browser':value==='worker'?'Worker':'Backend'

export default function AdminOperationalErrors(){
  const[data,setData]=useState([])
  const[summary,setSummary]=useState({})
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')
  const[status,setStatus]=useState('open')
  const[severity,setSeverity]=useState('')
  const[source,setSource]=useState('')
  const[environment,setEnvironment]=useState('')
  const[effectiveEnvironment,setEffectiveEnvironment]=useState('')
  const[search,setSearch]=useState('')
  const[query,setQuery]=useState('')
  const[page,setPage]=useState(1)
  const[totalPages,setTotalPages]=useState(1)

  const params=useMemo(()=>{
    const p=new URLSearchParams({status,page:String(page),limit:'30'})
    if(severity)p.set('severity',severity)
    if(source)p.set('source',source)
    if(environment)p.set('environment',environment)
    if(query)p.set('search',query)
    return p.toString()
  },[status,severity,source,environment,query,page])

  const load=useCallback(async({silent=false}={})=>{
    if(!silent)setLoading(true)
    try{
      const result=await authRequest('/admin/operational-events?'+params)
      setData(Array.isArray(result?.data)?result.data:[])
      setSummary(result?.summary||{})
      setEffectiveEnvironment(String(result?.environment||''))
      setTotalPages(Math.max(1,Number(result?.totalPages)||1))
      setError('')
    }catch(err){
      setError(err.message||'Unable to load operational errors')
    }finally{
      if(!silent)setLoading(false)
    }
  },[params])

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[load])

  async function updateEvent(item,next){
    try{
      await authRequest('/admin/operational-events/'+item.id,{
        method:'PATCH',
        body:JSON.stringify({
          status:next,
          note:next==='resolved'?'Reviewed in Error Monitor':undefined
        })
      })
      await load({silent:true})
    }catch(err){setError(err.message||'Unable to update operational error')}
  }

  function applySearch(event){
    event.preventDefault()
    setPage(1)
    setQuery(search.trim())
  }

  const openTotal=(Number(summary.openErrors)||0)+(Number(summary.openWarnings)||0)

  return <main className="admin-error-monitor">
    <section className="error-monitor-hero">
      <div>
        <span>SYSTEM / OBSERVABILITY</span>
        <h1>Error monitor</h1>
        <p>Centralized backend, browser and worker failures with request IDs, route context, build identity and deduplicated occurrence counts.</p>
      </div>
      <button type="button" onClick={()=>load()} disabled={loading}>{loading?'Refreshing…':'Refresh now'}</button>
    </section>

    {error&&<div className="error-monitor-alert"><strong>Monitoring error</strong><span>{error}</span></div>}

    <section className="error-monitor-summary">
      <article className="danger"><span>OPEN ERRORS</span><strong>{Number(summary.openErrors)||0}</strong><small>Requires investigation</small></article>
      <article className="warning"><span>OPEN WARNINGS</span><strong>{Number(summary.openWarnings)||0}</strong><small>Mostly slow requests</small></article>
      <article><span>BACKEND</span><strong>{Number(summary.backendOpen)||0}</strong><small>Server-side open fingerprints</small></article>
      <article><span>BROWSER</span><strong>{Number(summary.frontendOpen)||0}</strong><small>Frontend open fingerprints</small></article>
      <article><span>TOTAL OPEN</span><strong>{openTotal}</strong><small>Deduplicated active issues</small></article>
    </section>

    <section className="error-monitor-panel">
      <div className="error-monitor-toolbar">
        <div className="error-monitor-tabs">
          <button type="button" className={status==='open'?'active':''} onClick={()=>{setStatus('open');setPage(1)}}>Open</button>
          <button type="button" className={status==='resolved'?'active':''} onClick={()=>{setStatus('resolved');setPage(1)}}>Resolved</button>
          <button type="button" className={status==='all'?'active':''} onClick={()=>{setStatus('all');setPage(1)}}>All</button>
        </div>
        <div className="error-monitor-filters">
          <select value={severity} onChange={event=>{setSeverity(event.target.value);setPage(1)}}>
            <option value="">All severity</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
          </select>
          <select value={source} onChange={event=>{setSource(event.target.value);setPage(1)}}>
            <option value="">All sources</option>
            <option value="backend">Backend</option>
            <option value="frontend">Browser</option>
            <option value="worker">Worker</option>
          </select>
          <select value={environment} onChange={event=>{setEnvironment(event.target.value);setPage(1)}}>
            <option value="">Current environment</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="all">All environments</option>
          </select>
          <form onSubmit={applySearch}>
            <input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Message, route or request ID"/>
            <button>Search</button>
          </form>
        </div>
      </div>

      <div className="error-monitor-head">
        <div><span>ACTIVE FINGERPRINTS</span><h2>{loading?'Loading…':data.length+' issue'+(data.length===1?'':'s')+' on this page'}</h2></div>
        <small>{effectiveEnvironment&&effectiveEnvironment!=='all'?title(effectiveEnvironment)+' · ':''}Last signal {fmt(summary.lastSeenAt)}</small>
      </div>

      {data.length===0&&!loading?<div className="error-monitor-empty">
        <div>✓</div><strong>No matching operational errors</strong><span>{status==='open'?'The selected filters have no unresolved fingerprints.':'No records match these filters.'}</span>
      </div>:<div className="error-monitor-list">
        {data.map(item=><article className={'error-monitor-item '+item.severity} key={item.id}>
          <div className="error-monitor-severity"><i/><span>{item.severity}</span></div>
          <div className="error-monitor-copy">
            <div className="error-monitor-title-row">
              <strong>{item.message}</strong>
              <span className={'source '+item.source}>{sourceLabel(item.source)}</span>
              <span className="kind">{title(item.eventType)}</span>
            </div>
            <div className="error-monitor-meta">
              {item.method&&<span>{item.method}</span>}
              {item.route&&<b>{item.route}</b>}
              {item.statusCode&&<span>HTTP {item.statusCode}</span>}
              {item.durationMs!=null&&<span>{item.durationMs} ms</span>}
              <span>{item.occurrenceCount} occurrence{item.occurrenceCount===1?'':'s'}</span>
            </div>
            <div className="error-monitor-context">
              <span>First {fmt(item.firstSeenAt)}</span>
              <span>Last {fmt(item.lastSeenAt)}</span>
              <span>Build {item.buildCommit||'local'}</span>
              {item.environment&&<span>{title(item.environment)}</span>}
              {item.requestId&&<span>Request <code>{item.requestId}</code></span>}
              {item.userRole&&<span>Role {item.userRole}</span>}
            </div>
            {item.metadata?.stack&&<details><summary>Technical trace</summary><pre>{item.metadata.stack}</pre></details>}
            {item.resolvedAt&&<div className="error-monitor-resolution">Resolved {fmt(item.resolvedAt)}{item.resolutionNote?' · '+item.resolutionNote:''}</div>}
          </div>
          <div className="error-monitor-actions">
            {item.resolvedAt
              ?<button type="button" onClick={()=>updateEvent(item,'open')}>Reopen</button>
              :<button type="button" className="resolve" onClick={()=>updateEvent(item,'resolved')}>Resolve</button>}
          </div>
        </article>)}
      </div>}

      <footer className="error-monitor-pagination">
        <button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>← Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" disabled={page>=totalPages} onClick={()=>setPage(value=>Math.min(totalPages,value+1))}>Next →</button>
      </footer>
    </section>
  </main>
}
