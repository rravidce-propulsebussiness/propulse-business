import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import PortalContact from './PortalContact'
import { publicRequest } from '../utils/auth'
import './Contact.css'

const empty={
  company_name:'ProPulse Business',
  email:'',
  phone:'',
  whatsapp:'',
  address:'',
  business_hours:'',
  support_email:'',
  careers_email:'',
  maps_url:'',
  website_url:'/',
  social_handles:[],
}

function Icon({name,size=19}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='phone')return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if(name==='mail')return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='clock')return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  if(name==='chat')return <svg {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>
  if(name==='home')return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if(name==='sofa')return <svg {...p}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/></svg>
  if(name==='building')return <svg {...p}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  return null
}

export default function Contact(){
  const [searchParams]=useSearchParams()
  const portalAudience=searchParams.get('audience')
  if(portalAudience==='lead_partners') return <PortalContact audience={portalAudience}/>
  if(portalAudience==='users') return <Navigate to="/professionals" replace/>
  return <PublicContact/>
}

function PublicContact(){
  const [data,setData]=useState(empty)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    let active=true
    window.scrollTo(0,0)
    publicRequest('/contact?audience=website')
      .then(value=>{if(active)setData({...empty,...(value||{}),social_handles:Array.isArray(value?.social_handles)?value.social_handles:[]})})
      .catch(err=>{if(active)setError(err.message||'Unable to load contact details.')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[])

  const socials=useMemo(()=>data.social_handles.filter(item=>item?.enabled&&item?.url),[data.social_handles])
  const whatsapp=String(data.whatsapp||'').replace(/\D/g,'')
  const phoneHref=data.phone?'tel:'+String(data.phone).replace(/\s/g,''):'#'
  const email=data.email||data.support_email||''

  return <main className="contact-page">
    <header className="contact-header">
      <Link className="contact-logo" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/packages">Packages</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
        <Link className="active" to="/contact">Contact</Link>
      </nav>
      <div className="public-header-actions">
        <Link className="contact-header-cta" to="/quote#construction">Get Free Quote <Icon name="arrow" size={15}/></Link>
        <Link className="public-professional-btn" to="/contact?audience=users">For Professionals</Link>
      </div>
    </header>

    <section className="contact-hero">
      <div className="contact-hero-copy">
        <span className="contact-kicker">CONTACT PROPULSE</span>
        <h1>Questions About Your Home Journey? <em>Talk to Us.</em></h1>
        <p>Whether you are planning construction, interiors or a property requirement, reach the ProPulse team using the contact details configured by our Admin team.</p>
        <div className="contact-hero-actions">
          <Link className="contact-primary" to="/quote#construction">Get Free Quote <Icon name="arrow" size={15}/></Link>
          {data.phone&&<a className="contact-secondary" href={phoneHref}><Icon name="phone" size={15}/> Call Us</a>}
        </div>
        <div className="contact-trust"><span>Homeowner focused</span><i/><span>Admin-managed contact details</span><i/><span>Construction · Interiors · Real Estate</span></div>
      </div>

      <aside className="contact-hero-card">
        <span>WE'RE HERE TO HELP</span>
        <strong>{loading?'Loading contact information…':data.business_hours||'Contact our support team during business hours.'}</strong>
        <small>For project requirements, the fastest starting point is the guided quote page. For support or general questions, use the channels below.</small>
        <div className="contact-hero-contact"><span>•</span><div><b>{email||'Website support'}</b><small>{data.phone||'Contact details managed from Admin'}</small></div></div>
      </aside>
    </section>

    {error&&<div className="contact-alert">{error}</div>}

    <section className="contact-service-strip">
      <article><b>01</b><span>Construction</span><small>Quotation, packages and project requirements.</small></article>
      <article><b>02</b><span>Interiors</span><small>Design scope, rooms, finishes and requirements.</small></article>
      <article><b>03</b><span>Real Estate</span><small>Buy, rent, sell or investment requirements.</small></article>
      <article><b>04</b><span>Support</span><small>Website, account and general assistance.</small></article>
    </section>

    <section className="contact-body">
      <div className="contact-main-column">
        <article className="contact-panel">
          <div className="contact-panel-heading"><span className="contact-kicker">CONTACT CHANNELS</span><h2>Reach the ProPulse Team</h2><p>These details are loaded directly from Admin → Contact & Social → Website.</p></div>
          <div className="contact-detail-grid">
            <a className="contact-detail-card" href={email?'mailto:'+email:'#'}>
              <span className="contact-icon"><Icon name="mail" size={17}/></span><div><small>Email</small><strong>{loading?'Loading…':email||'Not published'}</strong><span>General website enquiries</span></div><b>→</b>
            </a>
            <a className="contact-detail-card" href={data.phone?phoneHref:'#'}>
              <span className="contact-icon"><Icon name="phone" size={17}/></span><div><small>Phone</small><strong>{loading?'Loading…':data.phone||'Not published'}</strong><span>{data.business_hours||'Business hours'}</span></div><b>→</b>
            </a>
            <a className="contact-detail-card" href={whatsapp?'https://wa.me/'+whatsapp:'#'} target={whatsapp?'_blank':undefined} rel={whatsapp?'noreferrer':undefined}>
              <span className="contact-icon"><Icon name="chat" size={17}/></span><div><small>WhatsApp</small><strong>{loading?'Loading…':data.whatsapp||'Not published'}</strong><span>Quick project questions</span></div><b>→</b>
            </a>
            <div className="contact-detail-card">
              <span className="contact-icon"><Icon name="clock" size={17}/></span><div><small>Business Hours</small><strong>{loading?'Loading…':data.business_hours||'Not published'}</strong><span>Support availability</span></div>
            </div>
          </div>
        </article>

        <article className="contact-panel location-panel">
          <div className="contact-panel-heading contact-location-heading">
            <div><span className="contact-kicker">LOCATION</span><h2>Office & Address</h2><p>{data.address||'The public office address can be configured from Admin.'}</p></div>
            {data.maps_url&&<a className="contact-outline-btn" href={data.maps_url} target="_blank" rel="noreferrer">Open in Maps ↗</a>}
          </div>
          <div className="contact-map">
            <div className="contact-map-grid"/>
            <div className="contact-map-pin"><span>●</span></div>
            <div className="contact-map-caption"><b>{data.company_name||'ProPulse Business'}</b><span>{data.address||'Address not published'}</span></div>
          </div>
        </article>
      </div>

      <aside className="contact-side-column">
        <article className="contact-panel contact-direct">
          <span className="contact-kicker">DIRECT SUPPORT</span>
          <h2>Need assistance?</h2>
          <p>Choose the channel that best matches what you need. Project quotation requests should start from the guided quote page so your details stay structured.</p>
          <div className="contact-direct-links">
            {data.support_email&&<a href={'mailto:'+data.support_email}><span>SUPPORT</span><strong>{data.support_email}</strong><b>→</b></a>}
            {data.careers_email&&<a href={'mailto:'+data.careers_email}><span>CAREERS</span><strong>{data.careers_email}</strong><b>→</b></a>}
            {data.phone&&<a href={phoneHref}><span>PHONE</span><strong>{data.phone}</strong><b>→</b></a>}
          </div>
          <Link className="contact-dark-cta" to="/quote#construction">Start a Project Quote <Icon name="arrow" size={15}/></Link>
        </article>

        <article className="contact-panel">
          <div className="contact-panel-heading"><span className="contact-kicker">SOCIAL CHANNELS</span><h2>Stay Connected</h2><p>Only social links enabled by Admin are shown here.</p></div>
          <div className="contact-social-grid">
            {socials.length?socials.map(item=><a key={item.id||item.platform} href={item.url} target="_blank" rel="noreferrer"><span>{String(item.platform||'?').slice(0,1).toUpperCase()}</span><div><strong>{item.platform}</strong><small>Open profile ↗</small></div></a>):<div className="contact-empty">No public social channels are currently published.</div>}
          </div>
        </article>

        <article className="contact-panel contact-address-mini">
          <span className="contact-kicker">OFFICE</span>
          <strong>{data.company_name||'ProPulse Business'}</strong>
          <p>{data.address||'Public address has not been configured yet.'}</p>
          {data.maps_url&&<a href={data.maps_url} target="_blank" rel="noreferrer">View location ↗</a>}
        </article>
      </aside>
    </section>

    <section className="contact-bottom-cta">
      <div><span className="contact-kicker">READY TO START?</span><h2>Tell Us What You Need</h2><p>Choose Construction, Interiors or Real Estate and continue with the guided homeowner flow.</p></div>
      <div><Link to="/packages">View Packages</Link><Link to="/quote#construction">Get Free Quote <Icon name="arrow" size={14}/></Link></div>
    </section>

    <footer className="contact-public-footer">
      <div><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>A homeowner-first starting point for construction, interiors and real estate requirements.</p></div>
      <div><b>Quick Links</b><Link to="/">Home</Link><Link to="/packages">Packages</Link><Link to="/projects">Projects</Link></div>
      <div><b>Support</b><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></div>
      <div><b>Contact</b>{data.phone&&<a href={phoneHref}>{data.phone}</a>}{email&&<a href={'mailto:'+email}>{email}</a>}<span>{data.address||'Hyderabad, India'}</span></div>
    </footer>
  </main>
}
