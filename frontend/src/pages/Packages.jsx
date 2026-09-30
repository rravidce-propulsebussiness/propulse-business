import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Packages.css'

const PACKAGES = [
  {
    key: 'standard',
    name: 'Standard',
    price: 1399,
    eyebrow: 'SMART VALUE',
    description: 'A practical semi-modular woodwork package with reliable materials and soft-close hardware.',
    specs: {
      wood: 'Gurjan BWP',
      internal: '0.72mm liner',
      external: '1mm Virgo / Advance',
      hardware: 'EBCO soft-close hinges & channels',
      baskets: 'Extra @ ₹4,000 / no.',
      finish: 'Semi-modular finish',
      handles: 'Price limit up to ₹120 / no.',
    },
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 1599,
    eyebrow: 'MOST POPULAR',
    description: 'A higher-spec full-modular package with upgraded ply, laminate, hardware and finishing allowances.',
    specs: {
      wood: 'Greenply / Century Ply 710',
      internal: '0.8 fabric finish',
      external: '1mm Merino / Century laminate',
      hardware: 'Hettich / Häfele soft-close hinges & channels',
      baskets: 'Extra @ ₹6,000 / no.',
      finish: 'Full modular finish',
      handles: 'Price limit up to ₹250 / no.',
    },
  },
]

const CUSTOMISATIONS = [
  ['HDHMR sheet upgrade', 'Up to +₹50 / sq ft', 'Action Tesa or equivalent category'],
  ['Profile glass', '+₹550 / sq ft', 'Charged separately'],
  ['PU / Duco shutters', '+₹350 / sq ft', 'Premium shutter finish'],
  ['Veneer / PVC / full-height laminate', '+₹100 / sq ft', 'Also applies to poly-granite sheet category'],
  ['Aristo-style glass shutters', '+₹850 / sq ft', 'Design customisation available'],
  ['Granite / full-body tiles', '₹400 / sq ft', 'Material + installation reference'],
  ['Dado tiles', '₹200 / sq ft', 'Material + installation reference'],
  ['Quartz platform', '₹800 / sq ft', 'Material + installation reference'],
  ['Regular wallpaper', '₹75 / sq ft', 'Including installation'],
  ['Custom wallpaper', '₹150 / sq ft', 'Including installation'],
  ['Roller blinds / customised curtains', '₹350 / sq ft', 'Reference allowance'],
  ['Wardrobe profile lights', '₹800 / metre', 'Sensor circuit reference: ₹3,500 / no.'],
  ['Gypsum false ceiling', '₹60 / sq ft', 'Gyproc board / SS304-channel category'],
  ['MDF CNC design', '₹300 / sq ft', 'Pooja mandir and wall designs'],
  ['Wall panelling with rafters', '₹600 / sq ft', 'PU / Duco finish reference: ₹800 / sq ft'],
]

const WORKS = [
  ['PU Wardrobes', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=86'],
  ['PU Kitchens', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=86'],
  ['Wall Panelling', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=86'],
  ['Profile Glass', 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=86'],
  ['Curtains & Blinds', 'https://images.unsplash.com/photo-1615874694520-474822394e73?auto=format&fit=crop&w=900&q=86'],
  ['Gypsum Ceiling', 'https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=900&q=86'],
  ['Wardrobes', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=86'],
  ['Wood Work', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=86'],
]

const PROVIDE = [
  ['Warranty', '10-year ply warranty and 1-year service-warranty reference terms from the package brochure.'],
  ['Design', 'Dedicated design support with personalised colour, layout and finish selections.'],
  ['Materials', 'Multiple material and brand selections from value to premium categories.'],
  ['Payment', 'Stage-wise payment structure instead of one large upfront payment.'],
]

const WHY = [
  ['Designed for your lifestyle', 'A package should still be customised around how the homeowner lives, cooks, stores and uses each room.'],
  ['End-to-end execution', 'Design, material selection, execution and finishing can be planned as one connected scope.'],
  ['Material transparency', 'Wood, laminate, hardware and finish expectations are shown before you request the final quotation.'],
  ['Clear pricing', 'Base package rates and add-on rates are visible so customisations do not feel hidden.'],
  ['Skilled execution', 'Final workmanship, brands and site execution are confirmed by the business you choose.'],
  ['After-sales support', 'Warranty and service commitments should be recorded in the final provider quotation and agreement.'],
]

function Icon({ name, size = 20 }) {
  const common={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='check') return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>
  if(name==='arrow') return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='home') return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if(name==='shield') return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='layers') return <svg {...common}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>
  if(name==='tool') return <svg {...common}><path d="M14.7 6.3a4 4 0 0 0-5-5L7.5 3.5l3 3 2.2-2.2a4 4 0 0 0 2 5L6 18l-2 2 2 2 2-2 8.7-8.7a4 4 0 0 0 5-5l-3 3-3-3 3-3Z"/></svg>
  return null
}

function formatCurrency(value){
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value)
}

export default function Packages(){
  const navigate=useNavigate()
  const [selected,setSelected]=useState('premium')
  const [area,setArea]=useState('')

  const selectedPackage=useMemo(()=>PACKAGES.find(item=>item.key===selected)||PACKAGES[1],[selected])
  const estimatedBase=useMemo(()=>{
    const size=Number(area)
    return Number.isFinite(size)&&size>0?size*selectedPackage.price:0
  },[area,selectedPackage])

  function openEstimator(){
    navigate('/interior-cost-estimator?package='+selected)
  }

  return <main className="pkg-page">
    <header className="pkg-header">
      <Link className="pkg-logo" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/build">Construction</Link>
        <Link to="/design">Interiors</Link>
        <Link className="active" to="/packages">Packages</Link>
        <Link to="/property">Real Estate</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
      </nav>
      <button onClick={openEstimator}>Get Interior Estimate <Icon name="arrow" size={15}/></button>
    </header>

    <section className="pkg-hero">
      <div className="pkg-hero-shade"/>
      <div className="pkg-hero-copy">
        <span>INTERIOR PACKAGES</span>
        <h1>Know What You’re <em>Paying For.</em></h1>
        <p>Compare woodwork materials, laminate, hardware, finishes and common customisation rates before you ask for the final interior quotation.</p>
        <div>
          <button onClick={()=>document.getElementById('package-comparison')?.scrollIntoView({behavior:'smooth'})}>Compare Packages <Icon name="arrow" size={16}/></button>
          <button className="secondary" onClick={openEstimator}>Calculate Interior Estimate</button>
        </div>
      </div>
      <div className="pkg-hero-card">
        <small>PACKAGE STARTING FROM</small>
        <strong>₹1,399<em>/sq ft</em></strong>
        <span>Reference woodwork package rate</span>
        <div><Icon name="shield" size={18}/> Materials + hardware + finish comparison</div>
      </div>
    </section>

    <section className="pkg-trust-strip">
      <article><span><Icon name="layers"/></span><div><b>Clear Materials</b><small>Ply, laminate and hardware shown</small></div></article>
      <article><span><Icon name="tool"/></span><div><b>Customisation Rates</b><small>Common upgrades shown separately</small></div></article>
      <article><span><Icon name="shield"/></span><div><b>Final Quote Protection</b><small>Provider confirms brands and warranty</small></div></article>
      <article><span><Icon name="home"/></span><div><b>Homeowner Focused</b><small>Compare before you commit</small></div></article>
    </section>

    <section className="pkg-section" id="package-comparison">
      <div className="pkg-section-head">
        <span>WOODWORK PACKAGES</span>
        <h2>Standard vs Premium</h2>
        <p>Use the comparison as a starting point, then customise the final scope to your home.</p>
      </div>

      <div className="pkg-card-grid">
        {PACKAGES.map(item=><article className={'pkg-package-card '+(selected===item.key?'selected':'')} key={item.key} onClick={()=>setSelected(item.key)}>
          <div className="pkg-package-top">
            <div><small>{item.eyebrow}</small><h3>{item.name}</h3></div>
            <span>{selected===item.key?<Icon name="check"/>:null}</span>
          </div>
          <div className="pkg-price"><strong>₹{item.price.toLocaleString('en-IN')}</strong><span>/ sq ft</span></div>
          <p>{item.description}</p>
          <ul>
            <li><Icon name="check" size={15}/>{item.specs.wood}</li>
            <li><Icon name="check" size={15}/>{item.specs.hardware}</li>
            <li><Icon name="check" size={15}/>{item.specs.finish}</li>
          </ul>
          <button type="button" onClick={event=>{event.stopPropagation();setSelected(item.key);openEstimator()}}>Estimate {item.name} Package <Icon name="arrow" size={14}/></button>
        </article>)}
      </div>

      <div className="pkg-comparison-wrap">
        <table className="pkg-comparison">
          <thead><tr><th>Material / Feature</th><th>Standard</th><th>Premium</th></tr></thead>
          <tbody>
            <tr><td>Cost per sq ft</td><td>₹1,399</td><td>₹1,599</td></tr>
            <tr><td>Wood</td><td>Gurjan BWP</td><td>Greenply / Century Ply 710</td></tr>
            <tr><td>Internal laminate</td><td>0.72mm liner</td><td>0.8 fabric finish</td></tr>
            <tr><td>External laminate</td><td>1mm Virgo / Advance</td><td>1mm Merino / Century laminate</td></tr>
            <tr><td>Hardware</td><td>EBCO soft-close hinges & channels</td><td>Hettich / Häfele soft-close hinges & channels</td></tr>
            <tr><td>Baskets</td><td>Extra @ ₹4,000 / no.</td><td>Extra @ ₹6,000 / no.</td></tr>
            <tr><td>Finish</td><td>Semi-modular finish</td><td>Full modular finish</td></tr>
            <tr><td>Handle allowance</td><td>Up to ₹120 / no.</td><td>Up to ₹250 / no.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section className="pkg-estimator-band">
      <div>
        <span>QUICK PACKAGE CHECK</span>
        <h2>See the base woodwork value for your area</h2>
        <p>This quick figure uses only the selected brochure package rate. Customisations, site work and final provider pricing are separate.</p>
      </div>
      <div className="pkg-mini-estimator">
        <label><span>Package</span><select value={selected} onChange={event=>setSelected(event.target.value)}>{PACKAGES.map(item=><option key={item.key} value={item.key}>{item.name} · ₹{item.price}/sq ft</option>)}</select></label>
        <label><span>Approx. woodwork area</span><div><input type="number" min="1" value={area} onChange={event=>setArea(event.target.value)} placeholder="e.g. 500"/><i>sq ft</i></div></label>
        <article><small>Base package value</small><strong>{estimatedBase?formatCurrency(estimatedBase):'₹—'}</strong><span>before customisations</span></article>
        <button onClick={openEstimator}>Get Detailed Interior Estimate <Icon name="arrow" size={15}/></button>
      </div>
    </section>

    <section className="pkg-section pkg-provide">
      <div className="pkg-section-head">
        <span>WHAT THE PACKAGE STRUCTURE COVERS</span>
        <h2>What You Can Compare Before Finalising</h2>
        <p>The brochure separates warranty, design, materials and payment terms. We keep those visible rather than burying them in fine print.</p>
      </div>
      <div className="pkg-provide-grid">
        {PROVIDE.map(([title,text],index)=><article key={title}><span>{String(index+1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p></article>)}
      </div>
      <div className="pkg-provider-note"><Icon name="shield"/><p><b>Important:</b> warranty, brand, service and payment commitments belong to the business providing the final quotation. ProPulse shows the package reference so homeowners know what to confirm in writing.</p></div>
    </section>

    <section className="pkg-custom">
      <div className="pkg-custom-inner">
        <div className="pkg-section-head light">
          <span>CUSTOMISATIONS</span>
          <h2>Popular Upgrades & Add-ons</h2>
          <p>These reference rates help homeowners understand which design choices usually sit outside a base woodwork package.</p>
        </div>
        <div className="pkg-custom-grid">
          {CUSTOMISATIONS.map(([title,price,note])=><article key={title}><div><h3>{title}</h3><strong>{price}</strong></div><p>{note}</p></article>)}
        </div>
      </div>
    </section>

    <section className="pkg-section pkg-works">
      <div className="pkg-section-head">
        <span>PACKAGE POSSIBILITIES</span>
        <h2>Interior Work You Can Plan</h2>
        <p>Woodwork is only one part of the final home. Add the finishes and details that matter to your project.</p>
      </div>
      <div className="pkg-works-grid">
        {WORKS.map(([title,image])=><article key={title}><img src={image} alt={title} loading="lazy"/><span>{title}</span></article>)}
      </div>
    </section>

    <section className="pkg-section pkg-why">
      <div className="pkg-section-head">
        <span>HOMEOWNER CHECKLIST</span>
        <h2>Choose the Package, Then Confirm the Details</h2>
        <p>A package name is useful only when the final material, hardware, finish and service commitments are clear.</p>
      </div>
      <div className="pkg-why-grid">
        {WHY.map(([title,text])=><article key={title}><span><Icon name="check" size={17}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}
      </div>
    </section>

    <section className="pkg-cta">
      <div>
        <span>READY TO PLAN YOUR INTERIORS?</span>
        <h2>Turn a Package into Your Home Estimate</h2>
        <p>Use the estimator for an indicative budget, or share your full interior requirement to receive relevant responses.</p>
      </div>
      <div>
        <button onClick={openEstimator}>Calculate Interior Estimate <Icon name="arrow" size={15}/></button>
        <Link to="/design">Share Interior Requirement</Link>
      </div>
    </section>

    <footer className="pkg-footer">
      <div><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>A homeowner-first starting point for construction, interiors and real estate requirements.</p></div>
      <div><b>Quick Links</b><Link to="/">Home</Link><Link to="/packages">Interior Packages</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link></div>
      <div><b>Interior</b><Link to="/design">Interior Requirement</Link><Link to="/interior-cost-estimator">Cost Estimator</Link><Link to="/packages">Package Comparison</Link></div>
      <div><b>Other Services</b><Link to="/build">Construction</Link><Link to="/property">Real Estate</Link><Link to="/about">About ProPulse</Link></div>
    </footer>
  </main>
}
