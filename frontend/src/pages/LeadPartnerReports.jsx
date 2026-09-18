import { useEffect, useMemo, useState } from 'react'import LeadPartnerSidebar from '../components/LeadPartnerSidebar';
;
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import './LeadPartnerReports.css';

const REASONS={fake:'Fake / invalid lead',wrong_number:'Wrong number',not_interested:'Customer not interested',duplicate:'Duplicate lead',other:'Other'};
const STATUS={pending:'Pending review',verified_fake:'Verified fake',verified_genuine:'Verified genuine',rejected:'Rejected'};
const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const formatDate=v=>v?new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
const formatDateTime=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';

export default function LeadPartnerReports(){
  const navigate=useNavigate(); const location=useLocation(); const user=getUser();
  const [reports,setReports]=useState([]); const [reportSummary,setReportSummary]=useState({total_reports:0,reported_leads:0,pending:0,verified_fake:0,verified_genuine:0,rejected:0}); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const [filter,setFilter]=useState('all'); const [search,setSearch]=useState(''); const [selected,setSelected]=useState(null); const [refreshing,setRefreshing]=useState(false);
  const initials=useMemo(()=>(user?.name||'Lead Partner').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'LP',[user?.name]);

  async function load(){try{setLoading(true);setError('');const data=await authRequest('/lead-partner/reports');setReports(Array.isArray(data?.data)?data.data:[]);setReportSummary(data?.summary||{total_reports:0,reported_leads:0,pending:0,verified_fake:0,verified_genuine:0,rejected:0})}catch(e){setError(e.message||'Unable to load reported leads')}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  async function refresh(){try{setRefreshing(true);await load()}finally{setRefreshing(false)}}
  function signOut(){clearSession();localStorage.removeItem('propulse_session_mode');navigate('/login',{replace:true})}

  const counts=useMemo(()=>{
    const statusOf=r=>String(r.status||'').trim().toLowerCase();
    return {
      all:reports.length,
      reported_leads:new Set(reports.map(r=>Number(r.lead_id)).filter(Number.isFinite)).size,
      pending:reports.filter(r=>statusOf(r)==='pending').length,
      verified_fake:reports.filter(r=>statusOf(r)==='verified_fake').length,
      verified_genuine:reports.filter(r=>statusOf(r)==='verified_genuine').length,
      rejected:reports.filter(r=>statusOf(r)==='rejected').length
    };
  },[reports]);
  const reasonCounts=useMemo(()=>Object.entries(REASONS).map(([key,label])=>({key,label,count:reports.filter(r=>r.reason===key).length})).filter(x=>x.count>0).sort((a,b)=>b.count-a.count),[reports]);
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return reports.filter(r=>{const text=[r.customer_name,r.customer_phone,r.industry_name,r.service_name,r.city_name,r.state_name,r.details,REASONS[r.reason]||r.reason,STATUS[r.status]||r.status].join(' ').toLowerCase();return (filter==='all'||r.status===filter)&&(!q||text.includes(q))})},[reports,filter,search]);

  function exportReport(){
    const headers=['Report ID','Lead ID','Customer','Phone','Industry','Service','Location','Reason','Report status','Lead status','Reported on','Reviewed on'];
    const rows=filtered.map(r=>[r.id,r.lead_id,r.customer_name||'',r.customer_phone||'',r.industry_name||'',r.service_name||'',[r.city_name,r.state_name].filter(Boolean).join(', '),REASONS[r.reason]||r.reason,STATUS[r.status]||r.status,r.lead_status||'',r.created_at||'',r.reviewed_at||'']);
    const csv=[headers,...rows].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='propulse-lead-reports.csv';a.click();URL.revokeObjectURL(a.href);
  }

  return <div className="reports-shell">
    <LeadPartnerSidebar user={user} onSignOut={signOut} />
    <main className="reports-main">
      <header className="reports-topbar"><div className="reports-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Reports</strong></div><div className="reports-top-status"><i/> Partner account</div></header>
      <div className="reports-content">
        <section className="reports-heading"><div><h1>Lead &amp; Earnings Reports</h1></div><button className="reports-export" type="button" onClick={exportReport}>⇩ Export Report</button></section>
        {error&&<div className="reports-alert">{error}<button onClick={load}>Retry</button></div>}
        <section className="reports-kpi-grid">
          <article><div className="reports-kpi-icon blue">▤</div><div><span>Reported Leads</span><strong>{loading?'—':counts.reported_leads}</strong><small>Leads reported by buyers / users</small></div></article>
          <article><div className="reports-kpi-icon green">✓</div><div><span>Verified Genuine</span><strong>{loading?'—':counts.verified_genuine}</strong><small>Reports reviewed as genuine</small></div></article>
          <article><div className="reports-kpi-icon red">!</div><div><span>Verified Fake</span><strong>{loading?'—':counts.verified_fake}</strong><small>Leads marked invalid after review</small></div></article>
          <article><div className="reports-kpi-icon orange">◷</div><div><span>Pending Review</span><strong>{loading?'—':counts.pending}</strong><small>Awaiting ProPulse review</small></div></article>
        </section>
        <section className="reports-analytics-grid">
          <article className="reports-card"><div className="reports-card-head"><div><h2>Report status</h2><p>Current review outcome of your reports</p></div></div><div className="reports-status-bars">
            {[['verified_fake','Verified fake',counts.verified_fake],['pending','Pending review',counts.pending],['verified_genuine','Verified genuine',counts.verified_genuine],['rejected','Rejected',counts.rejected]].map(([key,label,count])=><div key={key}><div><span>{label}</span><b>{count}</b></div><div className="reports-bar"><i className={key} style={{width:(counts.all?Math.max(3,(count/counts.all)*100):0)+'%'}}/></div></div>)}
          </div></article>
          <article className="reports-card"><div className="reports-card-head"><div><h2>Report reasons</h2><p>Why you reported leads</p></div></div>{reasonCounts.length?<div className="reports-reasons">{reasonCounts.map(x=><div key={x.key}><span className="reason-dot"/><span>{x.label}</span><b>{x.count}</b></div>)}</div>:<div className="reports-empty-mini">No reports submitted yet.</div>}</article>
        </section>
        <section className="reports-card reports-table-card">
          <div className="reports-card-head reports-table-head"><div><span className="reports-kicker">REPORTED LEADS</span><h2>Reported Leads</h2><p>Every lead you reported, together with the review outcome and lead status.</p></div><button className="reports-refresh" type="button" onClick={refresh} disabled={refreshing}>{refreshing?'Refreshing…':'↻ Refresh'}</button></div>
          <div className="reports-filter-row"><div className="reports-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search lead, customer, service, city, reason…"/></div><div className="reports-filter-tabs">{[['all','All'],['pending','Pending'],['verified_fake','Verified fake'],['verified_genuine','Genuine'],['rejected','Rejected']].map(([key,label])=><button type="button" key={key} className={filter===key?'active':''} onClick={()=>setFilter(key)}>{label}<b>{counts[key]}</b></button>)}</div></div>
          {loading?<div className="reports-loading">Loading reported leads…</div>:!filtered.length?<div className="reports-empty"><span>▥</span><strong>{reports.length?'No reports match your filters':'No reported leads yet'}</strong><p>{reports.length?'Change the search or status filter.':'When you report a purchased lead, its review and outcome will appear here.'}</p></div>:<div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>ID</th><th>DATE</th><th>LEAD</th><th>REPORTED BY</th><th>SERVICE</th><th>LOCATION</th><th>REASON</th><th>STATUS</th><th>LEAD OUTCOME</th><th>ACTION</th></tr></thead><tbody>
            {filtered.map(r=><tr key={r.id}><td><b>#R{r.id}</b><small>Lead #{r.lead_id}</small></td><td>{formatDate(r.created_at)}<small>{r.reviewed_at?('Reviewed '+formatDate(r.reviewed_at)):'Awaiting review'}</small></td><td><b>{r.customer_name||'Customer'}</b><small>{r.customer_phone||'Phone unavailable'}</small></td><td><b>{r.reporter_name||'User'}</b><small>{r.reporter_email||'—'}</small></td><td>{r.service_name||r.industry_name||'—'}</td><td>{[r.city_name,r.state_name].filter(Boolean).join(', ')||'—'}</td><td><span className="reason-pill">{REASONS[r.reason]||r.reason}</span></td><td><span className={'report-status-pill '+r.status}>{STATUS[r.status]||r.status}</span></td><td><span className={'lead-outcome-pill '+(r.lead_status||'')}>{r.lead_status==='invalid'?'Invalidated':r.lead_status||'—'}</span></td><td><button className="reports-view-btn" type="button" onClick={()=>setSelected(r)}>View</button></td></tr>)}
          </tbody></table></div>}
          {!loading&&filtered.length>0&&<div className="reports-table-footer">Showing <b>{filtered.length}</b> of <b>{reports.length}</b> reported lead{reports.length===1?'':'s'}</div>}
        </section>
      </div>
    </main>
    {selected&&<div className="report-detail-overlay" onClick={()=>setSelected(null)}><div className="report-detail-modal" onClick={e=>e.stopPropagation()}><button type="button" className="report-detail-close" onClick={()=>setSelected(null)}>×</button><span className="reports-kicker">REPORT #{selected.id}</span><h2>{selected.customer_name||'Reported lead'}</h2><div className="report-detail-status"><span className={'report-status-pill '+selected.status}>{STATUS[selected.status]||selected.status}</span><span className={'lead-outcome-pill '+(selected.lead_status||'')}>{selected.lead_status==='invalid'?'Lead invalidated':selected.lead_status||'Lead status unavailable'}</span></div><div className="report-detail-grid"><div><small>Lead ID</small><strong>#{selected.lead_id}</strong></div><div><small>Reason</small><strong>{REASONS[selected.reason]||selected.reason}</strong></div><div><small>Reported by</small><strong>{selected.reporter_name||'User'}{selected.reporter_email?' · '+selected.reporter_email:''}</strong></div><div><small>Service</small><strong>{selected.service_name||selected.industry_name||'—'}</strong></div><div><small>Location</small><strong>{[selected.city_name,selected.state_name].filter(Boolean).join(', ')||'—'}</strong></div><div><small>Reported</small><strong>{formatDateTime(selected.created_at)}</strong></div><div><small>Reviewed</small><strong>{formatDateTime(selected.reviewed_at)}</strong></div></div><div className="report-detail-section"><small>Your report details</small><p>{selected.details||'No additional details were provided.'}</p></div><div className="report-detail-section"><small>Outcome</small><p>{selected.status==='verified_fake'?'The lead was verified as fake/invalid and marked invalid. The existing refund and partner-earnings reversal workflow applies to the underlying lead purchase.':selected.status==='verified_genuine'?'The report was reviewed and the lead was not verified as fake.':'The report remains under review or was rejected; this report did not produce a fake-lead outcome.'}</p></div></div></div>}
  </div>
}
