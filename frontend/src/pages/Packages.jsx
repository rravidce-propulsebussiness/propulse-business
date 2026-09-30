import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Packages.css'

const CONSTRUCTION_PACKAGES = [
  {
    key: 'standard',
    name: 'Standard',
    eyebrow: 'ESSENTIAL HOME',
    badge: 'Smart Value',
    price: 1750,
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=88',
    description: 'Reliable construction specifications with practical branded materials and comfortable everyday finishes.',
    highlights: ['Reliable quality materials', 'Modern & functional specification', 'Strong value for practical homes'],
    specs: {
      'Architecture': '2D floor plans · Structural plans · 3D elevation · Soil test',
      'Steel': 'Shree 550 TMT or equivalent',
      'Cement': 'Nagarjuna 53 grade for slabs/pillars · Priya/equivalent 43 grade for brick/internal work',
      'Sand': 'Robo sand for construction · River sand for plastering',
      'Bricks': 'Karimnagar brick',
      'Kitchen': 'Wall tiles ₹45/sq ft · Sink ₹2,000 · Granite platform ₹120/sq ft',
      'Main door': 'Indian teak double door allowance ₹25,000',
      'Internal doors': 'Flush door allowance ₹7,000',
      'Windows': 'uPVC 3-track allowance ₹350/sq ft',
      'Bathroom': 'Wall tiles ₹45/sq ft · CERA fitting allowance ₹25,000/bathroom',
      'Flooring': 'Rooms ₹45/sq ft · Stair granite ₹70/sq ft · Parking anti-skid ₹45/sq ft',
      'Painting': 'Asian Tractor interior · ACE exterior reference',
      'Electrical': 'Finolex fireproof wire · MARU basic switches · Sudhakar piping',
      'Other': 'SS202 stair railing · MS gate up to ₹20,000 · 4,000L double-layer overhead tank',
    },
  },
  {
    key: 'premium',
    name: 'Premium',
    eyebrow: 'UPGRADED HOME',
    badge: 'Most Popular',
    price: 1899,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=88',
    description: 'A balanced upgrade with stronger brands, improved finishes and richer home specifications.',
    highlights: ['Premium branded materials', 'Better finishes & allowances', 'Great long-term value'],
    specs: {
      'Architecture': '2D + structural + 3D elevation · Digital survey · Soil test · Plumbing & electrical drawings',
      'Steel': 'Vizag TMT or Jairaj',
      'Cement': 'UltraTech 53 grade for slabs/pillars · Bangur/equivalent for brick/internal work',
      'Sand': 'River sand for construction except terrace/tile work',
      'Bricks': 'Karimnagar Class II bricks',
      'Kitchen': 'Wall tiles ₹55/sq ft · Sink ₹3,500 · Granite platform ₹160/sq ft',
      'Main door': 'Indian teak double door allowance ₹50,000',
      'Internal doors': 'Flush door allowance ₹10,000',
      'Windows': 'uPVC glass + mesh shutter allowance ₹450/sq ft',
      'Bathroom': 'Wall tiles ₹55/sq ft · Ashirwad pipe · Jaguar fitting allowance ₹35,000/bathroom',
      'Flooring': 'Rooms ₹70/sq ft · Stair granite ₹100/sq ft · Parking anti-skid ₹60/sq ft',
      'Painting': 'Birla putty + Asian Royale interior · Apex exterior reference',
      'Electrical': 'Polycab fireproof wire · Gold Medal switches · Sudhakar piping',
      'Other': 'SS303 stair railing · MS gate up to ₹35,000 · 4,000L three-layer overhead tank · RCC sump',
    },
  },
  {
    key: 'royal',
    name: 'Royal',
    eyebrow: 'HIGH-SPEC HOME',
    badge: 'Luxury',
    price: 2099,
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=88',
    description: 'Higher-spec materials, larger allowances and premium finish choices for a more luxurious home.',
    highlights: ['Top-tier material references', 'Higher finish allowances', 'Premium home specification'],
    specs: {
      'Architecture': '2D + structural + 3D elevation · Digital survey · Soil test · Plumbing & electrical drawings',
      'Steel': 'Tata 550 TMT',
      'Cement': 'UltraTech 53 grade for complete construction',
      'Sand': 'River sand for complete construction',
      'Bricks': 'Karimnagar Class I bricks',
      'Kitchen': 'Wall tiles ₹60/sq ft · Sink ₹6,000 · Granite platform ₹250/sq ft',
      'Main door': 'Indian teak double door allowance ₹60,000',
      'Internal doors': 'Flush door allowance ₹15,000',
      'Windows': 'uPVC glass + mesh shutter allowance ₹550/sq ft',
      'Bathroom': 'Tiles up to ceiling ₹65/sq ft · Ashirwad hot-water CPVC · Parryware Premium allowance ₹50,000/bathroom',
      'Flooring': 'Rooms ₹85/sq ft · Stair granite ₹130/sq ft · Parking granite ₹70/sq ft',
      'Painting': 'Birla putty + Royal emulsion · Apex Ultima weatherproof exterior',
      'Electrical': 'Polycab FRLS wire + Polycab piping · Gold Medal Air switches',
      'Other': 'SS304 stairs + glass balcony railing · Sliding gate up to ₹45,000 · 4,000L RCC overhead tank · 11 ft floor height',
    },
  },
]

const INTERIOR_PACKAGES = [
  {
    key: 'standard',
    name: 'Standard',
    eyebrow: 'SMART VALUE',
    badge: 'Smart Value',
    price: 1399,
    image: 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=1000&q=88',
    description: 'Practical semi-modular interiors with dependable ply, laminate and hardware references.',
    highlights: ['Gurjan BWP reference', 'EBCO soft-close hardware', 'Semi-modular finish'],
    specs: {
      'Wood': 'Gurjan BWP',
      'Internal laminate': '0.72mm liner',
      'External laminate': '1mm Virgo / Advance',
      'Hardware': 'EBCO soft-close hinges & channels',
      'Baskets': 'Extra @ ₹4,000 / no.',
      'Finish': 'Semi-modular finish',
      'Handle allowance': 'Up to ₹120 / no.',
    },
  },
  {
    key: 'premium',
    name: 'Premium',
    eyebrow: 'FULL MODULAR',
    badge: 'Most Popular',
    price: 1599,
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=88',
    description: 'Higher-spec full-modular interiors with upgraded ply, laminate and hardware allowances.',
    highlights: ['Greenply / Century 710', 'Hettich / Häfele soft-close', 'Full modular finish'],
    specs: {
      'Wood': 'Greenply / Century Ply 710',
      'Internal laminate': '0.8 fabric finish',
      'External laminate': '1mm Merino / Century laminate',
      'Hardware': 'Hettich / Häfele soft-close hinges & channels',
      'Baskets': 'Extra @ ₹6,000 / no.',
      'Finish': 'Full modular finish',
      'Handle allowance': 'Up to ₹250 / no.',
    },
  },
]

const CONSTRUCTION_COMPARE_ROWS = [
  ['Best for', 'Practical homes & strong value', 'Balanced premium homes', 'High-spec premium homes'],
  ['Architecture', '2D + structural + 3D + soil test', 'Adds digital survey + MEP drawings', 'Digital survey + MEP + higher-spec package'],
  ['Steel', 'Shree 550 TMT / equivalent', 'Vizag TMT / Jairaj', 'Tata 550 TMT'],
  ['Cement', 'Nagarjuna 53 + Priya/equivalent 43', 'UltraTech 53 + Bangur/equivalent', 'UltraTech 53 throughout'],
  ['Kitchen platform', '₹120/sq ft', '₹160/sq ft', '₹250/sq ft'],
  ['Main-door allowance', '₹25,000', '₹50,000', '₹60,000'],
  ['Window allowance', '₹350/sq ft', '₹450/sq ft', '₹550/sq ft'],
  ['Bathroom fitting allowance', '₹25,000 / bathroom', '₹35,000 / bathroom', '₹50,000 / bathroom'],
  ['Room flooring', '₹45/sq ft', '₹70/sq ft', '₹85/sq ft'],
  ['Electrical', 'Finolex + MARU', 'Polycab + Gold Medal', 'Polycab FRLS + Gold Medal Air'],
  ['Railing', 'SS202', 'SS303', 'SS304 + glass balcony railing'],
  ['Gate allowance', '₹20,000', '₹35,000', '₹45,000 sliding gate'],
]

const INTERIOR_COMPARE_ROWS = [
  ['Best for', 'Practical value interiors', 'Premium full-modular interiors'],
  ['Wood', 'Gurjan BWP', 'Greenply / Century Ply 710'],
  ['Internal laminate', '0.72mm liner', '0.8 fabric finish'],
  ['External laminate', '1mm Virgo / Advance', '1mm Merino / Century laminate'],
  ['Hardware', 'EBCO soft-close', 'Hettich / Häfele soft-close'],
  ['Baskets', 'Extra @ ₹4,000/no.', 'Extra @ ₹6,000/no.'],
  ['Finish', 'Semi-modular', 'Full modular'],
  ['Handle allowance', 'Up to ₹120/no.', 'Up to ₹250/no.'],
]

function collection(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.rows)) return value.rows
  if (Array.isArray(value?.items)) return value.items
  return []
}

function makeSubmissionKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'pkg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12)
}

function Icon({ name, size = 20 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'check') return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'arrow') return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if (name === 'chevron') return <svg {...p}><path d="m7 10 5 5 5-5"/></svg>
  if (name === 'home') return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if (name === 'layers') return <svg {...p}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>
  if (name === 'shield') return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'scale') return <svg {...p}><path d="M12 3v18M5 6h14M7 6 3 14h8L7 6ZM17 6l-4 8h8l-4-8Z"/><path d="M3 14a4 4 0 0 0 8 0M13 14a4 4 0 0 0 8 0M8 21h8"/></svg>
  if (name === 'headset') return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if (name === 'calc') return <svg {...p}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h1M12 11h1M16 11h1M8 15h1M12 15h1M16 15h1M8 19h1M12 19h1M16 19h1"/></svg>
  if (name === 'send') return <svg {...p}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
  if (name === 'refresh') return <svg {...p}><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 9A7 7 0 0 1 18 6l2 5M4 13l2 5a7 7 0 0 0 11.9-3"/></svg>
  return null
}

export default function Packages() {
  const navigate = useNavigate()
  const compareRef = useRef(null)
  const quoteRef = useRef(null)
  const hash = typeof window !== 'undefined' ? window.location.hash : ''
  const [category, setCategory] = useState(hash === '#interior' ? 'interior' : 'construction')
  const [compareConstruction, setCompareConstruction] = useState([])
  const [compareInterior, setCompareInterior] = useState([])
  const [expanded, setExpanded] = useState({})
  const [compareOpen, setCompareOpen] = useState(false)
  const [cities, setCities] = useState([])
  const [cityLoading, setCityLoading] = useState(true)
  const [quoteError, setQuoteError] = useState('')
  const [quoteForm, setQuoteForm] = useState({
    name: '',
    phone: '',
    cityId: '',
    projectType: '',
    budget: '',
    requirements: '',
    packageKeys: ['premium'],
  })

  useEffect(() => {
    let active = true
    publicRequest('/cities')
      .then(value => { if (active) setCities(collection(value)) })
      .catch(() => {})
      .finally(() => { if (active) setCityLoading(false) })
    return () => { active = false }
  }, [])

  const packages = category === 'construction' ? CONSTRUCTION_PACKAGES : INTERIOR_PACKAGES
  const selectedKeys = category === 'construction' ? compareConstruction : compareInterior
  const compareRows = category === 'construction' ? CONSTRUCTION_COMPARE_ROWS : INTERIOR_COMPARE_ROWS
  const selectedPackages = useMemo(
    () => selectedKeys.map(key => packages.find(item => item.key === key)).filter(Boolean),
    [packages, selectedKeys]
  )
  const cityList = useMemo(
    () => [...cities].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [cities]
  )

  function switchCategory(next) {
    setCategory(next)
    setExpanded({})
    setCompareOpen(false)
    setQuoteError('')
    setQuoteForm(current => ({
      ...current,
      projectType: '',
      packageKeys: next === 'construction' ? ['premium'] : ['premium'],
    }))
    window.history.replaceState({}, '', next === 'interior' ? '/packages#interior' : '/packages#construction')
  }

  function setCompare(key) {
    setCompareOpen(false)
    const setter = category === 'construction' ? setCompareConstruction : setCompareInterior
    setter(current => {
      if (current.includes(key)) return current.filter(item => item !== key)
      if (current.length >= 2) return [current[1], key]
      return [...current, key]
    })
  }

  function clearCompare() {
    setCompareOpen(false)
    if (category === 'construction') setCompareConstruction([])
    else setCompareInterior([])
  }

  function openComparison() {
    if (selectedKeys.length !== 2) return
    setCompareOpen(true)
    window.setTimeout(() => compareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  function toggleDetails(key) {
    setExpanded(current => ({ ...current, [category + ':' + key]: !current[category + ':' + key] }))
  }

  function openQuote(key) {
    setQuoteForm(current => ({ ...current, packageKeys: key ? [key] : current.packageKeys }))
    quoteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function submitQuote(event) {
    event.preventDefault()
    const phone = quoteForm.phone.replace(/\D/g, '')
    if (quoteForm.name.trim().length < 2) return setQuoteError('Enter your full name.')
    if (!/^[6-9]\d{9}$/.test(phone)) return setQuoteError('Enter a valid 10-digit mobile number.')
    if (!quoteForm.cityId) return setQuoteError('Select your city.')
    if (!quoteForm.projectType) return setQuoteError(category === 'construction' ? 'Select your project type.' : 'Select your property type.')
    if (!quoteForm.packageKeys.length) return setQuoteError('Select at least one package.')

    const city = cityList.find(item => String(item.id) === String(quoteForm.cityId))
    const primaryPackage = quoteForm.packageKeys[0]
    const answers = category === 'construction'
      ? {
          project_type: quoteForm.projectType,
          quality: primaryPackage === 'royal' ? 'luxury' : primaryPackage,
          budget: quoteForm.budget,
          additional_requirement: [
            quoteForm.requirements,
            'Package preference: ' + quoteForm.packageKeys.map(key => packages.find(item => item.key === key)?.name).filter(Boolean).join(', '),
          ].filter(Boolean).join(' · '),
        }
      : {
          property_type: quoteForm.projectType,
          finish_quality: primaryPackage === 'premium' ? 'premium' : 'standard',
          budget: quoteForm.budget,
          additional_requirement: [
            quoteForm.requirements,
            'Interior package preference: ' + quoteForm.packageKeys.map(key => packages.find(item => item.key === key)?.name).filter(Boolean).join(', '),
          ].filter(Boolean).join(' · '),
        }

    try {
      sessionStorage.setItem('propulse_intake_prefill', JSON.stringify({
        flowKey: category === 'construction' ? 'build' : 'design',
        cityId: Number(quoteForm.cityId),
        cityName: city?.name || '',
        pincode: '',
        answers,
        name: quoteForm.name.trim(),
        phone,
        email: '',
        consent: true,
        submissionKey: makeSubmissionKey(),
        createdAt: Date.now(),
      }))
    } catch {}

    const flowKey = category === 'construction' ? 'build' : 'design'
    const query = category === 'construction' ? '?package=' + encodeURIComponent(primaryPackage) : ''
    navigate('/requirements/' + flowKey + query)
  }

  function toggleQuotePackage(key) {
    setQuoteForm(current => {
      const exists = current.packageKeys.includes(key)
      if (exists) return { ...current, packageKeys: current.packageKeys.filter(item => item !== key) }
      if (current.packageKeys.length >= 2) return { ...current, packageKeys: [current.packageKeys[1], key] }
      return { ...current, packageKeys: [...current.packageKeys, key] }
    })
    setQuoteError('')
  }

  return <main className="pkg-page">
    <header className="pkg-header">
      <Link className="pkg-logo" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse" /></Link>
      <nav>
        <Link to="/">Home</Link>
        <Link className="active" to="/packages">Packages</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </nav>
      <div className="pkg-header-actions">
        <button className="pkg-header-quote" type="button" onClick={() => openQuote()}>Get Free Quote <Icon name="arrow" size={15} /></button>
        <Link className="pkg-pro-button" to="/contact?audience=users">For Professionals</Link>
      </div>
    </header>

    <section className={'pkg-hero ' + (category === 'construction' ? 'construction' : 'interior')}>
      <div className="pkg-hero-shade" />
      <div className="pkg-hero-content">
        <div className="pkg-hero-copy">
          <span>HOMEOWNER PACKAGE GUIDE</span>
          <h1>Compare Before You <em>Commit.</em></h1>
          <p>Review construction and interior package specifications in one place, then use the dedicated project flow for the final requirement or quotation.</p>
          <div className="pkg-category-switch">
            <button type="button" className={category === 'construction' ? 'active' : ''} onClick={() => switchCategory('construction')}><Icon name="home" size={18} />Construction Packages</button>
            <button type="button" className={category === 'interior' ? 'active' : ''} onClick={() => switchCategory('interior')}><Icon name="layers" size={18} />Interior Packages</button>
          </div>
          <div className="pkg-hero-benefits">
            <article><span><Icon name="shield" /></span><b>Transparent<br/>Specifications</b></article>
            <article><span><Icon name="calc" /></span><b>Compare &<br/>Choose Easily</b></article>
            <article><span><Icon name="headset" /></span><b>Expert Support<br/>at Every Step</b></article>
          </div>
        </div>

        <aside className="pkg-reference-card">
          <small>{category === 'construction' ? 'CONSTRUCTION REFERENCE' : 'INTERIOR REFERENCE'}</small>
          <strong>₹{(category === 'construction' ? 1750 : 1399).toLocaleString('en-IN')}<em>/sq ft</em></strong>
          <p>{category === 'construction' ? 'Standard package brochure reference' : 'Standard woodwork brochure reference'}</p>
          <div className="pkg-reference-list">
            <span><Icon name="shield" size={17} />Final scope and price are confirmed in the project quotation</span>
            <span><Icon name="shield" size={17} />Customizations available</span>
            <span><Icon name="shield" size={17} />Construction & interior package options</span>
          </div>
        </aside>
      </div>
    </section>

    <section className="pkg-main">
      <div className="pkg-packages-area">
        <div className="pkg-packages-kicker">OUR PACKAGES</div>

        <div className={'pkg-package-grid ' + (packages.length === 2 ? 'two' : '')}>
          {packages.map(item => {
            const selected = selectedKeys.includes(item.key)
            const open = Boolean(expanded[category + ':' + item.key])
            return <article className={'pkg-package-card ' + (selected ? 'selected' : '')} key={item.key}>
              <div className="pkg-card-image">
                <img src={item.image} alt="" />
                <button className={'pkg-card-check ' + (selected ? 'checked' : '')} type="button" aria-label={(selected ? 'Remove ' : 'Add ') + item.name + ' comparison'} onClick={() => setCompare(item.key)}>{selected ? <Icon name="check" size={17} /> : null}</button>
                {item.badge && <span className="pkg-card-badge">{item.badge === 'Luxury' ? '◇ ' : item.badge === 'Most Popular' ? '♛ ' : ''}{item.badge}</span>}
              </div>
              <div className="pkg-card-body">
                <small>{item.eyebrow}</small>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <div className="pkg-card-price"><strong>₹{item.price.toLocaleString('en-IN')}</strong><span>/sq ft</span></div>
                <ul>{item.highlights.map(value => <li key={value}><Icon name="check" size={15} />{value}</li>)}</ul>
                <div className="pkg-card-actions">
                  <button className={'pkg-select-compare ' + (selected ? 'active' : '')} type="button" onClick={() => setCompare(item.key)}>{selected ? <><Icon name="check" size={14} />Selected</> : 'Compare'}</button>
                  <button className="pkg-get-quote" type="button" onClick={() => openQuote(item.key)}>Get Quote <Icon name="arrow" size={14} /></button>
                  <button className="pkg-details-toggle" type="button" onClick={() => toggleDetails(item.key)}>{open ? 'Hide Details' : 'Full Details'} <Icon name="chevron" size={15} /></button>
                </div>
                {open && <div className="pkg-full-details">
                  {Object.entries(item.specs).map(([label, value]) => <div key={label}><b>{label}</b><span>{value}</span></div>)}
                </div>}
              </div>
            </article>
          })}
        </div>

        <div className="pkg-compare-bottom">
          <small>{selectedKeys.length}/2 selected</small>
          <button type="button" disabled={selectedKeys.length !== 2} onClick={openComparison}>Compare Packages <Icon name="arrow" size={14} /></button>
        </div>

        {compareOpen && <section className="pkg-comparison-section" ref={compareRef}>
          <div className="pkg-comparison-heading">
            <div><span>PACKAGE COMPARISON</span><h2>Side-by-Side Comparison</h2><p>Compare features and specifications for your selected packages.</p></div>
            <button type="button" onClick={clearCompare}><Icon name="refresh" size={15} />Clear Selection</button>
          </div>

          {selectedPackages.length === 2 ? <div className="pkg-comparison-table-wrap">
            <table className="pkg-comparison-table">
              <thead>
                <tr>
                  <th>Specification</th>
                  {selectedPackages.map(item => <th key={item.key}>
                    <div className="pkg-table-package"><img src={item.image} alt="" /><span><b>{item.name}</b><strong>₹{item.price.toLocaleString('en-IN')}/sq ft</strong></span>{item.badge && <i>{item.badge}</i>}</div>
                  </th>)}
                </tr>
              </thead>
              <tbody>
                {compareRows.map(row => {
                  const indexes = category === 'construction'
                    ? selectedPackages.map(item => CONSTRUCTION_PACKAGES.findIndex(pkg => pkg.key === item.key) + 1)
                    : selectedPackages.map(item => INTERIOR_PACKAGES.findIndex(pkg => pkg.key === item.key) + 1)
                  return <tr key={row[0]}><td>{row[0]}</td>{indexes.map((index, i) => <td key={selectedPackages[i].key}><Icon name="check" size={14} />{row[index]}</td>)}</tr>
                })}
              </tbody>
            </table>
          </div> : <div className="pkg-comparison-empty"><Icon name="scale" size={28} /><div><b>Select any two packages</b><span>Your detailed comparison will appear here.</span></div></div>}
        </section>}
      </div>

      <aside className="pkg-quote-card" ref={quoteRef}>
        <span>QUICK QUOTE REQUEST</span>
        <h2>Get a Quote</h2>
        <p>Choose a package and enter your basic details. You can confirm the remaining project information on the next step.</p>

        <form onSubmit={submitQuote}>
          <div className="pkg-form-two">
            <label><span>Full Name *</span><input value={quoteForm.name} onChange={event => setQuoteForm(current => ({ ...current, name: event.target.value }))} placeholder="Enter your full name" autoComplete="name" /></label>
            <label><span>Mobile Number *</span><input value={quoteForm.phone} onChange={event => setQuoteForm(current => ({ ...current, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="+91 98765 43210" inputMode="tel" autoComplete="tel" /></label>
          </div>

          <div className="pkg-form-two">
            <label><span>City *</span><select value={quoteForm.cityId} onChange={event => setQuoteForm(current => ({ ...current, cityId: event.target.value }))}><option value="">{cityLoading ? 'Loading cities…' : 'Select your city'}</option>{cityList.map(city => <option key={city.id} value={city.id}>{city.name}{city.state_name ? ' · ' + city.state_name : ''}</option>)}</select></label>
            <label><span>{category === 'construction' ? 'Project Type *' : 'Property Type *'}</span><select value={quoteForm.projectType} onChange={event => setQuoteForm(current => ({ ...current, projectType: event.target.value }))}>
              <option value="">Select {category === 'construction' ? 'project' : 'property'} type</option>
              {category === 'construction' ? <>
                <option value="house_construction">House construction</option>
                <option value="commercial_building">Commercial building</option>
                <option value="building_extension">Building extension</option>
              </> : <>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="independent_house">Independent house</option>
                <option value="office">Office</option>
                <option value="commercial_space">Commercial space</option>
              </>}
            </select></label>
          </div>

          <label className="pkg-package-interest"><span>Package Interested In *</span><div className="pkg-package-chips">{packages.map(item => <button type="button" key={item.key} className={quoteForm.packageKeys.includes(item.key) ? 'active' : ''} onClick={() => toggleQuotePackage(item.key)}>{item.name}{quoteForm.packageKeys.includes(item.key) ? ' ×' : ' +'}</button>)}</div></label>

          <label><span>Budget Range</span><select value={quoteForm.budget} onChange={event => setQuoteForm(current => ({ ...current, budget: event.target.value }))}><option value="">Select budget range</option><option value="Under ₹25 lakh">Under ₹25 lakh</option><option value="₹25–50 lakh">₹25–50 lakh</option><option value="₹50 lakh–₹1 crore">₹50 lakh–₹1 crore</option><option value="₹1–2 crore">₹1–2 crore</option><option value="Above ₹2 crore">Above ₹2 crore</option></select></label>

          <label><span>Requirement Details</span><textarea value={quoteForm.requirements} onChange={event => setQuoteForm(current => ({ ...current, requirements: event.target.value }))} placeholder="Tell us about your project, plot size, timeline or any specific requirements..." /></label>

          {quoteError && <div className="pkg-form-error">{quoteError}</div>}
          <button className="pkg-submit-quote" type="submit"><Icon name="send" size={16} />Continue to Quote <Icon name="arrow" size={15} /></button>
          <small className="pkg-form-note"><Icon name="check" size={14} />Next: confirm PIN code, size and project details.</small>
        </form>

        <div className="pkg-quote-trust">
          <span><Icon name="shield" size={17} /><b>Free</b><small>Consultation</small></span>
          <span><Icon name="headset" size={17} /><b>Expert</b><small>Support</small></span>
          <span><Icon name="check" size={17} /><b>No</b><small>Obligation</small></span>
        </div>
      </aside>
    </section>

    <section className="pkg-bottom-trust">
      <article><span>₹</span><div><b>Transparent Pricing</b><small>No hidden assumptions, clear package references</small></div></article>
      <article><span><Icon name="shield" size={20} /></span><div><b>Quality Assurance</b><small>Branded material and finish references</small></div></article>
      <article><span>☷</span><div><b>Flexible Customization</b><small>Tailor the final project scope to your needs</small></div></article>
      <article><span><Icon name="headset" size={20} /></span><div><b>Expert Consultation</b><small>Guided support through the requirement journey</small></div></article>
    </section>

    <div className="pkg-disclaimer">
      Package rates and specifications shown here are brochure references. Final pricing, exact brands, quantities, taxes, exclusions, warranties and scope are confirmed in the project quotation.
    </div>
  </main>
}
