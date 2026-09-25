import { Link, useLocation } from 'react-router-dom';
import '../pages/LeadPartnerShared.css';

export default function LeadPartnerSidebar({user,onSignOut}){
  const location=useLocation();
  const initials=(user?.name||'Lead Partner').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'LP';
  const is=(prefix,exact=false)=>exact?location.pathname===prefix:location.pathname.startsWith(prefix);
  return <aside className="lead-partner-sidebar">
    <div className="lead-partner-brand">
      <span className="lead-partner-brand-mark">P</span>
      <span className="lead-partner-brand-copy"><b>PRO<span>PULSE</span></b><small>LEAD PARTNER</small></span>
    </div>
    <div className="lead-partner-nav-label">WORKSPACE</div>
    <nav className="lead-partner-nav">
      <Link className={is('/lead-partner',true)?'active':''} to="/lead-partner"><span className="lead-partner-nav-icon">⌂</span><span>Overview</span></Link>
      <Link className={is('/lead-partner/inventory')?'active':''} to="/lead-partner/inventory"><span className="lead-partner-nav-icon">◈</span><span>Lead Inventory</span></Link>
      <Link className={is('/lead-partner/pricing')?'active':''} to="/lead-partner/pricing"><span className="lead-partner-nav-icon">₹</span><span>Pricing &amp; Revenue</span></Link>
      <Link className={is('/lead-partner/withdrawals')?'active':''} to="/lead-partner/withdrawals"><span className="lead-partner-nav-icon">⇩</span><span>Earnings &amp; Withdrawals</span></Link>
      <Link className={is('/lead-partner/reports')?'active':''} to="/lead-partner/reports"><span className="lead-partner-nav-icon">▥</span><span>Reports</span></Link>
      <Link className={location.pathname==='/contact' && new URLSearchParams(location.search).get('audience')==='lead_partners'?'active':''} to="/contact?audience=lead_partners"><span className="lead-partner-nav-icon">☎</span><span>Contact</span></Link>
      <Link className={is('/lead-partner/faqs')?'active':''} to="/lead-partner/faqs"><span className="lead-partner-nav-icon">?</span><span>FAQs</span></Link>
      <Link className={is('/lead-partner/account')?'active':''} to="/lead-partner/account"><span className="lead-partner-nav-icon">◎</span><span>Account</span></Link>
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