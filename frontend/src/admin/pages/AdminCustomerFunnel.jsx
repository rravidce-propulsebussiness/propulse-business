import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../utils/api'
import './AdminCustomerFunnel.css'

const money=value=>{
  const n=Number(value||0)
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0)
}
const compact=value=>new Intl.NumberFormat('en-IN',{notation:'compact',maximumFractionDigits:1}).format(Number(value||0))
const when=value=>{
  if(!value)return '—'
  const date=new Date(value)
  return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
}
const sourceCopy={
  public_requirement:{label:'Direct requirements',description:'Customers who submitted a structured Build or Interior requirement.'},
  public_estimator:{label:'Estimator leads',description:'Canonical leads created after an estimator user requested actual quotes.'},
}
const periods=[['7','7D'],['30','30D'],['90','90D'],['365','1Y'],['all','All']]

function Kpi({eyebrow,value,label,note,tone='blue'}){
  return <article className={'funnel-kpi '+tone}><span>{eyebrow}</span><strong>{value}</strong><b>{label}</b><small>{note}</small></article>
}

export default function AdminCustomerFunnel(){
  const [period,setPeriod]=useState('30')
  const [flowId,setFlowId]=useState('')
  const [conversion,setConversion]=useState('all')
  const [page,setPage]=useState(1)
  const [queryInput,setQueryInput]=useState('')
  const [query,setQuery]=useState('')
  const [refresh,setRefresh]=useState(0)
  const [state,setState]=useState({loading:true,error:'',data:null})

  useEffect(()=>{
    let live=true
    setState(current=>({...current,loading:true,error:''}))
    const params=new URLSearchParams({period,conversion,page:String(page),limit:'25'})
    if(flowId)params.set('flowId',flowId)
    if(query)params.set('q',query)
    apiRequest('/admin/customer-funnel?'+params.toString())
      .then(data=>{if(live)setState({loading:false,error:'',data})})
      .catch(error=>{if(live)setState(current=>({...current,loading:false,error:error.message||'Unable to load funnel analytics'}))})
    return()=>{live=false}
  },[period,flowId,conversion,page,query,refresh])

  const data=state.data||{}
  const summary=data.summary||{}
  const sources=Array.isArray(data.sources)?data.sources:[]
  const definitions=Array.isArray(data.estimatorDefinitions)?data.estimatorDefinitions:[]
  const estimators=Array.isArray(data.estimators)?data.estimators:[]
  const cities=Array.isArray(data.cities)?data.cities:[]
  const requirements=Array.isArray(data.requirements)?data.requirements:[]
  const recent=data.recent||{items:[],pagination:{page:1,pages:1,total:0}}
  const selectedFlow=useMemo(()=>definitions.find(item=>String(item.id)===String(flowId)),[definitions,flowId])

  function changePeriod(value){setPeriod(value);setPage(1)}
  function changeFlow(value){setFlowId(value);setPage(1)}
  function changeConversion(value){setConversion(value);setPage(1)}
  function submitSearch(event){event.preventDefault();setQuery(queryInput.trim());setPage(1)}

  return <main className="admin-funnel-page">
    <section className="admin-funnel-hero">
      <div className="admin-funnel-hero-copy">
        <span>CUSTOMER ACQUISITION / FUNNEL</span>
        <h1>Estimator &amp; customer funnel</h1>
        <p>See how project planning becomes quote requests, canonical leads and paid marketplace activity—using the same estimator and lead records that power the product.</p>
        <div className="admin-funnel-hero-meta">
          <span><b>{compact(summary.calculations)}</b> estimates</span>
          <span><b>{compact(summary.converted)}</b> quote requests</span>
          <span><b>{summary.conversionRate||0}%</b> estimate conversion</span>
        </div>
      </div>
      <div className="admin-funnel-hero-actions">
        <Link to="/admin/customer-flows"><span>⌘</span><div><b>Customer Flows</b><small>Questions, rates &amp; versions</small></div></Link>
        <button type="button" onClick={()=>setRefresh(value=>value+1)} disabled={state.loading}><span>↻</span><div><b>{state.loading?'Refreshing…':'Refresh analytics'}</b><small>Read latest canonical data</small></div></button>
      </div>
    </section>

    {state.error&&<div className="admin-funnel-alert">{state.error}<button type="button" onClick={()=>setRefresh(value=>value+1)}>Retry</button></div>}

    <section className="admin-funnel-toolbar">
      <div className="admin-funnel-periods">{periods.map(([value,label])=><button type="button" key={value} className={period===value?'active':''} onClick={()=>changePeriod(value)}>{label}</button>)}</div>
      <label>Estimator<select value={flowId} onChange={event=>changeFlow(event.target.value)}><option value="">All estimators</option>{definitions.map(item=><option key={item.id} value={item.id}>{item.name}{item.isActive?'':' (inactive)'}</option>)}</select></label>
      <label>History<select value={conversion} onChange={event=>changeConversion(event.target.value)}><option value="all">All calculations</option><option value="converted">Quote requested</option><option value="unconverted">Estimate only</option></select></label>
    </section>

    <section className="admin-funnel-kpis">
      <Kpi eyebrow="ESTIMATES" value={compact(summary.calculations)} label="Calculations completed" note={selectedFlow?selectedFlow.name:'Across all estimator flows'} tone="blue"/>
      <Kpi eyebrow="QUOTE INTENT" value={compact(summary.converted)} label="Requested actual quotes" note={(summary.conversionRate||0)+'% of completed estimates'} tone="orange"/>
      <Kpi eyebrow="DIRECT DEMAND" value={compact(summary.directRequirementLeads)} label="Requirement-form leads" note="Build / Interior submissions without estimator conversion" tone="green"/>
      <Kpi eyebrow="CANONICAL OUTPUT" value={compact(summary.customerFunnelLeads)} label="Customer-funnel leads" note={compact(summary.monetizedLeads)+' have at least one paid marketplace purchase'} tone="purple"/>
      <Kpi eyebrow="PAID LEAD SALES" value={money(summary.paidLeadSales)} label="Gross marketplace sales" note="Paid purchases attributed to customer-funnel leads; not company profit" tone="navy"/>
    </section>

    <section className="admin-funnel-grid primary">
      <article className="admin-funnel-panel estimator-performance">
        <div className="admin-funnel-panel-head"><div><span>ESTIMATOR PERFORMANCE</span><h2>{selectedFlow?selectedFlow.name:'Calculation → quote conversion'}</h2><p>Each conversion is a calculation linked to a quote-request lead.</p></div><small>{period==='all'?'All time':period+' days'}</small></div>
        <div className="estimator-performance-list">
          {estimators.length?estimators.map(item=><button type="button" key={item.definitionId} className={String(flowId)===String(item.definitionId)?'selected':''} onClick={()=>changeFlow(String(flowId)===String(item.definitionId)?'':String(item.definitionId))}>
            <div className="estimator-performance-title"><span><b>{item.name}</b><small>{item.key}</small></span><strong>{item.conversionRate}%</strong></div>
            <div className="estimator-progress"><i style={{width:Math.min(100,Math.max(0,item.conversionRate||0))+'%'}}/></div>
            <div className="estimator-performance-stats"><span><b>{compact(item.calculations)}</b> estimates</span><span><b>{compact(item.converted)}</b> quote requests</span><span><b>{money(item.averageMinimum)}–{money(item.averageMaximum)}</b> avg range</span></div>
          </button>):<div className="admin-funnel-empty">No estimator calculations in this period.</div>}
        </div>
      </article>

      <article className="admin-funnel-panel source-performance">
        <div className="admin-funnel-panel-head"><div><span>LEAD SOURCE</span><h2>Which customer path produces leads?</h2><p>Canonical lead output and paid marketplace activity by source.</p></div></div>
        <div className="source-performance-list">
          {sources.map(item=>{
            const copy=sourceCopy[item.source]||{label:item.source,description:'Customer funnel source'}
            const statusTotal=Object.values(item.statuses||{}).reduce((sum,value)=>sum+Number(value||0),0)
            return <div className={'source-performance-card '+(item.source==='public_estimator'?'estimator':'requirement')} key={item.source}>
              <div className="source-card-head"><span>{item.source==='public_estimator'?'₹':'⌁'}</span><div><strong>{copy.label}</strong><small>{copy.description}</small></div></div>
              <div className="source-card-numbers"><span><b>{compact(item.leads)}</b><small>leads</small></span><span><b>{compact(item.monetizedLeads)}</b><small>monetized</small></span><span><b>{money(item.paidSales)}</b><small>paid sales</small></span></div>
              <div className="source-statuses">{Object.entries(item.statuses||{}).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,5).map(([status,count])=><span key={status}><b>{count}</b> {status.replaceAll('_',' ')}</span>)}{!statusTotal&&<span>No leads in period</span>}</div>
            </div>
          })}
        </div>
      </article>
    </section>

    <section className="admin-funnel-grid secondary">
      <article className="admin-funnel-panel city-panel">
        <div className="admin-funnel-panel-head"><div><span>LOCATION SIGNAL</span><h2>Top estimator cities</h2><p>Where customers are completing estimates and requesting quotes.</p></div></div>
        <div className="admin-funnel-table-wrap compact"><table><thead><tr><th>City</th><th>Estimates</th><th>Quotes</th><th>Rate</th><th>Avg range</th></tr></thead><tbody>
          {cities.length?cities.map(city=><tr key={city.cityId}><td><strong>{city.cityName}</strong><small>{city.stateName||'—'}</small></td><td>{city.calculations}</td><td>{city.converted}</td><td><b className="rate-pill">{city.conversionRate}%</b></td><td>{money(city.averageMinimum)} – {money(city.averageMaximum)}</td></tr>):<tr><td colSpan="5" className="table-empty">No city data in this period.</td></tr>}
        </tbody></table></div>
      </article>

      <article className="admin-funnel-panel requirement-panel">
        <div className="admin-funnel-panel-head"><div><span>DIRECT REQUIREMENTS</span><h2>Requirement-form demand</h2><p>Build / Interior forms that became canonical leads directly.</p></div></div>
        <div className="requirement-flow-list">
          {requirements.length?requirements.map(item=><div key={item.flowKey}><span className="requirement-flow-icon">{item.flowKey==='build'?'⌂':item.flowKey==='design'?'◇':'⌁'}</span><div><strong>{item.flowKey==='build'?'Construction / Build':item.flowKey==='design'?'Interior / Design':item.flowKey}</strong><small>Latest {when(item.latestLeadAt)}</small></div><b>{item.leads}</b><small>{item.sold} sold</small></div>):<div className="admin-funnel-empty">No direct requirement leads in this period.</div>}
        </div>
      </article>
    </section>

    <section className="admin-funnel-panel history-panel">
      <div className="admin-funnel-panel-head history-head">
        <div><span>CALCULATION HISTORY</span><h2>Recent estimator activity</h2><p>Calculation history is read from the immutable estimator records. Customer contact details are not duplicated here.</p></div>
        <form className="funnel-search" onSubmit={submitSearch}><input value={queryInput} onChange={event=>setQueryInput(event.target.value)} placeholder="Search ID, PIN, city or estimator"/><button type="submit">Search</button>{query&&<button type="button" className="clear" onClick={()=>{setQueryInput('');setQuery('');setPage(1)}}>Clear</button>}</form>
      </div>
      <div className="admin-funnel-table-wrap"><table><thead><tr><th>Calculation</th><th>Estimator</th><th>Location</th><th>Range</th><th>Created</th><th>Quote request</th><th>Lead</th><th>Paid sales</th></tr></thead><tbody>
        {recent.items?.length?recent.items.map(item=><tr key={item.calculationId}>
          <td><code>{item.calculationId.slice(0,10)}…</code><small>v{item.versionNo}</small></td>
          <td><strong>{item.flowName}</strong><small>{item.flowKey}</small></td>
          <td><strong>{item.cityName||'—'}</strong><small>{[item.stateName,item.pincode].filter(Boolean).join(' · ')||'No mapped location'}</small></td>
          <td><strong>{money(item.minimum)} – {money(item.maximum)}</strong></td>
          <td>{when(item.createdAt)}</td>
          <td>{item.convertedAt?<><b className="conversion-pill yes">Converted</b><small>{when(item.convertedAt)}</small></>:<b className="conversion-pill no">Estimate only</b>}</td>
          <td>{item.leadId?<><Link to="/admin/leads">#{item.leadId}</Link><small>{item.leadStatus||item.leadSource||'linked'}</small></>:<span>—</span>}</td>
          <td><strong>{item.paidSales?money(item.paidSales):'—'}</strong>{item.paidPurchases>0&&<small>{item.paidPurchases} purchase{item.paidPurchases===1?'':'s'}</small>}</td>
        </tr>):<tr><td colSpan="8" className="table-empty">No calculations match these filters.</td></tr>}
      </tbody></table></div>
      <div className="funnel-pagination"><span>{recent.pagination?.total||0} calculations</span><div><button type="button" disabled={(recent.pagination?.page||1)<=1||state.loading} onClick={()=>setPage(value=>Math.max(1,value-1))}>← Previous</button><b>Page {recent.pagination?.page||1} of {recent.pagination?.pages||1}</b><button type="button" disabled={(recent.pagination?.page||1)>=(recent.pagination?.pages||1)||state.loading} onClick={()=>setPage(value=>value+1)}>Next →</button></div></div>
    </section>

    <div className="admin-funnel-footnote"><strong>Metric definition:</strong> “Paid lead sales” is the gross amount of paid marketplace purchases attached to customer-funnel leads created in the selected period. It is not Propulse net revenue, partner commission or investor allocation.</div>
  </main>
}
