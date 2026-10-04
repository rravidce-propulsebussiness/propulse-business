import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {authRequest,clearSession,getUser} from '../utils/auth';
import UserHeader from '../components/UserHeader';
import LeadPartnerSidebar from '../components/LeadPartnerSidebar';
import './Notifications.css';

const CATEGORY_LABELS={all:'All',payment:'Payments',wallet:'Wallet',lead:'Leads',membership:'Membership',payout:'Payouts',security:'Security',system:'System',sheet:'Google Sheets'};
const fmt=value=>value?new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—';

function NotificationContent(){
  const [data,setData]=useState({items:[],unread:0,total:0,page:1,pages:1});
  const [category,setCategory]=useState('all');
  const [unreadOnly,setUnreadOnly]=useState(false);
  const [page,setPage]=useState(1);
  const [prefs,setPrefs]=useState({email_enabled:true});
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');

  const load=async(nextPage=page)=>{
    setLoading(true);
    try{
      const params=new URLSearchParams({category,unreadOnly:String(unreadOnly),page:String(nextPage),limit:'30'});
      const result=await authRequest('/notifications?'+params.toString());
      setData(result||{items:[],unread:0,total:0,page:1,pages:1});
      setPage(Number(result?.page||nextPage));
      window.dispatchEvent(new Event('propulse-notifications-refresh'));
    }catch(e){setMessage(e.message||'Failed to load notifications')}
    finally{setLoading(false)}
  };
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load(1)});return()=>{active=false}},[category,unreadOnly]);
  useEffect(()=>{authRequest('/notifications/preferences').then(setPrefs).catch(()=>{})},[]);

  const markRead=async item=>{
    if(item.read_at)return;
    await authRequest('/notifications/'+item.id+'/read',{method:'PATCH'});
    setData(v=>({...v,unread:Math.max(0,Number(v.unread||0)-1),items:v.items.map(x=>x.id===item.id?{...x,read_at:new Date().toISOString()}:x)}));
    window.dispatchEvent(new Event('propulse-notifications-refresh'));
  };
  const openItem=async item=>{await markRead(item);if(item.action_url)window.location.assign(item.action_url)};
  const markAll=async()=>{await authRequest('/notifications/read-all',{method:'POST'});await load(page)};
  const toggleEmail=async()=>{
    const next=!prefs.email_enabled;
    try{const result=await authRequest('/notifications/preferences',{method:'PUT',body:JSON.stringify({emailEnabled:next})});setPrefs(result);setMessage(next?'Email notifications enabled.':'Email notifications disabled.')}
    catch(e){setMessage(e.message||'Failed to update email preference')}
  };

  return <div className="notifications-center">
    <header className="notifications-hero"><div><span>ACCOUNT UPDATES</span><h1>Notifications</h1><p>Payments, wallet activity, lead access, memberships, payouts, security and sync alerts in one place.</p></div><div className="notifications-hero-actions"><button onClick={markAll} disabled={!data.unread}>Mark all read</button><label><input type="checkbox" checked={Boolean(prefs.email_enabled)} onChange={toggleEmail}/><span>Email notifications</span></label></div></header>
    {message&&<div className="notifications-message">{message}<button onClick={()=>setMessage('')}>×</button></div>}
    <section className="notifications-summary"><article><span>Unread</span><strong>{data.unread||0}</strong><small>Needs your attention</small></article><article><span>Matching</span><strong>{data.total||0}</strong><small>Current filters</small></article><article><span>Email</span><strong>{prefs.email_enabled?'ON':'OFF'}</strong><small>Transactional delivery</small></article></section>
    <section className="notifications-toolbar"><div className="notifications-categories">{Object.entries(CATEGORY_LABELS).map(([key,label])=><button key={key} className={category===key?'active':''} onClick={()=>{setCategory(key);setPage(1)}}>{label}</button>)}</div><label className="notifications-unread-toggle"><input type="checkbox" checked={unreadOnly} onChange={e=>setUnreadOnly(e.target.checked)}/> Unread only</label></section>
    <section className="notifications-list">
      {loading?<div className="notifications-empty">Loading notifications…</div>:!(data.items||[]).length?<div className="notifications-empty">No notifications match these filters.</div>:(data.items||[]).map(item=><article key={item.id} className={'notification-row '+item.severity+' '+(item.read_at?'read':'unread')} onClick={()=>openItem(item)}>
        <i/><div className="notification-row-main"><div className="notification-row-top"><strong>{item.title}</strong><span>{fmt(item.created_at)}</span></div><p>{item.message}</p><div className="notification-row-meta"><b>{CATEGORY_LABELS[item.category]||item.category}</b>{!item.read_at&&<em>NEW</em>}{item.action_url&&<span>Open →</span>}</div></div>
      </article>)}
    </section>
    {Number(data.pages||1)>1&&<nav className="notifications-pagination"><button disabled={page<=1||loading} onClick={()=>{const p=page-1;setPage(p);load(p)}}>Previous</button><span>Page {page} of {data.pages}</span><button disabled={page>=data.pages||loading} onClick={()=>{const p=page+1;setPage(p);load(p)}}>Next</button></nav>}
  </div>;
}

export default function Notifications(){
  const user=getUser();
  const navigate=useNavigate();
  const signOut=()=>{clearSession();navigate('/login',{replace:true})};
  if(user?.role==='admin')return <NotificationContent/>;
  if(user?.role==='lead_partner')return <div className="lp-shell"><LeadPartnerSidebar user={user} onSignOut={signOut}/><main className="lp-main"><header className="lp-topbar"><div className="lp-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Notifications</strong></div></header><div className="lp-content"><NotificationContent/></div></main></div>;
  return <><UserHeader/><main className="notifications-customer-page"><NotificationContent/></main></>;
}
