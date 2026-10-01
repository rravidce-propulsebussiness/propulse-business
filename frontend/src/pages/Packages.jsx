import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CONSTRUCTION_PACKAGE_CATALOG } from '../data/constructionPackageCatalog'
import { INTERIOR_PACKAGES } from '../data/interiorPackageCatalog'
import './Packages.css'

const CONSTRUCTION_PACKAGES = [
  {
    key: 'standard',
    name: 'Standard',
    title: 'Standard Home',
    eyebrow: 'ESSENTIAL HOME',
    badge: 'Smart Value',
    price: CONSTRUCTION_PACKAGE_CATALOG.standard.rate,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=90',
    description: 'Best for practical homes with reliable branded materials and comfortable everyday finishes.',
    highlights: ['Modern elevation design', 'Reliable branded materials', 'Essential fittings & finishes'],
    specs: CONSTRUCTION_PACKAGE_CATALOG.standard.specs,
  },
  {
    key: 'premium',
    name: 'Premium',
    title: 'Premium Home',
    eyebrow: 'UPGRADED HOME',
    badge: 'Most Popular',
    price: CONSTRUCTION_PACKAGE_CATALOG.premium.rate,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1100&q=90',
    description: 'A balanced premium package with upgraded brands, richer finishes and stronger allowances.',
    highlights: ['Contemporary design options', 'Premium branded materials', 'Upgraded fittings & fixtures'],
    specs: CONSTRUCTION_PACKAGE_CATALOG.premium.specs,
  },
  {
    key: 'royal',
    name: 'Royal',
    title: 'Royal Home',
    eyebrow: 'HIGH-SPEC HOME',
    badge: 'Luxury',
    price: CONSTRUCTION_PACKAGE_CATALOG.royal.rate,
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1100&q=90',
    description: 'Higher-spec materials, larger allowances and premium finish choices for a luxurious home.',
    highlights: ['Custom architectural design', 'Top-tier material references', 'Premium finish allowances'],
    specs: CONSTRUCTION_PACKAGE_CATALOG.royal.specs,
  },
]

const INTERIOR_DISPLAY_PACKAGES = INTERIOR_PACKAGES.map((item) => ({
  ...item,
  title: item.key === 'standard' ? 'Standard Interiors' : 'Premium Interiors',
  highlights: item.highlights,
}))

const REAL_ESTATE_OPTIONS = [
  {
    title: 'Apartments',
    text: 'Modern apartments in prime locations',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1100&q=88',
  },
  {
    title: 'Villas',
    text: 'Premium villas for spacious living',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1100&q=88',
  },
  {
    title: 'Residential Plots',
    text: 'Well-located plots for your future home',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1100&q=88',
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

function Icon({ name, size = 20 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'check') return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'arrow') return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if (name === 'chevron') return <svg {...p}><path d="m7 10 5 5 5-5"/></svg>
  if (name === 'home') return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if (name === 'sofa') return <svg {...p}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/><path d="M5 17v2M19 17v2"/></svg>
  if (name === 'building') return <svg {...p}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if (name === 'shield') return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'people') return <svg {...p}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if (name === 'tag') return <svg {...p}><path d="M20 13 11 22 2 13V2h11l7 7Z"/><circle cx="7" cy="7" r="1.5"/></svg>
  if (name === 'headset') return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if (name === 'scale') return <svg {...p}><path d="M12 3v18M5 6h14M7 6 3 14h8L7 6ZM17 6l-4 8h8l-4-8Z"/><path d="M3 14a4 4 0 0 0 8 0M13 14a4 4 0 0 0 8 0M8 21h8"/></svg>
  if (name === 'refresh') return <svg {...p}><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 9A7 7 0 0 1 18 6l2 5M4 13l2 5a7 7 0 0 0 11.9-3"/></svg>
  if (name === 'pin') return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  return null
}

export default function Packages() {
  const navigate = useNavigate()
  const constructionRef = useRef(null)
  const interiorRef = useRef(null)
  const realEstateRef = useRef(null)
  const constructionCompareRef = useRef(null)
  const interiorCompareRef = useRef(null)

  const [activeCategory, setActiveCategory] = useState('construction')
  const [compareConstruction, setCompareConstruction] = useState([])
  const [compareInterior, setCompareInterior] = useState([])
  const [compareOpen, setCompareOpen] = useState({ construction: false, interior: false })
  const [expanded, setExpanded] = useState({})

  function scrollToCategory(category) {
    setActiveCategory(category)
    const ref = category === 'construction' ? constructionRef : category === 'interior' ? interiorRef : realEstateRef
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState({}, '', category === 'construction' ? '/packages#construction' : category === 'interior' ? '/packages#interior' : '/packages#real-estate')
  }

  function selectedKeys(category) {
    return category === 'construction' ? compareConstruction : compareInterior
  }

  function setCompare(category, key) {
    setCompareOpen(current => ({ ...current, [category]: false }))
    const setter = category === 'construction' ? setCompareConstruction : setCompareInterior
    setter(current => {
      if (current.includes(key)) return current.filter(item => item !== key)
      if (current.length >= 2) return [current[1], key]
      return [...current, key]
    })
  }

  function clearCompare(category) {
    setCompareOpen(current => ({ ...current, [category]: false }))
    if (category === 'construction') setCompareConstruction([])
    else setCompareInterior([])
  }

  function openComparison(category) {
    if (selectedKeys(category).length !== 2) return
    setCompareOpen(current => ({ ...current, [category]: true }))
    window.setTimeout(() => {
      const ref = category === 'construction' ? constructionCompareRef : interiorCompareRef
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function toggleDetails(category, key) {
    const id = category + ':' + key
    setExpanded(current => ({ ...current, [id]: !current[id] }))
  }

  function openQuote(category, key) {
    navigate('/quote?package=' + encodeURIComponent(String(key || '').toLowerCase()) + '#' + (category === 'construction' ? 'construction' : 'interiors'))
  }

  function renderPackageCard(category, item) {
    const selected = selectedKeys(category).includes(item.key)
    const open = Boolean(expanded[category + ':' + item.key])
    const title = item.title || item.name
    return <article className={'pkg-premium-card ' + (selected ? 'selected' : '')} key={item.key}>
      <div className="pkg-card-photo">
        <img src={item.image} alt={title} loading="lazy" />
        {item.badge && <span className="pkg-card-badge">{item.badge}</span>}
        <button className={'pkg-compare-check ' + (selected ? 'checked' : '')} type="button" onClick={() => setCompare(category, item.key)} aria-label={(selected ? 'Remove ' : 'Add ') + title + ' comparison'}>
          {selected ? <Icon name="check" size={14} /> : null}
        </button>
      </div>
      <div className="pkg-premium-card-body">
        <small>{item.eyebrow}</small>
        <h3>{title}</h3>
        <div className="pkg-premium-price"><strong>₹{item.price.toLocaleString('en-IN')}</strong><span>/sq ft</span></div>
        <p>{item.description}</p>
        <ul>{item.highlights.map(value => <li key={value}><Icon name="check" size={13}/>{value}</li>)}</ul>
        <div className="pkg-premium-actions">
          <button className="primary" type="button" onClick={() => openQuote(category, item.key)}>Get Quote <Icon name="arrow" size={14}/></button>
          <button className={'compare ' + (selected ? 'selected' : '')} type="button" onClick={() => setCompare(category, item.key)}>{selected ? 'Selected' : 'Compare'}</button>
        </div>
        <button className="pkg-full-toggle" type="button" onClick={() => toggleDetails(category, item.key)}>
          {open ? 'Hide Details' : 'Full Details'} <Icon name="chevron" size={14}/>
        </button>
        {open && <div className="pkg-full-details">
          {Object.entries(item.specs).map(([label,value]) => <div key={label}><b>{label}</b><span>{value}</span></div>)}
        </div>}
      </div>
    </article>
  }

  function renderCompare(category) {
    const packages = category === 'construction' ? CONSTRUCTION_PACKAGES : INTERIOR_DISPLAY_PACKAGES
    const rows = category === 'construction' ? CONSTRUCTION_COMPARE_ROWS : INTERIOR_COMPARE_ROWS
    const selected = selectedKeys(category).map(key => packages.find(item => item.key === key)).filter(Boolean)
    if (!compareOpen[category] || selected.length !== 2) return null
    const ref = category === 'construction' ? constructionCompareRef : interiorCompareRef
    return <section className="pkg-comparison-section" ref={ref}>
      <div className="pkg-comparison-heading">
        <div><span>PACKAGE COMPARISON</span><h3>Side-by-Side Comparison</h3><p>Compare the selected packages before you continue to quotation.</p></div>
        <button type="button" onClick={() => clearCompare(category)}><Icon name="refresh" size={14}/>Clear Selection</button>
      </div>
      <div className="pkg-comparison-table-wrap">
        <table className="pkg-comparison-table">
          <thead><tr><th>Specification</th>{selected.map(item => <th key={item.key}><div className="pkg-table-package"><img src={item.image} alt="" /><span><b>{item.title || item.name}</b><strong>₹{item.price.toLocaleString('en-IN')}/sq ft</strong></span></div></th>)}</tr></thead>
          <tbody>{rows.map(row => {
            const indexes = category === 'construction'
              ? selected.map(item => CONSTRUCTION_PACKAGES.findIndex(pkg => pkg.key === item.key) + 1)
              : selected.map(item => INTERIOR_DISPLAY_PACKAGES.findIndex(pkg => pkg.key === item.key) + 1)
            return <tr key={row[0]}><td>{row[0]}</td>{indexes.map((index,i)=><td key={selected[i].key}><Icon name="check" size={13}/>{row[index]}</td>)}</tr>
          })}</tbody>
        </table>
      </div>
    </section>
  }

  function compareBar(category) {
    const count = selectedKeys(category).length
    return <div className="pkg-compare-bar">
      <div><Icon name="scale" size={17}/><span><b>{count}/2 selected</b><small>Select any two packages to compare.</small></span></div>
      <button type="button" disabled={count !== 2} onClick={() => openComparison(category)}>Compare Packages <Icon name="arrow" size={13}/></button>
    </div>
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
        <Link to="/experts">Find Professionals</Link>
      </nav>
      <div className="pkg-header-actions">
        <Link className="pkg-header-quote" to="/quote#interiors">Get Free Quote <Icon name="arrow" size={15}/></Link>
        <Link className="pkg-pro-button" to="/professionals">For Professionals</Link>
      </div>
    </header>

    <section className="pkg-premium-hero">
      <div className="pkg-premium-hero-bg"/>
      <div className="pkg-premium-hero-inner">
        <div className="pkg-premium-copy">
          <span className="pkg-kicker"><i/>OUR PACKAGES</span>
          <h1>Beautiful Spaces<br/><em>Within Your Budget</em></h1>
          <p>Explore carefully curated packages for construction, interiors and real estate. Transparent scope, modern designs and flexible options to match your needs.</p>
          <div className="pkg-hero-points">
            <span><i><Icon name="people" size={17}/></i><b>Verified<br/>Professionals</b></span>
            <span><i><Icon name="shield" size={17}/></i><b>Quality<br/>Materials</b></span>
            <span><i><Icon name="tag" size={17}/></i><b>Transparent<br/>Pricing</b></span>
            <span><i><Icon name="headset" size={17}/></i><b>End-to-End<br/>Support</b></span>
          </div>
        </div>
        <aside className="pkg-hero-cta">
          <div><b>Turn your ideas into reality</b><p>Choose a package and get a detailed quotation for your requirement.</p></div>
          <Link to="/quote#interiors"><Icon name="arrow" size={18}/></Link>
        </aside>
      </div>
    </section>

    <section className="pkg-category-nav">
      <button className={activeCategory === 'construction' ? 'active' : ''} type="button" onClick={() => scrollToCategory('construction')}><i><Icon name="home" size={21}/></i><span><b>Construction Packages</b><small>Build your dream home</small></span><Icon name="arrow" size={15}/></button>
      <button className={activeCategory === 'interior' ? 'active' : ''} type="button" onClick={() => scrollToCategory('interior')}><i><Icon name="sofa" size={21}/></i><span><b>Interior Packages</b><small>Beautiful interior solutions</small></span><Icon name="arrow" size={15}/></button>
      <button className={activeCategory === 'real-estate' ? 'active' : ''} type="button" onClick={() => scrollToCategory('real-estate')}><i><Icon name="building" size={21}/></i><span><b>Real Estate</b><small>Curated property inspiration</small></span><Icon name="arrow" size={15}/></button>
    </section>

    <section className="pkg-premium-section" ref={constructionRef}>
      <div className="pkg-section-head">
        <div><span><i/>CONSTRUCTION PACKAGES</span><h2>Build Your Dream Home</h2><p>Choose from construction packages with transparent pricing, quality materials and clear specifications.</p></div>
        <div className="pkg-section-benefits"><span><Icon name="shield" size={15}/>Quality Construction</span><span><Icon name="people" size={15}/>Trusted Professionals</span><span><Icon name="check" size={15}/>Clear Specifications</span></div>
      </div>
      <div className="pkg-premium-grid construction">{CONSTRUCTION_PACKAGES.map(item => renderPackageCard('construction', item))}</div>
      {compareBar('construction')}
      {renderCompare('construction')}
    </section>

    <section className="pkg-premium-section pkg-interior-section" ref={interiorRef}>
      <div className="pkg-section-head">
        <div><span><i/>INTERIOR PACKAGES</span><h2>Transform Your Interiors</h2><p>Stylish, functional interior packages built around practical material and hardware references.</p></div>
        <div className="pkg-section-benefits"><span><Icon name="sofa" size={15}/>Modular Solutions</span><span><Icon name="shield" size={15}/>Branded Materials</span><span><Icon name="tag" size={15}/>Clear Package Rates</span></div>
      </div>
      <div className="pkg-premium-grid interior">{INTERIOR_DISPLAY_PACKAGES.map(item => renderPackageCard('interior', item))}</div>
      {compareBar('interior')}
      {renderCompare('interior')}
    </section>

    <section className="pkg-premium-section pkg-real-estate-section" ref={realEstateRef}>
      <div className="pkg-section-head">
        <div><span><i/>REAL ESTATE</span><h2>Find the Right Property</h2><p>Browse property inspiration by type, location and budget before sharing your exact requirement.</p></div>
        <div className="pkg-section-benefits"><span><Icon name="shield" size={15}/>Clear Context</span><span><Icon name="pin" size={15}/>Prime Locations</span><span><Icon name="people" size={15}/>Professional Support</span></div>
      </div>
      <div className="pkg-property-grid">
        {REAL_ESTATE_OPTIONS.map(item => <article key={item.title}><img src={item.image} alt={item.title} loading="lazy"/><div><span><h3>{item.title}</h3><p>{item.text}</p></span><Link to="/projects">Explore <Icon name="arrow" size={13}/></Link></div></article>)}
      </div>
    </section>

    <section className="pkg-bottom-note">
      <Icon name="shield" size={17}/>
      <p>Package rates and specifications shown here are brochure references. Final pricing, exact brands, quantities, taxes, exclusions, warranties and scope are confirmed in the project quotation.</p>
    </section>
  </main>
}
