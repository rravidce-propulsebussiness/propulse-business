import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authRequest } from '../utils/auth';
import '../pages/LeadPartnerShared.css';

const nav=[
  {to:'/lead-partner/dashboard',label:'Dashboard',icon:'⌂',exact:true,aliases:['/lead-partner']},
  {to:'/lead-partner/inventory',label:'Lead Inventory',icon:'◈'},
  {to:'/lead-partner/pricing',label:'Pricing & Revenue',icon:'₹'},
  {to:'/lead-partner/withdrawals',label:'Earnings & Withdrawals',icon:'⇩'},
  {to:'/lead-partner/reports',label:'Reports',icon:'▥'},
  {to:'/lead-partner/notifications',label:'Notifications',icon:'♢',notifications:true},
  {to:'/lead-partner/account',label:'Account',icon:'◎'},
  {to:'/lead-partner/faqs',label:'FAQs',icon:'?'},
  {to:'/contact?audience=lead_partners',label:'Contact',icon:'☎',contact:true},
];

export default function LeadPartnerSidebar({user,onSignOut}){
  const location=useLocation();
  const [unread,setUnread]=useState(0);
  useEffect(()=>{let active=true;const refresh=()=>authRequest('/notifications/unread-count').then(r=>{if(active)setUnread(Number(r?.unread||0))}).catch(()=>{});refresh();const timer=setInterval(refresh,60000);const onRefresh=()=>refresh();window.addEventListener('propulse-notifications-refresh',onRefresh);return()=>{active=false;clearInterval(timer);window.removeEventListener('propulse-notifications-refresh',onRefresh)}},[]);
  const initials=(user?.name||'Lead Partner').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'LP';
  const active=item=>{
    if(item.aliases?.includes(location.pathname)) return true;
    if(item.contact) return location.pathname==='/contact'&&new URLSearchParams(location.search).get('audience')==='lead_partners';
    return item.exact?location.pathname===item.to:location.pathname.startsWith(item.to);
  };

  return <aside className="lead-partner-sidebar">
    <div className="lead-partner-brand-row">
      <Link className="lead-partner-brand" to="/lead-partner/dashboard" aria-label="ProPulse Lead Partner dashboard">
        <span className="lead-partner-brand-mark">P</span>
        <span className="lead-partner-brand-copy"><b>PRO<span>PULSE</span></b><small>LEAD PARTNER</small></span>
      </Link>
    </div>

    <div className="lead-partner-nav-label">WORKSPACE</div>
    <nav className="lead-partner-nav" aria-label="Lead Partner navigation">
      {nav.map(item=><Link key={item.to} className={active(item)?'active':''} to={item.to}>
        <span className="lead-partner-nav-icon">{item.icon}</span>
        <span>{item.label}</span>{item.notifications&&unread>0&&<b className="lead-partner-notification-count">{unread>99?'99+':unread}</b>}
      </Link>)}
    </nav>

    <div className="lead-partner-sidebar-bottom">
      <div className="lead-partner-user">
        <span className="lead-partner-avatar">{initials}</span>
        <div><b>{user?.name||'Lead Partner'}</b><small>{user?.email||'Partner account'}</small></div>
      </div>
      <button type="button" onClick={onSignOut}>↪ <span>Log out</span></button>
    </div>
  </aside>
}