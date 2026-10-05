import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {authRequest} from '../../utils/auth';
import './AdminAuditTimeline.css';

const CATEGORY_LABELS={account:'Accounts',payment:'Payments',membership:'Memberships',lead:'Leads',pricing:'Pricing',payout:'Payouts',security:'Security',system:'System'};
const ACTION_LABELS={
  'user.create_admin':'Admin created','user.activate':'Account activated','user.deactivate':'Account deactivated','user.change_role':'Role changed','user.update_profile':'Profile updated',
  'membership.assign_plan':'Membership assigned','membership.change_plan':'Membership plan changed','membership.update':'Membership updated',
  'payment.review':'Payment reviewed','lead.quality_gate_settings':'Quality gate settings changed','lead.quality_recheck':'Lead quality rechecked','lead.quarantine_override':'Quarantine overridden',
  'pricing.rule_create':'Pricing rule created','pricing.rule_update':'Pricing rule updated','pricing.rule_delete':'Pricing rule deleted','pricing.access_settings':'Buyer access defaults changed','pricing.partner_settings':'Lead Partner pricing settings changed',
  'payout.lead_partner_process':'Lead Partner payout processed','payout.lead_partner_direct':'Direct Lead Partner payout','payout.investor_process':'Investor payout processed',
  'security.risk_review':'Risk event reviewed','partner.status_change':'Lead Partner status changed','company_proof.review':'Company proof reviewed'
};
const fmt=value=>value?new Date(value).toLocaleString():'—';

function display(value){
  if(value===null||value===undefined)return '—';
  if(typeof value==='boolean')return value?'Yes':'No';
  if(typeof value==='object')return JSON.stringify(value);
  return String(value);
}
function ChangeList({changes=[]}){
  if(!Array.isArray(changes)||!changes.length)return <span className="audit-no-change">Snapshot recorded</span>;
  return <div className="audit-changes">{changes.slice(0,8).map((change,index)=><div key={change.field+'-'+index}><b>{String(change.field).replace(/_/g,' ')}</b><span>{display(change.before)}</span><i>→</i><strong>{display(change.after)}</strong></div>)}{changes.length>8&&<small>+{changes.length-8} more changed fields</small>}</div>;
}

export default function AdminAuditTimeline(){
  const [data,setData]=useState({items:[],stats:{},actions:[],entities:[],page:1,pages:1,total:0});
  const [category,setCategory]=useState('all');
  const [action,setAction]=useState('all');
  const [entityType,setEntityType]=useState('all');
  const [search,setSearch]=useState('');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const searchRef=useRef(search);searchRef.current=search;
  const fromRef=useRef(from);fromRef.current=from;
  const toRef=useRef(to);toRef.current=to;

  const load=useCallback(async(nextPage=1)=>{
    setLoading(true);
    try{
      const params=new URLSearchParams({category,action,entityType,page:String(nextPage),limit:'50'});
      const searchValue=searchRef.current.trim();
      const fromValue=fromRef.current;
      const toValue=toRef.current;
      if(searchValue)params.set('search',searchValue);
      if(fromValue)params.set('from',new Date(fromValue+'T00:00:00').toISOString());
      if(toValue)params.set('to',new Date(toValue+'T23:59:59').toISOString());
      const result=await authRequest('/admin/audit-timeline?'+params.toString());
      setData(result||{items:[],stats:{},actions:[],entities:[],page:1,pages:1,total:0});
      setPage(Number(result?.page||nextPage));
    }catch(e){setMessage(e.message||'Failed to load audit timeline')}
    finally{setLoading(false)}
  },[category,action,entityType]);

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load(1)});return()=>{active=false}},[load]);
  const actions=useMemo(()=>data.actions||[],[data.actions]);
  const stats=data.stats||{};

  return <main className="audit-page">
    <header className="audit-head">
      <div><span>ADMIN GOVERNANCE</span><h1>Critical Action Audit Timeline</h1><p>Trace who changed sensitive ProPulse configuration, money flows, memberships, leads, access controls and security reviews.</p></div>
      <button type="button" onClick={()=>load(page)} disabled={loading}>{loading?'Refreshing…':'Refresh'}</button>
    </header>

    {message&&<div className="audit-message">{message}<button onClick={()=>setMessage('')}>×</button></div>}

    <section className="audit-stats">
      <article><span>Today</span><strong>{stats.today||0}</strong><small>Admin actions today</small></article>
      <article><span>Financial</span><strong>{stats.financial||0}</strong><small>Payment + payout actions</small></article>
      <article><span>Access & Security</span><strong>{stats.access_security||0}</strong><small>Accounts, membership, security</small></article>
      <article><span>Lead & Pricing</span><strong>{stats.lead_pricing||0}</strong><small>Inventory and revenue controls</small></article>
      <article><span>Total</span><strong>{stats.total||0}</strong><small>Recorded critical actions</small></article>
    </section>

    <section className="audit-toolbar">
      <div className="audit-search"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')load(1)}} placeholder="Search actor, action, entity, reason…"/><button onClick={()=>load(1)}>Search</button></div>
      <select value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}}><option value="all">All categories</option>{Object.entries(CATEGORY_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
      <select value={action} onChange={e=>{setAction(e.target.value);setPage(1)}}><option value="all">All actions</option>{actions.filter(x=>category==='all'||x.category===category).map(x=><option key={x.action} value={x.action}>{ACTION_LABELS[x.action]||x.action} ({x.total})</option>)}</select>
      <select value={entityType} onChange={e=>{setEntityType(e.target.value);setPage(1)}}><option value="all">All entities</option>{(data.entities||[]).map(x=><option key={x.entity_type} value={x.entity_type}>{x.entity_type.replace(/_/g,' ')} ({x.total})</option>)}</select>
      <input type="date" value={from} onChange={e=>setFrom(e.target.value)} title="From date"/>
      <input type="date" value={to} onChange={e=>setTo(e.target.value)} title="To date"/>
      <button className="audit-apply" onClick={()=>load(1)}>Apply dates</button>
    </section>

    <section className="audit-list">
      <div className="audit-list-head"><div><span>IMMUTABLE HISTORY</span><h2>{data.total||0} matching action{Number(data.total||0)===1?'':'s'}</h2></div><small>Sensitive credentials, proof files, raw UTRs and full bank details are automatically redacted from snapshots.</small></div>
      {loading?<div className="audit-empty">Loading critical actions…</div>:!(data.items||[]).length?<div className="audit-empty">No audit records match the current filters.</div>:(data.items||[]).map(item=><article className={'audit-event '+item.category} key={item.id}>
        <div className="audit-main">
          <div className="audit-badges"><b>{CATEGORY_LABELS[item.category]||item.category}</b><span>{ACTION_LABELS[item.action]||item.action.replace(/[._]/g,' ')}</span></div>
          <h3>{ACTION_LABELS[item.action]||item.action.replace(/[._]/g,' ')}</h3>
          <p>{item.entity_type.replace(/_/g,' ')}{item.entity_id?' #'+item.entity_id:''}</p>
          {item.reason&&<div className="audit-reason"><b>Reason</b>{item.reason}</div>}
          <ChangeList changes={item.metadata?.changes||[]}/>
        </div>
        <div className="audit-actor"><span>ACTOR</span><strong>{item.actor_name||'System / unknown'}</strong><small>{item.actor_email||'No actor account'}</small>{item.actor_user_id&&<a href={'/admin/users?search='+encodeURIComponent(item.actor_email||item.actor_user_id)}>Admin/User #{item.actor_user_id}</a>}</div>
        <div className="audit-context"><span>CONTEXT</span><strong>{item.source||'application'}</strong><small>{fmt(item.created_at)}</small>{item.request_id&&<small>Request: {item.request_id}</small>}</div>
      </article>)}
    </section>

    {Number(data.pages||1)>1&&<nav className="audit-pagination"><button disabled={page<=1||loading} onClick={()=>{const p=page-1;setPage(p);load(p)}}>Previous</button><span>Page {page} of {data.pages}</span><button disabled={page>=data.pages||loading} onClick={()=>{const p=page+1;setPage(p);load(p)}}>Next</button></nav>}
  </main>;
}
