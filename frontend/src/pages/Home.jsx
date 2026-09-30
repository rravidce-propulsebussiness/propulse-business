import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import WebsiteFaqSection from '../components/WebsiteFaqSection'
import './Home.css'

const WHY_IMAGE = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2200&q=88'
const FINAL_IMAGE = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1800&q=88'

function makeSubmissionKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'consult_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12)
}

const emptyConsultation = () => ({
  flowKey: '',
  cityId: '',
  pincode: '',
  name: '',
  phone: '',
  consent: false,
  website: '',
  projectType: '',
  floors: '',
  plotArea: '',
  propertyType: '',
  bhk: '',
  area: '',
  propertyIntent: '',
  budget: '',
  additional: '',
})

function consultationPrefillAnswers(form) {
  const answers = {}
  if (form.flowKey === 'build') {
    if (form.projectType) answers.project_type = form.projectType
    if (form.floors) answers.floors = String(form.floors)
    if (form.plotArea) answers.plot_area = String(form.plotArea)
  }
  if (form.flowKey === 'design') {
    if (form.propertyType) answers.property_type = form.propertyType
    if (form.bhk) answers.bhk = form.bhk
    if (form.area) answers.area = String(form.area)
  }
  if (form.flowKey === 'property') {
    if (form.propertyIntent) answers.property_intent = form.propertyIntent
    if (form.propertyType) answers.property_type = form.propertyType
    if (form.budget) answers.budget = form.budget
  }
  if (form.additional.trim()) answers.additional_requirement = form.additional.trim()
  return answers
}

const SERVICES = [
  {
    key: 'build',
    eyebrow: 'BUILD',
    title: 'Home Construction',
    text: 'Independent homes, villas, extensions and complete home construction requirements.',
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=88',
    icon: 'home',
  },
  {
    key: 'design',
    eyebrow: 'DESIGN',
    title: 'Interior Design',
    text: 'Full-home interiors, modular kitchens, wardrobes, renovation and room-by-room design.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=88',
    icon: 'sofa',
  },
  {
    key: 'property',
    eyebrow: 'DISCOVER',
    title: 'Real Estate',
    text: 'Buy, sell, rent or invest with a clear property requirement matched to your location.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=88',
    icon: 'building',
  },
]

const INSPIRATION = [
  ['Independent Houses', 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=900&q=86'],
  ['Home Renovation', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=86'],
  ['Modular Kitchens', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=86'],
  ['Living Room Interiors', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=86'],
  ['Premium Apartments', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=86'],
  ['Gated Communities', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=86'],
]

const HOMEOWNER_VALUES = [
  {
    icon: 'clipboard',
    title: 'Clear requirement first',
    text: 'Share the important details once so every conversation starts with the same project context.',
  },
  {
    icon: 'pin',
    title: 'Local relevance',
    text: 'City and PIN-based intake keeps your request focused on businesses that can actually serve your area.',
  },
  {
    icon: 'shield',
    title: 'You stay in control',
    text: 'Start with a free consultation and decide how you want to continue after reviewing your options.',
  },
]

function collection(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.rows)) return value.rows
  if (Array.isArray(value?.items)) return value.items
  return []
}

function Icon({ name, size = 22 }) {
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
  if (name === 'support') return <svg {...common}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if (name === 'people') return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if (name === 'heart') return <svg {...common}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
  if (name === 'pin') return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if (name === 'clipboard') return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/></svg>
  if (name === 'phone') return <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'star') return <svg {...common}><path d="m12 2 3 6 7 .9-5 4.8 1.2 6.8L12 17.3 5.8 20.5 7 13.7 2 8.9 9 8Z"/></svg>
  return null
}

function HeroJourneyVideo({ source }) {
  return <div className="hc-architecture-video">
    {source ? <video
      className="hc-architecture-video-element"
      src={source}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-label="Animated homeowner journey from open plot and planning to completed home and interiors"
    /> : <div className="hc-architecture-loading" aria-hidden="true"><span>Preparing home journey…</span></div>}
  </div>
}

function Home() {
  const navigate = useNavigate()
  const [cities, setCities] = useState([])
  const [contactData, setContactData] = useState({})
  const [homepageMedia, setHomepageMedia] = useState({ hero_image_url: '', category_images: {} })
  const [loadingCities, setLoadingCities] = useState(true)
  const [consultOpen, setConsultOpen] = useState(false)
  const [popupCycle, setPopupCycle] = useState(0)
  const [consultForm, setConsultForm] = useState(emptyConsultation)
  const [consultSubmissionKey, setConsultSubmissionKey] = useState(makeSubmissionKey)
  const [consultError, setConsultError] = useState('')
  const [consultSaving, setConsultSaving] = useState(false)
  const [consultSubmitted, setConsultSubmitted] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [heroVideoUrl, setHeroVideoUrl] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let active = true
    let objectUrl = ''
    const segmentUrls = Array.from({ length: 10 }, (_, index) =>
      '/media/propulse-home-journey/' + String(index).padStart(2, '0') + '.b64'
    )

    Promise.all(segmentUrls.map(url => fetch(url).then(response => {
      if (!response.ok) throw new Error('Hero video segment failed to load')
      return response.text()
    })))
      .then(parts => {
        if (!active) return
        const base64 = parts.join('').replace(/\s+/g, '')
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index)
        }
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }))
        setHeroVideoUrl(objectUrl)
      })
      .catch(() => {
        if (active) setHeroVideoUrl('')
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoadingCities(true)
    Promise.allSettled([
      publicRequest('/cities'),
      publicRequest('/contact?audience=website'),
      publicRequest('/homepage-media'),
    ]).then(([cityResult, contactResult, mediaResult]) => {
      if (!active) return
      if (cityResult.status === 'fulfilled') setCities(collection(cityResult.value))
      if (contactResult.status === 'fulfilled') setContactData(contactResult.value || {})
      if (mediaResult.status === 'fulfilled') setHomepageMedia({
        hero_image_url: mediaResult.value?.hero_image_url || '',
        category_images: mediaResult.value?.category_images || {},
      })
      setLoadingCities(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let alreadySubmitted = false
    try { alreadySubmitted = sessionStorage.getItem('propulse_basic_lead_submitted') === '1' } catch {}
    if (alreadySubmitted) return undefined
    const timer = window.setTimeout(() => setConsultOpen(true), 5 * 60 * 1000)
    return () => window.clearTimeout(timer)
  }, [popupCycle])

  const cityList = useMemo(
    () => [...cities].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [cities]
  )

  const selectedCity = useMemo(
    () => cityList.find(city => String(city.id) === String(consultForm.cityId)),
    [cityList, consultForm.cityId]
  )

  const selectedCityPincodes = useMemo(() => {
    const rows = Array.isArray(selectedCity?.pincodes) ? selectedCity.pincodes : []
    const map = new Map()
    rows.forEach(item => {
      const pincode = String(typeof item === 'string' ? item : item?.pincode || '')
      if (/^\d{6}$/.test(pincode) && !map.has(pincode)) map.set(pincode, typeof item === 'string' ? { pincode } : item)
    })
    return [...map.values()]
  }, [selectedCity])

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''

  function scrollToSection(id) {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openConsult(flowKey = '') {
    setConsultError('')
    setConsultSubmitted(null)
    setConsultForm(current => {
      if (!flowKey || flowKey === current.flowKey) return { ...current, flowKey: flowKey || current.flowKey }
      return { ...emptyConsultation(), flowKey, name: current.name, phone: current.phone, consent: current.consent }
    })
    setConsultOpen(true)
  }

  function changeConsultFlow(flowKey) {
    setConsultSubmitted(null)
    setConsultForm(current => ({ ...emptyConsultation(), flowKey, name: current.name, phone: current.phone, consent: current.consent }))
    setConsultSubmissionKey(makeSubmissionKey())
    setConsultError('')
  }

  function closeConsult() {
    setConsultOpen(false)
    setConsultError('')
    if (!consultSubmitted) setPopupCycle(value => value + 1)
  }

  function openConstructionQuote() {
    setConsultOpen(false)
    navigate('/quote#construction')
  }

  async function submitConsult(event) {
    event.preventDefault()
    const mobile = consultForm.phone.replace(/\D/g, '')
    const name = consultForm.name.trim()
    const pincode = consultForm.pincode.replace(/\D/g, '')
    if (!consultForm.flowKey) return setConsultError('Select what you need help with.')
    if (!consultForm.cityId) return setConsultError('Select your city or location.')
    if (!/^\d{6}$/.test(pincode)) return setConsultError('Select or enter a valid 6-digit PIN code.')
    if (consultForm.flowKey === 'build' && !consultForm.projectType) return setConsultError('Select the construction project type.')
    if (consultForm.flowKey === 'build' && (!/^\d{1,3}$/.test(String(consultForm.floors)) || Number(consultForm.floors) < 1 || Number(consultForm.floors) > 100)) return setConsultError('Enter the planned number of floors.')
    if (consultForm.flowKey === 'design' && !consultForm.propertyType) return setConsultError('Select the property type.')
    if (consultForm.flowKey === 'property' && !consultForm.propertyIntent) return setConsultError('Select whether you want to buy, rent, sell or invest.')
    if (consultForm.flowKey === 'property' && !consultForm.propertyType) return setConsultError('Select the property type.')
    if (name.length < 2) return setConsultError('Enter your name.')
    if (!/^[6-9]\d{9}$/.test(mobile)) return setConsultError('Enter a valid 10-digit mobile number.')
    if (!consultForm.consent) return setConsultError('Please accept the contact consent to continue.')

    const details = {
      projectType: consultForm.projectType,
      floors: consultForm.floors,
      plotArea: consultForm.plotArea,
      propertyType: consultForm.propertyType,
      bhk: consultForm.bhk,
      area: consultForm.area,
      propertyIntent: consultForm.propertyIntent,
      budget: consultForm.budget,
      additional: consultForm.additional,
    }

    try {
      setConsultSaving(true)
      setConsultError('')
      const query = new URLSearchParams(window.location.search)
      const result = await publicRequest('/customer-flows/' + consultForm.flowKey + '/consultation', {
        method: 'POST',
        body: JSON.stringify({
          cityId: Number(consultForm.cityId),
          pincode,
          details,
          contact: { name, phone: mobile, email: '' },
          consent: true,
          submissionKey: consultSubmissionKey,
          website: consultForm.website,
          attribution: {
            utmSource: query.get('utm_source') || '',
            utmMedium: query.get('utm_medium') || '',
            utmCampaign: query.get('utm_campaign') || '',
            utmContent: query.get('utm_content') || '',
            utmTerm: query.get('utm_term') || '',
            referrer: document.referrer || '',
            landingPath: window.location.pathname + window.location.search,
          },
        }),
      })

      try {
        sessionStorage.setItem('propulse_intake_prefill', JSON.stringify({
          flowKey: consultForm.flowKey,
          cityId: Number(consultForm.cityId),
          cityName: selectedCity?.name || '',
          pincode,
          answers: consultationPrefillAnswers(consultForm),
          name,
          phone: mobile,
          consent: true,
          submissionKey: consultSubmissionKey,
          createdAt: Date.now(),
        }))
      } catch {}

      try { sessionStorage.setItem('propulse_basic_lead_submitted', '1') } catch {}
      setConsultSubmitted({
        flowKey: consultForm.flowKey,
        leadId: result?.leadId || null,
        name,
      })
    } catch (error) {
      setConsultError(error.message || 'Unable to submit your consultation request.')
      setConsultSubmissionKey(current => current || makeSubmissionKey())
    } finally {
      setConsultSaving(false)
    }
  }

  const media = homepageMedia.category_images || {}
  const whyImage = media.why_homeowners || WHY_IMAGE
  const finalImage = media.final_cta || FINAL_IMAGE

  return <div className="hc-home">
    <header className="hc-header hc-approved-header">
      <Link className="hc-logo" to="/" aria-label="ProPulse home">
        <img src="/brand/propulse-logo.svg" alt="ProPulse" />
      </Link>

      <nav className={menuOpen ? 'hc-nav open' : 'hc-nav'} aria-label="Main navigation">
        <button className="active" onClick={() => scrollToSection('home')}>Home</button>
        <Link to="/packages">Packages</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </nav>

      <div className="hc-header-actions public-header-actions">
        <Link className="hc-consult-btn hc-quote-btn" to="/quote#construction">Get Free Quote <Icon name="arrow" size={15} /></Link>
        <Link className="public-professional-btn" to="/login">Professionals</Link>
        <button className="hc-menu" aria-label="Toggle navigation" onClick={() => setMenuOpen(value => !value)}>☰</button>
      </div>
    </header>

    <main>
      <section className="hc-video-hero" id="home">
        <div className="hc-video-hero-inner">
          <div className="hc-video-copy">
            <div className="hc-video-kicker"><i/><span>YOUR HOME. OUR EXPERTISE.</span></div>
            <h1>Build. Design.<br/>Find. <em>All in One Place.</em></h1>
            <p>Construction, Interiors and Real Estate solutions for modern homeowners.</p>

            <div className="hc-video-actions">
              <Link className="hc-video-primary" to="/quote#construction">Get Free Quote <Icon name="arrow" size={16}/></Link>
              <Link className="hc-video-secondary" to="/packages">View Packages</Link>
            </div>

            <div className="hc-video-trust">
              <span><Icon name="shield" size={16}/> Trusted Businesses</span>
              <span><Icon name="clipboard" size={16}/> Transparent Process</span>
              <span><Icon name="support" size={16}/> End-to-End Support</span>
              <span><Icon name="heart" size={16}/> Homeowner Focused</span>
            </div>
          </div>

          <div className="hc-video-panel">
            <HeroJourneyVideo source={heroVideoUrl} />

            <Link className="hc-video-service-card card-construction" to="/quote#construction">
              <span><Icon name="home" size={20}/></span>
              <div><b>Construction</b><small>From plot plan to finished home</small></div>
              <i><Icon name="arrow" size={15}/></i>
            </Link>

            <Link className="hc-video-service-card card-interior" to="/quote#interiors">
              <span><Icon name="sofa" size={20}/></span>
              <div><b>Interior Design</b><small>Rooms, finishes and complete interiors</small></div>
              <i><Icon name="arrow" size={15}/></i>
            </Link>

            <Link className="hc-video-service-card card-property" to="/quote#property">
              <span><Icon name="building" size={20}/></span>
              <div><b>Real Estate</b><small>Buy, rent, sell or invest</small></div>
              <i><Icon name="arrow" size={15}/></i>
            </Link>

            <div className="hc-video-badge"><span/> PLOT → PLAN → HOME → INTERIOR</div>
          </div>
        </div>
      </section>

      <section className="hc-why" id="about" style={{ backgroundImage: `url("${whyImage}")` }}>
        <div className="hc-why-shade" />
        <div className="hc-why-inner">
          <div className="hc-why-heading">
            <h2>Why Homeowners Choose ProPulse</h2>
            <p>We make the first step easier: explain what you need, keep the project context organised and move forward with relevant options.</p>
          </div>

          <div className="hc-why-grid">
            <article><span><Icon name="shield" /></span><div><b>Structured Requirements</b><small>Your project details stay clear from the beginning.</small></div></article>
            <article><span><Icon name="people" /></span><div><b>Multiple Options</b><small>Use the same brief when comparing responses.</small></div></article>
            <article><span><Icon name="consult" /></span><div><b>Free Consultation</b><small>Start without paying for the initial consultation.</small></div></article>
            <article><span><Icon name="support" /></span><div><b>End-to-End Journey</b><small>From planning to the next project decision.</small></div></article>
          </div>
        </div>
      </section>

      <section className="hc-section hc-how" id="how-it-works">
        <div className="hc-section-heading">
          <span>Simple by design</span>
          <h2>How It Works</h2>
          <p>Start your home journey in a few clear steps.</p>
        </div>

        <div className="hc-how-grid">
          <article><div><b>1</b><span><Icon name="clipboard" /></span></div><h3>Tell Us Your Requirement</h3><p>Choose construction, interiors or real estate and share the project details.</p></article>
          <i><Icon name="arrow" size={22} /></i>
          <article><div><b>2</b><span><Icon name="people" /></span></div><h3>We Structure the Brief</h3><p>Your answers become one clear requirement instead of scattered calls and messages.</p></article>
          <i><Icon name="arrow" size={22} /></i>
          <article><div><b>3</b><span><Icon name="consult" /></span></div><h3>Discuss Your Options</h3><p>Relevant businesses can respond with better context about what you actually need.</p></article>
          <i><Icon name="arrow" size={22} /></i>
          <article><div><b>4</b><span><Icon name="home" /></span></div><h3>Move Your Home Forward</h3><p>Compare the next steps and choose how you want your project to continue.</p></article>
        </div>
      </section>

      <section className="hc-inspiration">
        <div className="hc-section-heading compact">
          <span>Ideas for your next step</span>
          <h2>Home Inspiration</h2>
          <p>Explore the kinds of projects homeowners can start through ProPulse.</p>
          <Link className="hc-inspiration-link" to="/projects">Explore all project ideas <Icon name="arrow" size={14} /></Link>
        </div>

        <div className="hc-inspiration-grid">
          {INSPIRATION.map(([title, image]) => <button key={title} onClick={() => openConsult()}>
            <img src={image} alt="" loading="lazy" />
            <span>{title}</span>
          </button>)}
        </div>
      </section>

      <section className="hc-section hc-homeowner-values">
        <div className="hc-section-heading">
          <span>Trust starts with clarity</span>
          <h2>Designed Around Homeowner Concerns</h2>
          <p>Everything is designed around a homeowner’s questions first, so you can understand the next step before choosing how to continue.</p>
        </div>

        <div className="hc-value-grid">
          {HOMEOWNER_VALUES.map(item => <article key={item.title}>
            <span><Icon name={item.icon} size={24} /></span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <div><Icon name="check" size={15} /> Homeowner-first experience</div>
          </article>)}
        </div>
      </section>

      <WebsiteFaqSection variant="home" audience="homeowner" />

      <section className="hc-final" id="contact">
        <img src={finalImage} alt="" loading="lazy" />
        <div className="hc-final-shade" />
        <div className="hc-final-copy">
          <span>Ready when you are</span>
          <h2>Ready to Plan Your Home?</h2>
          <p>Start with a free consultation and continue with the right construction, interior or property requirement.</p>
          <div>
            <Link to="/quote#construction">Get Free Quote <Icon name="arrow" size={16} /></Link>
            <Link className="secondary" to="/packages">View Packages</Link>
          </div>
        </div>
        <div className="hc-final-trust">
          <div><span><Icon name="consult" size={18} /></span><b>Free consultation</b></div>
          <div><span><Icon name="shield" size={18} /></span><b>Structured homeowner brief</b></div>
        </div>
      </section>
    </main>

    <footer className="hc-footer">
      <div className="hc-footer-brand">
        <img src="/brand/propulse-logo.svg" alt="ProPulse" />
        <p>A homeowner-first starting point for construction, interiors and real estate requirements.</p>
      </div>
      <div><b>Home Solutions</b><Link to="/quote#construction">Construction</Link><Link to="/quote#interiors">Interior Design</Link><Link to="/packages">Interior Packages</Link><Link to="/quote#property">Real Estate</Link></div>
      <div><b>Quick Links</b><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><button onClick={() => openConsult()}>Free Consultation</button><Link to="/contact">Contact</Link></div>
      <div><b>Contact</b>{phone && <a href={'tel:' + String(phone).replace(/\s/g, '')}>{phone}</a>}{email && <a href={'mailto:' + email}>{email}</a>}<span>Hyderabad, India</span></div>
    </footer>

    {consultOpen && <aside className="hc-consult-popup" role="dialog" aria-label="Free consultation">
      <button className="hc-popup-close" type="button" onClick={closeConsult} aria-label="Close consultation popup">×</button>
      <div className="hc-popup-head">
        <span><Icon name="phone" size={21} /></span>
        <div><h3>Tell Us Your Requirement</h3><p>This popup only captures a basic lead so relevant businesses can respond. It does not generate a quotation.</p></div>
      </div>

      {consultSubmitted ? <div className="hc-popup-success">
        <div className="hc-popup-success-icon"><Icon name="check" size={28} /></div>
        <h4>Requirement received</h4>
        <p>Your basic requirement has been saved successfully{consultSubmitted.leadId ? <> as <b>#L-{String(consultSubmitted.leadId).padStart(6,'0')}</b></> : null}. Relevant businesses can now respond according to ProPulse lead-access rules.</p>
        {consultSubmitted.flowKey === 'build' && <>
          <div className="hc-popup-quote-note">
            <b>Need a detailed construction quotation?</b>
            <span>Use the Construction quotation form separately to enter built-up area, scope, quality and other pricing details.</span>
          </div>
          <button className="hc-popup-submit" type="button" onClick={openConstructionQuote}>Get Detailed Construction Quote <Icon name="arrow" size={15} /></button>
        </>}
        <button className="hc-popup-done" type="button" onClick={closeConsult}>Done</button>
      </div> : <form onSubmit={submitConsult}>
        <label>
          <span>I am looking for</span>
          <select value={consultForm.flowKey} onChange={event => changeConsultFlow(event.target.value)}>
            <option value="">Select requirement</option>
            <option value="build">Home Construction</option>
            <option value="design">Interior Design</option>
            <option value="property">Real Estate</option>
          </select>
        </label>

        <label>
          <span>City / Location</span>
          <select value={consultForm.cityId} disabled={loadingCities} onChange={event => { setConsultForm({ ...consultForm, cityId: event.target.value, pincode: '' }); setConsultError('') }}>
            <option value="">{loadingCities ? 'Loading locations…' : 'Select city'}</option>
            {cityList.map(city => <option value={city.id} key={city.id}>{city.name}{city.state_name ? ' · ' + city.state_name : ''}</option>)}
          </select>
        </label>

        <label>
          <span>PIN Code</span>
          {selectedCityPincodes.length ? <select value={consultForm.pincode} onChange={event => { setConsultForm({ ...consultForm, pincode: event.target.value }); setConsultError('') }}>
            <option value="">Select PIN code</option>
            {selectedCityPincodes.map(item => <option value={item.pincode} key={item.pincode}>{item.pincode}{item.officeName ? ' · ' + item.officeName : ''}</option>)}
          </select> : <input className="hc-popup-input" inputMode="numeric" maxLength="6" value={consultForm.pincode} onChange={event => { setConsultForm({ ...consultForm, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) }); setConsultError('') }} placeholder="Enter 6-digit PIN code" />}
        </label>

        {consultForm.flowKey === 'build' && <div className="hc-popup-detail-grid">
          <label><span>Project Type</span><select value={consultForm.projectType} onChange={event => { setConsultForm({ ...consultForm, projectType: event.target.value }); setConsultError('') }}><option value="">Select project</option><option value="house_construction">House construction</option><option value="commercial_building">Commercial building</option><option value="building_extension">Building extension</option></select></label>
          <label><span>No. of Floors</span><input className="hc-popup-input" type="number" min="1" max="100" value={consultForm.floors} onChange={event => { setConsultForm({ ...consultForm, floors: event.target.value }); setConsultError('') }} placeholder="e.g. 2" /></label>
          <label><span>Plot Area <small>(Optional)</small></span><div className="hc-popup-unit"><input type="number" min="50" max="1000000" value={consultForm.plotArea} onChange={event => setConsultForm({ ...consultForm, plotArea: event.target.value })} placeholder="e.g. 2000" /><i>sq ft</i></div></label>
        </div>}

        {consultForm.flowKey === 'design' && <div className="hc-popup-detail-grid">
          <label><span>Property Type</span><select value={consultForm.propertyType} onChange={event => { setConsultForm({ ...consultForm, propertyType: event.target.value, bhk: '' }); setConsultError('') }}><option value="">Select property</option><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="independent_house">Independent house</option><option value="office">Office</option><option value="commercial_space">Commercial space</option></select></label>
          {['apartment','villa','independent_house'].includes(consultForm.propertyType) && <label><span>BHK <small>(Optional)</small></span><select value={consultForm.bhk} onChange={event => setConsultForm({ ...consultForm, bhk: event.target.value })}><option value="">Select BHK</option><option value="1bhk">1 BHK</option><option value="2bhk">2 BHK</option><option value="3bhk">3 BHK</option><option value="4bhk">4 BHK</option><option value="5plus">5+ BHK</option></select></label>}
          <label><span>Approx. Area <small>(Optional)</small></span><div className="hc-popup-unit"><input type="number" min="50" max="1000000" value={consultForm.area} onChange={event => setConsultForm({ ...consultForm, area: event.target.value })} placeholder="e.g. 1500" /><i>sq ft</i></div></label>
        </div>}

        {consultForm.flowKey === 'property' && <div className="hc-popup-detail-grid">
          <label><span>I Want To</span><select value={consultForm.propertyIntent} onChange={event => { setConsultForm({ ...consultForm, propertyIntent: event.target.value }); setConsultError('') }}><option value="">Select intent</option><option value="buy">Buy</option><option value="rent">Rent</option><option value="sell">Sell</option><option value="invest">Invest</option></select></label>
          <label><span>Property Type</span><select value={consultForm.propertyType} onChange={event => { setConsultForm({ ...consultForm, propertyType: event.target.value }); setConsultError('') }}><option value="">Select property</option><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="independent_house">Independent house</option><option value="plot">Plot / land</option><option value="commercial">Commercial property</option><option value="office">Office space</option></select></label>
          <label><span>Budget <small>(Optional)</small></span><input className="hc-popup-input" maxLength="100" value={consultForm.budget} onChange={event => setConsultForm({ ...consultForm, budget: event.target.value })} placeholder="e.g. ₹40–60 lakh" /></label>
        </div>}

        {consultForm.flowKey && <label>
          <span>Additional Information <small>(Optional)</small></span>
          <textarea className="hc-popup-textarea" rows="2" maxLength="1000" value={consultForm.additional} onChange={event => setConsultForm({ ...consultForm, additional: event.target.value })} placeholder="Share any important requirement, preferred locality, parking, vastu, materials, rooms, etc." />
        </label>}

        <label>
          <span>Your Name</span>
          <input className="hc-popup-input" autoComplete="name" maxLength="160" value={consultForm.name} onChange={event => { setConsultForm({ ...consultForm, name: event.target.value }); setConsultError('') }} placeholder="Enter your name" />
        </label>

        <label>
          <span>Mobile Number</span>
          <div className="hc-popup-phone"><i>+91</i><input inputMode="tel" autoComplete="tel" maxLength="10" value={consultForm.phone} onChange={event => { setConsultForm({ ...consultForm, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }); setConsultError('') }} placeholder="Enter 10-digit number" /></div>
        </label>

        <label className="hc-popup-consent">
          <input type="checkbox" checked={consultForm.consent} onChange={event => { setConsultForm({ ...consultForm, consent: event.target.checked }); setConsultError('') }} />
          <span>I agree that ProPulse may use and share my submitted contact details with relevant businesses so they can respond to this requirement.</span>
        </label>
        <label className="hc-popup-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={consultForm.website} onChange={event => setConsultForm({ ...consultForm, website: event.target.value })} /></label>

        {consultError && <div className="hc-popup-error">{consultError}</div>}
        <button className="hc-popup-submit" type="submit" disabled={consultSaving}>{consultSaving ? 'Saving…' : 'Submit Basic Requirement'} {!consultSaving && <Icon name="arrow" size={15} />}</button>
        <small><Icon name="shield" size={12} /> This creates only a basic lead. Construction quotation is available separately from the Construction page.</small>
      </form>}
    </aside>}
  </div>
}

export default Home
