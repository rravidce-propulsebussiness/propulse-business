import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Projects.css'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'

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
  {
    id:'courtyard-villa',
    category:'construction',
    categoryLabel:'Construction',
    title:'Courtyard Villa',
    city:'Hyderabad',
    location:'Kokapet, Hyderabad',
    propertyType:'Villa',
    budget:'₹1Cr–₹2Cr',
    area:3600,
    style:'Contemporary',
    meta:'4 BHK',
    image:'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=88',
    description:'Courtyard-focused villa inspiration with private outdoor pockets, daylight and cross ventilation.',
  },
  {
    id:'compact-urban-home',
    category:'construction',
    categoryLabel:'Construction',
    title:'Compact Urban Home',
    city:'Hyderabad',
    location:'Manikonda, Hyderabad',
    propertyType:'Independent House',
    budget:'₹25L–₹50L',
    area:1800,
    style:'Minimal',
    meta:'3 BHK',
    image:'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=88',
    description:'Compact independent-home concept for narrow urban plots with efficient room planning and simple elevation.',
  },
  {
    id:'contemporary-farmhouse',
    category:'construction',
    categoryLabel:'Construction',
    title:'Contemporary Farmhouse',
    city:'Hyderabad',
    location:'Shankarpally, Hyderabad',
    propertyType:'Farmhouse',
    budget:'₹1Cr–₹2Cr',
    area:4200,
    style:'Contemporary',
    meta:'4 BHK',
    image:'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=88',
    description:'Relaxed farmhouse inspiration combining larger openings, shaded verandahs and contemporary materials.',
  },
  {
    id:'row-house',
    category:'construction',
    categoryLabel:'Construction',
    title:'Row House',
    city:'Bengaluru',
    location:'Whitefield, Bengaluru',
    propertyType:'Row House',
    budget:'₹50L–₹1Cr',
    area:2400,
    style:'Modern',
    meta:'3 BHK',
    image:'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=88',
    description:'Modern row-house concept with efficient vertical planning, balconies and a compact family layout.',
  },
  {
    id:'penthouse-interior',
    category:'design',
    categoryLabel:'Interiors',
    title:'Penthouse Interior',
    city:'Hyderabad',
    location:'Nanakramguda, Hyderabad',
    propertyType:'Apartment',
    budget:'₹50L–₹1Cr',
    area:3400,
    style:'Luxury',
    meta:'4 BHK',
    image:'https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=1200&q=88',
    description:'Penthouse interior inspiration with layered lighting, premium finishes and large-format living spaces.',
  },
  {
    id:'minimal-apartment',
    category:'design',
    categoryLabel:'Interiors',
    title:'Minimal Apartment',
    city:'Hyderabad',
    location:'Kukatpally, Hyderabad',
    propertyType:'Apartment',
    budget:'₹10L–₹20L',
    area:1450,
    style:'Minimalist',
    meta:'2 BHK',
    image:'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=88',
    description:'Minimal apartment concept with clean storage, soft neutral finishes and practical everyday furniture.',
  },
  {
    id:'modular-kitchen-project',
    category:'design',
    categoryLabel:'Interiors',
    title:'Modular Kitchen',
    city:'Hyderabad',
    location:'Miyapur, Hyderabad',
    propertyType:'Apartment',
    budget:'Under ₹10L',
    area:450,
    style:'Contemporary',
    meta:'Kitchen',
    image:'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=88',
    description:'Modular-kitchen inspiration focused on storage efficiency, work triangle, lighting and durable finishes.',
  },
  {
    id:'scandinavian-home-interior',
    category:'design',
    categoryLabel:'Interiors',
    title:'Scandinavian Home Interior',
    city:'Bengaluru',
    location:'Sarjapur, Bengaluru',
    propertyType:'Apartment',
    budget:'₹20L–₹50L',
    area:1900,
    style:'Scandinavian',
    meta:'3 BHK',
    image:'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=88',
    description:'Bright Scandinavian-inspired home with pale wood, functional storage and soft layered furnishings.',
  },
  {
    id:'coworking-office',
    category:'design',
    categoryLabel:'Interiors',
    title:'Co-working Office',
    city:'Hyderabad',
    location:'Madhapur, Hyderabad',
    propertyType:'Office',
    budget:'₹20L–₹50L',
    area:6500,
    style:'Industrial',
    meta:'Commercial',
    image:'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=88',
    description:'Flexible co-working interior inspiration with collaborative zones, meeting rooms and acoustic separation.',
  },
  {
    id:'retail-store-interior',
    category:'design',
    categoryLabel:'Interiors',
    title:'Retail Store Interior',
    city:'Hyderabad',
    location:'Banjara Hills, Hyderabad',
    propertyType:'Commercial',
    budget:'₹10L–₹20L',
    area:2200,
    style:'Modern',
    meta:'Retail',
    image:'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=88',
    description:'Retail interior concept balancing product display, lighting, customer circulation and branded finishes.',
  },
  {
    id:'gated-community-apartment',
    category:'property',
    categoryLabel:'Real Estate',
    title:'Gated Community Apartment',
    city:'Hyderabad',
    location:'Narsingi, Hyderabad',
    propertyType:'Apartment',
    budget:'₹1Cr–₹2Cr',
    area:2100,
    style:'Premium',
    meta:'3 BHK',
    image:'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=88',
    description:'Gated-community apartment inspiration for buyers comparing layouts, amenities, access and neighbourhood fit.',
  },
  {
    id:'villa-community',
    category:'property',
    categoryLabel:'Real Estate',
    title:'Villa Community',
    city:'Hyderabad',
    location:'Tellapur, Hyderabad',
    propertyType:'Villa',
    budget:'₹2Cr+',
    area:3800,
    style:'Luxury',
    meta:'4 BHK',
    image:'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1200&q=88',
    description:'Villa-community inspiration for customers evaluating private outdoor space, community amenities and scale.',
  },
  {
    id:'apartment-for-sale',
    category:'property',
    categoryLabel:'Real Estate',
    title:'Apartment for Sale',
    city:'Hyderabad',
    location:'Kondapur, Hyderabad',
    propertyType:'Apartment',
    budget:'₹50L–₹1Cr',
    area:1250,
    style:'Modern',
    meta:'2 BHK',
    image:'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=88',
    description:'Compact apartment inspiration for buyers and sellers comparing budget, connectivity, condition and resale value.',
  },
  {
    id:'residential-plot',
    category:'property',
    categoryLabel:'Real Estate',
    title:'Residential Plot',
    city:'Hyderabad',
    location:'Shadnagar, Hyderabad',
    propertyType:'Plot',
    budget:'₹25L–₹50L',
    area:2400,
    style:'Open Plot',
    meta:'267 sq yd',
    image:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=88',
    description:'Residential-plot inspiration for customers exploring location, access, surrounding development and future use.',
  },
  {
    id:'commercial-office-unit',
    category:'property',
    categoryLabel:'Real Estate',
    title:'Commercial Office Unit',
    city:'Hyderabad',
    location:'Kokapet, Hyderabad',
    propertyType:'Commercial',
    budget:'₹1Cr–₹2Cr',
    area:3200,
    style:'Premium',
    meta:'Office',
    image:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=88',
    description:'Commercial office inspiration for comparing floor efficiency, access, visibility and business-location context.',
  },
  {
    id:'family-apartment-interior',
    category:'design',
    categoryLabel:'Interiors',
    title:'Family Apartment Interior',
    city:'Vijayawada',
    location:'Vijayawada, Andhra Pradesh',
    propertyType:'Apartment',
    budget:'₹20L–₹50L',
    area:2050,
    style:'Warm Modern',
    meta:'3 BHK',
    image:'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1200&q=88',
    description:'Family-focused interior concept with durable finishes, integrated storage and comfortable shared spaces.',
  },
]


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


export default function Projects(){
  const [contactData,setContactData]=useState({})
  const [category,setCategory]=useState('all')
  const [query,setQuery]=useState('')
  const [visible,setVisible]=useState(12)
  const [selectedProject,setSelectedProject]=useState(null)
  const [recentProjects,setRecentProjects]=useState([])
  const [recentProjectsLoading,setRecentProjectsLoading]=useState(true)

  useEffect(()=>{
    window.scrollTo(0,0)
    publicRequest('/contact?audience=website')
      .then(value=>setContactData(value||{}))
      .catch(()=>{})
  },[])

  useEffect(()=>{
    let active=true
    publicRequest('/experts/projects?page=1&pageSize=18')
      .then(value=>{
        if(!active)return
        const rows=Array.isArray(value)?value:Array.isArray(value?.data)?value.data:[]
        setRecentProjects(rows)
      })
      .catch(()=>{if(active)setRecentProjects([])})
      .finally(()=>{if(active)setRecentProjectsLoading(false)})
    return()=>{active=false}
  },[])

  const sortedRecentProjects=useMemo(()=>[...recentProjects].sort((a,b)=>{
    const right=new Date(b.published_at||0).getTime()
    const left=new Date(a.published_at||0).getTime()
    return right-left||Number(b.project_id||0)-Number(a.project_id||0)
  }),[recentProjects])

  function playableVideo(url){
    const value=String(url||'')
    return value.startsWith('/uploads/business-projects/')||/\.(mp4|mov|webm)(?:$|[?#])/i.test(value)
  }

  function imagePlan(url){
    return /\.(?:jpg|jpeg|png|webp)(?:$|[?#])/i.test(String(url||''))
  }

  function pdfPlan(url){
    return /\.pdf(?:$|[?#])/i.test(String(url||''))
  }

  function recentLabel(value){
    const date=new Date(value)
    if(Number.isNaN(date.getTime()))return 'Recently added'
    return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(date)
  }

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    return PROJECTS.filter(project=>{
      if(category!=='all'&&project.category!==category)return false
      if(q&&!([project.title,project.location,project.categoryLabel,project.propertyType,project.style,project.description].join(' ').toLowerCase().includes(q)))return false
      return true
    })
  },[category,query])

  useEffect(()=>{
    if(!selectedProject)return undefined
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    return()=>{document.body.style.overflow=previous}
  },[selectedProject])

  function openProject(project){
    setSelectedProject(project)
  }

  function closeProject(){
    setSelectedProject(null)
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

  function projectSpecifications(project){
    if(project.category==='design'){
      if(project.propertyType==='Office'||project.propertyType==='Commercial') return [
        ['Interior Scope','Complete office interior concept'],
        ['Work Zones','Reception, workstations, cabins and meeting areas'],
        ['Storage','Integrated office and utility storage'],
        ['Ceiling','False-ceiling and services coordination'],
        ['Lighting','Ambient, task and accent lighting'],
        ['Furniture','Fixed + loose office furniture'],
        ['Services','Electrical, data, HVAC and power planning'],
        ['Finish Direction',project.style+' commercial finish palette'],
        ['Flooring','Existing / selected project finish'],
        ['Site Status','Finalised after measurement and site inspection'],
      ]
      return [
        ['Interior Scope','Full-home interior concept'],
        ['Rooms','Living + '+project.meta+' bedrooms + kitchen'],
        ['Kitchen','Modular kitchen planning'],
        ['Wardrobes',project.meta+' bedroom wardrobe planning'],
        ['TV Unit','Living-room TV wall / media unit'],
        ['False Ceiling','Living and dining ceiling concept'],
        ['Lighting','Ambient + task + accent lighting'],
        ['Furniture','Fixed and loose furniture planning'],
        ['Storage','Room-wise custom storage'],
        ['Finish Direction',project.style+' laminate / veneer / paint palette'],
      ]
    }
    if(project.category==='construction') return [
      ['Construction Scope','Complete residential construction concept'],
      ['Configuration',project.meta],
      ['Structure','RCC framed structure'],
      ['Planning','Room layout, circulation and ventilation'],
      ['Elevation',project.style+' exterior elevation'],
      ['Electrical','Point layout and DB planning'],
      ['Plumbing','Water-supply and drainage planning'],
      ['Flooring','Package / material based selection'],
      ['Doors & Windows','Finalised with selected package'],
      ['Execution','Final timeline after drawings and site inputs'],
    ]
    return [
      ['Property Context',project.propertyType+' reference concept'],
      ['Configuration',project.meta],
      ['Area Reference',project.area+' sq ft built-up area'],
      ['Budget Reference',project.budget],
      ['Location',project.location],
      ['Furnishing','To be verified on the actual property'],
      ['Parking','To be verified on the actual property'],
      ['Amenities','Project-specific; verify before decision'],
      ['Availability','Not represented as a live listing'],
      ['Due Diligence','Approvals, title and ownership to be verified'],
    ]
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
    <PublicHeader />

    {(recentProjectsLoading||sortedRecentProjects.length>0)&&<section className="pj-video-wrap">
      <div className="pj-video-heading">
        <div><span>REAL PROFESSIONAL WORK</span><h2>Recent completed projects</h2><p>Published business projects appear automatically here, newest first.</p></div>
        <Link to="/experts">Find Professionals <Icon name="arrow" size={14}/></Link>
      </div>
      {recentProjectsLoading?<div className="pj-video-loading">Loading recent completed projects…</div>:<div className="pj-video-grid">
        {sortedRecentProjects.map(project=><article className="pj-video-card" key={project.project_id}>
          <div className="pj-video-media">
            {playableVideo(project.video_url)
              ?<video controls playsInline preload="metadata" poster={project.cover_image_url||undefined} src={project.video_url}/>
              :project.cover_image_url
                ?<img src={project.cover_image_url} alt={project.title||'Completed project'}/>
                :imagePlan(project.plan_url)
                  ?<img src={project.plan_url} alt={(project.title||'Project')+' plan / drawing'}/>
                  :<div className="pj-project-media-placeholder"><Icon name="building" size={30}/><b>{pdfPlan(project.plan_url)?'PDF plan available':'Completed project'}</b></div>}
          </div>
          <div className="pj-video-copy">
            <div className="pj-video-meta"><span>{project.project_type||'Completed project'}</span><time>{recentLabel(project.published_at)}</time></div>
            <h3>{project.title}</h3>
            <p>{project.description||'Completed project shared by a ProPulse professional.'}</p>
            <div className="pj-project-assets">
              {project.video_url&&!playableVideo(project.video_url)&&<a href={project.video_url} target="_blank" rel="noreferrer">Watch video ↗</a>}
              {project.plan_url&&<a href={project.plan_url} target="_blank" rel="noreferrer">{pdfPlan(project.plan_url)?'View PDF plan ↗':'View plan / drawing ↗'}</a>}
            </div>
            <div className="pj-video-business"><div><b>{project.business_name}</b><small>{project.location_text||'Service location available in profile'}</small></div>{project.is_verified&&<span><Icon name="shield" size={13}/> Verified</span>}</div>
          </div>
        </article>)}
      </div>}
    </section>}

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
      {visible<filtered.length&&<button className="pj-load" onClick={()=>setVisible(v=>v+6)}>Load More Projects ↓</button>}
    </section>

    <section className="pj-stats">
      <article><span><Icon name="building" size={23}/></span><div><b>10</b><small>Metro Cities</small></div></article>
      <article><span><Icon name="pin" size={23}/></span><div><b>50+</b><small>Locations Covered</small></div></article>
      <article><span><Icon name="home" size={23}/></span><div><b>3</b><small>Project Categories</small></div></article>
      <article><span><Icon name="shield" size={23}/></span><div><b>Free</b><small>Consultation</small></div></article>
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

          <div className="pj-detail-section pj-spec-section">
            <span>INDICATIVE SPECIFICATION</span>
            <h3>Project details at a glance</h3>
            <div className="pj-spec-grid">
              {projectSpecifications(selectedProject).map(([label,value])=><article key={label}><small>{label}</small><b>{value}</b></article>)}
            </div>
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
          </div>
        </div>
      </section>
    </div>}

    <PublicFooter phone={phone} email={email} />
  </main>
}
