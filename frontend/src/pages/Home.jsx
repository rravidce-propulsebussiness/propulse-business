import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Home.css'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import HeroBlueprintAnimation from '../components/HeroBlueprintAnimation'

const DEFAULT_HERO = 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=2200&q=92'

const SERVICES = [
  {
    key: 'build',
    eyebrow: 'Construction',
    title: 'Build Your Home',
    text: 'Independent house, villa, apartment and commercial construction.',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=88',
    icon: 'home',
  },
  {
    key: 'design',
    eyebrow: 'Interiors',
    title: 'Design Your Space',
    text: 'Home interiors, office interiors and customized spaces.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=88',
    icon: 'sofa',
  },
  {
    key: 'property',
    eyebrow: 'Real Estate',
    title: 'Find a Property',
    text: 'Buy or sell the right property with a clear requirement.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=88',
    icon: 'building',
  },
]

const BENEFITS = [
  { icon: 'clipboard', title: 'One Requirement, Multiple Options', text: 'Compare different solutions in one place.' },
  { icon: 'people', title: 'Relevant Professionals', text: 'Discover registered businesses for your requirement.' },
  { icon: 'layers', title: 'Package & Material Comparison', text: 'Compare packages, materials and estimates.' },
  { icon: 'consult', title: 'Free Consultation', text: 'Get initial guidance without any obligation.' },
]

const STEPS = [
  { number: '1', icon: 'clipboard', title: 'Share Your Requirement', text: 'Tell us about your plot, budget and preferences.' },
  { number: '2', icon: 'layers', title: 'Get Estimated Plan', text: 'Use the estimator to understand an indicative budget range.' },
  { number: '3', icon: 'people', title: 'Connect with Professionals', text: 'Relevant professionals can understand the same structured brief.' },
  { number: '4', icon: 'home', title: 'Move Forward', text: 'Compare quotations and choose the option you like.' },
]

const PROJECTS = [
  {
    title: 'Independent House',
    location: 'Hyderabad, Telangana',
    image: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=90',
  },
  {
    title: 'Living Room Interiors',
    location: 'Vijayawada, Andhra Pradesh',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=90',
  },
  {
    title: 'Apartment Project',
    location: 'Bengaluru, Karnataka',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=90',
  },
  {
    title: 'Modular Kitchen',
    location: 'Visakhapatnam, Andhra Pradesh',
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=90',
  },
]

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  if (name === 'home') return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if (name === 'sofa') return <svg {...common}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/><path d="M5 17v2M19 17v2"/></svg>
  if (name === 'building') return <svg {...common}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if (name === 'shield') return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'consult') return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>
  if (name === 'people') return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if (name === 'pin') return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if (name === 'clipboard') return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/></svg>
  if (name === 'layers') return <svg {...common}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'phone') return <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  return null
}

function openRequirement(flowKey = '') {
  window.dispatchEvent(new CustomEvent('propulse:open-lead-popup', {
    detail: { flowKey },
  }))
}

export default function Home() {
  const [contactData, setContactData] = useState({})
  const [homepageMedia, setHomepageMedia] = useState({ hero_image_url: '' })

  useEffect(() => {
    window.scrollTo(0, 0)
    let active = true
    Promise.allSettled([
      publicRequest('/contact?audience=website'),
      publicRequest('/homepage-media'),
    ]).then(([contactResult, mediaResult]) => {
      if (!active) return
      if (contactResult.status === 'fulfilled') setContactData(contactResult.value || {})
      if (mediaResult.status === 'fulfilled') {
        setHomepageMedia({ hero_image_url: mediaResult.value?.hero_image_url || '' })
      }
    })
    return () => { active = false }
  }, [])


  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''
  const heroImage = homepageMedia.hero_image_url || DEFAULT_HERO

  return <div className="hc-home">
    <PublicHeader />

    <main>
      <section className="hc-hero hc-premium-hero" id="home">
        <div className="hc-container hc-premium-hero-inner">
          <div className="hc-premium-hero-copy">
            <span className="hc-premium-kicker">BUILDING SPACES, ELEVATING LIVES</span>
            <h1>Don’t Leave Your <em>Dream Home</em> to <strong>Chance.</strong></h1>
            <p>Find the right partner. Build it right.</p>
            <div className="hc-premium-actions">
              <button type="button" onClick={() => openRequirement()}>Start Your Project <span aria-hidden="true">→</span></button>
              <a href="/packages">View Packages</a>
            </div>
            <div className="hc-premium-trust" aria-label="ProPulse benefits">
              <span><Icon name="clipboard" size={22}/>Free Consultation</span>
              <span><Icon name="layers" size={22}/>Relevant Professionals</span>
              <span><Icon name="check" size={22}/>Warranty Options</span>
            </div>
          </div>
          <div className="hc-premium-scene">
            <div className="hc-premium-scene-label"><small>YOUR PROJECT JOURNEY</small><b>Plot → Construction → Home → Interior</b></div>
            <HeroBlueprintAnimation />
          </div>
        </div>
      </section>

      <section className="hc-section hc-services">
        <div className="hc-container">
          <div className="hc-section-head hc-section-head-centered">
            <h2>What do you need?</h2>
          </div>
          <div className="hc-service-grid">
            {SERVICES.map(item => <article className="hc-service-card" key={item.key}>
              <img src={item.image} alt={item.title} loading="lazy" />
              <div className="hc-service-copy">
                <span className="hc-service-icon"><Icon name={item.icon} size={19}/></span>
                <div>
                  <h3>{item.title}</h3>
                  <b>{item.eyebrow}</b>
                  <p>{item.text}</p>
                </div>
                <button type="button" onClick={() => openRequirement(item.key)} aria-label={'Start '+item.title}><Icon name="arrow" size={15}/></button>
              </div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="hc-section hc-benefits">
        <div className="hc-container">
          <div className="hc-section-head compact hc-section-head-centered">
            <h2>Why Homeowners Choose ProPulse</h2>
          </div>
          <div className="hc-benefit-grid">
            {BENEFITS.map((item,index) => <article key={item.title}>
              <span className={'tone-'+(index+1)}><Icon name={item.icon} size={19}/></span>
              <div><h3>{item.title}</h3><p>{item.text}</p></div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="hc-section hc-how">
        <div className="hc-container">
          <div className="hc-section-head hc-section-head-centered">
            <h2>How It Works</h2>
          </div>
          <div className="hc-step-grid">
            {STEPS.map((step,index) => <article key={step.number}>
              <span className={'hc-step-number tone-'+(index+1)}>{step.number}</span>
              <span className={'hc-step-icon tone-'+(index+1)}><Icon name={step.icon} size={18}/></span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              {index < STEPS.length-1 && <i className="hc-step-arrow"><Icon name="arrow" size={15}/></i>}
            </article>)}
          </div>
        </div>
      </section>

      <section className="hc-section hc-projects">
        <div className="hc-container">
          <div className="hc-section-head hc-section-head-centered">
            <h2>Home Inspiration</h2>
          </div>
          <div className="hc-project-grid">
            {PROJECTS.map(project => <article key={project.title}>
              <img src={project.image} alt={project.title} loading="lazy"/>
              <div><h3>{project.title}</h3><p><Icon name="pin" size={12}/>{project.location}</p></div>
            </article>)}
          </div>
        </div>
      </section>


      <section className="hc-slim-cta">
        <div className="hc-container hc-slim-cta-inner">
          <img src={heroImage} alt="" loading="lazy"/>
          <div><h2>Ready to Start Your Project?</h2><p>Get expert guidance and compare the best options.</p></div>
          <div className="hc-slim-actions">
            <button type="button" onClick={() => openRequirement('')}>Start Your Requirement <Icon name="arrow" size={14}/></button>
            <Link to="/packages">View Packages</Link>
          </div>
        </div>
      </section>
    </main>

    <PublicFooter phone={phone} email={email} />
  </div>
}
