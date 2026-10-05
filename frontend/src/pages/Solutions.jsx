import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import RequirementWizard from './RequirementWizard'
import './Solutions.css'

const FLOWS = {
  construction: {
    flowKey: 'build',
    eyebrow: 'CONSTRUCTION',
    title: 'Construction',
    subtitle: 'Build & Get Quote',
    description: 'Get a detailed project quotation with cost range, package preference, specifications and downloadable PDF.',
    image: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1100&q=90',
    icon: 'build',
  },
  interiors: {
    flowKey: 'design',
    eyebrow: 'INTERIORS',
    title: 'Interiors',
    subtitle: 'Plan Your Interiors',
    description: 'Share rooms, area, finishes and scope so relevant interior businesses can respond to your requirement.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=90',
    icon: 'design',
  },
  property: {
    flowKey: 'property',
    eyebrow: 'REAL ESTATE',
    title: 'Real Estate',
    subtitle: 'Find Your Property',
    description: 'Buy or sell property with a structured location, property-type and budget requirement.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1100&q=90',
    icon: 'property',
  },
}

function Icon({name,size=20}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='build')return <svg {...p}><path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-7h6v7"/><path d="M7 10h10"/></svg>
  if(name==='design')return <svg {...p}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/><path d="M5 17v2M19 17v2"/></svg>
  if(name==='property')return <svg {...p}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  return null
}

function hashKey(hash){
  const key=String(hash||'').replace(/^#/,'').toLowerCase()
  if(key==='interior'||key==='design')return 'interiors'
  if(key==='real-estate'||key==='realestate')return 'property'
  return FLOWS[key]?key:'construction'
}


export default function Solutions(){
  const location=useLocation()
  const navigate=useNavigate()
  const activeKey=useMemo(()=>hashKey(location.hash),[location.hash])
  const active=FLOWS[activeKey]
  const [completed,setCompleted]=useState(false)

  useEffect(()=>{
    if(!location.hash) navigate('/quote'+location.search+'#construction',{replace:true})
  },[location.hash,location.search,navigate])

  return <main className="quote-page">
    <header className="quote-header">
      <Link className="quote-logo" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/packages">Packages</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/experts">Find Professionals</Link>
      </nav>
      <div className="public-header-actions">
        <Link className="quote-header-cta" to="/quote#interiors">Get Free Quote <Icon name="arrow" size={15}/></Link>
        <Link className="public-professional-btn" to="/professionals">For Professionals</Link>
      </div>
    </header>

    {!completed&&<section className="quote-flow-switcher" aria-label="Choose quote type">
      <div className="quote-flow-switcher-inner">
        {Object.entries(FLOWS).map(([key,item])=><button
          type="button"
          key={key}
          className={activeKey===key?'active':''}
          onClick={()=>navigate('/quote'+location.search+'#'+key)}
          aria-pressed={activeKey===key}
        >
          <span><Icon name={item.icon} size={18}/></span>
          <b>{item.title}</b>
          {activeKey===key&&<i>Selected</i>}
        </button>)}
      </div>
    </section>}

    <section className={'quote-flow quote-flow-'+activeKey} key={active.flowKey}>
      <RequirementWizard flowKey={active.flowKey} onCompletionChange={setCompleted}/>
    </section>
  </main>
}
