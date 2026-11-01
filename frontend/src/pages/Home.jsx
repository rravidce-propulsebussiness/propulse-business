import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Home.css'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import HeroBlueprintAnimation from '../components/HeroBlueprintAnimation'

const HOME_TRUST_HEADLINES = [
  { lead: 'Clear Scope.', accent: ' Transparent Estimates.' },
  { lead: 'Construction Planning.', accent: ' Built Around Your Plot.' },
  { lead: 'Material Specifications.', accent: ' Clearly Discussed.' },
  { lead: 'Project Updates.', accent: ' At Key Milestones.' },
  { lead: 'Compare Options.', accent: ' Make an Informed Choice.' },
]
const DEFAULT_HERO = 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=2200&q=92'

const SERVICES = [
  { key: 'build', eyebrow: 'House Construction', title: 'Independent House Construction', text: 'Plan your home around your plot, built-up area, specifications and budget.', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=88', icon: 'home' },
  { key: 'build', eyebrow: 'Villa Construction', title: 'Villa Construction', text: 'Explore construction planning for a new villa and multi-floor home.', image: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=88', icon: 'building' },
  { key: 'build', eyebrow: 'Turnkey Construction', title: 'Turnkey Construction', text: 'Discuss scope, materials, milestones and handover expectations in one brief.', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=88', icon: 'layers' },
  { key: 'design', eyebrow: 'Home Interiors', title: 'Home Interiors', text: 'Plan residential interiors with a clear room-wise scope and finish preferences.', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=88', icon: 'sofa' },
  { key: 'design', eyebrow: 'Renovation', title: 'Renovation & Remodeling', text: 'Describe the existing space, required changes and intended finish.', image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=88', icon: 'building' },
]

const BENEFITS = [
  { icon: 'home', title: 'Direct Home Construction', text: 'ProPulse directly undertakes independent-house and villa construction.', link: '/contact' },
  { icon: 'sofa', title: 'Direct Interior Execution', text: 'ProPulse designs and executes residential and commercial interiors.', link: '/contact' },
  { icon: 'people', title: 'Professional Marketplace', text: 'Compare independent businesses. Professionals can buy project leads.', link: '/experts' },
  { icon: 'layers', title: 'Technology & Business OS', text: 'Software to manage construction and interior businesses.', link: '/technology' },
]

const STEPS = [
  { number: '1', icon: 'clipboard', title: 'Share Your Requirement', text: 'Tell us about your plot, budget and preferences.' },
  { number: '2', icon: 'layers', title: 'Get Estimated Plan', text: 'Use the estimator to understand an indicative budget range.' },
  { number: '3', icon: 'people', title: 'Connect with Professionals', text: 'Relevant professionals can understand the same structured brief.' },
  { number: '4', icon: 'home', title: 'Move Forward', text: 'Compare quotations and choose the option you like.' },
]

// These are explicitly labelled as illustrative inspiration. They are never presented
// as completed ProPulse work when no public project has been published.
const INSPIRATION = [
  { title: 'Independent House Inspiration', image: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=90' },
  { title: 'Living Room Interior Inspiration', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=90' },
  { title: 'Apartment Design Inspiration', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=90' },
  { title: 'Modular Kitchen Inspiration', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=90' },
]

function clean(value) { return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim() }
function projectPath(project) { return '/projects/' + (clean(project.seo_slug) || 'project-' + (project.project_id || project.id)) }
function projectImage(project) { return clean(project.video_thumbnail_url) || clean(project.cover_image_url) || (Array.isArray(project.image_urls) ? clean(project.image_urls[0]) : '') }

function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
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

function openRequirement(flowKey = '') { window.dispatchEvent(new CustomEvent('propulse:open-lead-popup', { detail: { flowKey } })) }

export default function Home() {
  const [contactData, setContactData] = useState({})
  const [homepageMedia, setHomepageMedia] = useState({ hero_image_url: '' })
  const [publishedProjects, setPublishedProjects] = useState([])
  const [trustTyping, setTrustTyping] = useState({ index: 0, length: 0, phase: 'typing' })
  const activeTrustHeadline = HOME_TRUST_HEADLINES[trustTyping.index]

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setTrustTyping({ index: 0, length: HOME_TRUST_HEADLINES[0].lead.length + HOME_TRUST_HEADLINES[0].accent.length, phase: 'static' })
      return
    }
    const timeout = window.setTimeout(() => {
      setTrustTyping(current => {
        const phrase = HOME_TRUST_HEADLINES[current.index]
        const phraseLength = phrase.lead.length + phrase.accent.length
        if (current.phase === 'typing') return current.length < phraseLength ? { ...current, length: current.length + 1 } : { ...current, phase: 'holding' }
        if (current.phase === 'holding') return { ...current, phase: 'erasing' }
        if (current.phase === 'erasing') return current.length > 0 ? { ...current, length: current.length - 1 } : { index: (current.index + 1) % HOME_TRUST_HEADLINES.length, length: 0, phase: 'typing' }
        return current
      })
    }, trustTyping.phase === 'holding' ? 2000 : trustTyping.phase === 'erasing' ? 34 : 65)
    return () => window.clearTimeout(timeout)
  }, [trustTyping])

  useEffect(() => {
    let active = true
    Promise.allSettled([
      publicRequest('/contact?audience=website'),
      publicRequest('/homepage-media'),
      publicRequest('/experts/projects?page=1&pageSize=4'),
    ]).then(([contactResult, mediaResult, projectsResult]) => {
      if (!active) return
      if (contactResult.status === 'fulfilled') setContactData(contactResult.value || {})
      if (mediaResult.status === 'fulfilled') setHomepageMedia({ hero_image_url: mediaResult.value?.hero_image_url || '' })
      if (projectsResult.status === 'fulfilled') {
        const value = projectsResult.value
        const rows = Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []
        setPublishedProjects(rows.slice(0, 4))
      }
    })
    return () => { active = false }
  }, [])

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''
  const heroImage = homepageMedia.hero_image_url || DEFAULT_HERO
  const hasPublishedProjects = publishedProjects.length > 0

  return <div className="hc-home">
    <PublicHeader />
    <main>
      <section className="hc-hero hc-premium-hero" id="home">
        <div className="hc-container hc-premium-hero-inner">
          <div className="hc-premium-hero-copy">
            <span className="hc-premium-kicker">HOUSE CONSTRUCTION COMPANY IN HYDERABAD</span>
            <h1>Build Your <em>Dream Home</em> in <strong>Hyderabad.</strong></h1>
            <p className="hc-premium-typewriter" style={{ position: 'relative', minHeight: '1.4em', margin: '22px 0 26px', fontFamily: "'Sora', Inter, ui-sans-serif, sans-serif", fontSize: 'clamp(14px,2.4vw,23px)', fontWeight: 700, letterSpacing: '-.035em', lineHeight: 1.4 }}>
              <span className="hc-premium-typewriter-sr" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>Plan house construction in Hyderabad with a clear scope, transparent estimates and construction requirements tailored to your plot and budget.</span>
              <span className="hc-premium-typewriter-line" aria-hidden="true" style={{ position: 'relative', display: 'block', minHeight: '1.4em' }}>
                <span className="hc-premium-typewriter-lead" style={{ color: '#f7f9ff' }}>{activeTrustHeadline.lead.slice(0, trustTyping.length)}</span>
                <span className="hc-premium-typewriter-accent" style={{ color: '#ff9d70' }}>{activeTrustHeadline.accent.slice(0, Math.max(0, trustTyping.length - activeTrustHeadline.lead.length))}</span>
                <span className="hc-premium-typewriter-caret" style={{ display: 'inline-block', width: '2px', height: '1.07em', marginLeft: '3px', background: '#ff8c56', verticalAlign: '-.12em' }} />
              </span>
            </p>
            <p className="hc-business-intro">Planning an independent house or villa? Share your plot size, built-up area, floors, budget and preferred specifications. ProPulse helps you take the next step with a structured construction brief. Interiors and independent professionals are available too.</p>
            <div className="hc-premium-actions"><button className="hc-hero-cta hc-hero-cta-primary" type="button" onClick={() => openRequirement('build')}><span className="hc-hero-cta-label">Get Construction Estimate</span><span className="hc-hero-cta-arrow" aria-hidden="true">→</span></button><Link className="hc-hero-cta hc-hero-cta-secondary" to="/contact"><span className="hc-hero-cta-label">Talk to Our Team</span><span className="hc-hero-cta-arrow" aria-hidden="true">→</span></Link></div>
            <div className="hc-premium-trust" aria-label="Construction planning priorities"><span><Icon name="clipboard" size={22}/>Clear Scope</span><span><Icon name="layers" size={22}/>Material Specifications</span><span><Icon name="check" size={22}/>Transparent Estimates</span></div>
          </div>
          <div className="hc-premium-scene"><HeroBlueprintAnimation /></div>
        </div>
      </section>
      <section className="hc-section hc-services"><div className="hc-container"><div className="hc-section-head hc-section-head-centered"><h2>House Construction Services in Hyderabad</h2></div><div className="hc-service-grid">{SERVICES.map(item => <article className="hc-service-card" key={item.title}><img src={item.image} alt={item.title} loading="lazy"/><div className="hc-service-copy"><span className="hc-service-icon"><Icon name={item.icon} size={19}/></span><div><h3>{item.title}</h3><b>{item.eyebrow}</b><p>{item.text}</p></div><button type="button" onClick={() => openRequirement(item.key)} aria-label={'Start '+item.title}><Icon name="arrow" size={15}/></button></div></article>)}</div></div></section>
      <section className="hc-section hc-benefits"><div className="hc-container"><div className="hc-section-head compact hc-section-head-centered"><h2>What to Clarify Before You Build</h2></div><div className="hc-benefit-grid">{[{icon:'clipboard',title:'Defined Scope',text:'Align built-up area, floor count, drawings and included work.',link:'/guides/home-construction-checklist'},{icon:'layers',title:'Material Specifications',text:'Discuss grades, brands, finishes and quality checks before work begins.',link:'/guides/best-steel-for-house-construction'},{icon:'people',title:'Compare Professionals',text:'Review published profiles and relevant work where available.',link:'/experts'},{icon:'shield',title:'Clear Commercial Terms',text:'Ask about milestones, exclusions, variations, warranty and handover.',link:'/guides/choose-construction-contractor-hyderabad'}].map((item,index) => <article key={item.title}><span className={'tone-'+(index+1)}><Icon name={item.icon} size={19}/></span><div><h3>{item.title}</h3><p>{item.text}</p><Link to={item.link}>Learn more →</Link></div></article>)}</div></div></section>
      <section className="hc-section hc-how"><div className="hc-container"><div className="hc-section-head hc-section-head-centered"><h2>How It Works</h2></div><div className="hc-step-grid">{STEPS.map((step,index) => <article key={step.number}><span className={'hc-step-number tone-'+(index+1)}>{step.number}</span><span className={'hc-step-icon tone-'+(index+1)}><Icon name={step.icon} size={18}/></span><h3>{step.title}</h3><p>{step.text}</p>{index < STEPS.length-1 && <i className="hc-step-arrow"><Icon name="arrow" size={15}/></i>}</article>)}</div></div></section>
      <section className="hc-section hc-projects">
        <div className="hc-container">
          <div className="hc-section-head hc-section-head-centered">
            <h2>{hasPublishedProjects ? 'Published Construction & Interior Projects' : 'Home Design Inspiration'}</h2>
            <p>{hasPublishedProjects ? 'Real projects published by eligible ProPulse businesses. Open a project to see its public details and video when available.' : 'Illustrative design inspiration only. These images are not presented as completed ProPulse projects.'}</p>
          </div>
          <div className="hc-project-grid">
            {hasPublishedProjects ? publishedProjects.map(project => {
              const image = projectImage(project)
              return <article key={project.project_id || project.id}><Link to={projectPath(project)} aria-label={'View '+clean(project.title)}>{image ? <img src={image} alt={clean(project.title)} loading="lazy"/> : <div className="hc-project-placeholder" aria-hidden="true">Project video</div>}<div><h3>{clean(project.title) || 'Published project'}</h3><p>{clean(project.location_text) || 'Published project'}</p></div></Link></article>
            }) : INSPIRATION.map(project => <article key={project.title}><img src={project.image} alt={project.title} loading="lazy"/><div><h3>{project.title}</h3><p>Illustrative reference</p></div></article>)}
          </div>
          {hasPublishedProjects && <p className="hc-projects-more"><Link to="/projects">View all published projects →</Link></p>}
        </div>
      </section>
      <section className="hc-slim-cta"><div className="hc-container hc-slim-cta-inner"><img src={heroImage} alt="" loading="lazy"/><div><h2>Ready to Start Your Project?</h2><p>Start planning your house construction in Hyderabad with a structured project requirement.</p></div><div className="hc-slim-actions"><button type="button" onClick={() => openRequirement('build')}>Get Construction Estimate <Icon name="arrow" size={14}/></button><Link to="/packages">View Packages</Link></div></div></section>
    </main>
    <PublicFooter phone={phone} email={email} />
  </div>
}