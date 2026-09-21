import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { clearSession, getUser } from '../utils/auth';
import LeadPartnerSidebar from '../components/LeadPartnerSidebar';
import UserHeader from '../components/UserHeader';
import './PortalContact.css';

const audienceCopy={
  lead_partners:{label:'Lead Partner',title:'Contact',sub:'Connect with ProPulse support for lead uploads, pricing, reports, earnings and withdrawals.'},
  users:{label:'Customer',title:'Contact',sub:'Connect with ProPulse support for leads, your account, wallet and membership.'}
};
const empty={company_name:'',email:'',phone:'',whatsapp:'',address:'',business_hours:'',support_email:'',careers_email:'',maps_url:'',social_handles:[]};

export default function PortalContact({audience='lead_partners'}){
  const copy=audienceCopy[audience]||audienceCopy.lead_partners;
  const [data,setData]=useState(empty),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const user=getUser(), navigate=useNavigate();
  useEffect(()=>{let active=true;setLoading(true);setError('');apiRequest('/contact?audience='+encodeURIComponent(audience),{},false).then(v=>active&&setData({...empty,...v})).catch(e=>active&&setError(e.message||'Unable to load contact details')).finally(()=>active&&setLoading(false));return()=>{active=false}},[audience]);
  const socials=useMemo(()=>Array.isArray(data.social_handles)?data.social_handles.filter(s=>s.enabled&&s.url):[],[data]);
  const wa=data.whatsapp?String(data.whatsapp).replace(/\D/g,''):'';
  function signOut(){clearSession();localStorage.removeItem('propulse_session_mode');navigate('/login',{replace:true})}
  return <div className="portal-contact-shell">
    {audience==='lead_partners'?<><LeadPartnerSidebar user={user} onSignOut={signOut}/><main className="portal-contact-main partner-main"><header className="portal-contact-topbar"><div><span>Lead Partner</span><b>/</b><strong>Contact</strong></div><div className="portal-contact-status"><i/> Partner account</div></header><PortalContactContent copy={copy} data={data} socials={socials} wa={wa} loading={loading} error={error}/></main></>:<><UserHeader/><main className="portal-contact-main user-contact-main"><div className="portal-contact-user-wrap"><div className="portal-contact-user-breadcrumb"><span>Account</span><b>/</b><strong>Contact</strong></div><PortalContactContent copy={copy} data={data} socials={socials} wa={wa} loading={loading} error={error}/></div></main></>}
  </div>
}

function PortalContactContent({copy,data,socials,wa,loading,error}){
  return <div className="portal-contact-content">
    <section className="portal-contact-heading"><div><h1>{copy.title}</h1><p>{copy.sub}</p></div></section>
    {error&&<div className="portal-contact-alert">{error}<button type="button" onClick={()=>window.location.reload()}>Retry</button></div>}
    <section className="portal-contact-grid">
      <div className="portal-contact-left">
        <article className="portal-contact-card"><div className="portal-contact-card-head"><div><span className="portal-contact-kicker">SUPPORT</span><h2>We’re here to help</h2><p>Reach the ProPulse team using the contact details configured for this portal.</p></div></div>
          <div className="portal-contact-info-grid">
            <a className="portal-contact-info" href={data.email?'mailto:'+data.email:'#'}><span>✉</span><div><small>Email</small><strong>{loading?'Loading…':data.email||'—'}</strong></div></a>
            <a className="portal-contact-info" href={data.phone?'tel:'+data.phone:'#'}><span>☎</span><div><small>Phone</small><strong>{loading?'Loading…':data.phone||'—'}</strong></div></a>
            <a className="portal-contact-info" href={wa?'https://wa.me/'+wa:'#'} target="_blank" rel="noreferrer"><span>◉</span><div><small>WhatsApp</small><strong>{loading?'Loading…':data.whatsapp||'—'}</strong></div></a>
            <div className="portal-contact-info"><span>◷</span><div><small>Business hours</small><strong>{loading?'Loading…':data.business_hours||'—'}</strong></div></div>
          </div>
        </article>
        <article className="portal-contact-card"><div className="portal-contact-card-head"><div><span className="portal-contact-kicker">LOCATION</span><h2>Office location</h2></div>{data.maps_url&&<a className="portal-contact-outline" href={data.maps_url} target="_blank" rel="noreferrer">Open in Maps ↗</a>}</div>
          <div className="portal-contact-map"><div className="portal-contact-map-lines"></div><div className="portal-contact-map-pin">●</div><div className="portal-contact-map-label"><strong>{data.company_name||'ProPulse Business'}</strong><span>{data.address||'—'}</span></div></div>
          <div className="portal-contact-address"><span>⌖</span><div><small>Address</small><strong>{loading?'Loading…':data.address||'—'}</strong></div></div>
        </article>
      </div>
      <aside className="portal-contact-right">
        <article className="portal-contact-card portal-contact-dark"><span className="portal-contact-kicker">DIRECT SUPPORT</span><h2>Need assistance?</h2><p>For faster support, use the contact channel that best matches your request.</p><a href={data.support_email?'mailto:'+data.support_email:'#'}>Support email <b>→</b></a>{data.careers_email&&<a href={'mailto:'+data.careers_email}>Careers <b>→</b></a>}</article>
        <article className="portal-contact-card"><div className="portal-contact-card-head"><div><span className="portal-contact-kicker">SOCIAL CHANNELS</span><h2>Stay connected</h2><p>Official social handles for this portal.</p></div></div><div className="portal-contact-socials">{socials.length?socials.map(s=><a key={s.id} href={s.url} target="_blank" rel="noreferrer"><span>{s.platform.slice(0,1).toUpperCase()}</span><div><strong>{s.platform}</strong><small>Open profile ↗</small></div></a>):<div className="portal-contact-empty">No social handles are currently published.</div>}</div></article>
      </aside>
    </section>
  </div>
}