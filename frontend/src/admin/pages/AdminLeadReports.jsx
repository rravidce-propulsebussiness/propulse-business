import { useCallback, useEffect, useMemo, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminLeadReports.css'

const STATUSES=[
  ['pending','Pending'],
  ['verified_fake','Verified fake'],
  ['verified_genuine','Verified genuine'],
  ['rejected','Rejected'],
  ['all','All']
]

const REASONS={
  fake:'Fake lead',
  wrong_number:'Wrong number',
  not_interested:'Customer not interested',
  duplicate:'Duplicate',
  other:'Other'
}

const STATUS_META={
  pending:{label:'Pending',className:'pending'},
  verified_fake:{label:'Verified fake',className:'fake'},
  verified_genuine:{label:'Verified genuine',className:'genuine'},
  rejected:{label:'Rejected',className:'rejected'}
}

function Icon({name}){
  const paths={
    pending:<><path d="M7 3h7l3 3v15H7z"/><path d="M14 3v4h4"/><circle cx="16.5" cy="16.5" r="3.5"/><path d="M16.5 14.8v2l1.3.8"/></>,
    genuine:<><path d="M12 3l7 3v5c0 4.7-2.7 8-7 10-4.3-2-7-5.3-7-10V6z"/><path d="M8.8 12.3l2 2 4.4-4.6"/></>,
    fake:<><path d="M12 3l7 3v5c0 4.7-2.7 8-7 10-4.3-2-7-5.3-7-10V6z"/><path d="M9.5 9.5l5 5m0-5l-5 5"/></>,
    rejected:<><circle cx="12" cy="12" r="8"/><path d="M7.3 7.3l9.4 9.4"/></>,
    repeat:<><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.8 18c.8-3 2.5-4.5 5.2-4.5s4.4 1.5 5.2 4.5M14 14.4c2.8 0 4.6 1.2 5.4 3.6"/></>,
    all:<><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
    search:<><circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l5 5"/></>,
    list:<><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h1m3 0h5M8 13h1m3 0h5M8 17h1m3 0h5"/></>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export default function AdminLeadReports(){
  const [status,setStatus]=useState('pending')
  const [data,setData]=useState({data:[],summary:{},pagination:{}})
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(null)
  const [message,setMessage]=useState('')
  const [search,setSearch]=useState('')

  const load=useCallback(async()=>{
    try{
      setLoading(true)
      setError('')
      setData(await authRequest(`/lead-reports/admin?status=${status}`))
    }catch(e){
      setError(e.message||'Failed to load reports')
    }finally{
      setLoading(false)
    }
  },[status])

  useEffect(()=>{
    let active=true
    queueMicrotask(()=>{if(active)load()})
    return()=>{active=false}
  },[load])

  async function review(id,nextStatus){
    try{
      setBusy(id);setMessage('');setError('')
      await authRequest(`/lead-reports/admin/${id}`,{method:'PATCH',body:JSON.stringify({status:nextStatus})})
      setMessage(`Report #${id} marked ${nextStatus.replace('_',' ')}.`)
      await load()
    }catch(e){
      setError(e.message||'Failed to review report')
    }finally{
      setBusy(null)
    }
  }

  async function setControl(userId,canReportLeads){
    try{
      setBusy(`user-${userId}`);setMessage('');setError('')
      await authRequest(`/lead-reports/admin/user/${userId}/control`,{method:'PATCH',body:JSON.stringify({canReportLeads,reason:canReportLeads?null:'Lead reporting disabled by admin'})})
      setMessage(canReportLeads?'Reporting re-enabled for this user.':'Reporting disabled for this user.')
      await load()
    }catch(e){
      setError(e.message||'Failed to update reporting control')
    }finally{
      setBusy(null)
    }
  }

  const summary=data.summary||{}
  const metrics=[
    {key:'pending',label:'Pending Reports',value:summary.pending||0,icon:'pending',className:'pending'},
    {key:'verified_genuine',label:'Verified Genuine',value:summary.verified_genuine||0,icon:'genuine',className:'genuine'},
    {key:'verified_fake',label:'Verified Fake',value:summary.verified_fake||0,icon:'fake',className:'fake'},
    {key:'rejected',label:'Rejected',value:summary.rejected||0,icon:'rejected',className:'rejected'},
    {key:'repeat_reporters',label:'Repeat Reporters',value:summary.repeat_reporters||0,icon:'repeat',className:'repeat'}
  ]

  const rows=useMemo(()=>{
    const q=search.trim().toLowerCase()
    if(!q)return data.data||[]
    return (data.data||[]).filter(row=>[
      row.id,row.lead_id,row.customer_name,row.industry_name,row.reporter_name,row.reporter_email,
      REASONS[row.reason]||row.reason,row.details,row.status
    ].some(value=>String(value??'').toLowerCase().includes(q)))
  },[data.data,search])

  return <section className="lead-reports-page">
    <div className="lead-report-metrics">
      {metrics.map(metric=><article key={metric.key} className={`lead-report-metric ${metric.className}`}>
        <div className="lead-report-metric-icon"><Icon name={metric.icon}/></div>
        <div className="lead-report-metric-copy">
          <strong>{loading?'—':Number(metric.value).toLocaleString('en-IN')}</strong>
          <span>{metric.label}</span>
        </div>
      </article>)}
    </div>

    <div className="lead-report-tabs" role="tablist" aria-label="Lead report status">
      {STATUSES.map(([value,label])=>{
        const icon=value==='verified_fake'?'fake':value==='verified_genuine'?'genuine':value==='all'?'all':value
        return <button key={value} type="button" className={status===value?'active':''} onClick={()=>setStatus(value)} role="tab" aria-selected={status===value}>
          <Icon name={icon}/><span>{label}</span>
        </button>
      })}
    </div>

    {error&&<div className="lead-report-alert error">{error}</div>}
    {message&&<div className="lead-report-alert success">{message}</div>}

    <section className="lead-report-workspace">
      <div className="lead-report-workspace-head">
        <div className="lead-report-workspace-title">
          <span className="lead-report-workspace-icon"><Icon name="list"/></span>
          <div><h2>Customer Reports</h2><p>Customer-submitted lead quality reviews and reporting controls.</p></div>
        </div>
        <label className="lead-report-search">
          <Icon name="search"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reports..." aria-label="Search reports"/>
          {search&&<button type="button" onClick={()=>setSearch('')} aria-label="Clear report search">×</button>}
        </label>
      </div>

      {loading?<div className="lead-report-loading"><span/><span/><span/></div>:!rows.length?
        <div className="lead-report-empty">
          <div className="lead-report-empty-art">
            <span className="paper back"/>
            <span className="paper front"><i/><i/><i/></span>
            <b>!</b>
          </div>
          <h3>{search?'No matching reports':'No reports in this view'}</h3>
          <p>{search?'Try a different search term or status filter.':'There are no customer reports in the selected category right now.'}</p>
        </div>
      :
        <div className="lead-report-table-wrap">
          <table className="lead-report-table">
            <thead><tr><th>REPORT</th><th>LEAD</th><th>REPORTER</th><th>REASON</th><th>DETAILS</th><th>STATUS</th><th>ACTION</th></tr></thead>
            <tbody>{rows.map(row=>{
              const enabled=row.can_report_leads!==false
              const controlBusy=busy===`user-${row.reporter_user_id}`
              const meta=STATUS_META[row.status]||{label:row.status,className:'neutral'}
              return <tr key={row.id}>
                <td><span className="report-id">#{row.id}</span></td>
                <td><div className="report-primary">#{row.lead_id} · {row.customer_name||'Customer'}</div><div className="report-secondary">{row.industry_name||'—'} · {row.lead_status||'—'}</div></td>
                <td><div className="report-primary">{row.reporter_name||'User'}</div><div className="report-secondary">{row.reporter_email||'—'}</div><div className={`report-access ${enabled?'enabled':'disabled'}`}>{enabled?'Reporting enabled':'Reporting disabled'} · False reports: {row.false_report_count||0}</div></td>
                <td><span className="report-reason">{REASONS[row.reason]||row.reason}</span></td>
                <td><div className="report-details">{row.details||'—'}</div></td>
                <td><span className={`report-status ${meta.className}`}>{meta.label}</span></td>
                <td>{row.status==='pending'?
                  <div className="report-actions">
                    <button className="fake" disabled={busy===row.id} onClick={()=>review(row.id,'verified_fake')}>Verify fake</button>
                    <button className="genuine" disabled={busy===row.id} onClick={()=>review(row.id,'verified_genuine')}>Genuine</button>
                    <button className="reject" disabled={busy===row.id} onClick={()=>review(row.id,'rejected')}>Reject</button>
                  </div>
                :
                  <button className={`report-control-btn ${enabled?'disable':'enable'}`} disabled={controlBusy} onClick={()=>setControl(row.reporter_user_id,!enabled)}>{controlBusy?'Updating…':enabled?'Disable reporting':'Enable reporting'}</button>
                }</td>
              </tr>
            })}</tbody>
          </table>
        </div>
      }
    </section>
  </section>
}
