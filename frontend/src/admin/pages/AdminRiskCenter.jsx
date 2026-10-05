import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {authRequest} from '../../utils/auth';
import './AdminRiskCenter.css';

const EVENT_LABELS={
  repeated_failed_login:'Repeated failed login',
  duplicate_payment_reference:'Duplicate UTR',
  rapid_lead_purchase:'Rapid lead purchase',
  rapid_payout_account_change:'Payout account changes',
  shared_payout_destination:'Shared payout destination'
};
const fmt=value=>value?new Date(value).toLocaleString():'—';
const sevRank={critical:4,high:3,medium:2,low:1};

function metadataSummary(event){
  const m=event?.metadata||{};
  if(event.event_type==='repeated_failed_login')return [m.emailHint,m.attempts?m.attempts+' attempts':null,m.sourceCount?m.sourceCount+' source(s)':null].filter(Boolean).join(' · ');
  if(event.event_type==='duplicate_payment_reference')return ['Fingerprint '+(m.fingerprint||'—'),m.existingPaymentId?'Existing payment #'+m.existingPaymentId:null,m.paymentId?'Attempted payment #'+m.paymentId:null].filter(Boolean).join(' · ');
  if(event.event_type==='rapid_lead_purchase')return [m.purchases?m.purchases+' purchases':null,m.windowMinutes?'within '+m.windowMinutes+' min':null,m.amount!=null?'₹'+Number(m.amount).toLocaleString('en-IN'):null].filter(Boolean).join(' · ');
  if(event.event_type==='rapid_payout_account_change')return [m.accountHint,m.changesIn30Days?m.changesIn30Days+' changes / 30 days':null,m.previousAgeHours!=null?'Previous account age '+m.previousAgeHours+'h':null].filter(Boolean).join(' · ');
  if(event.event_type==='shared_payout_destination')return [m.accountHint,m.sharedUserCount?m.sharedUserCount+' other user(s)':null,m.fingerprint?'Fingerprint '+m.fingerprint:null].filter(Boolean).join(' · ');
  return Object.entries(m).slice(0,4).map(([k,v])=>k+': '+String(v)).join(' · ');
}

export default function AdminRiskCenter(){
  const [data,setData]=useState({items:[],stats:{},types:[],page:1,pages:1,total:0});
  const [status,setStatus]=useState('open');
  const [severity,setSeverity]=useState('all');
  const [type,setType]=useState('all');
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(true);
  const [busyId,setBusyId]=useState(null);
  const [message,setMessage]=useState('');
  const searchRef=useRef(search);searchRef.current=search;

  const load=useCallback(async(nextPage=1)=>{
    setLoading(true);
    try{
      const params=new URLSearchParams({status,severity,type,page:String(nextPage),limit:'50'});
      const searchValue=searchRef.current.trim();
      if(searchValue)params.set('search',searchValue);
      const result=await authRequest('/admin/risk-center?'+params.toString());
      setData(result||{items:[],stats:{},types:[],page:1,pages:1,total:0});
      setPage(Number(result?.page||nextPage));
    }catch(e){setMessage(e.message||'Failed to load Risk Center')}
    finally{setLoading(false)}
  },[status,severity,type]);

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load(1)});return()=>{active=false}},[load]);

  const ordered=useMemo(()=>[...(data.items||[])].sort((a,b)=>(sevRank[b.severity]||0)-(sevRank[a.severity]||0)||new Date(b.last_seen_at)-new Date(a.last_seen_at)),[data.items]);

  const review=async(event,nextStatus)=>{
    const verb=nextStatus==='resolved'?'Resolve':'Dismiss';
    const note=window.prompt(verb+' this risk event — enter the Admin review note:','');
    if(note===null)return;
    if(!note.trim()){setMessage('A review note is required');return}
    setBusyId(event.id);
    try{
      await authRequest('/admin/risk-center/'+event.id,{method:'PATCH',body:JSON.stringify({status:nextStatus,note})});
      setMessage('Risk event '+nextStatus+'.');
      await load(page);
    }catch(e){setMessage(e.message||'Failed to review risk event')}
    finally{setBusyId(null)}
  };

  const stats=data.stats||{};
  return <main className="risk-center">
    <header className="risk-head">
      <div><span>SECURITY OPERATIONS</span><h1>Risk Center</h1><p>Consolidated fraud and abuse signals from authentication, payments, lead purchasing and payout destinations.</p></div>
      <button type="button" onClick={()=>load(page)} disabled={loading}>{loading?'Refreshing…':'Refresh'}</button>
    </header>

    {message&&<div className="risk-message">{message}<button onClick={()=>setMessage('')}>×</button></div>}

    <section className="risk-stats">
      <article><span>Open</span><strong>{stats.open||0}</strong><small>Needs review</small></article>
      <article className="critical"><span>Critical</span><strong>{stats.critical||0}</strong><small>Immediate attention</small></article>
      <article className="high"><span>High</span><strong>{stats.high||0}</strong><small>High-risk signals</small></article>
      <article className="medium"><span>Medium</span><strong>{stats.medium||0}</strong><small>Review recommended</small></article>
      <article><span>Last 24h</span><strong>{stats.last_24h||0}</strong><small>New or repeated</small></article>
    </section>

    <section className="risk-toolbar">
      <div className="risk-search"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')load(1)}} placeholder="Search user, email, title…"/><button onClick={()=>load(1)}>Search</button></div>
      <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="open">Open</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option><option value="all">All statuses</option></select>
      <select value={severity} onChange={e=>{setSeverity(e.target.value);setPage(1)}}><option value="all">All severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      <select value={type} onChange={e=>{setType(e.target.value);setPage(1)}}><option value="all">All signals</option>{(data.types||[]).map(x=><option key={x.event_type} value={x.event_type}>{EVENT_LABELS[x.event_type]||x.event_type} ({x.total})</option>)}</select>
    </section>

    <section className="risk-list">
      <div className="risk-list-head"><div><span>RISK EVENTS</span><h2>{data.total||0} matching event{Number(data.total||0)===1?'':'s'}</h2></div><small>Signals are indicators for review, not automatic accusations or account freezes.</small></div>
      {loading?<div className="risk-empty">Loading risk signals…</div>:!ordered.length?<div className="risk-empty">No risk events match the current filters.</div>:ordered.map(event=><article className={'risk-event '+event.severity} key={event.id}>
        <div className="risk-event-primary">
          <div className="risk-badges"><b className={'severity '+event.severity}>{event.severity}</b><b className={'state '+event.status}>{event.status}</b><span>{EVENT_LABELS[event.event_type]||event.event_type}</span></div>
          <h3>{event.title}</h3>
          <p>{event.summary}</p>
          <div className="risk-meta">{metadataSummary(event)||'No additional metadata'}</div>
        </div>
        <div className="risk-event-user">
          <span>LINKED USER</span>
          <strong>{event.user_name||'Unknown / unmatched'}</strong>
          <small>{event.user_email||'No linked account'}</small>
          {event.user_id&&<a href={'/admin/users?search='+encodeURIComponent(event.user_email||event.user_id)}>User #{event.user_id}</a>}
        </div>
        <div className="risk-event-time">
          <span>OCCURRENCES</span><strong>{event.occurrence_count||1}</strong>
          <small>First: {fmt(event.first_seen_at)}</small>
          <small>Last: {fmt(event.last_seen_at)}</small>
        </div>
        <div className="risk-event-review">
          {event.status==='open'?<>
            <button disabled={busyId===event.id} onClick={()=>review(event,'resolved')}>Resolve</button>
            <button className="secondary" disabled={busyId===event.id} onClick={()=>review(event,'dismissed')}>Dismiss</button>
          </>:<>
            <span>REVIEWED</span>
            <strong>{event.reviewed_by_name||'Admin'}</strong>
            <small>{fmt(event.reviewed_at)}</small>
            <small>{event.review_note||'—'}</small>
          </>}
        </div>
      </article>)}
    </section>

    {Number(data.pages||1)>1&&<nav className="risk-pagination">
      <button disabled={page<=1||loading} onClick={()=>{const p=page-1;setPage(p);load(p)}}>Previous</button>
      <span>Page {page} of {data.pages}</span>
      <button disabled={page>=data.pages||loading} onClick={()=>{const p=page+1;setPage(p);load(p)}}>Next</button>
    </nav>}
  </main>;
}
