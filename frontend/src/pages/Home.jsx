import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Home.css'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import HeroBlueprintAnimation from '../components/HeroBlueprintAnimation'
import ScrollBuildStory from '../components/home/ScrollBuildStory'
import ConceptRealitySlider from '../components/home/ConceptRealitySlider'
import TechDashboard from '../components/home/TechDashboard'
import { TechScene } from '../components/home/HomeScenes'
import { useInView, useReducedMotion } from '../components/home/useHomeMotion'

const HOME_TRUST_HEADLINES = [
  { lead: 'Home Construction.', accent: ' Built Around Your Plot.' },
  { lead: 'Premium Interiors.', accent: ' Designed Room by Room.' },
  { lead: 'Smart Technology.', accent: ' Updates at Key Milestones.' },
  { lead: 'Clear Scope.', accent: ' Transparent Estimates.' },
]
const DEFAULT_HERO = 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1600&q=80'
const unsplash = (id, width = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=85`

const PILLARS = [
  {
    key: 'build', tone: 'construction', eyebrow: 'Direct Home Construction', title: 'Construction',
    text: 'Independent houses, villas and turnkey builds, planned around your plot, specifications and budget.',
    points: ['Plot, soil and approvals reviewed first', 'Drawings, BOQ and specifications agreed', 'Milestone-based execution and quality checks'],
    image: unsplash('1541888946425-d81bb19240f5', 1000), cta: { to: '/quote#construction', label: 'Get estimate' },
  },
  {
    key: 'design', tone: 'interiors', eyebrow: 'Direct Interior Execution', title: 'Interiors',
    text: 'Residential and commercial interiors, with room-wise scope, finishes and fittings agreed in writing.',
    points: ['Modular kitchens and wardrobes', 'False ceiling, lighting and wall finishes', 'Turnkey interior execution'],
    image: unsplash('1631679706909-1844bbd07221', 1000), cta: { to: '/packages#interior', label: 'Interior packages' },
  },
  {
    key: 'tech', tone: 'technology', eyebrow: 'Technology & Business OS', title: 'Technology',
    text: 'Software to run construction and interior businesses: leads, quotations, projects and client updates in one place.',
    points: ['CRM, quotations and contracts', 'Project, finance and billing tools', 'Client portal and WhatsApp updates'],
    cta: { to: '/technology', label: 'Explore products' },
  },
]

const MARQUEE = ['Independent houses', 'Villas', 'Turnkey construction', 'Modular kitchens', 'Wardrobes', 'False ceilings', 'Renovation', 'Business OS', 'CRM & quotations', 'Client portal', 'Verified professionals', 'Hyderabad']

const SERVICES = [
  { key: 'build', eyebrow: 'House Construction', title: 'Independent House Construction', text: 'Plan your home around your plot, built-up area, specifications and budget.', image: unsplash('1600566753190-17f0baa2a6c3'), icon: 'home' },
  { key: 'build', eyebrow: 'Villa Construction', title: 'Villa Construction', text: 'Explore construction planning for a new villa and multi-floor home.', image: unsplash('1600585152915-d208bec867a1'), icon: 'building' },
  { key: 'build', eyebrow: 'Turnkey Construction', title: 'Turnkey Construction', text: 'Discuss scope, materials, milestones and handover expectations in one brief.', image: unsplash('1600607687939-ce8a6c25118c'), icon: 'layers' },
  { key: 'design', eyebrow: 'Home Interiors', title: 'Home Interiors', text: 'Plan residential interiors with a clear room-wise scope and finish preferences.', image: unsplash('1600210492486-724fe5c67fb0'), icon: 'sofa' },
  { key: 'design', eyebrow: 'Renovation', title: 'Renovation & Remodeling', text: 'Describe the existing space, required changes and intended finish.', image: unsplash('1600607687920-4e2a09cf159d'), icon: 'building' },
]

const STEPS = [
  { number: '1', icon: 'consult', title: 'Plan & Consult', text: 'Discuss your plot, built-up area, budget and project goals.' },
  { number: '2', icon: 'layers', title: 'Design & Specify', text: 'Align drawings, materials, finishes and the scope of work.' },
  { number: '3', icon: 'people', title: 'Build & Review', text: 'Agree milestones, quality checks and project communication.' },
  { number: '4', icon: 'home', title: 'Handover', text: 'Review completed scope, documents and agreed handover items.' },
]

const CLARIFY = [
  { icon: 'clipboard', title: 'Defined Scope', text: 'Align built-up area, floor count, drawings and included work.', link: '/guides/home-construction-checklist' },
  { icon: 'layers', title: 'Material Specifications', text: 'Discuss grades, brands, finishes and quality checks before work begins.', link: '/guides/best-steel-for-house-construction' },
  { icon: 'people', title: 'Compare Professionals', text: 'Review published profiles and relevant work where available.', link: '/experts' },
  { icon: 'shield', title: 'Clear Commercial Terms', text: 'Ask about milestones, exclusions, variations, warranty and handover.', link: '/guides/choose-construction-contractor-hyderabad' },
]

const FAQS = [
  { q: 'Does ProPulse provide house construction in Hyderabad?', a: 'ProPulse directly undertakes selected independent-house and villa construction projects. Project location, scope, specifications and availability are reviewed before a proposal is confirmed.' },
  { q: 'What details are needed for a construction estimate?', a: 'Share your plot dimensions, location, planned built-up area, number of floors, drawings if available, preferred specifications, budget and expected timeline.' },
  { q: 'Can I explore interior design and turnkey options?', a: 'Yes. You can discuss room-wise interior requirements, modular kitchens, finishes and turnkey scope. The final inclusions and exclusions should be agreed in writing.' },
  { q: 'Can I compare independent construction professionals?', a: 'Explore published professional profiles and project information on ProPulse. Check credentials, relevant work, references and written commercial terms before appointing a provider.' },
]

// These are explicitly labelled as illustrative inspiration. They are never presented
// as completed ProPulse work when no public project has been published.
const INSPIRATION = [
  { title: 'Independent House Inspiration', image: unsplash('1600585152915-d208bec867a1') },
  { title: 'Living Room Interior Inspiration', image: unsplash('1600210492486-724fe5c67fb0') },
  { title: 'Apartment Design Inspiration', image: unsplash('1545324418-cc1a3fa10c00') },
  { title: 'Modular Kitchen Inspiration', image: unsplash('1556911220-bff31c812dba') },
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
  if (name === 'clipboard') return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/></svg>
  if (name === 'layers') return <svg {...common}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>
  if (name === 'chip') return <svg {...common}><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><path d="M10 10h4v4h-4z"/></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'play') return <svg {...common}><path d="M7 4v16l13-8z" fill="currentColor"/></svg>
  if (name === 'pause') return <svg {...common}><path d="M8 5v14M16 5v14" strokeWidth="3"/></svg>
  return null
}

function openRequirement(flowKey = '') { window.dispatchEvent(new CustomEvent('propulse:open-lead-popup', { detail: { flowKey } })) }

function useTypewriter(reduced) {
  const [state, setState] = useState({ index: 0, length: 0, phase: 'typing' })
  useEffect(() => {
    if (reduced) return undefined
    const timeout = window.setTimeout(() => {
      setState(current => {
        const phrase = HOME_TRUST_HEADLINES[current.index]
        const phraseLength = phrase.lead.length + phrase.accent.length
        if (current.phase === 'typing') return current.length < phraseLength ? { ...current, length: current.length + 1 } : { ...current, phase: 'holding' }
        if (current.phase === 'holding') return { ...current, phase: 'erasing' }
        if (current.phase === 'erasing') return current.length > 0 ? { ...current, length: current.length - 1 } : { index: (current.index + 1) % HOME_TRUST_HEADLINES.length, length: 0, phase: 'typing' }
        return current
      })
    }, state.phase === 'holding' ? 2000 : state.phase === 'erasing' ? 28 : 58)
    return () => window.clearTimeout(timeout)
  }, [state, reduced])
  if (reduced) return { phrase: HOME_TRUST_HEADLINES[0], length: 999 }
  return { phrase: HOME_TRUST_HEADLINES[state.index], length: state.length }
}

// Pointer-follow tilt for premium cards; CSS only applies it on hover-capable devices.
function useTilt() {
  const ref = useRef(null)
  const onPointerMove = event => {
    const node = ref.current
    if (!node || event.pointerType !== 'mouse') return
    const rect = node.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    node.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg')
    node.style.setProperty('--ry', (x * 8).toFixed(2) + 'deg')
    node.style.setProperty('--mx', ((x + 0.5) * 100).toFixed(1) + '%')
    node.style.setProperty('--my', ((y + 0.5) * 100).toFixed(1) + '%')
  }
  const onPointerLeave = () => { const node = ref.current; if (node) { node.style.setProperty('--rx', '0deg'); node.style.setProperty('--ry', '0deg') } }
  return { ref, onPointerMove, onPointerLeave }
}

function PillarCard({ item, index }) {
  const tilt = useTilt()
  return <article className={'ph-pillar ph-pillar-' + item.tone} {...tilt}>
    <div className="ph-pillar-media">
      {item.image ? <img src={item.image} alt={item.title + ' by ProPulse'} loading="lazy" decoding="async"/> : <TechScene stage={4}/>}
      <span className="ph-pillar-num">0{index + 1}</span>
    </div>
    <div className="ph-pillar-body">
      <small>{item.eyebrow}</small>
      <h3>{item.title}</h3>
      <p>{item.text}</p>
      <ul>{item.points.map(point => <li key={point}><Icon name="check" size={15}/>{point}</li>)}</ul>
      <div className="ph-pillar-actions">
        <Link to={item.cta.to}>{item.cta.label} <Icon name="arrow" size={15}/></Link>
        {item.key !== 'tech' && <button type="button" onClick={() => openRequirement(item.key)}>Talk to us</button>}
      </div>
    </div>
  </article>
}

function JourneyVideo({ reduced }) {
  const [ref, inView] = useInView({ threshold: 0.35 })
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (inView && !reduced && !userPaused) {
      if (video.preload !== 'auto') video.preload = 'auto'
      video.play().catch(() => {})
    } else video.pause()
  }, [inView, reduced, userPaused])
  const toggle = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) { setUserPaused(false); video.play().catch(() => {}) }
    else { setUserPaused(true); video.pause() }
  }
  return <div className="ph-video" ref={ref}>
    <video ref={videoRef} src="/media/propulse-home-reel.mp4" poster="/media/propulse-home-reel-poster.jpg" muted loop playsInline preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label="Animated walkthrough of a modern home exterior and its finished interior"/>
    <span className="ph-video-tag"><i/>Concept walkthrough</span>
    <button type="button" className="ph-video-toggle" onClick={toggle} aria-label={playing ? 'Pause video' : 'Play video'}><Icon name={playing ? 'pause' : 'play'} size={16}/></button>
  </div>
}

export default function Home() {
  const reduced = useReducedMotion()
  const [contactData, setContactData] = useState({})
  const [homepageMedia, setHomepageMedia] = useState({ hero_image_url: '' })
  const [publishedProjects, setPublishedProjects] = useState([])
  const typed = useTypewriter(reduced)
  const heroRef = useRef(null)
  const ctaRef = useRef(null)
  const projectsRef = useRef(null)
  const [stepsRef, stepsIn] = useInView({ once: true, threshold: 0.3 })

  useEffect(() => {
    let active = true
    publicRequest('/contact?audience=website')
      .then(value => { if (active) setContactData(value || {}) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    const section = projectsRef.current
    if (!section) return undefined
    let active = true
    const loadProjects = () => {
      publicRequest('/experts/projects?page=1&pageSize=4')
        .then(value => {
          if (!active) return
          const rows = Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []
          setPublishedProjects(rows.slice(0, 4))
        })
        .catch(() => {})
    }
    if (!('IntersectionObserver' in window)) {
      loadProjects()
      return () => { active = false }
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect()
        loadProjects()
      }
    }, { rootMargin: '500px 0px' })
    observer.observe(section)
    return () => { active = false; observer.disconnect() }
  }, [])

  useEffect(() => {
    const section = ctaRef.current
    if (!section) return undefined
    let active = true
    const loadMedia = () => {
      publicRequest('/homepage-media')
        .then(value => { if (active) setHomepageMedia({ hero_image_url: value?.hero_image_url || '' }) })
        .catch(() => {})
    }
    if (!('IntersectionObserver' in window)) {
      loadMedia()
      return () => { active = false }
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect()
        loadMedia()
      }
    }, { rootMargin: '500px 0px' })
    observer.observe(section)
    return () => { active = false; observer.disconnect() }
  }, [])

  // Soft spotlight that follows the pointer across the hero (mouse only).
  const onHeroPointerMove = event => {
    if (event.pointerType !== 'mouse' || reduced) return
    const node = heroRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    node.style.setProperty('--spot-x', (event.clientX - rect.left) + 'px')
    node.style.setProperty('--spot-y', (event.clientY - rect.top) + 'px')
  }

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''
  const heroImage = homepageMedia.hero_image_url || DEFAULT_HERO
  const hasPublishedProjects = publishedProjects.length > 0
  const typedLead = typed.phrase.lead.slice(0, typed.length)
  const typedAccent = typed.phrase.accent.slice(0, Math.max(0, typed.length - typed.phrase.lead.length))

  return <div className={'hc-home ph-home' + (reduced ? ' is-reduced' : '')}>
    <PublicHeader />
    <main>
      <section className="hc-hero ph-hero" id="home" ref={heroRef} onPointerMove={onHeroPointerMove}>
        <div className="ph-hero-bg" aria-hidden="true">
          <svg className="ph-hero-lines" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
            <path d="M-20 560 C 240 470, 420 640, 700 520 S 1100 380, 1240 430"/>
            <path d="M-20 600 C 260 520, 460 690, 720 570 S 1100 440, 1240 480"/>
            <path d="M80 0v700M280 0v700M480 0v700M680 0v700M880 0v700M1080 0v700" className="ph-hero-grid"/>
            <path d="M0 140h1200M0 340h1200M0 540h1200" className="ph-hero-grid"/>
          </svg>
          <span className="ph-orb ph-orb-a"/><span className="ph-orb ph-orb-b"/><span className="ph-hero-spot"/>
        </div>
        <div className="hc-container ph-hero-inner">
          <div className="ph-hero-copy">
            <span className="ph-kicker"><i aria-hidden="true"/>HOUSE CONSTRUCTION COMPANY IN HYDERABAD</span>
            <h1>Build Your <em>Dream Home</em> in <strong>Hyderabad.</strong></h1>
            <p className="ph-typewriter">
              <span className="sr-only">Home construction, premium interiors and smart project technology in Hyderabad, with a clear scope and transparent estimates.</span>
              <span aria-hidden="true"><span className="ph-typed-lead">{typedLead}</span><span className="ph-typed-accent">{typedAccent}</span><span className="ph-caret"/></span>
            </p>
            <p className="ph-hero-intro">Planning an independent house or villa? Share your plot size, built-up area, floors, budget and preferred specifications. ProPulse helps you take the next step with a structured construction brief. Interiors and independent professionals are available too.</p>
            <div className="ph-hero-actions">
              <Link className="ph-btn ph-btn-primary" to="/quote#construction"><span>Get Construction Estimate</span><Icon name="arrow" size={17}/></Link>
              <button className="ph-btn ph-btn-ghost" type="button" onClick={() => openRequirement('')}><span>Talk to Our Team</span><Icon name="arrow" size={17}/></button>
            </div>
            <div className="ph-hero-trust" aria-label="Construction planning priorities">
              <span><Icon name="clipboard" size={18}/>Clear Scope</span>
              <span><Icon name="layers" size={18}/>Material Specifications</span>
              <span><Icon name="check" size={18}/>Transparent Estimates</span>
            </div>
          </div>
          <div className="ph-hero-visual"><HeroBlueprintAnimation /></div>
        </div>
        <a className="ph-scroll-cue" href="#divisions" aria-label="Scroll to ProPulse divisions"><span/></a>
      </section>

      <div className="ph-marquee" aria-hidden="true" data-no-scroll-reveal>
        <div className="ph-marquee-track">{[...MARQUEE, ...MARQUEE].map((item, index) => <span key={index}>{item}<i/></span>)}</div>
      </div>

      <section className="ph-section ph-divisions" id="divisions">
        <div className="hc-container">
          <div className="ph-head">
            <span className="ph-eyebrow">ONE PARTNER · THREE DIVISIONS</span>
            <h2>Construction, interiors and technology, <em>working together.</em></h2>
            <p>Build the house, design the rooms and track every milestone, without juggling separate vendors.</p>
          </div>
          <div className="ph-pillars">{PILLARS.map((item, index) => <PillarCard key={item.key} item={item} index={index}/>)}</div>
          <div className="ph-market">
            <span className="ph-market-icon"><Icon name="people" size={22}/></span>
            <div><b>Professional Marketplace</b><p>Compare independent businesses and their published work. Professionals can buy verified project leads.</p></div>
            <Link to="/experts">Find Professionals <Icon name="arrow" size={15}/></Link>
            <Link to="/packages" className="ph-market-alt">View all packages <Icon name="arrow" size={15}/></Link>
          </div>
        </div>
      </section>

      <section className="ph-section ph-build" aria-labelledby="ph-build-title" data-no-scroll-reveal>
        <div className="hc-container">
          <div className="ph-head ph-head-left">
            <span className="ph-eyebrow">CONSTRUCTION, STEP BY STEP</span>
            <h2 id="ph-build-title">Scroll to watch your home <em>come together.</em></h2>
            <p>Every stage is planned, specified and reviewed before the next one begins.</p>
          </div>
          <ScrollBuildStory />
        </div>
      </section>

      <section className="ph-section ph-interiors" aria-labelledby="ph-interiors-title" data-no-scroll-reveal>
        <div className="hc-container ph-split">
          <ConceptRealitySlider />
          <div className="ph-split-copy">
            <span className="ph-eyebrow">INTERIORS</span>
            <h2 id="ph-interiors-title">From drawing to <em>finished room.</em></h2>
            <p>Drag the slider to see how a design drawing becomes a finished space. Every room gets its own scope: layout, joinery, finishes and lighting, agreed before work begins.</p>
            <ul className="ph-ticks">
              <li><Icon name="check" size={16}/>Room-wise scope and material schedule</li>
              <li><Icon name="check" size={16}/>Modular kitchen, wardrobes and storage</li>
              <li><Icon name="check" size={16}/>Lighting, ceilings and wall finishes</li>
            </ul>
            <div className="ph-inline-actions"><button type="button" className="ph-btn ph-btn-primary" onClick={() => openRequirement('design')}><span>Plan my interiors</span><Icon name="arrow" size={16}/></button><Link className="ph-text-link" to="/packages">View interior packages <Icon name="arrow" size={15}/></Link></div>
          </div>
        </div>
      </section>

      <section className="ph-section ph-tech-band" aria-labelledby="ph-tech-title" data-no-scroll-reveal>
        <div className="hc-container ph-split ph-split-reverse">
          <div className="ph-split-copy">
            <span className="ph-eyebrow">TECHNOLOGY</span>
            <h2 id="ph-tech-title">See every milestone, <em>as it happens.</em></h2>
            <p>The ProPulse Business OS keeps enquiries, quotations, site progress and payments in one place, so owners and teams always know what is done and what is next.</p>
            <div className="ph-tech-grid">
              {[['clipboard', 'CRM & quotations'], ['layers', 'Project tracking'], ['shield', 'Finance & billing'], ['chip', 'Client portal']].map(([icon, label]) => <span key={label}><Icon name={icon} size={18}/>{label}</span>)}
            </div>
            <div className="ph-inline-actions"><Link className="ph-btn ph-btn-light" to="/technology"><span>Explore Products &amp; Services</span><Icon name="arrow" size={16}/></Link></div>
          </div>
          <TechDashboard />
        </div>
      </section>

      <section className="ph-section ph-journey" aria-labelledby="ph-journey-title" data-no-scroll-reveal>
        <div className="hc-container ph-journey-inner">
          <JourneyVideo reduced={reduced} />
          <div className="ph-journey-copy">
            <span className="ph-eyebrow">PLOT TO KEYS</span>
            <h2 id="ph-journey-title">One brief. <em>One team.</em> One home you love.</h2>
            <p>Start with a single requirement. We plan the structure, design the interiors and keep you updated, from the first site visit to handover.</p>
            <ol className="ph-journey-steps">
              <li><b>Share your brief</b><span>Plot, floors, budget and style</span></li>
              <li><b>Get a clear estimate</b><span>Scope and specifications in writing</span></li>
              <li><b>Build and furnish</b><span>Tracked milestones, one point of contact</span></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="hc-section ph-section hc-services" aria-labelledby="ph-services-title">
        <div className="hc-container">
          <div className="ph-head"><span className="ph-eyebrow">SERVICES</span><h2 id="ph-services-title">House Construction Services in Hyderabad</h2><p>Pick a service to start a guided requirement. It takes about two minutes.</p></div>
          <div className="hc-service-grid">{SERVICES.map(item => <article className="hc-service-card" key={item.title}>
            <div className="hc-service-media"><img src={item.image} alt={item.title} loading="lazy" decoding="async"/><span className="hc-service-icon"><Icon name={item.icon} size={18}/></span></div>
            <div className="hc-service-copy"><b>{item.eyebrow}</b><h3>{item.title}</h3><p>{item.text}</p><button type="button" onClick={() => openRequirement(item.key)} aria-label={'Start ' + item.title}>Start <Icon name="arrow" size={14}/></button></div>
          </article>)}</div>
        </div>
      </section>

      <section className="hc-section ph-section hc-how" aria-labelledby="ph-how-title">
        <div className="hc-container">
          <div className="ph-head"><span className="ph-eyebrow">HOW IT WORKS</span><h2 id="ph-how-title">How It Works: A Clear, Transparent Construction Process</h2></div>
          <div className={'hc-step-grid' + (stepsIn ? ' is-in' : '')} ref={stepsRef} data-no-scroll-reveal>
            <svg className="ph-step-line" viewBox="0 0 1000 8" preserveAspectRatio="none" aria-hidden="true"><path d="M0 4h1000"/></svg>
            {STEPS.map((step, index) => <article key={step.number} style={{ '--i': index }}>
              <span className="hc-step-number">{step.number}</span>
              <span className="hc-step-icon"><Icon name={step.icon} size={20}/></span>
              <h3>{step.title}</h3><p>{step.text}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="hc-section ph-section hc-secondary-paths" aria-labelledby="ph-needs-title">
        <div className="hc-container">
          <div className="ph-head ph-head-left"><span className="ph-eyebrow">OTHER WAYS WE CAN HELP</span><h2 id="ph-needs-title">What do you need?</h2><p>Construction leads the way. Explore ProPulse’s other divisions when your project needs them.</p></div>
          <div className="hc-secondary-path-grid">
            <article><span>01</span><h3>Build Your Home</h3><p><strong>Direct Home Construction</strong> for homeowners planning a house or villa, with scope and specifications discussed before an estimate.</p><button type="button" onClick={() => openRequirement('build')}>Plan construction <span aria-hidden="true">→</span></button></article>
            <article><span>02</span><h3>Design Your Space</h3><p><strong>Direct Interior Execution</strong> for homeowners planning interiors, finishes and space improvements.</p><button type="button" onClick={() => openRequirement('design')}>Explore interiors <span aria-hidden="true">→</span></button></article>
            <article><span>03</span><h3>Find a Property</h3><p>Buy or sell the right property, or compare independent professionals through the ProPulse marketplace.</p><Link to="/experts">Find Professionals <span aria-hidden="true">→</span></Link></article>
          </div>
          <p className="hc-secondary-path-note">Our Construction, Interiors, Marketplace &amp; Technology Divisions serve different needs. Technology tools support construction businesses; service availability and scope are confirmed for each enquiry.</p>
        </div>
      </section>

      <section className="hc-section ph-section hc-benefits" aria-labelledby="ph-clarify-title">
        <div className="hc-container">
          <div className="ph-head"><span className="ph-eyebrow">BEFORE YOU BUILD</span><h2 id="ph-clarify-title">What to Clarify Before You Build</h2></div>
          <div className="hc-benefit-grid">{CLARIFY.map(item => <article key={item.title}><span><Icon name={item.icon} size={20}/></span><h3>{item.title}</h3><p>{item.text}</p><Link to={item.link}>Explore details <Icon name="arrow" size={14}/></Link></article>)}</div>
        </div>
      </section>

      <section className="hc-section ph-section hc-projects" aria-labelledby="ph-projects-title" ref={projectsRef}>
        <div className="hc-container">
          <div className="ph-head">
            <span className="ph-eyebrow">{hasPublishedProjects ? 'PROJECTS' : 'INSPIRATION'}</span>
            <h2 id="ph-projects-title">{hasPublishedProjects ? 'Published Construction & Interior Projects' : 'Home Design Inspiration'}</h2>
            <p>{hasPublishedProjects ? 'Real projects published by eligible ProPulse businesses. Open a project to see its public details and video when available.' : 'Illustrative design inspiration only. These images are not presented as completed ProPulse projects.'}</p>
          </div>
          <div className="hc-project-grid">
            {hasPublishedProjects ? publishedProjects.map(project => {
              const image = projectImage(project)
              return <article key={project.project_id || project.id}><Link to={projectPath(project)} aria-label={'View ' + clean(project.title)}>{image ? <img src={image} alt={clean(project.title)} loading="lazy" decoding="async"/> : <div className="hc-project-placeholder" aria-hidden="true">Project video</div>}<div><h3>{clean(project.title) || 'Published project'}</h3><p>{clean(project.location_text) || 'Published project'}</p></div></Link></article>
            }) : INSPIRATION.map(project => <article key={project.title}><img src={project.image} alt={project.title} loading="lazy" decoding="async"/><div><h3>{project.title}</h3><p>Illustrative reference</p></div></article>)}
          </div>
          {hasPublishedProjects && <p className="hc-projects-more"><Link to="/projects">View all published projects →</Link></p>}
        </div>
      </section>

      <section className="hc-section ph-section pp-home-faq" aria-labelledby="pp-home-faq-title">
        <div className="hc-container ph-faq">
          <div className="ph-head ph-head-left">
            <span className="ph-eyebrow">QUICK ANSWERS</span>
            <h2 id="pp-home-faq-title">Planning a Construction or Interior Project?</h2>
            <p>Useful starting points before you request an estimate or speak with a professional.</p>
            <p className="pp-home-faq-more">Need more detail? <Link to="/faq">Browse construction, interior and property FAQs</Link>.</p>
          </div>
          <div className="ph-faq-list">{FAQS.map((item, index) => <details key={item.q} open={index === 0}><summary><h3>{item.q}</h3><i aria-hidden="true"/></summary><p>{item.a}</p></details>)}</div>
        </div>
      </section>

      <section className="hc-slim-cta ph-cta" data-no-scroll-reveal ref={ctaRef}>
        <div className="hc-container">
          <div className="ph-cta-card">
            <img src={heroImage} alt="" loading="lazy" decoding="async"/>
            <svg className="ph-cta-house" viewBox="0 0 220 160" aria-hidden="true"><path d="M10 150h200M30 150V78l80-58 80 58v72M78 150v-44h64v44M52 96h22v20H52zM146 96h22v20h-22z"/></svg>
            <div className="ph-cta-copy"><h2>Ready to Start Your Project?</h2><p>Start planning your house construction in Hyderabad with a structured project requirement.</p></div>
            <div className="ph-cta-actions">
              <button type="button" className="ph-btn ph-btn-primary" aria-label="Start Your Requirement — Get Construction Estimate" onClick={() => openRequirement('build')}><span>Get Construction Estimate</span><Icon name="arrow" size={16}/></button>
              <Link className="ph-btn ph-btn-glass" to="/packages"><span>View Packages</span></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
    <PublicFooter phone={phone} email={email} />
  </div>
}
