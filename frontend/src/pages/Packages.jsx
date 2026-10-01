import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CONSTRUCTION_PACKAGE_CATALOG } from '../data/constructionPackageCatalog'
import { INTERIOR_PACKAGE_CATALOG, INTERIOR_PACKAGES } from '../data/interiorPackageCatalog'
import './Packages.css'

const CONSTRUCTION_PACKAGES = [
  {
    key: 'standard',
    name: 'Standard',
    eyebrow: 'ESSENTIAL HOME',
    badge: 'Smart Value',
    price: CONSTRUCTION_PACKAGE_CATALOG.standard.rate,
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=88',
    description: 'Reliable construction specifications with practical branded materials and comfortable everyday finishes.',
    highlights: ['Reliable quality materials', 'Modern & functional specification', 'Strong value for practical homes'],
    specs: CONSTRUCTION_PACKAGE_CATALOG.standard.specs,
  },
  {
    key: 'premium',
    name: 'Premium',
    eyebrow: 'UPGRADED HOME',
    badge: 'Most Popular',
    price: CONSTRUCTION_PACKAGE_CATALOG.premium.rate,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=88',
    description: 'A balanced upgrade with stronger brands, improved finishes and richer home specifications.',
    highlights: ['Premium branded materials', 'Better finishes & allowances', 'Great long-term value'],
    specs: CONSTRUCTION_PACKAGE_CATALOG.premium.specs,
  },
  {
    key: 'royal',
    name: 'Royal',
    eyebrow: 'HIGH-SPEC HOME',
    badge: 'Luxury',
    price: CONSTRUCTION_PACKAGE_CATALOG.royal.rate,
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=88',
    description: 'Higher-spec materials, larger allowances and premium finish choices for a more luxurious home.',
    highlights: ['Top-tier material references', 'Higher finish allowances', 'Premium home specification'],
    specs: CONSTRUCTION_PACKAGE_CATALOG.royal.specs,
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
  const hash = typeof window !== 'undefined' ? window.location.hash : ''
  const [category, setCategory] = useState(hash === '#interior' ? 'interior' : 'construction')
  const [compareConstruction, setCompareConstruction] = useState([])
  const [compareInterior, setCompareInterior] = useState([])
  const [expanded, setExpanded] = useState({})
  const [compareOpen, setCompareOpen] = useState(false)
  const packages = category === 'construction' ? CONSTRUCTION_PACKAGES : INTERIOR_PACKAGES
  const selectedKeys = category === 'construction' ? compareConstruction : compareInterior
  const compareRows = category === 'construction' ? CONSTRUCTION_COMPARE_ROWS : INTERIOR_COMPARE_ROWS
  const selectedPackages = useMemo(
    () => selectedKeys.map(key => packages.find(item => item.key === key)).filter(Boolean),
    [packages, selectedKeys]
  )
  function switchCategory(next) {
    setCategory(next)
    setExpanded({})
    setCompareOpen(false)
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
    const packageKey = String(key || '').toLowerCase()
    const hash = category === 'construction' ? 'construction' : 'interiors'
    navigate('/quote?package=' + encodeURIComponent(packageKey) + '#' + hash)
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
        <button className="pkg-header-quote" type="button" onClick={() => window.dispatchEvent(new CustomEvent('propulse:open-lead-popup',{detail:{flowKey:category==='construction'?'build':'design'}}))}>Get Free Quote <Icon name="arrow" size={15} /></button>
        <Link className="pkg-pro-button" to="/professionals">For Professionals</Link>
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
          <strong>₹{(category === 'construction' ? CONSTRUCTION_PACKAGE_CATALOG.standard.rate : INTERIOR_PACKAGE_CATALOG.standard.price).toLocaleString('en-IN')}<em>/sq ft</em></strong>
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
