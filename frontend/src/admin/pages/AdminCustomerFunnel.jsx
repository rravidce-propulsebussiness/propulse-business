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
  public_requirement:{label:'Direct requirements',description:'Customers who submitted a structured Build or Interior requirement.',icon:'⌁'},
  public_estimator:{label:'Estimator leads',description:'Completed estimator journeys become canonical leads immediately; contact-pending estimates stay on safe hold until quotes are requested.',icon:'₹'},
}
const periods=[['7','7D'],['30','30D'],['90','90D'],['365','1Y'],['all','ALL']]

function Kpi({icon,eyebrow,value,label,note,tone='blue'}){
  return <article className={'premium-kpi '+tone}>
    <div className="premium-kpi-top"><span className="premium-kpi-icon">{icon}</span><small>{eyebrow}</small></div>
    <strong>{value}</strong>
    <b>{label}</b>
    <p>{note}</p>
  </article>
}

function FlowJourney({flow}){
  const icon=flow.flowType==='estimator'?'₹':'⌁'
  return <article className={'journey-card '+(flow.flowType==='estimator'?'estimator':'requirement')}>
    <div className="journey-card-head">
      <div className="journey-title"><span>{icon}</span><div><small>{flow.flowType==='estimator'?'ESTIMATOR JOURNEY':'REQUIREMENT JOURNEY'}</small><h3>{flow.flowName}</h3><code>{flow.flowKey}</code></div></div>
      <div className="journey-result"><strong>{flow.completionRate||0}%</strong><span>open → final submit</span></div>
    </div>

    <div className="journey-acquisition">
      <div><small>Homepage CTA</small><strong>{compact(flow.homepageCtaSessions)}</strong></div>
      <span>→</span>
      <div><small>Reached wizard</small><strong>{compact(flow.homepageHandoffSessions)}</strong></div>
      <b>{flow.homepageHandoffRate||0}% handoff</b>
      <p>Homepage handoff counts sessions that clicked this flow on the homepage and subsequently opened the same wizard.</p>
    </div>

    <div className="journey-stages">
      {(flow.stages||[]).map((stage,index)=>{
        const first=index===0
        return <div className="journey-stage-wrap" key={stage.key}>
          {!first&&<div className="journey-drop"><span>−{stage.dropOff}</span><small>{stage.dropOffRate}% drop</small></div>}
          <div className="journey-stage">
            <div className="journey-stage-number">{String(index+1).padStart(2,'0')}</div>
            <div className="journey-stage-copy"><small>{stage.label}</small><strong>{compact(stage.sessions)}</strong><span>{first?'Entry stage':stage.stepRate+'% from previous'}</span></div>
            <div className="journey-stage-ring" style={{'--stage':Math.min(100,Math.max(0,stage.retentionRate||0))+'%'}}><b>{Math.round(stage.retentionRate||0)}%</b></div>
          </div>
        </div>
      })}
    </div>
  </article>
}

function QuestionDropoffCard({flow}){
  const highestKey=flow.highestDropOff?.questionKey
  return <article className={'question-friction-card '+(flow.flowType==='estimator'?'estimator':'requirement')}>
    <div className="question-friction-head">
      <div><span>{flow.flowType==='estimator'?'₹':'⌁'}</span><div><small>{flow.flowType==='estimator'?'ESTIMATOR QUESTIONS':'REQUIREMENT QUESTIONS'}</small><h3>{flow.flowName}</h3><code>{flow.flowKey}</code></div></div>
      <div className="question-friction-summary"><strong>{flow.questionsTracked||0}</strong><span>questions observed</span>{flow.highestDropOff&&<small>{flow.highestDropOff.dropOffRate}% highest observed drop</small>}</div>
    </div>
    <div className="question-friction-list">
      {(flow.questions||[]).map(question=>{
        const position=question.firstPosition===question.lastPosition
          ? 'Step '+question.firstPosition
          : 'Steps '+question.firstPosition+'–'+question.lastPosition
        const highest=highestKey===question.questionKey&&question.viewed>0
        return <div className={'question-friction-row '+(highest?'highest':'')} key={question.questionKey}>
          <div className="question-friction-position"><b>{String(question.firstPosition||0).padStart(2,'0')}</b><small>{position}</small></div>
          <div className="question-friction-copy"><div><strong>{question.label}</strong>{highest&&<em>Highest observed drop</em>}</div><small><code>{question.questionKey}</code>{question.questionType?' · '+question.questionType.replaceAll('_',' '):''}</small><div className="question-friction-bar"><i style={{width:Math.min(100,Math.max(0,question.completionRate||0))+'%'}}/></div></div>
          <div className="question-friction-stat"><strong>{compact(question.viewed)}</strong><span>viewed</span></div>
          <div className="question-friction-stat"><strong>{compact(question.completed)}</strong><span>completed</span></div>
          <div className="question-friction-stat abandon"><strong>{compact(question.abandoned)}</strong><span>left here</span></div>
          <div className="question-friction-rate"><strong>{question.completionRate||0}%</strong><span>completion</span><small>{question.dropOffRate||0}% drop</small></div>
        </div>
      })}
    </div>
  </article>
}

function SourceCard({item}){
  const copy=sourceCopy[item.source]||{label:item.source,description:'Customer funnel source',icon:'◈'}
  const statuses=Object.entries(item.statuses||{}).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,5)
  return <article className={'source-premium '+(item.source==='public_estimator'?'estimator':'requirement')}>
    <div className="source-premium-head"><span>{copy.icon}</span><div><small>{item.source==='public_estimator'?'ESTIMATE → QUOTE':'DIRECT FORM'}</small><h3>{copy.label}</h3><p>{copy.description}</p></div></div>
    <div className="source-premium-metrics">
      <div><strong>{compact(item.leads)}</strong><span>Canonical leads</span></div>
      <div><strong>{compact(item.monetizedLeads)}</strong><span>Monetized leads</span></div>
      <div><strong>{money(item.paidSales)}</strong><span>Gross paid sales</span></div>
    </div>
    <div className="source-premium-statuses">{statuses.length?statuses.map(([status,count])=><span key={status}><b>{count}</b>{status.replaceAll('_',' ')}</span>):<span>No leads in this period</span>}</div>
    <Link className="source-premium-link" to={'/admin/leads?source='+encodeURIComponent(item.source)}>View these leads <span>→</span></Link>
  </article>
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
  const tracking=data.journeyTracking||{}
  const trackedFlows=Array.isArray(tracking.flows)?tracking.flows:[]
  const questionDropoff=Array.isArray(data.questionDropoff)?data.questionDropoff:[]
  const recent=data.recent||{items:[],pagination:{page:1,pages:1,total:0}}
  const recentCustomerLeads=Array.isArray(data.recentCustomerLeads)?data.recentCustomerLeads:[]
  const selectedFlow=useMemo(()=>definitions.find(item=>String(item.id)===String(flowId)),[definitions,flowId])
  const periodLabel=period==='all'?'All time':period==='365'?'Last year':`Last ${period} days`

  function changePeriod(value){setPeriod(value);setPage(1)}
  function changeFlow(value){setFlowId(value);setPage(1)}
  function changeConversion(value){setConversion(value);setPage(1)}
  function submitSearch(event){event.preventDefault();setQuery(queryInput.trim());setPage(1)}

  return <main className="admin-funnel-page premium">
    <section className="funnel-command">
      <div className="funnel-command-copy">
        <div className="funnel-live-pill"><i/>FIRST-PARTY FUNNEL INTELLIGENCE</div>
        <h1>Estimator &amp; customer funnel</h1>
        <p>Follow customer intent from project entry to completed estimate, canonical lead capture and downstream paid lead activity.</p>
        <div className="funnel-command-badges">
          <span><b>{compact(tracking.uniqueSessions||0)}</b> tracked sessions</span>
          <span><b>{compact(summary.calculations||0)}</b> completed estimates</span>
          <span><b>{summary.conversionRate||0}%</b> estimate → quote</span>
          <span><b>{money(summary.paidLeadSales||0)}</b> gross paid lead sales</span>
        </div>
      </div>
      <div className="funnel-command-side">
        <div className="tracking-window"><small>TRACKING WINDOW</small><strong>{periodLabel}</strong><span>{tracking.trackingStartedAt?'First event '+when(tracking.trackingStartedAt):'Event tracking begins after this release is deployed'}</span></div>
        <div className="funnel-command-actions">
          <Link to="/admin/customer-flows"><span>⌘</span><div><b>Customer Flows</b><small>Questions, rates &amp; versions</small></div></Link>
          <button type="button" onClick={()=>setRefresh(value=>value+1)} disabled={state.loading}><span>↻</span><div><b>{state.loading?'Refreshing…':'Refresh now'}</b><small>Read canonical data</small></div></button>
        </div>
      </div>
    </section>

    {state.error&&<div className="admin-funnel-alert"><span>{state.error}</span><button type="button" onClick={()=>setRefresh(value=>value+1)}>Retry</button></div>}

    <section className="funnel-control-bar">
      <div className="funnel-period-control"><small>PERIOD</small><div>{periods.map(([value,label])=><button type="button" key={value} className={period===value?'active':''} onClick={()=>changePeriod(value)}>{label}</button>)}</div></div>
      <label><span>Estimator</span><select value={flowId} onChange={event=>changeFlow(event.target.value)}><option value="">All estimators</option>{definitions.map(item=><option key={item.id} value={item.id}>{item.name}{item.isActive?'':' (inactive)'}</option>)}</select></label>
      <label><span>Calculation history</span><select value={conversion} onChange={event=>changeConversion(event.target.value)}><option value="all">All calculations</option><option value="converted">Lead captured</option><option value="unconverted">Legacy estimate only</option></select></label>
      <div className="funnel-control-status"><i className={state.loading?'loading':''}/><span>{state.loading?'Updating dashboard':'Live from canonical tables'}</span></div>
    </section>

    <section className="premium-kpi-grid">
      <Kpi icon="◎" eyebrow="ESTIMATE DEMAND" value={compact(summary.calculations)} label="Calculations completed" note={selectedFlow?selectedFlow.name:'All published estimator flows'} tone="blue"/>
      <Kpi icon="↗" eyebrow="QUOTE INTENT" value={compact(summary.converted)} label="Actual quotes requested" note={`${summary.conversionRate||0}% of completed estimates converted`} tone="orange"/>
      <Kpi icon="⌁" eyebrow="DIRECT DEMAND" value={compact(summary.directRequirementLeads)} label="Requirement-form leads" note="Build / Interior submissions that skipped the estimator path" tone="green"/>
      <Kpi icon="◈" eyebrow="CANONICAL OUTPUT" value={compact(summary.customerFunnelLeads)} label="Customer-funnel leads" note={`${compact(summary.monetizedLeads)} later produced a paid marketplace purchase`} tone="purple"/>
      <Kpi icon="₹" eyebrow="MARKETPLACE VALUE" value={money(summary.paidLeadSales)} label="Gross paid lead sales" note="Attributed sales amount, not Propulse net revenue or commission" tone="navy"/>
    </section>

    <section className="premium-section journey-intelligence">
      <div className="premium-section-head">
        <div><span>JOURNEY INTELLIGENCE</span><h2>Where customers continue — and where they drop.</h2><p>Unique anonymous sessions per stage. Contact details and answer values are never stored in funnel events.</p></div>
        <div className="tracking-summary">
          <div><strong>{compact(tracking.homepageCtaSessions||0)}</strong><span>Homepage CTA sessions</span></div>
          <div><strong>{compact(tracking.wizardOpenSessions||0)}</strong><span>Wizard-open sessions</span></div>
          <div><strong>{compact(tracking.events||0)}</strong><span>Safe funnel events</span></div>
        </div>
      </div>
      <div className="journey-grid">
        {trackedFlows.length?trackedFlows.map(flow=><FlowJourney key={(flow.flowKey||'unknown')+'-'+flow.flowType} flow={flow}/>):<div className="premium-empty">
          <span>◎</span><h3>Journey tracking is ready.</h3><p>Stage metrics will appear here after customers use the homepage, requirement forms and estimators on this release.</p>
        </div>}
      </div>
    </section>

    <section className="premium-section question-friction-section">
      <div className="premium-section-head">
        <div><span>QUESTION FRICTION MAP</span><h2>Which question makes customers stop?</h2><p>Views and completions use anonymous sessions and configured question keys only. Customer answer values are never copied into analytics.</p></div>
        <Link className="question-config-link" to="/admin/customer-flows">Edit questions <span>→</span></Link>
      </div>
      <div className="question-friction-grid">
        {questionDropoff.length?questionDropoff.map(flow=><QuestionDropoffCard key={(flow.flowKey||'unknown')+'-'+flow.flowType} flow={flow}/>):<div className="premium-empty">
          <span>⌁</span><h3>Question diagnostics are ready.</h3><p>After customers move through the updated wizards, this section will show which configured questions are viewed, completed or abandoned.</p>
        </div>}
      </div>
    </section>

    <section className="premium-section">
      <div className="premium-section-head">
        <div><span>LEAD SOURCE &amp; MONETIZATION</span><h2>Which customer path produces leads?</h2><p>Canonical lead output and gross paid marketplace sales by customer acquisition path.</p></div>
      </div>
      <div className="source-premium-grid">{sources.map(item=><SourceCard key={item.source} item={item}/>)}</div>
    </section>

    <section className="premium-two-column">
      <article className="premium-panel estimator-performance-premium">
        <div className="premium-panel-head"><div><span>ESTIMATOR PERFORMANCE</span><h3>Estimate → customer lead capture</h3><p>Tracks completed estimates that are attached to a canonical customer lead with contact details.</p></div><b>{periodLabel}</b></div>
        <div className="estimator-premium-list">
          {estimators.length?estimators.map(item=><button type="button" key={item.definitionId} className={String(flowId)===String(item.definitionId)?'selected':''} onClick={()=>changeFlow(String(flowId)===String(item.definitionId)?'':String(item.definitionId))}>
            <div className="estimator-premium-title"><span><strong>{item.name}</strong><small>{item.key}</small></span><em>{item.conversionRate}%</em></div>
            <div className="estimator-premium-bar"><i style={{width:Math.min(100,Math.max(0,item.conversionRate||0))+'%'}}/></div>
            <div className="estimator-premium-metrics"><span><b>{compact(item.calculations)}</b> calculations</span><span><b>{compact(item.converted)}</b> leads captured</span><span><b>{money(item.averageMinimum)} – {money(item.averageMaximum)}</b> average range</span></div>
          </button>):<div className="premium-empty small"><p>No estimator calculations match this period.</p></div>}
        </div>
      </article>

      <article className="premium-panel city-premium-panel">
        <div className="premium-panel-head"><div><span>LOCATION SIGNAL</span><h3>Top estimator cities</h3><p>Where customer estimate and lead activity is appearing.</p></div></div>
        <div className="premium-table-wrap city-table"><table><thead><tr><th>City</th><th>Estimates</th><th>Leads</th><th>Capture rate</th><th>Average range</th></tr></thead><tbody>
          {cities.length?cities.map(city=><tr key={city.cityId}><td><strong>{city.cityName}</strong><small>{city.stateName||'—'}</small></td><td>{city.calculations}</td><td>{city.converted}</td><td><b className="premium-rate-pill">{city.conversionRate}%</b></td><td>{money(city.averageMinimum)} – {money(city.averageMaximum)}</td></tr>):<tr><td colSpan="5" className="table-empty">No location data in this period.</td></tr>}
        </tbody></table></div>
      </article>
    </section>

    <section className="premium-two-column demand-row">
      <article className="premium-panel">
        <div className="premium-panel-head"><div><span>DIRECT REQUIREMENTS</span><h3>Build &amp; Interior demand</h3><p>Requirement-form submissions that became canonical leads directly.</p></div></div>
        <div className="direct-demand-list">
          {requirements.length?requirements.map(item=><div key={item.flowKey}><span className="direct-demand-icon">{item.flowKey==='build'?'⌂':item.flowKey==='design'?'◇':'⌁'}</span><div><strong>{item.flowKey==='build'?'Construction / Build':item.flowKey==='design'?'Interior / Design':item.flowKey}</strong><small>Latest lead {when(item.latestLeadAt)}</small></div><div className="direct-demand-number"><b>{item.leads}</b><span>leads</span></div><div className="direct-demand-number"><b>{item.sold}</b><span>sold</span></div></div>):<div className="premium-empty small"><p>No direct requirement leads in this period.</p></div>}
        </div>
      </article>
      <article className="premium-panel data-principles">
        <div className="premium-panel-head"><div><span>DATA PRINCIPLES</span><h3>Useful analytics without invasive tracking.</h3></div></div>
        <div className="data-principle-list">
          <div><span>01</span><p><b>No contact data</b>Event records never store customer names, phone numbers or email addresses.</p></div>
          <div><span>02</span><p><b>Question key, never answer</b>Analytics may store the configured question key and numeric step position, but never the customer’s answer value.</p></div>
          <div><span>03</span><p><b>First-party only</b>No third-party analytics SDK, pixels or session replay dependency.</p></div>
          <div><span>04</span><p><b>Canonical outcomes</b>Lead and paid-sales metrics still come from actual leads and lead purchases.</p></div>
        </div>
      </article>
    </section>

    <section className="premium-section customer-lead-ops">
      <div className="premium-section-head">
        <div><span>CUSTOMER LEAD OPERATIONS</span><h2>Recent customer-generated leads</h2><p>One operational queue for requirement forms and estimator journeys, showing contact readiness and canonical lead status before operational follow-up.</p></div>
        <Link className="question-config-link" to="/admin/leads">Open Manage Leads <span>→</span></Link>
      </div>
      <div className="customer-lead-ops-list">
        {recentCustomerLeads.length?recentCustomerLeads.map(item=>{
          const awaiting=item.source==='public_estimator'&&item.contactPending
          const href='/admin/leads?leadId='+encodeURIComponent(String(item.leadId))+'&source='+encodeURIComponent(item.source)+(awaiting?'&contactState=awaiting_contact':'')
          return <article className={'customer-lead-ops-row '+(awaiting?'awaiting':'ready')} key={item.leadId}>
            <div className="customer-lead-identity">
              <span className={'customer-lead-source '+(item.source==='public_estimator'?'estimator':'requirement')}>{item.source==='public_estimator'?'₹':'⌁'}</span>
              <div><small>{item.source==='public_estimator'?'ESTIMATOR':'REQUIREMENT FORM'} · LEAD #{item.leadId}</small><strong>{item.customerName||(awaiting?'Legacy estimator customer':'Customer')}</strong><span>{item.flowName||item.flowKey||'Customer flow'}{item.flowKey?' · '+item.flowKey:''}</span></div>
            </div>
            <div className="customer-lead-contact"><small>CONTACT</small><b className={awaiting?'pending':'ready'}>{awaiting?'Legacy: awaiting contact':'Contact ready'}</b><span>{awaiting?'Older estimate was created before mandatory contact capture':[item.hasPhone?'Phone':null,item.hasEmail?'Email':null].filter(Boolean).join(' + ')||'Contact captured'}</span></div>
            <div className="customer-lead-status"><small>LEAD STATUS</small><b>{String(item.status||'unknown').replaceAll('_',' ')}</b><span>{item.qualityGateStatus?String(item.qualityGateStatus).replaceAll('_',' '):awaiting?'Legacy safe hold':'Canonical lead'}</span></div>
            <div className="customer-lead-context"><small>PROJECT</small><b>{item.serviceName||item.industryName||'Customer requirement'}</b><span>{[item.cityName,item.stateName,item.pincode].filter(Boolean).join(' · ')||'Location unavailable'}</span></div>
            <div className="customer-lead-value"><small>VALUE</small><b>{item.paidSales?money(item.paidSales):'—'}</b><span>{item.paidPurchases?item.paidPurchases+' paid purchase'+(item.paidPurchases===1?'':'s'):item.estimateMinimum!=null?money(item.estimateMinimum)+' – '+money(item.estimateMaximum):'Not monetized yet'}</span></div>
            <div className="customer-lead-time"><small>CREATED</small><b>{when(item.createdAt)}</b>{item.convertedAt&&<span>Lead captured {when(item.convertedAt)}</span>}</div>
            <Link className="customer-lead-open" to={href}>Open lead <span>→</span></Link>
          </article>
        }):<div className="premium-empty"><span>◈</span><h3>No customer leads in this window.</h3><p>Requirement-form and estimator-generated leads will appear here automatically.</p></div>}
      </div>
    </section>

    <section className="premium-section history-premium">
      <div className="premium-section-head history-head">
        <div><span>CALCULATION LEDGER</span><h2>Estimator history</h2><p>Immutable calculation records with version, location, customer lead linkage and saved pricing context.</p></div>
        <form className="premium-search" onSubmit={submitSearch}><input value={queryInput} onChange={event=>setQueryInput(event.target.value)} placeholder="Search ID, PIN, city or estimator"/><button type="submit">Search</button>{query&&<button type="button" className="clear" onClick={()=>{setQueryInput('');setQuery('');setPage(1)}}>Clear</button>}</form>
      </div>
      <div className="premium-table-wrap"><table><thead><tr><th>Calculation</th><th>Estimator</th><th>Location</th><th>Indicative range</th><th>Calculated</th><th>Lead capture</th><th>Canonical lead</th><th>Paid sales</th></tr></thead><tbody>
        {recent.items?.length?recent.items.map(item=><tr key={item.calculationId}>
          <td><code>{item.calculationId.slice(0,10)}…</code><small>Version {item.versionNo}</small></td>
          <td><strong>{item.flowName}</strong><small>{item.flowKey}</small></td>
          <td><strong>{item.cityName||'—'}</strong><small>{[item.stateName,item.pincode].filter(Boolean).join(' · ')||'No mapped location'}</small></td>
          <td><strong>{money(item.minimum)} – {money(item.maximum)}</strong></td>
          <td>{when(item.createdAt)}</td>
          <td>{item.convertedAt?<><b className="status-chip converted">Lead captured</b><small>{when(item.convertedAt)}</small></>:<b className="status-chip estimate">Legacy estimate only</b>}</td>
          <td>{item.leadId?<><Link to={'/admin/leads?leadId='+encodeURIComponent(String(item.leadId))+(item.leadSource?'&source='+encodeURIComponent(item.leadSource):'')+(item.leadSource==='public_estimator'&&!item.convertedAt?'&contactState=awaiting_contact':'')}>Lead #{item.leadId}</Link><small>{item.leadStatus||item.leadSource||'linked'}</small></>:<span>—</span>}</td>
          <td><strong>{item.paidSales?money(item.paidSales):'—'}</strong>{item.paidPurchases>0&&<small>{item.paidPurchases} purchase{item.paidPurchases===1?'':'s'}</small>}</td>
        </tr>):<tr><td colSpan="8" className="table-empty">No calculations match these filters.</td></tr>}
      </tbody></table></div>
      <div className="premium-pagination"><span>{recent.pagination?.total||0} calculations</span><div><button type="button" disabled={(recent.pagination?.page||1)<=1||state.loading} onClick={()=>setPage(value=>Math.max(1,value-1))}>← Previous</button><b>Page {recent.pagination?.page||1} of {recent.pagination?.pages||1}</b><button type="button" disabled={(recent.pagination?.page||1)>=(recent.pagination?.pages||1)||state.loading} onClick={()=>setPage(value=>value+1)}>Next →</button></div></div>
    </section>

    <div className="funnel-accounting-note"><span>i</span><p><strong>Accounting definition:</strong> “Gross paid lead sales” is the amount of paid marketplace purchases attached to customer-funnel leads created in the selected period. It is not Propulse net revenue, Lead Partner earnings, investor allocation or commission.</p></div>
  </main>
}
