import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listLeads } from '../api/leads'
import './ProfessionalHome.css'

function Icon({name,size=20}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='briefcase')return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='filter')return <svg {...p}><path d="M4 5h16M7 12h10M10 19h4"/></svg>
  if(name==='wallet')return <svg {...p}><path d="M3 7h16a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V7Z"/><path d="M3 7V5a2 2 0 0 1 2-2h12v4M16 12h5"/></svg>
  if(name==='check')return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  if(name==='user')return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
  if(name==='lock')return <svg {...p}><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
  if(name==='star')return <svg {...p}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>
  return null
}

const fallback=[
  {id:'example-1',industry_name:'Construction',service_name:'Home Construction',city_name:'Hyderabad',state_name:'Telangana',lead_type:'basic',example:true},
  {id:'example-2',industry_name:'Interiors',service_name:'Residential Interiors',city_name:'Hyderabad',state_name:'Telangana',lead_type:'premium',example:true},
  {id:'example-3',industry_name:'Real Estate',service_name:'Property Requirement',city_name:'Hyderabad',state_name:'Telangana',lead_type:'exclusive',example:true},
]

function toItems(value){
  if(Array.isArray(value))return value
  if(Array.isArray(value?.items))return value.items
  if(Array.isArray(value?.data))return value.data
  return []
}

function leadLabel(value){
  const key=String(value||'basic').toLowerCase()
  return key==='exclusive'?'Exclusive':key==='premium'?'Premium':'Basic'
}

export default function ProfessionalHome(){
  const [leads,setLeads]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let live=true
    listLeads({status:'available',page:1,limit:4})
      .then(data=>{if(live)setLeads(toItems(data).slice(0,4))})
      .catch(()=>{if(live)setLeads([])})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[])

  const preview=useMemo(()=>leads.length?leads:fallback,[leads])

  return <main className="pro-home">
    <header className="pro-home-header">
      <Link className="pro-home-logo" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav>
        <a href="#opportunities">Leads</a>
        <a href="#how">How It Works</a>
        <a href="#benefits">Benefits</a>
        <Link to="/">Homeowners</Link>
      </nav>
      <div className="pro-home-actions">
        <Link className="pro-login" to="/login">Login</Link>
        <Link className="pro-signup" to="/signup">Create Business Account <Icon name="arrow" size={15}/></Link>
      </div>
    </header>

    <section className="pro-hero">
      <div className="pro-hero-copy">
        <span className="pro-kicker"><i/> PROPULSE FOR PROFESSIONALS</span>
        <h1>Turn Customer Requirements Into <em>Business Opportunities.</em></h1>
        <p>Discover relevant construction, interior and real-estate leads, review the requirement before you buy, and grow your business through one focused marketplace.</p>
        <div className="pro-hero-actions">
          <Link className="pro-primary" to="/leads">Browse Live Leads <Icon name="arrow" size={16}/></Link>
          <Link className="pro-secondary" to="/signup">Sign Up Free</Link>
        </div>
        <div className="pro-hero-trust">
          <span><Icon name="shield" size={17}/> Business verification</span>
          <span><Icon name="filter" size={17}/> Service & location matching</span>
          <span><Icon name="lock" size={17}/> Protected customer contact</span>
        </div>
      </div>

      <div className="pro-hero-market">
        <div className="pro-market-head">
          <div><span>LIVE MARKETPLACE PREVIEW</span><h2>Relevant opportunities, in one place.</h2></div>
          <Link to="/leads">View all <Icon name="arrow" size={14}/></Link>
        </div>
        <div className="pro-market-grid">
          {loading?<div className="pro-market-loading">Loading available leads…</div>:preview.map((lead,index)=>{
            const location=[lead.city_name,lead.state_name].filter(Boolean).join(', ')||'Location available'
            return <article className="pro-lead-card" key={lead.id||index}>
              <div className="pro-lead-top"><span className={'pro-lead-type '+String(lead.lead_type||'basic').toLowerCase()}>{leadLabel(lead.lead_type)}</span><small>{lead.example?'Example':'Available'}</small></div>
              <div className="pro-lead-icon"><Icon name="briefcase" size={23}/></div>
              <h3>{lead.service_name||lead.industry_name||'Business Opportunity'}</h3>
              <p>{lead.industry_name||'Customer requirement'}</p>
              <div className="pro-lead-location"><Icon name="pin" size={13}/>{location}</div>
              <div className="pro-lead-foot"><span>Contact protected</span><b>View lead <Icon name="arrow" size={12}/></b></div>
            </article>
          })}
        </div>
      </div>
    </section>

    <section className="pro-value-strip" id="benefits">
      <article><span><Icon name="filter"/></span><div><b>Relevant Leads</b><small>Filter by industry, service and location.</small></div></article>
      <article><span><Icon name="shield"/></span><div><b>Verified Business Profile</b><small>Build trust with your professional account.</small></div></article>
      <article><span><Icon name="wallet"/></span><div><b>Flexible Lead Access</b><small>Use wallet, offers and available access options.</small></div></article>
      <article><span><Icon name="star"/></span><div><b>Grow Consistently</b><small>Track purchased leads and follow up from one place.</small></div></article>
    </section>

    <section className="pro-opportunities" id="opportunities">
      <div className="pro-section-head">
        <span>LEAD MARKETPLACE</span>
        <h2>Find opportunities that <em>fit your business.</em></h2>
        <p>Start with the industries and locations you actually serve. ProPulse keeps the customer requirement structured so you can evaluate the opportunity before taking the next step.</p>
      </div>
      <div className="pro-industry-grid">
        <article className="construction">
          <div className="pro-industry-image"><img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1100&q=88" alt="Construction professional"/></div>
          <div><span>CONSTRUCTION</span><h3>Home construction requirements</h3><p>Discover homeowner enquiries for new construction, renovation and related services.</p><Link to="/leads?category=construction">Explore construction leads <Icon name="arrow" size={14}/></Link></div>
        </article>
        <article className="interiors">
          <div className="pro-industry-image"><img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=88" alt="Interior design project"/></div>
          <div><span>INTERIORS</span><h3>Interior project requirements</h3><p>Find customers looking for residential interiors, modular work and complete-home solutions.</p><Link to="/leads?category=interiors">Explore interior leads <Icon name="arrow" size={14}/></Link></div>
        </article>
        <article className="real-estate">
          <div className="pro-industry-image"><img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1100&q=88" alt="Real estate buildings"/></div>
          <div><span>REAL ESTATE</span><h3>Property customer requirements</h3><p>Connect with relevant property enquiries based on the services and locations you support.</p><Link to="/leads?category=real-estate">Explore real-estate leads <Icon name="arrow" size={14}/></Link></div>
        </article>
      </div>
    </section>

    <section className="pro-how" id="how">
      <div className="pro-section-head centered">
        <span>SIMPLE PROFESSIONAL FLOW</span>
        <h2>From signup to opportunity <em>in four clear steps.</em></h2>
      </div>
      <div className="pro-how-grid">
        <article><b>01</b><span><Icon name="user"/></span><h3>Create Your Business Account</h3><p>Add your services and locations so ProPulse can show more relevant opportunities.</p></article>
        <i>→</i>
        <article><b>02</b><span><Icon name="shield"/></span><h3>Complete Verification</h3><p>Submit the required business details and proof documents for your professional profile.</p></article>
        <i>→</i>
        <article><b>03</b><span><Icon name="briefcase"/></span><h3>Review Available Leads</h3><p>See structured project information and choose opportunities that fit your business.</p></article>
        <i>→</i>
        <article><b>04</b><span><Icon name="check"/></span><h3>Access & Follow Up</h3><p>Purchase or claim eligible lead access, then continue the customer conversation from your account.</p></article>
      </div>
    </section>

    <section className="pro-account-cta">
      <div>
        <span>READY TO GROW?</span>
        <h2>Your next customer opportunity could already be waiting.</h2>
        <p>Create your business profile or sign in to explore available leads.</p>
      </div>
      <div className="pro-account-actions">
        <Link to="/signup">Create Business Account <Icon name="arrow" size={15}/></Link>
        <Link to="/login">Login</Link>
      </div>
    </section>

    <footer className="pro-home-footer">
      <div><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Lead opportunities and business growth tools for professionals.</p></div>
      <div><b>Marketplace</b><Link to="/leads">Browse Leads</Link><Link to="/signup">Create Account</Link><Link to="/login">Login</Link></div>
      <div><b>Homeowners</b><Link to="/">Home</Link><Link to="/packages">Packages</Link><Link to="/projects">Projects</Link></div>
      <div><b>Support</b><Link to="/contact">Contact ProPulse</Link></div>
    </footer>
  </main>
}
