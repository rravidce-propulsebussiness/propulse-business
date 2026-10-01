import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Projects.css'

const PROJECTS = [
  {
    id:'modern-villa',
    category:'construction',
    categoryLabel:'Construction',
    title:'Modern Villa',
    city:'Hyderabad',
    location:'Hyderabad, Telangana',
    propertyType:'Villa',
    budget:'₹50L–₹1Cr',
    area:3200,
    style:'Modern',
    meta:'4 BHK',
    image:'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=88',
    description:'A modern villa concept with generous natural light, landscaped setbacks and clean contemporary lines.',
  },
  {
    id:'apartment-interior',
    category:'design',
    categoryLabel:'Interiors',
    title:'Apartment Interior',
    city:'Hyderabad',
    location:'Hyderabad, Telangana',
    propertyType:'Apartment',
    budget:'₹20L–₹50L',
    area:2200,
    style:'Contemporary',
    meta:'3 BHK',
    image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=88',
    description:'Contemporary apartment interiors with warm materials, elegant lighting and practical storage planning.',
  },
  {
    id:'premium-apartments',
    category:'property',
    categoryLabel:'Real Estate',
    title:'Premium Apartments',
    city:'Hyderabad',
    location:'Gachibowli, Hyderabad',
    propertyType:'Apartment',
    budget:'₹1Cr–₹2Cr',
    area:1800,
    style:'Premium',
    meta:'3 BHK',
    image:'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=88',
    description:'Premium apartment inspiration for customers exploring gated communities and well-planned amenities.',
  },
  {
    id:'independent-house',
    category:'construction',
    categoryLabel:'Construction',
    title:'Independent House',
    city:'Hyderabad',
    location:'Kondapur, Hyderabad',
    propertyType:'Independent House',
    budget:'₹50L–₹1Cr',
    area:2800,
    style:'Modern',
    meta:'4 BHK',
    image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=88',
    description:'Independent-house inspiration focused on practical family spaces and a clean architectural elevation.',
  },
  {
    id:'office-interior',
    category:'design',
    categoryLabel:'Interiors',
    title:'Office Space',
    city:'Hyderabad',
    location:'HITEC City, Hyderabad',
    propertyType:'Office',
    budget:'₹20L–₹50L',
    area:5000,
    style:'Modern',
    meta:'Commercial',
    image:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=88',
    description:'Office-interior inspiration balancing collaboration, privacy, circulation and polished finishes.',
  },
  {
    id:'commercial-space',
    category:'property',
    categoryLabel:'Real Estate',
    title:'Commercial Space',
    city:'Hyderabad',
    location:'Financial District, Hyderabad',
    propertyType:'Commercial',
    budget:'₹2Cr+',
    area:12000,
    style:'Premium',
    meta:'Commercial',
    image:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=88',
    description:'Commercial-property inspiration for customers evaluating visibility, access and business-ready layouts.',
  },
  {
    id:'duplex-house',
    category:'construction',
    categoryLabel:'Construction',
    title:'Duplex House',
    city:'Hyderabad',
    location:'Madhapur, Hyderabad',
    propertyType:'Duplex',
    budget:'₹1Cr–₹2Cr',
    area:4000,
    style:'Luxury',
    meta:'5 BHK',
    image:'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=88',
    description:'Spacious duplex-house inspiration with layered living spaces, balconies and premium finishes.',
  },
  {
    id:'luxury-villa-interior',
    category:'design',
    categoryLabel:'Interiors',
    title:'Luxury Villa Interior',
    city:'Hyderabad',
    location:'Jubilee Hills, Hyderabad',
    propertyType:'Villa',
    budget:'₹50L–₹1Cr',
    area:5000,
    style:'Luxury',
    meta:'5 BHK',
    image:'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=88',
    description:'Luxury-villa interior inspiration with bespoke furniture language, refined lighting and layered textures.',
  },
]


function collection(value){
  if(Array.isArray(value)) return value
  if(Array.isArray(value?.data)) return value.data
  if(Array.isArray(value?.rows)) return value.rows
  return []
}

function Icon({name,size=18}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='home')return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if(name==='building')return <svg {...p}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if(name==='sofa')return <svg {...p}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/></svg>
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='photo')return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>
  if(name==='info')return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
  if(name==='search')return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
  if(name==='area')return <svg {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
  if(name==='people')return <svg {...p}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if(name==='chat')return <svg {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>
  return null
}

function openLeadPopup(flowKey=''){
  window.dispatchEvent(new CustomEvent('propulse:open-lead-popup',{detail:{flowKey}}))
}

export default function Projects(){
  const navigate=useNavigate()
  const [cities,setCities]=useState([])
  const [contactData,setContactData]=useState({})
  const [category,setCategory]=useState('all')
  const [city,setCity]=useState('')
  const [propertyType,setPropertyType]=useState('')
  const [budget,setBudget]=useState('')
  const [area,setArea]=useState('')
  const [style,setStyle]=useState('')
  const [query,setQuery]=useState('')
  const [visible,setVisible]=useState(8)
  const [selectedProject,setSelectedProject]=useState(null)

  useEffect(()=>{
    window.scrollTo(0,0)
    Promise.allSettled([publicRequest('/cities'),publicRequest('/contact?audience=website')]).then(([cityResult,contactResult])=>{
      if(cityResult.status==='fulfilled') setCities(collection(cityResult.value))
      if(contactResult.status==='fulfilled') setContactData(contactResult.value||{})
    })
  },[])

  const cityOptions=useMemo(()=>{
    const names=new Set(PROJECTS.map(p=>p.city))
    cities.forEach(c=>c?.name&&names.add(c.name))
    return [...names].sort()
  },[cities])

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    return PROJECTS.filter(project=>{
      if(category!=='all'&&project.category!==category)return false
      if(city&&project.city!==city)return false
      if(propertyType&&project.propertyType!==propertyType)return false
      if(budget&&project.budget!==budget)return false
      if(area==='under2000'&&project.area>=2000)return false
      if(area==='2000to4000'&&(project.area<2000||project.area>4000))return false
      if(area==='4000plus'&&project.area<4000)return false
      if(style&&project.style!==style)return false
      if(q&&!([project.title,project.location,project.categoryLabel,project.propertyType,project.style,project.description].join(' ').toLowerCase().includes(q)))return false
      return true
    })
  },[category,city,propertyType,budget,area,style,query])

  function openProject(project){
    setSelectedProject(project)
    document.body.style.overflow='hidden'
  }

  function closeProject(){
    setSelectedProject(null)
    document.body.style.overflow=''
  }

  function projectHighlights(project){
    if(project.category==='construction') return [
      'Elevation and spatial planning concept',
      'Natural light and ventilation focused layout',
      'Flexible material and finish selections',
      'Suitable for detailed construction consultation',
    ]
    if(project.category==='design') return [
      'Space planning and storage-focused concept',
      'Coordinated material and finish palette',
      'Lighting and furniture planning ideas',
      'Suitable for room-wise interior consultation',
    ]
    return [
      'Location and property-type context',
      'Budget and built-up area reference',
      'Lifestyle and layout inspiration',
      'Use as a brief when discussing suitable options',
    ]
  }

  function projectScope(project){
    if(project.category==='construction') return ['Planning','Structure','Elevation','Finishes']
    if(project.category==='design') return ['Layout','Storage','Lighting','Finishes']
    return ['Location','Property Type','Budget','Preferences']
  }

  function projectPlanningDetails(project){
    if(project.category==='construction') return [
      ['Planning focus','Plot utilisation, setbacks, circulation and room planning'],
      ['Structure','Foundation and RCC structure to be finalised after drawings and site inputs'],
      ['Services','Electrical, plumbing and water planning coordinated with the layout'],
      ['Elevation','Facade language and exterior finishes matched to the selected style'],
      ['Material selection','Package and branded-material choices finalised during quotation'],
      ['Approvals','Local drawings, approvals and site conditions to be confirmed before execution'],
    ]
    if(project.category==='design'){
      if(project.propertyType==='Office'||project.propertyType==='Commercial') return [
        ['Layout focus','Work zones, meeting areas, circulation and collaborative spaces'],
        ['Storage','Integrated storage and utility planning based on operational needs'],
        ['Lighting','Ambient, task and feature-lighting coordination'],
        ['Furniture','Fixed and loose furniture planning to suit the workspace'],
        ['Finish direction',project.style+' material and colour palette'],
        ['Services','Electrical, data, HVAC and ceiling coordination to be detailed after site review'],
      ]
      return [
        ['Room planning','Living, bedrooms, kitchen and circulation planned as one coordinated interior'],
        ['Storage','Wardrobes, kitchen storage and utility requirements planned around daily use'],
        ['Lighting','Ambient, task and decorative-lighting layers'],
        ['Furniture','Fixed and loose furniture can be included based on selected scope'],
        ['Finish direction',project.style+' material and colour palette'],
        ['Site inputs','Measurements, floor plan and existing-site conditions to be confirmed before final quote'],
      ]
    }
    return [
      ['Location fit','Review commute, neighbourhood, access and nearby infrastructure'],
      ['Property fit','Confirm configuration, usable area and layout against your requirement'],
      ['Budget fit','Treat the displayed budget only as an inspiration/reference band'],
      ['Amenities','Parking, security and project amenities should be verified for a live property'],
      ['Availability','Inventory, seller/developer details and current availability are not represented here'],
      ['Due diligence','Ownership, approvals and regulatory information must be checked on the actual property'],
    ]
  }

  function projectConfirmations(project){
    if(project.category==='construction') return ['Actual plot dimensions','Soil/site condition','Final built-up area','Chosen package & materials','Approvals and execution timeline']
    if(project.category==='design') return ['Exact site measurements','Floor plan / reference images','Rooms or areas in scope','Package / finish preference','Electrical, ceiling and furniture scope']
    return ['Exact property / project','Live price and availability','Developer / seller details','Approvals / ownership','Site visit and final commercial terms']
  }

  const phone=contactData.phone||contactData.phone_number||contactData.mobile||''
  const email=contactData.email||contactData.support_email||''

  return <main className="pj-page">
    <header className="pj-header">
      <Link to="/" className="pj-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav><Link to="/">Home</Link><Link to="/packages">Packages</Link><Link className="active" to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/experts">Find Professionals</Link></nav>
      <div className="public-header-actions">
        <Link className="public-quote-button" to="/quote#interiors">Get Free Quote <Icon name="arrow" size={15}/></Link>
        <Link className="public-professional-btn" to="/professionals">For Professionals</Link>
      </div>
    </header>

    <section className="pj-hero">
      <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=92" alt="Modern premium home"/>
      <div className="pj-hero-wash"/>
      <div className="pj-hero-copy"><span>PROJECT INSPIRATION</span><h1>Explore Home<em>Projects & Ideas</em></h1><p>Browse construction, interior and real-estate inspiration, then start a requirement based on what you like. Sample images are for inspiration unless a project is explicitly marked as verified.</p></div>
      <aside className="pj-feature-box">
        <div><Icon name="home"/><span>Modern Designs</span></div>
        <div><Icon name="photo"/><span>Visual Inspiration</span></div>
        <div><Icon name="info"/><span>Detailed Information</span></div>
        <div><Icon name="building"/><span>Detailed Project View</span></div>
        <div><Icon name="chat"/><span>Free Consultation</span></div>
      </aside>
      <div className="pj-hero-benefits">
        <article><Icon name="shield"/><div><b>Clear Inspiration</b><small>Start from a visual idea</small></div></article>
        <article><Icon name="photo"/><div><b>Multiple Categories</b><small>Construction, Interiors, Real Estate</small></div></article>
        <article><Icon name="people"/><div><b>Structured Requirement</b><small>Turn ideas into a clear brief</small></div></article>
        <article><Icon name="info"/><div><b>Clear Context</b><small>Ideas are labelled as inspiration</small></div></article>
      </div>
    </section>

    <section className="pj-filter-wrap">
      <div className="pj-filter-top">
        <div className="pj-category-tabs">
          <button className={category==='all'?'active':''} onClick={()=>setCategory('all')}><Icon name="home" size={15}/>All Projects</button>
          <button className={category==='construction'?'active':''} onClick={()=>setCategory('construction')}><Icon name="building" size={15}/>Construction</button>
          <button className={category==='design'?'active':''} onClick={()=>setCategory('design')}><Icon name="sofa" size={15}/>Interiors</button>
          <button className={category==='property'?'active':''} onClick={()=>setCategory('property')}><Icon name="building" size={15}/>Real Estate</button>
        </div>
        <label className="pj-search"><Icon name="search" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects, locations, styles..."/></label>
      </div>
      <div className="pj-filter-grid">
        <label><Icon name="pin" size={14}/><select value={city} onChange={e=>setCity(e.target.value)}><option value="">Select City</option>{cityOptions.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
        <label><select value={propertyType} onChange={e=>setPropertyType(e.target.value)}><option value="">Project Type</option>{[...new Set(PROJECTS.map(p=>p.propertyType))].map(v=><option key={v}>{v}</option>)}</select></label>
        <label><select value={budget} onChange={e=>setBudget(e.target.value)}><option value="">Budget Range</option>{[...new Set(PROJECTS.map(p=>p.budget))].map(v=><option key={v}>{v}</option>)}</select></label>
        <label><select value={area} onChange={e=>setArea(e.target.value)}><option value="">Built-up Area</option><option value="under2000">Under 2000 sq ft</option><option value="2000to4000">2000–4000 sq ft</option><option value="4000plus">4000+ sq ft</option></select></label>
        <label><select value={style} onChange={e=>setStyle(e.target.value)}><option value="">Style / Design</option>{[...new Set(PROJECTS.map(p=>p.style))].map(v=><option key={v}>{v}</option>)}</select></label>
        <button className="pj-apply" onClick={()=>setVisible(8)}>Apply Filters</button>
      </div>
    </section>

    <section className="pj-grid-wrap">
      <div className="pj-project-grid">
        {filtered.slice(0,visible).map(project=><article className="pj-project-card" key={project.id} onClick={()=>openProject(project)}>
          <div className="pj-project-photo">
            <img src={project.image} alt={project.title}/>
            <span className={'pj-badge '+project.category}>{project.categoryLabel}</span>
            <span className="pj-project-style">{project.style}</span>
            <div className="pj-photo-overlay"><span>View project details</span><Icon name="arrow" size={16}/></div>
          </div>
          <div className="pj-project-copy">
            <div className="pj-project-title-row">
              <div><h3>{project.title}</h3><small><Icon name="pin" size={12}/>{project.location}</small></div>
            </div>
            <div className="pj-project-meta">
              <span>{project.meta}</span>
              <span><Icon name="area" size={12}/>{project.area} sq ft</span>
              <span>{project.budget}</span>
            </div>
            <p>{project.description}</p>
            <div className="pj-project-footer-row"><span>Inspiration concept</span><b>View Full Details <Icon name="arrow" size={13}/></b></div>
          </div>
        </article>)}
      </div>
      {filtered.length===0&&<div className="pj-empty">No inspiration cards match these filters. Try clearing one or more filters.</div>}
      {visible<filtered.length&&<button className="pj-load" onClick={()=>setVisible(v=>v+4)}>Load More Projects ↓</button>}
    </section>

    <section className="pj-stats">
      <article><span><Icon name="building" size={23}/></span><div><b>10</b><small>Metro Cities</small></div></article>
      <article><span><Icon name="pin" size={23}/></span><div><b>50+</b><small>Locations Covered</small></div></article>
      <article><span><Icon name="home" size={23}/></span><div><b>3</b><small>Project Categories</small></div></article>
      <article><span><Icon name="shield" size={23}/></span><div><b>Free</b><small>Consultation</small></div></article>
    </section>

    <section className="pj-use-cases">
      <div className="pj-section-head"><div><h2>Explore Projects <em>In Detail</em></h2><p>Open any project to review its concept, area, budget range, scope and design highlights before deciding what you want.</p></div></div>
      <div className="pj-use-grid">
        <article><img src={PROJECTS[0].image} alt=""/><div><strong>“</strong><p>Review the construction concept, scale, style and planning highlights before using it as inspiration for your own home.</p><b>Construction Concepts</b></div></article>
        <article><img src={PROJECTS[1].image} alt=""/><div><strong>“</strong><p>Open interior projects to understand the design language, planning approach, finishes and the kind of scope you may want.</p><b>Interior Concepts</b></div></article>
        <article><img src={PROJECTS[2].image} alt=""/><div><strong>“</strong><p>Review property examples for type, location, scale and budget context without treating inspiration cards as live listings.</p><b>Property Concepts</b></div></article>
      </div>
    </section>

    {selectedProject&&<div className="pj-detail-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closeProject()}}>
      <section className="pj-detail-modal" role="dialog" aria-modal="true" aria-label={selectedProject.title+' project details'}>
        <button className="pj-detail-close" type="button" onClick={closeProject} aria-label="Close project details">×</button>

        <div className="pj-detail-media">
          <img src={selectedProject.image} alt={selectedProject.title}/>
          <span className={'pj-badge '+selectedProject.category}>{selectedProject.categoryLabel}</span>
          <div className="pj-detail-image-note">Inspiration concept</div>
        </div>

        <div className="pj-detail-content">
          <div className="pj-detail-heading">
            <span>{selectedProject.style} · {selectedProject.propertyType}</span>
            <h2>{selectedProject.title}</h2>
            <p><Icon name="pin" size={14}/>{selectedProject.location}</p>
          </div>

          <div className="pj-detail-stats">
            <article><small>Project Type</small><b>{selectedProject.propertyType}</b></article>
            <article><small>Configuration</small><b>{selectedProject.meta}</b></article>
            <article><small>Built-up Area</small><b>{selectedProject.area} sq ft</b></article>
            <article><small>Budget Range</small><b>{selectedProject.budget}</b></article>
            <article><small>Design Style</small><b>{selectedProject.style}</b></article>
            <article><small>Category</small><b>{selectedProject.categoryLabel}</b></article>
          </div>

          <div className="pj-detail-section">
            <span>PROJECT OVERVIEW</span>
            <h3>About this concept</h3>
            <p>{selectedProject.description}</p>
          </div>

          <div className="pj-detail-columns">
            <div className="pj-detail-section">
              <span>DESIGN HIGHLIGHTS</span>
              <h3>What this project explores</h3>
              <ul>{projectHighlights(selectedProject).map(item=><li key={item}><i>✓</i>{item}</li>)}</ul>
            </div>
            <div className="pj-detail-section">
              <span>PROJECT SCOPE</span>
              <h3>Typical discussion areas</h3>
              <div className="pj-scope-chips">{projectScope(selectedProject).map(item=><b key={item}>{item}</b>)}</div>
            </div>
          </div>

          <div className="pj-detail-section pj-detail-planning-section">
            <span>PLANNING DETAILS</span>
            <h3>Useful details before you proceed</h3>
            <div className="pj-detail-planning-grid">
              {projectPlanningDetails(selectedProject).map(([label,value])=><article key={label}><small>{label}</small><p>{value}</p></article>)}
            </div>
          </div>

          <div className="pj-detail-confirm">
            <div>
              <span>BEFORE FINALISING</span>
              <h3>What should be confirmed?</h3>
            </div>
            <div>{projectConfirmations(selectedProject).map(item=><b key={item}><i>✓</i>{item}</b>)}</div>
          </div>

          <div className="pj-detail-note">
            <Icon name="info" size={18}/>
            <div><b>Concept, not a live quotation</b><span>Images, area and budget are for project inspiration. Final scope, pricing, materials and timelines depend on your actual requirement and the professional you choose.</span></div>
          </div>

          <div className="pj-detail-actions">
            <Link to="/packages" onClick={closeProject}>View Packages <Icon name="arrow" size={15}/></Link>
            <Link className="secondary" to="/professionals" onClick={closeProject}>Ask About This Project</Link>
          </div>
        </div>
      </section>
    </div>}

    <footer className="pj-footer">
      <div className="pj-footer-brand"><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Your customer starting point for construction, interiors and real-estate requirements.</p><div>f&nbsp;&nbsp;◎&nbsp;&nbsp;▶&nbsp;&nbsp;in</div></div>
      <div><b>Quick Links</b><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link to="/quote#property">Real Estate</Link><Link to="/projects">Projects</Link></div>
      <div><b>Our Services</b><Link to="/quote#construction">Home Construction</Link><Link to="/quote#interiors">Interior Design</Link><Link to="/quote#property">Real Estate</Link><Link to="/quote#construction">Construction Quote</Link><Link to="/quote#construction">Free Consultation</Link></div>
      <div><b>Support</b><Link to="/professionals">FAQ</Link><Link to="/#contact">Contact Us</Link><Link to="/professionals">Privacy Policy</Link><Link to="/professionals">Terms & Conditions</Link></div>
      <div><b>Contact Info</b>{phone&&<span><Icon name="phone" size={13}/>{phone}</span>}{email&&<span>{email}</span>}<span><Icon name="pin" size={13}/>Hyderabad, India</span></div>
    </footer>
  </main>
}
