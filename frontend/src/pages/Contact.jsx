import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import './Home.css';
import './Contact.css';
import PortalContact from './PortalContact';

function Icon({children}){return <span className="contact-icon" aria-hidden="true">{children}</span>}

export default function Contact(){
  const [searchParams]=useSearchParams();
  const portalAudience=searchParams.get('audience');
  if(portalAudience==='lead_partners'||portalAudience==='users') return <PortalContact audience={portalAudience}/>;
  return <PublicContact searchParams={searchParams}/>;
}

function PublicContact({searchParams}){
  const audience=['website','common'].includes(searchParams.get('audience')||'website')?searchParams.get('audience')||'website':'website';
  const audienceLabel={website:'Public Website',users:'Customer Support',lead_partners:'Lead Partner Support',common:'ProPulse Support'}[audience];
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;apiRequest('/contact?audience='+encodeURIComponent(audience),{},false).then(v=>{if(active)setData(v)}).catch(()=>{if(active)setData({})}).finally(()=>active&&setLoading(false));return()=>{active=false}},[]);
  const socials=useMemo(()=>Array.isArray(data?.social_handles)?data.social_handles.filter(s=>s.enabled&&s.url):[],[data]);
  const wa=data?.whatsapp?String(data.whatsapp).replace(/\D/g,''):'';
  return <div className="contact-page">
    <header className="public-header contact-header">
      <Link className="brand" to="/" aria-label="Propulse Business home"><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link>
      <nav className="desktop-nav" aria-label="Main navigation"><Link to="/">Home</Link><Link to="/leads">See Leads</Link><a href="/#services">Services</a><a href="/#faq">FAQ</a><Link className="active" to="/contact">Contact</Link></nav>
      <div className="header-actions"><Link className="header-leads" to="/leads">See Leads</Link><Link className="header-signup" to="/signup">Get started</Link></div>
    </header>
    <main>
      <section className="contact-hero"><div><span className="contact-kicker">{audienceLabel.toUpperCase()}</span><h1>Contact ProPulse</h1><p>{audience==='lead_partners'?'Need help with lead uploads, pricing, reports or withdrawals? Reach the ProPulse team through the channel that works best for you.':audience==='users'?'Need help with leads, your account, wallet or membership? Reach the ProPulse support team through the channel that works best for you.':'Have a question about leads, digital growth or your business account? Reach the team through the channel that works best for you.'}</p></div><div className="contact-hero-badge"><span>PRO</span><strong>PULSE</strong><small>Business growth &amp; lead opportunities</small></div></section>
      <section className="contact-grid">
        <div className="contact-left">
          <article className="contact-card contact-main-card"><div className="contact-card-head"><div><span className="contact-kicker">CONTACT DETAILS</span><h2>We’re here to help</h2><p>Connect with ProPulse for support, business enquiries and partnership conversations.</p></div></div>
            <div className="contact-info-grid">
              <a className="contact-info" href={data?.email?'mailto:'+data.email:'#'}><Icon>✉</Icon><div><small>Email</small><strong>{loading?'Loading…':data?.email||'—'}</strong><span>Send us an email</span></div></a>
              <a className="contact-info" href={data?.phone?'tel:'+data.phone:'#'}><Icon>☎</Icon><div><small>Phone</small><strong>{loading?'Loading…':data?.phone||'—'}</strong><span>Talk to our team</span></div></a>
              <a className="contact-info" href={wa?'https://wa.me/'+wa:'#'} target="_blank" rel="noreferrer"><Icon>◉</Icon><div><small>WhatsApp</small><strong>{loading?'Loading…':data?.whatsapp||'—'}</strong><span>Quick conversation</span></div></a>
              <div className="contact-info"><Icon>◷</Icon><div><small>Business hours</small><strong>{loading?'Loading…':data?.business_hours||'—'}</strong><span>We’ll respond as soon as possible</span></div></div>
            </div>
          </article>
          <article className="contact-card contact-address-card"><div className="contact-card-head"><div><span className="contact-kicker">VISIT / LOCATE</span><h2>Our location</h2></div>{data?.maps_url&&<a className="contact-outline-btn" href={data.maps_url} target="_blank" rel="noreferrer">Open in Maps ↗</a>}</div>
            <div className="contact-map"><div className="contact-map-grid"></div><div className="contact-pin"><span>●</span></div><div className="contact-map-label"><strong>{data?.company_name||'ProPulse Business'}</strong><span>{data?.address||'—'}</span></div></div>
            <div className="contact-address-row"><Icon>⌖</Icon><div><small>Address</small><strong>{loading?'Loading…':data?.address||'—'}</strong></div></div>
          </article>
        </div>
        <aside className="contact-right">
          <article className="contact-card enquiry-card"><span className="contact-kicker">BUSINESS ENQUIRIES</span><h2>Let’s build something useful.</h2><p>Tell us what you need and we’ll route your enquiry to the right team.</p><div className="contact-enquiry-list"><a href={data?.support_email?'mailto:'+data.support_email:'#'}><Icon>✉</Icon><div><small>Support</small><strong>{data?.support_email||'—'}</strong></div><b>→</b></a><a href={data?.careers_email?'mailto:'+data.careers_email:'#'}><Icon>✦</Icon><div><small>Careers</small><strong>{data?.careers_email||'—'}</strong></div><b>→</b></a></div></article>
          <article className="contact-card social-card"><div className="contact-card-head"><div><span className="contact-kicker">FOLLOW PRO PULSE</span><h2>Social channels</h2><p>Stay connected with updates and new opportunities.</p></div></div><div className="contact-social-grid">{socials.length?socials.map(s=><a key={s.id} href={s.url} target="_blank" rel="noreferrer"><span className="contact-social-mark">{s.platform.slice(0,1).toUpperCase()}</span><div><strong>{s.platform}</strong><small>Open profile ↗</small></div></a>):<div className="contact-empty">Social links will appear here when published by Admin.</div>}</div></article>
          <article className="contact-card company-card"><span className="contact-kicker">COMPANY</span><h3>{data?.company_name||'ProPulse Business'}</h3><p>Building practical digital systems that help businesses attract, convert and grow.</p><Link to="/leads">Explore live leads →</Link></article>
        </aside>
      </section>
    </main>
    <footer className="public-footer contact-footer"><span>© {new Date().getFullYear()} {data?.company_name||'ProPulse Business'}</span><div><Link to="/">Home</Link><Link to="/leads">See Leads</Link><Link to="/contact">Contact</Link><Link to="/login">Login</Link></div></footer>
  </div>
}