import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Packages.css'

const CONSTRUCTION_PACKAGES = [
  {
    key:'standard',
    name:'Standard',
    price:1699,
    eyebrow:'ESSENTIAL HOME',
    description:'A practical construction specification with core drawings, structural materials and standard finishes.',
    highlights:['2D + structural + 3D elevation plans','Shree 550 TMT or equivalent','53-grade Nagarjuna + 43-grade Priya/equivalent','Room flooring allowance up to ₹45/sq ft','CERA bathroom fitting allowance up to ₹25,000/bathroom'],
    specs:{
      architecture:'2D floor plans · Structural plans · 3D elevation · Soil test',
      steel:'Shree 550 TMT or equivalent',
      cement:'Nagarjuna 53 grade for slabs/pillars · Priya/equivalent 43 grade for brick/internal work',
      sand:'Robo sand for construction · River sand for plastering',
      bricks:'Karimnagar brick',
      kitchen:'Wall tiles ₹45/sq ft · Sink ₹2,000 · Granite platform ₹120/sq ft',
      mainDoor:'Indian teak double door allowance ₹25,000',
      internalDoor:'Flush door allowance ₹7,000',
      windows:'uPVC 3-track allowance ₹350/sq ft',
      bathroomDoor:'Waterproof flush/WPC frame allowance ₹6,000',
      bathroom:'Wall tiles ₹45/sq ft · CERA fitting allowance ₹25,000/bathroom',
      flooring:'Rooms ₹45/sq ft · Stair granite ₹70/sq ft · Parking anti-skid ₹45/sq ft',
      painting:'Asian Tractor interior · ACE exterior reference',
      electrical:'Finolex fireproof wire · MARU basic switches · Sudhakar piping',
      other:'SS202 stair railing · MS gate up to ₹20,000 · 4,000L double-layer overhead tank',
    },
  },
  {
    key:'premium',
    name:'Premium',
    price:1899,
    eyebrow:'UPGRADED HOME',
    description:'Upgraded brands, drawings, finishes, doors/windows, bathroom fittings and electrical specifications.',
    highlights:['Adds digital survey + MEP drawings','Vizag TMT / Jairaj steel','UltraTech 53 grade + Bangur/equivalent','Room flooring allowance up to ₹70/sq ft','Jaguar bathroom fitting allowance up to ₹35,000/bathroom'],
    specs:{
      architecture:'2D + structural + 3D elevation · Digital survey · Soil test · Plumbing & electrical drawings',
      steel:'Vizag TMT or Jairaj',
      cement:'UltraTech 53 grade for slabs/pillars · Bangur/equivalent for brick/internal work',
      sand:'River sand for construction except terrace/tile work',
      bricks:'Karimnagar Class II bricks',
      kitchen:'Wall tiles ₹55/sq ft · Sink ₹3,500 · Granite platform ₹160/sq ft',
      mainDoor:'Indian teak double door allowance ₹50,000',
      internalDoor:'Flush door allowance ₹10,000',
      windows:'uPVC glass + mesh shutter allowance ₹450/sq ft',
      bathroomDoor:'Waterproof flush/WPC frame allowance ₹9,000',
      bathroom:'Wall tiles ₹55/sq ft · Ashirwad pipe · Jaguar fitting allowance ₹35,000/bathroom',
      flooring:'Rooms ₹70/sq ft · Stair granite ₹100/sq ft · Parking anti-skid ₹60/sq ft',
      painting:'Birla putty + Asian Royale interior · Apex exterior reference',
      electrical:'Polycab fireproof wire · Gold Medal switches · Sudhakar piping',
      other:'SS303 stair railing · MS gate up to ₹35,000 · 4,000L three-layer overhead tank · RCC sump',
    },
  },
  {
    key:'royal',
    name:'Royal',
    price:2099,
    eyebrow:'HIGH-SPEC HOME',
    description:'Higher structural, finish, bathroom, electrical and external-work allowances for a more premium home.',
    highlights:['Detailed architecture + MEP drawings','Tata 550 TMT steel','UltraTech 53 grade for complete construction','Room flooring allowance up to ₹85/sq ft','Parryware Premium allowance up to ₹50,000/bathroom'],
    specs:{
      architecture:'2D + structural + 3D elevation · Digital survey · Soil test · Plumbing & electrical drawings',
      steel:'Tata 550 TMT',
      cement:'UltraTech 53 grade for complete construction',
      sand:'River sand for complete construction',
      bricks:'Karimnagar Class I bricks',
      kitchen:'Wall tiles ₹60/sq ft · Sink ₹6,000 · Granite platform ₹250/sq ft',
      mainDoor:'Indian teak double door allowance ₹60,000',
      internalDoor:'Flush door allowance ₹15,000',
      windows:'uPVC glass + mesh shutter allowance ₹550/sq ft',
      bathroomDoor:'Waterproof flush/WPC frame allowance ₹12,000',
      bathroom:'Tiles up to ceiling ₹65/sq ft · Ashirwad hot-water CPVC · Parryware Premium allowance ₹50,000/bathroom',
      flooring:'Rooms ₹85/sq ft · Stair granite ₹130/sq ft · Parking granite ₹70/sq ft',
      painting:'Birla putty + Royal emulsion · Apex Ultima weatherproof exterior',
      electrical:'Polycab FRLS wire + Polycab piping · Gold Medal Air switches',
      other:'SS304 stairs + glass balcony railing · Sliding gate up to ₹45,000 · 4,000L RCC overhead tank · 11 ft floor height',
    },
  },
]

const INTERIOR_PACKAGES = [
  {
    key:'standard',
    name:'Standard',
    price:1399,
    eyebrow:'SMART VALUE',
    description:'Semi-modular woodwork with practical material, laminate and hardware allowances.',
    specs:{
      wood:'Gurjan BWP',
      internal:'0.72mm liner',
      external:'1mm Virgo / Advance',
      hardware:'EBCO soft-close hinges & channels',
      baskets:'Extra @ ₹4,000 / no.',
      finish:'Semi-modular finish',
      handles:'Price limit up to ₹120 / no.',
    },
  },
  {
    key:'premium',
    name:'Premium',
    price:1599,
    eyebrow:'FULL MODULAR',
    description:'Higher-spec full-modular woodwork with upgraded ply, laminate and hardware allowances.',
    specs:{
      wood:'Greenply / Century Ply 710',
      internal:'0.8 fabric finish',
      external:'1mm Merino / Century laminate',
      hardware:'Hettich / Häfele soft-close hinges & channels',
      baskets:'Extra @ ₹6,000 / no.',
      finish:'Full modular finish',
      handles:'Price limit up to ₹250 / no.',
    },
  },
]

const INTERIOR_CUSTOMISATIONS = [
  ['HDHMR sheet upgrade','Up to +₹50 / sq ft','Action Tesa reference category'],
  ['Profile glass','+₹550 / sq ft','Charged separately'],
  ['PU / Duco shutters','+₹350 / sq ft','Premium shutter finish'],
  ['Veneer / PVC / full-height laminate','+₹100 / sq ft','Reference add-on'],
  ['Aristo-style glass shutters','+₹850 / sq ft','Design customisation'],
  ['Granite / full-body tiles','₹400 / sq ft','Material + installation reference'],
  ['Dado tiles','₹200 / sq ft','Material + installation reference'],
  ['Quartz platform','₹800 / sq ft','Material + installation reference'],
  ['Regular wallpaper','₹75 / sq ft','Including installation reference'],
  ['Custom wallpaper','₹150 / sq ft','Including installation reference'],
  ['Roller blinds / custom curtains','₹350 / sq ft','Reference allowance'],
  ['Wardrobe profile lights','₹800 / metre','Sensor circuit reference ₹3,500/no.'],
  ['Gypsum false ceiling','₹60 / sq ft','Gyproc-board category reference'],
  ['MDF CNC design','₹300 / sq ft','Pooja/wall design reference'],
  ['Wall panelling with rafters','₹600 / sq ft','PU/Duco reference ₹800/sq ft'],
]

const CONSTRUCTION_COMMON = [
  ['Junction protection','Chicken-mesh plastering at internal/external joints'],
  ['Projections','Window sill beds, lintels, sun shades, water-patti projections and required concrete shelves/drops'],
  ['Brickwork detailing','Concrete bed around 3 ft height and controlled spacing intended to reduce seepage risk'],
  ['Provisions','Lift/earthing provision and lift headroom where required'],
  ['Supervision reference','Site engineer and stage-wise checks'],
  ['Post-handover reference','Provider-side post-construction support should be confirmed in the final contract'],
]

const CONSTRUCTION_ROWS = [
  ['Rate / sq ft','₹1,699','₹1,899','₹2,099'],
  ['Architecture','2D + structural + 3D + soil test','Adds digital survey + MEP drawings','Digital survey + MEP + higher-spec package'],
  ['Steel','Shree 550 TMT / equivalent','Vizag TMT / Jairaj','Tata 550 TMT'],
  ['Cement','Nagarjuna 53 + Priya/equivalent 43','UltraTech 53 + Bangur/equivalent','UltraTech 53 throughout'],
  ['Sand','Robo + river plastering','River sand except terrace/tile work','River sand throughout'],
  ['Bricks','Karimnagar brick','Karimnagar Class II','Karimnagar Class I'],
  ['Kitchen tiles','₹45/sq ft','₹55/sq ft','₹60/sq ft'],
  ['Kitchen platform','₹120/sq ft','₹160/sq ft','₹250/sq ft'],
  ['Main-door allowance','₹25,000','₹50,000','₹60,000'],
  ['Internal-door allowance','₹7,000','₹10,000','₹15,000'],
  ['Window allowance','₹350/sq ft','₹450/sq ft','₹550/sq ft'],
  ['Bathroom fitting allowance','₹25,000 / bathroom','₹35,000 / bathroom','₹50,000 / bathroom'],
  ['Room flooring','₹45/sq ft','₹70/sq ft','₹85/sq ft'],
  ['Stair flooring','₹70/sq ft','₹100/sq ft','₹130/sq ft'],
  ['Parking finish','₹45/sq ft anti-skid','₹60/sq ft anti-skid','₹70/sq ft granite'],
  ['Electrical','Finolex + MARU','Polycab + Gold Medal','Polycab FRLS + Gold Medal Air'],
  ['Railing','SS202','SS303','SS304 + glass balcony railing'],
  ['Gate allowance','₹20,000','₹35,000','₹45,000 sliding gate'],
  ['Overhead tank','4,000L double-layer','4,000L three-layer','4,000L RCC tank'],
]

const INTERIOR_ROWS = [
  ['Cost per sq ft','₹1,399','₹1,599'],
  ['Wood','Gurjan BWP','Greenply / Century Ply 710'],
  ['Internal laminate','0.72mm liner','0.8 fabric finish'],
  ['External laminate','1mm Virgo / Advance','1mm Merino / Century laminate'],
  ['Hardware','EBCO soft-close','Hettich / Häfele soft-close'],
  ['Baskets','Extra @ ₹4,000/no.','Extra @ ₹6,000/no.'],
  ['Finish','Semi-modular','Full modular'],
  ['Handle allowance','Up to ₹120/no.','Up to ₹250/no.'],
]

function Icon({name,size=20}){
  const common={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='check')return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>
  if(name==='arrow')return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='home')return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if(name==='layers')return <svg {...common}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>
  if(name==='shield')return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  return null
}

export default function Packages(){
  const navigate=useNavigate()
  const hash=typeof window!=='undefined'?window.location.hash:''
  const [category,setCategory]=useState(hash==='#interior'?'interior':'construction')
  const [selectedConstruction,setSelectedConstruction]=useState('premium')
  const [selectedInterior,setSelectedInterior]=useState('premium')

  const selectedConstructionPackage=useMemo(()=>CONSTRUCTION_PACKAGES.find(item=>item.key===selectedConstruction)||CONSTRUCTION_PACKAGES[1],[selectedConstruction])
  const selectedInteriorPackage=useMemo(()=>INTERIOR_PACKAGES.find(item=>item.key===selectedInterior)||INTERIOR_PACKAGES[1],[selectedInterior])

  function switchCategory(next){
    setCategory(next)
    window.history.replaceState({},'',next==='interior'?'/packages#interior':'/packages#construction')
    window.scrollTo({top:0,behavior:'smooth'})
  }

  function getConstructionQuote(pkg){
    navigate('/build?package='+pkg)
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
      <button onClick={()=>getConstructionQuote(selectedConstruction)}>Get Construction Quote <Icon name="arrow" size={15}/></button>
    </header>

    <section className={'pkg-hero '+(category==='construction'?'pkg-hero-construction':'pkg-hero-interior')}>
      <div className="pkg-hero-shade"/>
      <div className="pkg-hero-copy">
        <span>HOMEOWNER PACKAGE GUIDE</span>
        <h1>Compare Before You <em>Commit.</em></h1>
        <p>Review construction and interior package specifications in one place, then use the dedicated project flow for the final requirement or quotation.</p>
        <div className="pkg-category-switch">
          <button className={category==='construction'?'active':''} onClick={()=>switchCategory('construction')}><Icon name="home" size={16}/> Construction Packages</button>
          <button className={category==='interior'?'active':''} onClick={()=>switchCategory('interior')}><Icon name="layers" size={16}/> Interior Packages</button>
        </div>
      </div>
      <div className="pkg-hero-card">
        <small>{category==='construction'?'CONSTRUCTION REFERENCE':'INTERIOR REFERENCE'}</small>
        <strong>{category==='construction'?'₹1,699':'₹1,399'}<em>/sq ft</em></strong>
        <span>{category==='construction'?'Standard package brochure reference':'Standard woodwork brochure reference'}</span>
        <div><Icon name="shield" size={18}/> Final scope and price are confirmed in the project quotation</div>
      </div>
    </section>

    <section className="pkg-trust-strip">
      <article><span><Icon name="layers"/></span><div><b>Compare Specifications</b><small>Materials, finishes and allowances</small></div></article>
      <article><span><Icon name="home"/></span><div><b>Construction + Interiors</b><small>Both package families in one page</small></div></article>
      <article><span><Icon name="shield"/></span><div><b>No Hidden Assumption</b><small>Reference package vs final quote separated</small></div></article>
      <article><span><Icon name="check"/></span><div><b>Quote From /build</b><small>No duplicate public estimator page</small></div></article>
    </section>

    {category==='construction'?<>
      <section className="pkg-section">
        <div className="pkg-section-head">
          <span>CONSTRUCTION PACKAGES</span>
          <h2>Standard, Premium & Royal</h2>
          <p>The uploaded construction brochure uses three material/finish tiers. These rates are kept as brochure references; the final ProPulse construction quotation is generated from the current Admin-configured pricing engine.</p>
        </div>

        <div className="pkg-construction-grid">
          {CONSTRUCTION_PACKAGES.map(item=><article className={'pkg-construction-card '+(selectedConstruction===item.key?'selected':'')} key={item.key} onClick={()=>setSelectedConstruction(item.key)}>
            <div className="pkg-package-top"><div><small>{item.eyebrow}</small><h3>{item.name}</h3></div><span>{selectedConstruction===item.key?<Icon name="check"/>:null}</span></div>
            <div className="pkg-price"><strong>₹{item.price.toLocaleString('en-IN')}</strong><span>/ sq ft</span></div>
            <p>{item.description}</p>
            <ul>{item.highlights.map(value=><li key={value}><Icon name="check" size={15}/>{value}</li>)}</ul>
            <button type="button" onClick={event=>{event.stopPropagation();getConstructionQuote(item.key)}}>Get {item.name} Quote <Icon name="arrow" size={14}/></button>
          </article>)}
        </div>

        <div className="pkg-brochure-condition"><Icon name="shield"/><p><b>Brochure applicability note:</b> the source brochure states that its package rates apply for plot sizes above 1,000 sq ft and references a total 4,500 sq ft condition. Treat these figures as package references until the final ProPulse quotation confirms your actual site, built-up area, floors and scope.</p></div>

        <div className="pkg-comparison-wrap">
          <table className="pkg-comparison pkg-construction-table">
            <thead><tr><th>Specification</th><th>Standard</th><th>Premium</th><th>Royal</th></tr></thead>
            <tbody>{CONSTRUCTION_ROWS.map(row=><tr key={row[0]}>{row.map((cell,index)=><td key={index}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="pkg-section pkg-selected-detail">
        <div className="pkg-section-head">
          <span>{selectedConstructionPackage.name.toUpperCase()} PACKAGE DETAILS</span>
          <h2>What the Selected Package Specifies</h2>
          <p>Use this checklist when reviewing the final contractor quotation. The final written quotation should confirm exact brands, quantities, models, taxes, exclusions and warranty terms.</p>
        </div>
        <div className="pkg-spec-grid">
          {Object.entries(selectedConstructionPackage.specs).map(([key,value])=><article key={key}><span>{key.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase())}</span><p>{value}</p></article>)}
        </div>
      </section>

      <section className="pkg-common-construction">
        <div className="pkg-section">
          <div className="pkg-section-head light">
            <span>COMMON PROJECT HIGHLIGHTS</span>
            <h2>Details Worth Confirming in Every Quote</h2>
            <p>The source brochure also highlights construction-detail and supervision items that sit outside a simple ₹/sq-ft headline.</p>
          </div>
          <div className="pkg-common-grid">
            {CONSTRUCTION_COMMON.map(([title,text])=><article key={title}><Icon name="check" size={17}/><div><h3>{title}</h3><p>{text}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="pkg-cta">
        <div><span>READY FOR AN ACTUAL PROJECT QUOTATION?</span><h2>Use the Construction Quote Flow</h2><p>Choose a package as your preference, then let /build calculate the project using your city, built-up area, floors, scope and Admin-configured rates.</p></div>
        <div><button onClick={()=>getConstructionQuote(selectedConstruction)}>Get {selectedConstructionPackage.name} Quote <Icon name="arrow" size={15}/></button><Link to="/build">Open Construction Quote</Link></div>
      </section>
    </>:<>
      <section className="pkg-section" id="interior-packages">
        <div className="pkg-section-head">
          <span>WOODWORK PACKAGES</span>
          <h2>Standard vs Premium Interiors</h2>
          <p>The interior brochure compares wood, laminate, hardware, baskets, finish and handle allowances. This is a package guide—not a second estimator.</p>
        </div>

        <div className="pkg-card-grid">
          {INTERIOR_PACKAGES.map(item=><article className={'pkg-package-card '+(selectedInterior===item.key?'selected':'')} key={item.key} onClick={()=>setSelectedInterior(item.key)}>
            <div className="pkg-package-top"><div><small>{item.eyebrow}</small><h3>{item.name}</h3></div><span>{selectedInterior===item.key?<Icon name="check"/>:null}</span></div>
            <div className="pkg-price"><strong>₹{item.price.toLocaleString('en-IN')}</strong><span>/ sq ft</span></div>
            <p>{item.description}</p>
            <ul>
              <li><Icon name="check" size={15}/>{item.specs.wood}</li>
              <li><Icon name="check" size={15}/>{item.specs.hardware}</li>
              <li><Icon name="check" size={15}/>{item.specs.finish}</li>
            </ul>
            <Link className="pkg-card-link" to="/design">Share Interior Requirement <Icon name="arrow" size={14}/></Link>
          </article>)}
        </div>

        <div className="pkg-comparison-wrap">
          <table className="pkg-comparison">
            <thead><tr><th>Material / Feature</th><th>Standard</th><th>Premium</th></tr></thead>
            <tbody>{INTERIOR_ROWS.map(row=><tr key={row[0]}>{row.map((cell,index)=><td key={index}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="pkg-custom">
        <div className="pkg-custom-inner">
          <div className="pkg-section-head light"><span>INTERIOR CUSTOMISATIONS</span><h2>Popular Upgrades & Add-ons</h2><p>These brochure reference rates help homeowners understand which design choices can sit outside the base woodwork package.</p></div>
          <div className="pkg-custom-grid">{INTERIOR_CUSTOMISATIONS.map(([title,price,note])=><article key={title}><div><h3>{title}</h3><strong>{price}</strong></div><p>{note}</p></article>)}</div>
        </div>
      </section>

      <section className="pkg-section pkg-selected-detail">
        <div className="pkg-section-head"><span>{selectedInteriorPackage.name.toUpperCase()} INTERIOR DETAILS</span><h2>Selected Woodwork Specification</h2><p>Use these package details as a discussion starting point and ask the final provider to confirm exact brands, thicknesses, hardware series, warranties and installation scope.</p></div>
        <div className="pkg-spec-grid">{Object.entries(selectedInteriorPackage.specs).map(([key,value])=><article key={key}><span>{key.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase())}</span><p>{value}</p></article>)}</div>
        <div className="pkg-provider-note"><Icon name="shield"/><p><b>Important:</b> ProPulse does not promise another provider’s warranty or brand commitment. The selected interior business must confirm warranty, materials, payment schedule and service terms in its final written quotation.</p></div>
      </section>

      <section className="pkg-cta">
        <div><span>READY TO DISCUSS YOUR INTERIORS?</span><h2>Share the Interior Requirement</h2><p>No duplicate estimator is needed here. The package page helps the homeowner compare options; the Interior flow captures the actual project requirement.</p></div>
        <div><Link className="pkg-primary-link" to="/design">Share Interior Requirement <Icon name="arrow" size={15}/></Link><button className="pkg-secondary-button" onClick={()=>switchCategory('construction')}>View Construction Packages</button></div>
      </section>
    </>}

    <footer className="pkg-footer">
      <div><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>A homeowner-first starting point for construction, interiors and real estate requirements.</p></div>
      <div><b>Packages</b><button onClick={()=>switchCategory('construction')}>Construction Packages</button><button onClick={()=>switchCategory('interior')}>Interior Packages</button></div>
      <div><b>Project Flows</b><Link to="/build">Construction Quote</Link><Link to="/design">Interior Requirement</Link><Link to="/property">Real Estate Requirement</Link></div>
      <div><b>Explore</b><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About ProPulse</Link></div>
    </footer>
  </main>
}
