import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../utils/api'
import PortalContact from './PortalContact'
import './Contact.css'

const empty={company_name:'',email:'',phone:'',whatsapp:'',address:'',business_hours:'',support_email:'',careers_email:'',maps_url:'',website_url:'',social_handles:[]}

function Icon({children}){return <span className="contact-icon" aria-hidden="true">{children}</span>}

export default function Contact(){
  const [searchParams]=useSearchParams()
  const portalAudience=searchParams.get('audience')
  if(portalAudience==='lead_partners'||portalAudience==='users') return <PortalContact audience={portalAudience}/>
  return <Navigate to="/#contact" replace/>
}

function PublicContact({searchParams}){
  const audience=['website','common'].includes(searchParams.get('audience')||'website')?searchParams.get('audience')||'website':'website'
  const [data,setData]=useState(empty)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{
    let active=true
    setLoading(true);setError('')
    apiRequest('/contact?audience='+encodeURIComponent(audience),{},false)
      .then(value=>active&&setData({...empty,...value}))
      .catch(err=>active&&setError(err.message||'Unable to load contact details'))
      .finally(()=>active&&setLoading(false))
    return()=>{active=false}
  },[audience])

  const socials=useMemo(()=>Array.isArray(data.social_handles)?data.social_handles.filter(item=>item?.enabled&&item?.url):[],[data])
  const wa=data.whatsapp?String(data.whatsapp).replace(/\D/g,''):''
  const display=v=>loading?'Loading…':v||'Not configured'
  const company=data.company_name||'Propulse Business Technologies Private Limited'

  return <div className="contact-page">
    <header className="public-header contact-header">
      <Link className="brand" to="/" aria-label="Propulse Business home"><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link to="/">Home</Link>
        <Link to="/leads">Buy Leads</Link>
        <a href="/#how-it-works">How It Works</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#about">About</a>
        <Link className="nav-active" to="/contact">Contact</Link>
      </nav>
      <div className="header-actions">
        <Link className="header-search" to="/leads" aria-label="Search leads">⌕</Link>
        <Link className="header-login" to="/login">Login</Link>
        <Link className="header-signup" to="/signup">Get Started <span>→</span></Link>
      </div>
    </header>

    <main>
      <section className="contact-hero">
        <div className="contact-hero-copy">
          <span className="contact-kicker">CONNECT WITH PROPULSE</span>
          <h1>Let’s build your next <em>digital move.</em></h1>
          <p>Talk to Propulse about technology, digital marketing, lead opportunities, software, automation or business support. We’ll help route your requirement to the right team.</p>
          <div className="contact-hero-actions">
            {data.email&&<a href={'mailto:'+data.email} className="contact-primary">Email Propulse <span>→</span></a>}
            {wa&&<a href={'https://wa.me/'+wa} target="_blank" rel="noreferrer" className="contact-secondary">WhatsApp <span>↗</span></a>}
          </div>
          <div className="contact-trust"><span>✓</span> Technology support <i/><span>✓</span> Business growth <i/><span>✓</span> Lead marketplace</div>
        </div>
        <div className="contact-hero-card">
          <span>PROPULSE BUSINESS</span>
          <strong>{company}</strong>
          <small>IT technology • Digital growth • Lead sales • Business support</small>
          <div className="contact-hero-contact"><span>●</span><div><b>{display(data.business_hours)}</b><small>Business hours</small></div></div>
        </div>
      </section>

      {error&&<div className="contact-alert">{error}</div>}

      <section className="contact-service-strip">
        <article><b>01</b><span>Technology</span><small>Websites, apps, software, automation and digital systems.</small></article>
        <article><b>02</b><span>Digital Marketing</span><small>SEO, social media, campaigns, branding, photo and video.</small></article>
        <article><b>03</b><span>Lead Sales</span><small>Discover and purchase relevant customer enquiries.</small></article>
        <article><b>04</b><span>Business Support</span><small>Registration, GST, ITR and selected filing workflows.</small></article>
      </section>

      <section className="contact-body">
        <div className="contact-main-column">
          <article className="contact-panel">
            <div className="contact-panel-heading">
              <div><span className="contact-kicker">CONTACT DETAILS</span><h2>Choose the channel that works for you.</h2><p>Use the details configured by Admin for the public website.</p></div>
            </div>
            <div className="contact-detail-grid">
              <a className="contact-detail-card" href={data.email?'mailto:'+data.email:'#'}><Icon>✉</Icon><div><small>Email</small><strong>{display(data.email)}</strong><span>General enquiries &amp; conversations</span></div><b>→</b></a>
              <a className="contact-detail-card" href={data.phone?'tel:'+data.phone:'#'}><Icon>☎</Icon><div><small>Phone</small><strong>{display(data.phone)}</strong><span>Speak with the team</span></div><b>→</b></a>
              <a className="contact-detail-card" href={wa?'https://wa.me/'+wa:'#'} target="_blank" rel="noreferrer"><Icon>◉</Icon><div><small>WhatsApp</small><strong>{display(data.whatsapp)}</strong><span>Quick business conversation</span></div><b>→</b></a>
              <div className="contact-detail-card"><Icon>◷</Icon><div><small>Business hours</small><strong>{display(data.business_hours)}</strong><span>Response timing depends on the enquiry</span></div></div>
            </div>
          </article>

          <article className="contact-panel location-panel">
            <div className="contact-panel-heading">
              <div><span className="contact-kicker">OFFICE &amp; LOCATION</span><h2>{company}</h2><p>{display(data.address)}</p></div>
              {data.maps_url&&<a className="contact-outline-btn" href={data.maps_url} target="_blank" rel="noreferrer">Open in Maps ↗</a>}
            </div>
            <div className="contact-map"><div className="contact-map-grid"/><div className="contact-map-pin"><span>●</span></div><div className="contact-map-caption"><b>PROPULSE</b><span>Business &amp; technology support</span></div></div>
          </article>
        </div>

        <aside className="contact-side-column">
          <article className="contact-panel contact-direct">
            <span className="contact-kicker">START A CONVERSATION</span>
            <h2>Tell us what you’re building.</h2>
            <p>From a new website or app to digital campaigns, lead acquisition or a business technology requirement, start with a simple conversation.</p>
            <div className="contact-direct-links">
              <a href={data.support_email?'mailto:'+data.support_email:'#'}><span>Support</span><strong>{display(data.support_email)}</strong><b>→</b></a>
              <a href={data.careers_email?'mailto:'+data.careers_email:'#'}><span>Careers</span><strong>{display(data.careers_email)}</strong><b>→</b></a>
            </div>
            <Link to="/signup" className="contact-dark-cta">Get Started <span>→</span></Link>
          </article>

          <article className="contact-panel">
            <div className="contact-panel-heading"><div><span className="contact-kicker">SOCIAL CHANNELS</span><h2>Stay connected.</h2><p>Official links published by Admin.</p></div></div>
            <div className="contact-social-grid">{socials.length?socials.map(item=><a key={item.id} href={item.url} target="_blank" rel="noreferrer"><span>{String(item.platform).slice(0,1).toUpperCase()}</span><div><strong>{item.platform}</strong><small>Open profile ↗</small></div></a>):<div className="contact-empty">Social channels will appear here when published by Admin.</div>}</div>
          </article>

          <article className="contact-panel contact-address-mini">
            <span className="contact-kicker">BUSINESS WEBSITE</span>
            <strong>{company}</strong>
            <p>Practical IT and digital services for businesses that want to build, market, sell and scale.</p>
            {data.website_url&&data.website_url!=='/'&&<a href={data.website_url} target="_blank" rel="noreferrer">Visit website ↗</a>}
          </article>
        </aside>
      </section>

      <section className="contact-bottom-cta">
        <div><span className="contact-kicker">READY WHEN YOU ARE</span><h2>Have a requirement? Let’s talk.</h2><p>Reach Propulse using the contact details above or start from the business platform.</p></div>
        <div><Link to="/leads">Explore Leads</Link><Link to="/signup">Create Account</Link></div>
      </section>
    </main>

    <footer className="public-footer contact-footer">
      <div className="footer-brand"><Link to="/"><img src="/brand/propulse-logo.png" alt="Propulse"/></Link><p>Building businesses through technology and digital growth.</p></div>
      <div><strong>Platform</strong><Link to="/leads">Buy Leads</Link><a href="/#pricing">Services &amp; Pricing</a><a href="/#about">About Propulse</a></div>
      <div><strong>Company</strong><Link to="/contact">Contact</Link><a href="/#how-it-works">How It Works</a><Link to="/login">Login</Link></div>
      <div><strong>Contact</strong><span>{display(data.email)}</span><span>{display(data.phone)}</span></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {company}. All rights reserved.</span><span>Technology • Digital Growth • Lead Sales • Business Support</span></div>
    </footer>
  </div>
}
