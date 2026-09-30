import { useEffect, useMemo, useRef, useState } from 'react'
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
  website: '',
  projectType: '',
  floors: '',
  plotArea: '',
  propertyType: '',
  bhk: '',
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
  }
  if (form.flowKey === 'property') {
    if (form.propertyIntent) answers.property_intent = form.propertyIntent
    if (form.propertyType) answers.property_type = form.propertyType
    if (form.budget) answers.budget = form.budget
  }
  if (form.additional.trim()) answers.additional_requirement = form.additional.trim()
  return answers
}

const CONSTRUCTION_FLOORS = [
  { value: '1', label: 'Ground Floor' },
  { value: '2', label: 'G+1' },
  { value: '3', label: 'G+2' },
  { value: '4', label: 'G+3' },
  { value: '5', label: 'Above G+3' },
]

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
  {
    title: 'Warm Modern Villa',
    text: 'Clean volumes, warm wood and wide glass openings.',
    image: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=90',
    icon: 'home',
    flowKey: 'build',
  },
  {
    title: 'Courtyard Living',
    text: 'Bring daylight and greenery into the heart of the home.',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=90',
    icon: 'heart',
    flowKey: 'build',
  },
  {
    title: 'Wood & Marble Kitchen',
    text: 'A warm, premium palette with practical storage.',
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=90',
    icon: 'clipboard',
    flowKey: 'design',
  },
  {
    title: 'Hotel-Style Bedroom',
    text: 'Layered lighting, soft textures and calm neutral tones.',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=90',
    icon: 'sofa',
    flowKey: 'design',
  },
  {
    title: 'Japandi Living Room',
    text: 'Minimal lines, natural textures and comfortable warmth.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=90',
    icon: 'sofa',
    flowKey: 'design',
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
  if (name === 'layers') return <svg {...common}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>
  if (name === 'phone') return <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'star') return <svg {...common}><path d="m12 2 3 6 7 .9-5 4.8 1.2 6.8L12 17.3 5.8 20.5 7 13.7 2 8.9 9 8Z"/></svg>
  return null
}

function Home() {
  const navigate = useNavigate()
  const [cities, setCities] = useState([])
  const [contactData, setContactData] = useState({})
  const [homepageMedia, setHomepageMedia] = useState({ hero_image_url: '', category_images: {} })
  const [loadingCities, setLoadingCities] = useState(true)
  const [citySearch, setCitySearch] = useState('')
  const [detectedLocation, setDetectedLocation] = useState(null)
  const [locatingPincode, setLocatingPincode] = useState(false)
  const [locatingDevice, setLocatingDevice] = useState(false)
  const pinLookupSeq = useRef(0)
  const [consultOpen, setConsultOpen] = useState(false)
  const [popupCycle, setPopupCycle] = useState(0)
  const [consultForm, setConsultForm] = useState(emptyConsultation)
  const [consultSubmissionKey, setConsultSubmissionKey] = useState(makeSubmissionKey)
  const [consultError, setConsultError] = useState('')
  const [consultSaving, setConsultSaving] = useState(false)
  const [consultSubmitted, setConsultSubmitted] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!consultOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = event => { if (event.key === 'Escape') closeConsult() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [consultOpen])

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
    const delay = popupCycle === 0 ? 15 * 1000 : 5 * 60 * 1000
    const timer = window.setTimeout(() => setConsultOpen(true), delay)
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

  function cityLabel(city) {
    if (!city) return ''
    return city.name + (city.state_name ? ' · ' + city.state_name : '')
  }

  function exactCityForInput(value) {
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) return null
    return cityList.find(city => {
      const name = String(city.name || '').trim().toLowerCase()
      const full = cityLabel(city).trim().toLowerCase()
      return normalized === name || normalized === full
    }) || null
  }

  function chooseCity(city, { keepPincode = false } = {}) {
    if (!city) return
    setCitySearch(cityLabel(city))
    setConsultForm(current => ({
      ...current,
      cityId: String(city.id),
      pincode: keepPincode ? current.pincode : '',
    }))
    setDetectedLocation(current => ({
      ...(current || {}),
      cityName: city.name || '',
      stateName: city.state_name || current?.stateName || '',
      source: current?.source || 'city',
    }))
    setConsultError('')
  }

  function handleCitySearch(value) {
    setCitySearch(value)
    const exact = exactCityForInput(value)
    setConsultForm(current => ({
      ...current,
      cityId: exact ? String(exact.id) : '',
      pincode: exact && String(exact.id) === String(current.cityId) ? current.pincode : '',
    }))
    if (exact) {
      setDetectedLocation(current => ({
        ...(current || {}),
        cityName: exact.name || '',
        stateName: exact.state_name || current?.stateName || '',
        source: 'city',
      }))
    } else {
      setDetectedLocation(current => current?.source === 'pin' ? current : null)
    }
    setConsultError('')
  }

  async function locatePincode(pincode) {
    const lookupId = ++pinLookupSeq.current
    if (!/^\d{6}$/.test(pincode)) {
      setLocatingPincode(false)
      return
    }
    try {
      setLocatingPincode(true)
      setConsultError('')
      const result = await publicRequest('/pincodes/location/' + pincode)
      if (lookupId !== pinLookupSeq.current) return

      let city = result?.cityId
        ? cityList.find(item => String(item.id) === String(result.cityId))
        : null
      if (!city && result?.cityName) {
        city = cityList.find(item =>
          String(item.name || '').trim().toLowerCase() === String(result.cityName || '').trim().toLowerCase()
          && (!result.stateName || String(item.state_name || '').trim().toLowerCase() === String(result.stateName || '').trim().toLowerCase())
        ) || null
      }

      setDetectedLocation({
        source: 'pin',
        pincode,
        cityName: city?.name || result?.cityName || '',
        stateName: city?.state_name || result?.stateName || '',
        districtName: result?.districtName || '',
        postalAreas: Array.isArray(result?.postalAreas) ? result.postalAreas : [],
        status: result?.status || '',
      })

      setConsultForm(current => {
        const currentCity = cityList.find(item => String(item.id) === String(current.cityId))
        const sameState = currentCity && result?.stateName
          ? String(currentCity.state_name || '').trim().toLowerCase() === String(result.stateName || '').trim().toLowerCase()
          : false
        return {
          ...current,
          pincode,
          cityId: city ? String(city.id) : (sameState ? current.cityId : ''),
        }
      })

      if (city) setCitySearch(cityLabel(city))
      else if (result?.stateName) {
        const currentCity = cityList.find(item => String(item.id) === String(consultForm.cityId))
        const sameState = currentCity
          && String(currentCity.state_name || '').trim().toLowerCase() === String(result.stateName || '').trim().toLowerCase()
        if (!sameState) setCitySearch('')
      }
    } catch (error) {
      if (lookupId !== pinLookupSeq.current) return
      setDetectedLocation(null)
      setConsultError(error.message || 'Unable to detect location from this PIN code.')
    } finally {
      if (lookupId === pinLookupSeq.current) setLocatingPincode(false)
    }
  }

  function handlePincodeChange(value) {
    const pincode = String(value || '').replace(/\D/g, '').slice(0, 6)
    pinLookupSeq.current += 1
    setDetectedLocation(null)
    setConsultForm(current => ({ ...current, pincode }))
    setConsultError('')
    if (pincode.length === 6) locatePincode(pincode)
  }

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setConsultError('Current location is not supported by this browser. Enter your city or PIN manually.')
      return
    }

    setLocatingDevice(true)
    setConsultError('')
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const result = await publicRequest('/pincodes/reverse-location', {
            method: 'POST',
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          })

          const city = result?.cityId
            ? cityList.find(item => String(item.id) === String(result.cityId))
            : cityList.find(item =>
                String(item.name || '').trim().toLowerCase() === String(result?.cityName || '').trim().toLowerCase()
                && (!result?.stateName || String(item.state_name || '').trim().toLowerCase() === String(result.stateName || '').trim().toLowerCase())
              )

          setConsultForm(current => ({
            ...current,
            pincode: String(result?.pincode || ''),
            cityId: city ? String(city.id) : '',
          }))
          setCitySearch(city ? cityLabel(city) : (result?.cityName || ''))
          setDetectedLocation({
            source: 'device',
            pincode: result?.pincode || '',
            cityName: city?.name || result?.cityName || '',
            stateName: city?.state_name || result?.stateName || '',
            districtName: result?.districtName || '',
            localityName: result?.localityName || '',
            detectedAddress: result?.detectedAddress || '',
            status: result?.status || '',
          })

          if (!city) {
            setConsultError('Location detected, but this city is not configured yet. Please choose the nearest available city.')
          }
        } catch (error) {
          setDetectedLocation(null)
          setConsultError(error.message || 'Unable to detect your current location. Enter city or PIN manually.')
        } finally {
          setLocatingDevice(false)
        }
      },
      error => {
        setLocatingDevice(false)
        if (error.code === error.PERMISSION_DENIED) {
          setConsultError('Location permission was denied. You can still enter your city or PIN manually.')
        } else if (error.code === error.TIMEOUT) {
          setConsultError('Location detection timed out. Enter your city or PIN manually.')
        } else {
          setConsultError('Unable to read your current location. Enter your city or PIN manually.')
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    )
  }

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''

  function scrollToSection(id) {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openConsult(flowKey = '') {
    setConsultError('')
    setConsultSubmitted(null)
    if (selectedCity && !citySearch) setCitySearch(cityLabel(selectedCity))
    setConsultForm(current => {
      if (!flowKey || flowKey === current.flowKey) return { ...current, flowKey: flowKey || current.flowKey }
      return { ...emptyConsultation(), flowKey, name: current.name, phone: current.phone }
    })
    setConsultOpen(true)
  }

  function changeConsultFlow(flowKey) {
    setConsultSubmitted(null)
    setCitySearch('')
    setDetectedLocation(null)
    pinLookupSeq.current += 1
    setConsultForm(current => ({ ...emptyConsultation(), flowKey, name: current.name, phone: current.phone }))
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
    const typedCity = exactCityForInput(citySearch)
    const submitCityId = Number(consultForm.cityId || typedCity?.id || 0)
    const submitCity = cityList.find(city => Number(city.id) === submitCityId) || typedCity
    if (!consultForm.flowKey) return setConsultError('Select what you need help with.')
    if (!submitCityId) return setConsultError('Enter and select a valid city or location.')
    if (!/^\d{6}$/.test(pincode)) return setConsultError('Select or enter a valid 6-digit PIN code.')
    if (consultForm.flowKey === 'build' && !consultForm.projectType) return setConsultError('Select the construction project type.')
    if (consultForm.flowKey === 'build' && (!/^\d{1,3}$/.test(String(consultForm.floors)) || Number(consultForm.floors) < 1 || Number(consultForm.floors) > 100)) return setConsultError('Enter the planned number of floors.')
    if (consultForm.flowKey === 'design' && !consultForm.propertyType) return setConsultError('Select the property type.')
    if (consultForm.flowKey === 'property' && !consultForm.propertyIntent) return setConsultError('Select whether you want to buy, rent, sell or invest.')
    if (consultForm.flowKey === 'property' && !consultForm.propertyType) return setConsultError('Select the property type.')
    if (name.length < 2) return setConsultError('Enter your name.')
    if (!/^[6-9]\d{9}$/.test(mobile)) return setConsultError('Enter a valid 10-digit mobile number.')

    const details = {
      projectType: consultForm.projectType,
      floors: consultForm.floors,
      plotArea: consultForm.plotArea,
      propertyType: consultForm.propertyType,
      bhk: consultForm.bhk,
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
          cityId: submitCityId,
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
          cityId: submitCityId,
          cityName: submitCity?.name || '',
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
        <Link to="/projects">Projects</Link><Link to="/experts">Experts</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </nav>

      <div className="hc-header-actions public-header-actions">
        <Link className="hc-consult-btn hc-quote-btn" to="/quote#construction">Get Free Quote <Icon name="arrow" size={15} /></Link>
        <Link className="public-professional-btn" to="/professionals">For Professionals</Link>
        <button className="hc-menu" aria-label="Toggle navigation" onClick={() => setMenuOpen(value => !value)}>☰</button>
      </div>
    </header>

    <main>
      <section className="hc-expert-hero" id="home">
        <div className="hc-expert-hero-inner">
          <div className="hc-expert-copy">
            <div className="hc-expert-kicker"><i/><span>TRUSTED EXPERTS FOR YOUR HOME</span></div>
            <h1>Build. Design.<br/>Find the <em>Right Experts.</em></h1>
            <p>Get connected with trusted construction and interior professionals for your home project. Compare the right experts, branded material options, warranty-backed work where offered, and transparent choices in one place.</p>

            <div className="hc-expert-actions">
              <Link className="hc-expert-primary" to="/quote#construction">Get Free Quote <Icon name="arrow" size={16}/></Link>
              <Link className="hc-expert-secondary" to="/packages">View Packages</Link>
            </div>

            <div className="hc-expert-benefits" aria-label="ProPulse homeowner benefits">
              <span><Icon name="people" size={21}/><b>Find Right<br/>Experts</b></span>
              <span><Icon name="layers" size={21}/><b>Branded<br/>Materials</b></span>
              <span><Icon name="shield" size={21}/><b>Warranty<br/>Options</b></span>
              <span><Icon name="check" size={21}/><b>Transparent<br/>Choices</b></span>
              <span><Icon name="heart" size={21}/><b>Homeowner<br/>Focused</b></span>
            </div>
          </div>

          <div className="hc-expert-visual">
            <img
              className="hc-expert-house"
              src="https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1800&q=92"
              alt="Modern premium home exterior"
              fetchPriority="high"
            />
            <div className="hc-expert-visual-shade" aria-hidden="true"/>

            <svg className="hc-expert-network" viewBox="0 0 900 620" preserveAspectRatio="none" aria-hidden="true">
              <path d="M210 80 C330 75, 335 170, 470 184" />
              <path d="M696 96 C626 118, 620 206, 584 240" />
              <path d="M420 548 C455 470, 520 462, 536 380" />
              <path d="M785 525 C720 485, 690 447, 674 392" />
              <circle cx="470" cy="184" r="7"/>
              <circle cx="584" cy="240" r="7"/>
              <circle cx="536" cy="380" r="7"/>
              <circle cx="674" cy="392" r="7"/>
            </svg>

            <article className="hc-expert-float hc-professionals-card">
              <span className="hc-expert-card-icon"><Icon name="people" size={24}/></span>
              <div className="hc-expert-card-copy">
                <b>Verified Professionals</b>
                <small>Architects, engineers, contractors</small>
                <div className="hc-expert-avatars" aria-hidden="true">
                  <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80" alt="" />
                  <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80" alt="" />
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" alt="" />
                  <i>+</i>
                </div>
              </div>
            </article>

            <article className="hc-expert-float hc-materials-card">
              <span className="hc-expert-card-icon"><Icon name="layers" size={24}/></span>
              <div className="hc-expert-card-copy">
                <b>Branded Material Options</b>
                <small>Compare material choices offered by professionals</small>
                <div className="hc-material-chips" aria-hidden="true">
                  <i>Paints</i><i>Cement</i><i>Tiles</i><i>Hardware</i>
                </div>
              </div>
            </article>

            <article className="hc-expert-float hc-consultation-card" aria-label="Free consultation available">
              <span className="hc-expert-card-icon"><Icon name="consult" size={20}/></span>
              <span><b>Free Consultation</b><small>Tell us your requirement</small></span>
            </article>

            <article className="hc-expert-float hc-warranty-card" aria-label="Warranty-backed options">
              <span className="hc-expert-card-icon"><Icon name="shield" size={20}/></span>
              <span><b>Warranty-backed Options</b><small>Review warranty terms before you choose</small></span>
            </article>

            <div className="hc-expert-mini mini-living" aria-hidden="true">
              <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=700&q=88" alt="" />
            </div>
            <div className="hc-expert-mini mini-kitchen" aria-hidden="true">
              <img src="https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=700&q=88" alt="" />
            </div>
          </div>
        </div>
      </section>

      <section className="hc-why" id="about" style={{ backgroundImage: `url("${whyImage}")` }}>
        <div className="hc-why-shade" />
        <div className="hc-why-glow" aria-hidden="true" />
        <div className="hc-why-inner">
          <div className="hc-why-heading">
            <h2>Why Homeowners<br/>Choose <em>ProPulse.</em></h2>
            <span className="hc-why-underline" aria-hidden="true" />
          </div>

          <div className="hc-why-grid">
            <article>
              <span className="hc-why-icon"><Icon name="clipboard" /></span>
              <div><b>Structured Requirements</b><small>Your project details stay clear from the beginning.</small></div>
              <Link className="hc-why-arrow" to="/quote#construction" aria-label="Start a structured requirement"><Icon name="arrow" size={15}/></Link>
            </article>
            <article>
              <span className="hc-why-icon"><Icon name="people" /></span>
              <div><b>Multiple Options</b><small>Use the same brief when comparing responses.</small></div>
              <Link className="hc-why-arrow" to="/quote" aria-label="Explore homeowner options"><Icon name="arrow" size={15}/></Link>
            </article>
            <article>
              <span className="hc-why-icon"><Icon name="consult" /></span>
              <div><b>Free Consultation</b><small>Start without paying for the initial consultation.</small></div>
              <button className="hc-why-arrow" type="button" onClick={() => openConsult()} aria-label="Open free consultation"><Icon name="arrow" size={15}/></button>
            </article>
            <article>
              <span className="hc-why-icon"><Icon name="support" /></span>
              <div><b>End-to-End Journey</b><small>From planning to the next project decision.</small></div>
              <Link className="hc-why-arrow" to="/how-it-works" aria-label="See how ProPulse works"><Icon name="arrow" size={15}/></Link>
            </article>
          </div>
        </div>
      </section>

      <section className="hc-how-premium" id="how-it-works" aria-labelledby="how-it-works-title">
        <div className="hc-how-premium-heading">
          <h2 id="how-it-works-title">How It Works</h2>
          <span aria-hidden="true" />
        </div>

        <div className="hc-how-premium-grid">
          <article className="hc-how-premium-card">
            <div className="hc-how-photo-wrap">
              <img
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=90"
                alt="Homeowner sharing her construction or interior requirement"
                loading="lazy"
              />
              <span className="hc-how-step">1</span>
              <span className="hc-how-float-icon"><Icon name="clipboard" size={28}/></span>
            </div>
            <div className="hc-how-card-copy">
              <h3>Tell Us Your Requirement</h3>
              <p>Share your construction or interior requirement with the details you have.</p>
            </div>
          </article>

          <span className="hc-how-connector" aria-hidden="true"><Icon name="arrow" size={28}/></span>

          <article className="hc-how-premium-card">
            <div className="hc-how-photo-wrap">
              <img
                src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=90"
                alt="Homeowners meeting with experienced professionals"
                loading="lazy"
              />
              <span className="hc-how-step">2</span>
              <span className="hc-how-float-icon"><Icon name="people" size={28}/></span>
            </div>
            <div className="hc-how-card-copy">
              <h3>We Find the Right Experts</h3>
              <p>We connect you with relevant professionals, senior engineers, architects, or trusted partners.</p>
            </div>
          </article>

          <span className="hc-how-connector" aria-hidden="true"><Icon name="arrow" size={28}/></span>

          <article className="hc-how-premium-card">
            <div className="hc-how-photo-wrap">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=90"
                alt="Homeowner comparing suitable project options"
                loading="lazy"
              />
              <span className="hc-how-step">3</span>
              <span className="hc-how-float-icon"><Icon name="consult" size={28}/></span>
            </div>
            <div className="hc-how-card-copy">
              <h3>Choose the Best Option</h3>
              <p>Compare suggested solutions, consultations, or packages that fit your need.</p>
            </div>
          </article>

          <span className="hc-how-connector" aria-hidden="true"><Icon name="arrow" size={28}/></span>

          <article className="hc-how-premium-card">
            <div className="hc-how-photo-wrap">
              <img
                src="https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=90"
                alt="Homeowners starting their home journey in a completed modern home"
                loading="lazy"
              />
              <span className="hc-how-step">4</span>
              <span className="hc-how-float-icon"><Icon name="home" size={28}/></span>
            </div>
            <div className="hc-how-card-copy">
              <h3>Start Your Home Journey</h3>
              <p>Move ahead confidently with the right next step for your project.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="hc-inspiration" aria-labelledby="home-inspiration-title">
        <div className="hc-inspiration-heading">
          <h2 id="home-inspiration-title"><span>Home</span> Inspiration</h2>
          <i aria-hidden="true" />
          <p>Explore design directions, layouts and finishes for your home.</p>
        </div>

        <div className="hc-inspiration-grid">
          {INSPIRATION.map(item => <article className="hc-inspiration-card" key={item.title}>
            <button className="hc-inspiration-image" type="button" onClick={() => openConsult(item.flowKey)} aria-label={'Explore ' + item.title}>
              <img src={item.image} alt={item.title} loading="lazy" />
              <span className="hc-inspiration-icon"><Icon name={item.icon} size={24} /></span>
            </button>
            <div className="hc-inspiration-copy">
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
              <button className="hc-inspiration-arrow" type="button" onClick={() => openConsult(item.flowKey)} aria-label={'Start with ' + item.title}>
                <Icon name="arrow" size={17} />
              </button>
            </div>
          </article>)}
        </div>

        <Link className="hc-inspiration-cta" to="/projects">Explore all project ideas <Icon name="arrow" size={16} /></Link>
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

    {consultOpen && <div className="hc-popup-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeConsult() }}>
      <aside className="hc-consult-popup" role="dialog" aria-modal="true" aria-label="Free consultation">
      <button className="hc-popup-close" type="button" onClick={closeConsult} aria-label="Close consultation popup">×</button>
      <div className="hc-popup-head">
        <span><Icon name="phone" size={21} /></span>
        <div><h3>Tell Us Your Requirement</h3></div>
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

        <div className="hc-location-fields">
          <label>
            <span>City / Location</span>
            <input
              className="hc-popup-input"
              list="hc-city-options"
              autoComplete="off"
              disabled={loadingCities}
              value={citySearch}
              onChange={event => handleCitySearch(event.target.value)}
              onBlur={event => {
                const exact = exactCityForInput(event.target.value)
                if (exact) chooseCity(exact, { keepPincode: true })
              }}
              placeholder={loadingCities ? 'Loading locations…' : 'Type city name'}
            />
            <datalist id="hc-city-options">
              {cityList.map(city => <option value={cityLabel(city)} key={city.id} />)}
            </datalist>
          </label>

          <label>
            <span>PIN Code {locatingPincode ? <small>Detecting…</small> : null}</span>
            <input
              className="hc-popup-input"
              list={selectedCityPincodes.length ? 'hc-pin-options' : undefined}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength="6"
              value={consultForm.pincode}
              onChange={event => handlePincodeChange(event.target.value)}
              placeholder="Enter 6-digit PIN code"
            />
            {selectedCityPincodes.length ? <datalist id="hc-pin-options">
              {selectedCityPincodes.map(item => <option value={item.pincode} key={item.pincode}>{item.officeName || ''}</option>)}
            </datalist> : null}
          </label>
        </div>

        <button
          className="hc-current-location-btn"
          type="button"
          onClick={detectCurrentLocation}
          disabled={locatingDevice}
        >
          <Icon name="pin" size={16} />
          {locatingDevice ? 'Detecting your location…' : 'Use my current location'}
        </button>

        {(detectedLocation || selectedCity) && <div className="hc-location-meta">
          <Icon name="pin" size={15} />
          <div>
            <b>{detectedLocation?.localityName ? detectedLocation.localityName + ' · ' : ''}{detectedLocation?.cityName || selectedCity?.name || citySearch || 'Location detected'}</b>
            <span>
              {[detectedLocation?.districtName, detectedLocation?.stateName || selectedCity?.state_name].filter(Boolean).join(' · ')}
              {detectedLocation?.source === 'pin' ? ' · synced from PIN' : detectedLocation?.source === 'device' ? ' · detected from current location' : ''}
            </span>
          </div>
        </div>}

        {consultForm.flowKey === 'build' && <div className="hc-popup-detail-grid">
          <label><span>Project Type</span><select value={consultForm.projectType} onChange={event => { setConsultForm({ ...consultForm, projectType: event.target.value }); setConsultError('') }}><option value="">Select project</option><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="renovation">Renovation</option><option value="extension">Extension</option></select></label>
          <label><span>No. of Floors</span><select value={consultForm.floors} onChange={event => { setConsultForm({ ...consultForm, floors: event.target.value }); setConsultError('') }}><option value="">Select floors</option>{CONSTRUCTION_FLOORS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span>Plot Area <small>(Optional)</small></span><div className="hc-popup-unit"><input type="number" min="10" max="100000" value={consultForm.plotArea} onChange={event => setConsultForm({ ...consultForm, plotArea: event.target.value })} placeholder="e.g. 200" /><i>sq yards</i></div></label>
        </div>}

        {consultForm.flowKey === 'design' && <div className="hc-popup-detail-grid">
          <label><span>Property Type</span><select value={consultForm.propertyType} onChange={event => { setConsultForm({ ...consultForm, propertyType: event.target.value, bhk: '' }); setConsultError('') }}><option value="">Select property</option><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="independent_house">Independent house</option><option value="office">Office</option><option value="commercial_space">Commercial space</option></select></label>
          <label><span>BHK <small>(Optional)</small></span><select value={consultForm.bhk} onChange={event => { setConsultForm({ ...consultForm, bhk: event.target.value }); setConsultError('') }}><option value="">Select BHK</option><option value="1bhk">1 BHK</option><option value="2bhk">2 BHK</option><option value="3bhk">3 BHK</option><option value="4bhk">4 BHK</option><option value="5plus">5+ BHK</option></select></label>
        </div>}

        {consultForm.flowKey === 'property' && <div className="hc-popup-detail-grid">
          <label><span>I Want To</span><select value={consultForm.propertyIntent} onChange={event => { setConsultForm({ ...consultForm, propertyIntent: event.target.value }); setConsultError('') }}><option value="">Select intent</option><option value="buy">Buy</option><option value="sell">Sell</option></select></label>
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

        <p className="hc-popup-submit-notice">By submitting, you agree that ProPulse may use your details to process this requirement and connect you with relevant professionals.</p>
        <label className="hc-popup-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={consultForm.website} onChange={event => setConsultForm({ ...consultForm, website: event.target.value })} /></label>

        {consultError && <div className="hc-popup-error">{consultError}</div>}
        <button className="hc-popup-submit" type="submit" disabled={consultSaving}>{consultSaving ? 'Saving…' : 'Submit Basic Requirement'} {!consultSaving && <Icon name="arrow" size={15} />}</button>
      </form>}
      </aside>
    </div>}
  </div>
}

export default Home
