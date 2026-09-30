import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './About.css'

const HERO='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=92'
const STORY='https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1500&q=90'
const IMPACT='https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1500&q=90'

function collection(value){
  if(Array.isArray(value)) return value
  if(Array.isArray(value?.data)) return value.data
  if(Array.isArray(value?.rows)) return value.rows
  if(Array.isArray(value?.items)) return value.items
  return []
}

function Icon({name,size=20}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='people')return <svg {...p}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='receipt')return <svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
  if(name==='support')return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if(name==='target')return <svg {...p}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M15 9l5-5"/></svg>
  if(name==='eye')return <svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
  if(name==='heart')return <svg {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='check')return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  if(name==='building')return <svg {...p}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if(name==='guide')return <svg {...p}><circle cx="12" cy="7" r="3"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M18 5l2-2M4 5 2 3"/></svg>
  if(name==='gear')return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>
  if(name==='award')return <svg {...p}><circle cx="12" cy="8" r="5"/><path d="m8.5 12.5-2 8 5.5-3 5.5 3-2-8"/></svg>
  if(name==='bulb')return <svg {...p}><path d="M9 18h6M10 22h4"/><path d="M8.2 14.3A7 7 0 1 1 15.8 14c-.9.7-1.3 1.4-1.3 2H9.6c0-.6-.5-1.2-1.4-1.7Z"/></svg>
  if(name==='handshake')return <svg {...p}><path d="m8 11 3 3c1 1 2 .8 3 0l3-3"/><path d="m3 8 4-4 4 4-4 4zM21 8l-4-4-4 4 4 4z"/><path d="M9 16l2 2c1 1 2 1 3 0l3-3"/></svg>
  if(name==='phone')return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  return null
}

export default function About(){
  const navigate=useNavigate()
  const [cities,setCities]=useState([])
  const [industries,setIndustries]=useState([])
  const [contactData,setContactData]=useState({})

  useEffect(()=>{
    window.scrollTo(0,0)
    Promise.allSettled([
      publicRequest('/cities'),
      publicRequest('/industries'),
      publicRequest('/contact?audience=website'),
    ]).then(([cityResult,industryResult,contactResult])=>{
      if(cityResult.status==='fulfilled')setCities(collection(cityResult.value))
      if(industryResult.status==='fulfilled')setIndustries(collection(industryResult.value))
      if(contactResult.status==='fulfilled')setContactData(contactResult.value||{})
    })
  },[])

  const activeIndustries=useMemo(()=>industries.filter(item=>item?.is_active!==false),[industries])
  const phone=contactData.phone||contactData.phone_number||contactData.mobile||''
  const email=contactData.email||contactData.support_email||''

  function jump(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}

  return <main className="ab-page">
    <header className="ab-header">
      <Link to="/" className="ab-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav><Link to="/">Home</Link><Link to="/packages">Packages</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link><Link className="active" to="/about">About</Link><Link to="/contact">Contact</Link></nav>
      <div className="public-header-actions">
        <button className="public-quote-button" onClick={()=>navigate('/quote#construction')}>Get Free Quote <Icon name="arrow" size={15}/></button>
        <Link className="public-professional-btn" to="/contact?audience=users">For Professionals</Link>
      </div>
    </header>

    <section className="ab-hero">
      <img src={HERO} alt="Premium modern home"/>
      <div className="ab-hero-wash"/>
      <div className="ab-hero-copy"><span>ABOUT PROPULSE</span><h1>Building Better<br/>Spaces For A<em>Brighter Tomorrow</em></h1><p>ProPulse gives homeowners a structured starting point for construction, interiors and real-estate requirements.</p></div>
      <aside className="ab-hero-menu">
        <button onClick={()=>jump('ab-mission')}><Icon name="target"/><span>Our Mission</span></button>
        <button onClick={()=>jump('ab-vision')}><Icon name="eye"/><span>Our Vision</span></button>
        <button onClick={()=>jump('ab-values')}><Icon name="people"/><span>Our Values</span></button>
        <button onClick={()=>jump('ab-why')}><Icon name="shield"/><span>Why Choose Us</span></button>
        <button onClick={()=>jump('ab-impact')}><Icon name="building"/><span>Our Impact</span></button>
      </aside>
      <div className="ab-hero-benefits">
        <article><span><Icon name="people"/></span><div><b>People First</b><small>Your requirement, your priority</small></div></article>
        <article><span><Icon name="shield"/></span><div><b>Relevant Businesses</b><small>Matched by category and location</small></div></article>
        <article><span><Icon name="receipt"/></span><div><b>Transparent Process</b><small>Clear information first</small></div></article>
        <article><span><Icon name="support"/></span><div><b>End-to-End Journey</b><small>From requirement onward</small></div></article>
      </div>
    </section>

    <section className="ab-story" id="ab-mission">
      <div className="ab-story-copy">
        <span>OUR STORY</span>
        <h2>From a Simple Idea<br/>to a Bigger Impact</h2>
        <p>ProPulse started with a simple belief: customers should be able to build, design or define the property they need without beginning from a confusing marketplace.</p>
        <p>Instead of forcing customers to repeat the same details to different businesses, ProPulse turns their needs into a structured requirement that can be understood consistently.</p>
        <button onClick={()=>navigate('/how-it-works')}>Our Journey <Icon name="arrow" size={14}/></button>
      </div>
      <div className="ab-story-visual" id="ab-vision">
        <img src={STORY} alt="Premium interior space"/>
        <div className="ab-story-card"><h3>Creating Spaces<br/>That Matter</h3><i/><p>Whether it’s a dream home, a beautiful interior or a smarter property decision, ProPulse is designed to make the starting point clearer and simpler.</p></div>
      </div>
    </section>

    <section className="ab-stats">
      <article><span><Icon name="home"/></span><div><b>3</b><small>Core Customer Journeys</small></div></article>
      <article><span><Icon name="people"/></span><div><b>{activeIndustries.length||'Admin'}</b><small>{activeIndustries.length?'Active Industries':'Managed Categories'}</small></div></article>
      <article><span><Icon name="pin"/></span><div><b>{cities.length||'City + PIN'}</b><small>{cities.length?'Active Cities':'Location-aware Intake'}</small></div></article>
      <article><span><Icon name="heart"/></span><div><b>Free</b><small>Consultation Start</small></div></article>
    </section>

    <section className="ab-why" id="ab-why">
      <div className="ab-why-copy">
        <span>WHY CHOOSE PROPULSE</span>
        <h2>A Trusted Starting Point<br/>For Your Property Journey</h2>
        <p>ProPulse brings together structured requirements, transparent information and location-aware flows so customers can focus on the decisions that actually matter.</p>
        <button onClick={()=>navigate('/quote#construction')}>Get Free Consultation <Icon name="arrow" size={14}/></button>
      </div>
      <div className="ab-feature-grid">
        <article><span><Icon name="shield"/></span><div><b>Relevant Businesses</b><p>Your requirement is structured so suitable businesses can understand what you need.</p></div></article>
        <article><span><Icon name="receipt"/></span><div><b>Transparent Estimates</b><p>Use indicative estimators before comparing actual business quotations.</p></div></article>
        <article><span><Icon name="support"/></span><div><b>End-to-End Journey</b><p>Move from requirement to responses without losing your project context.</p></div></article>
        <article><span><Icon name="building"/></span><div><b>Wide Range of Options</b><p>Construction, interiors and real estate each have their own customer flow.</p></div></article>
        <article><span><Icon name="guide"/></span><div><b>Guided Experience</b><p>Clear questions help customers explain scope, location, budget and preferences.</p></div></article>
        <article><span><Icon name="gear"/></span><div><b>Hassle-Free Experience</b><p>A simple public flow without unnecessary professional marketplace clutter.</p></div></article>
      </div>
    </section>

    <section className="ab-values" id="ab-values">
      <div className="ab-values-copy"><span>OUR VALUES</span><h2>What Drives Us</h2><p>We are committed to making property journeys simple, transparent and reliable for customers.</p></div>
      <article><span><Icon name="handshake"/></span><b>Trust</b><p>Clear requirements and honest information.</p></article>
      <article><span><Icon name="award"/></span><b>Quality</b><p>Structured flows that improve the quality of conversations.</p></article>
      <article><span><Icon name="bulb"/></span><b>Innovation</b><p>Technology that makes the first step simpler and smarter.</p></article>
      <article><span><Icon name="people"/></span><b>Customer Focus</b><p>Customer needs stay at the centre of every public flow.</p></article>
    </section>

    <section className="ab-impact" id="ab-impact">
      <img src={IMPACT} alt="Premium residential project"/>
      <div className="ab-impact-copy"><span>OUR IMPACT</span><h2>Better Spaces.<em>Happier Lives.</em></h2><p>From dream homes to modern offices, from stylish interiors to better property decisions — ProPulse helps customers turn ideas into structured requirements.</p></div>
      <div className="ab-impact-actions">
        <button onClick={()=>navigate('/quote#construction')}>Start Your Project <Icon name="arrow" size={14}/></button>
        <ul><li><Icon name="check" size={14}/>Customer-first requirement flows</li><li><Icon name="check" size={14}/>Admin-managed cities and industries</li><li><Icon name="check" size={14}/>Construction, interiors and real estate</li><li><Icon name="check" size={14}/>Built for clearer project conversations</li></ul>
      </div>
    </section>

    <footer className="ab-footer">
      <div className="ab-footer-brand"><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Your customer starting point for construction, interiors and real-estate requirements.</p><div>f&nbsp;&nbsp;◎&nbsp;&nbsp;▶&nbsp;&nbsp;in</div></div>
      <div><b>Quick Links</b><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link to="/quote#property">Real Estate</Link><Link to="/projects">Projects</Link></div>
      <div><b>Our Services</b><Link to="/quote#construction">Home Construction</Link><Link to="/quote#interiors">Interior Design</Link><Link to="/quote#property">Real Estate</Link><Link to="/quote#construction">Construction Quote</Link><Link to="/quote#construction">Free Consultation</Link></div>
      <div><b>Support</b><Link to="/contact?audience=users">FAQ</Link><Link to="/#contact">Contact Us</Link><Link to="/contact?audience=users">Privacy Policy</Link><Link to="/contact?audience=users">Terms & Conditions</Link></div>
      <div><b>Contact Info</b>{phone&&<span><Icon name="phone" size={13}/>{phone}</span>}{email&&<span>{email}</span>}<span><Icon name="pin" size={13}/>Hyderabad, India</span></div>
    </footer>
  </main>
}
