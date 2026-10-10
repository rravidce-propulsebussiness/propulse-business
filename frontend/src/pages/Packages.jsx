import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CONSTRUCTION_PACKAGE_CATALOG } from '../data/constructionPackageCatalog'
import { INTERIOR_PACKAGES } from '../data/interiorPackageCatalog'
import './Packages.css'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'

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

const PACKAGE_HEADLINES = [
  { lead: 'For Every Choice, ', accent: "There's a Package" },
  { lead: 'Your Space. Your Style. ', accent: 'Your Package.' },
  { lead: 'Build or Design, ', accent: 'Find Your Package' },
]
const PACKAGE_HEADLINE_MEASURE = PACKAGE_HEADLINES.reduce((longest, item) => {
  const headline = item.lead + item.accent
  return headline.length > longest.length ? headline : longest
}, '')

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
  if (name === 'shield') return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'people') return <svg {...p}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if (name === 'tag') return <svg {...p}><path d="M20 13 11 22 2 13V2h11l7 7Z"/><circle cx="7" cy="7" r="1.5"/></svg>
  if (name === 'headset') return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if (name === 'scale') return <svg {...p}><path d="M12 3v18M5 6h14M7 6 3 14h8L7 6ZM17 6l-4 8h8l-4-8Z"/><path d="M3 14a4 4 0 0 0 8 0M13 14a4 4 0 0 0 8 0M8 21h8"/></svg>
  if (name === 'refresh') return <svg {...p}><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 9A7 7 0 0 1 18 6l2 5M4 13l2 5a7 7 0 0 0 11.9-3"/></svg>
  return null
}

export default function Packages() {
  const navigate = useNavigate()
  const constructionCompareRef = useRef(null)
  const interiorCompareRef = useRef(null)
  const initialHash = typeof window !== 'undefined' ? window.location.hash : ''
  const [activeCategory, setActiveCategory] = useState(initialHash === '#interior' || initialHash === '#interiors' ? 'interior' : 'construction')
  const [compareConstruction, setCompareConstruction] = useState([])
  const [compareInterior, setCompareInterior] = useState([])
  const [compareOpen, setCompareOpen] = useState({ construction: false, interior: false })
  const [expanded, setExpanded] = useState({})
  const [typewriter, setTypewriter] = useState({ index: 0, length: 0, phase: 'typing' })
  const activeHeadline = PACKAGE_HEADLINES[typewriter.index]
  const activeHeadlineText = activeHeadline.lead + activeHeadline.accent

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      if (typewriter.phase !== 'static') {
        setTypewriter({ index: 0, length: PACKAGE_HEADLINES[0].lead.length + PACKAGE_HEADLINES[0].accent.length, phase: 'static' })
      }
      return
    }

    const delay = typewriter.phase === 'holding' ? 1900 : typewriter.phase === 'erasing' ? 34 : 65
    const timeout = window.setTimeout(() => {
      setTypewriter(current => {
        const phrase = PACKAGE_HEADLINES[current.index]
        const total = phrase.lead.length + phrase.accent.length

        if (current.phase === 'typing') {
          return current.length < total
            ? { ...current, length: current.length + 1 }
            : { ...current, phase: 'holding' }
        }
        if (current.phase === 'holding') return { ...current, phase: 'erasing' }
        if (current.phase === 'erasing') {
          return current.length > 0
            ? { ...current, length: current.length - 1 }
            : { index: (current.index + 1) % PACKAGE_HEADLINES.length, length: 0, phase: 'typing' }
        }
        return current
      })
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [typewriter])

  function switchCategory(category) {
    if (!['construction','interior'].includes(category)) return
    setActiveCategory(category)
    setExpanded({})
    window.history.replaceState({}, '', category === 'construction' ? '/packages#construction' : '/packages#interior')
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
    return <article className={'pkg-premium-card tier-' + item.key + ' ' + (selected ? 'selected' : '')} key={item.key}>
      <div className="pkg-card-photo">
        <img src={item.image} alt={title} loading="lazy" />
        <div className="pkg-card-photo-shade" />
        {item.badge && <span className="pkg-card-badge">{item.badge}</span>}
        {selected && <span className="pkg-card-selected"><Icon name="check" size={12}/> Selected for comparison</span>}
      </div>
      <div className="pkg-premium-card-body">
        <div className="pkg-card-heading">
          <div><small>{item.eyebrow}</small><h3>{title}</h3></div>
          <div className="pkg-premium-price"><strong>₹{item.price.toLocaleString('en-IN')}</strong><span>per sq ft</span></div>
        </div>
        <p className="pkg-card-description">{item.description}</p>
        <div className="pkg-card-highlights">
          <span>Package highlights</span>
          <ul>{item.highlights.map(value => <li key={value}><Icon name="check" size={13}/>{value}</li>)}</ul>
        </div>
        <div className="pkg-premium-actions">
          <button className="primary" type="button" onClick={() => openQuote(category, item.key)}>Get Quote <Icon name="arrow" size={14}/></button>
          <button className={'compare ' + (selected ? 'selected' : '')} type="button" onClick={() => setCompare(category, item.key)}>
            {selected ? <><Icon name="check" size={13}/> Selected</> : 'Compare'}
          </button>
        </div>
        <button
          className={'pkg-full-toggle ' + (open ? 'open' : '')}
          type="button"
          onClick={() => toggleDetails(category, item.key)}
          aria-expanded={open}
          aria-controls={'pkg-details-' + category + '-' + item.key}
        >
          <span>{open ? 'Hide full specifications' : 'View full specifications'}</span>
          <i><Icon name="chevron" size={14}/></i>
        </button>
        {open && <div className="pkg-full-details" id={'pkg-details-' + category + '-' + item.key}>
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
        <div><span>PACKAGE COMPARISON</span><h3>Side-by-Side Comparison</h3></div>
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
    return <div className={'pkg-compare-bar ' + (count === 2 ? 'ready' : '')}>
      <div className="pkg-compare-status"><i><Icon name="scale" size={17}/></i><span><b>{count}/2 packages selected</b><small>{count === 2 ? 'Ready to compare.' : 'Select two packages.'}</small></span></div>
      <button type="button" disabled={count !== 2} onClick={() => openComparison(category)}>Compare Packages <Icon name="arrow" size={13}/></button>
    </div>
  }

  return <main className="pkg-page">
    <PublicHeader />
    <section className="premium-page-intro pkg-quote-intro" aria-labelledby="premium-packages-title">
      <h1 id="premium-packages-title" className="pkg-quote-title" aria-label={activeHeadlineText}>
        <span className="pkg-quote-measure" aria-hidden="true">{PACKAGE_HEADLINE_MEASURE}</span>
        <span className="pkg-quote-typed" aria-hidden="true">
          <span className="pkg-quote-lead">{activeHeadline.lead.slice(0, typewriter.length)}</span>
          <span className="pkg-quote-accent">{activeHeadline.accent.slice(0, Math.max(0, typewriter.length - activeHeadline.lead.length))}</span>
          <span className="pkg-quote-caret" />
        </span>
      </h1>
    </section>

    <section className="pkg-category-nav" aria-label="Package categories">
      <button className={activeCategory === 'construction' ? 'active' : ''} type="button" onClick={() => switchCategory('construction')}>
        <i><Icon name="home" size={21}/></i>
        <span><b>Construction Packages</b><small>Build your dream home</small></span>
        <em>{activeCategory === 'construction' ? 'Selected' : 'View'}</em>
      </button>
      <button className={activeCategory === 'interior' ? 'active' : ''} type="button" onClick={() => switchCategory('interior')}>
        <i><Icon name="sofa" size={21}/></i>
        <span><b>Interior Packages</b><small>Premium interior solutions</small></span>
        <em>{activeCategory === 'interior' ? 'Selected' : 'View'}</em>
      </button>
    </section>

    {activeCategory === 'construction' ? <section className="pkg-premium-section pkg-active-panel">
      <div className="pkg-section-benefits"><span><Icon name="shield" size={15}/>Quality Construction</span><span><Icon name="people" size={15}/>Trusted Professionals</span><span><Icon name="check" size={15}/>Clear Specifications</span></div>
      <div className="pkg-premium-grid construction">{CONSTRUCTION_PACKAGES.map(item => renderPackageCard('construction', item))}</div>
      {compareBar('construction')}
      {renderCompare('construction')}
    </section> : <section className="pkg-premium-section pkg-active-panel pkg-interior-section">
      <div className="pkg-section-benefits"><span><Icon name="sofa" size={15}/>Modular Solutions</span><span><Icon name="shield" size={15}/>Branded Materials</span><span><Icon name="tag" size={15}/>Clear Package Rates</span></div>
      <div className="pkg-premium-grid interior">{INTERIOR_DISPLAY_PACKAGES.map(item => renderPackageCard('interior', item))}</div>
      {compareBar('interior')}
      {renderCompare('interior')}
    </section>}

    <PublicFooter />
  </main>
}
