import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import RequirementWizard from './RequirementWizard'
import './Solutions.css'

const FLOWS = {
  construction: {
    flowKey: 'build',
    eyebrow: 'CONSTRUCTION QUOTATION',
    title: 'Construction',
    subtitle: 'Build & Quote',
    description: 'Enter project size, floors, scope and package preference to generate a structured construction quotation.',
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1500&q=88',
  },
  interiors: {
    flowKey: 'design',
    eyebrow: 'INTERIOR REQUIREMENT',
    title: 'Interiors',
    subtitle: 'Design Your Home',
    description: 'Share your property, rooms, finish preference and interior scope so relevant interior businesses can respond.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1500&q=88',
  },
  property: {
    flowKey: 'property',
    eyebrow: 'REAL ESTATE REQUIREMENT',
    title: 'Real Estate',
    subtitle: 'Find the Right Property',
    description: 'Tell us whether you want to buy, rent, sell or invest, along with location, property type and budget.',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1500&q=88',
  },
}

function Icon({name,size=20}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='build')return <svg {...p}><path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-7h6v7"/><path d="M7 10h10"/></svg>
  if(name==='design')return <svg {...p}><path d="M4 20h16"/><path d="M6 16V8h12v8"/><path d="M8 8V4h8v4"/><path d="M9 12h6"/></svg>
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

  useEffect(()=>{
    if(!location.hash) navigate('/solutions'+location.search+'#construction',{replace:true})
  },[location.hash,location.search,navigate])

  function switchFlow(key){
    navigate('/solutions'+location.search+'#'+key)
    window.scrollTo({top:0,behavior:'smooth'})
  }

  return <main className="sol-page">
    <header className="sol-header">
      <Link className="sol-logo" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav>
        <Link to="/">Home</Link>
        <Link className={activeKey==='construction'?'active':''} to="/solutions#construction">Construction</Link>
        <Link className={activeKey==='interiors'?'active':''} to="/solutions#interiors">Interiors</Link>
        <Link to="/packages">Packages</Link>
        <Link className={activeKey==='property'?'active':''} to="/solutions#property">Real Estate</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
      </nav>
      <Link className="sol-packages-link" to="/packages">View Packages <Icon name="arrow" size={14}/></Link>
    </header>

    <section className="sol-intro">
      <div>
        <span>ONE HOMEOWNER WORKSPACE</span>
        <h1>Plan Your Home <em>From One Page.</em></h1>
        <p>Switch between Construction, Interiors and Real Estate without opening separate customer pages. Each tab keeps its own questions and submission logic.</p>
      </div>
      <aside>
        <b>3 guided journeys</b>
        <span>One consistent ProPulse experience</span>
      </aside>
    </section>

    <section className="sol-switch" aria-label="Choose a homeowner service">
      {Object.entries(FLOWS).map(([key,item])=><button type="button" key={key} className={activeKey===key?'active':''} onClick={()=>switchFlow(key)}>
        <span className="sol-switch-icon"><Icon name={key==='construction'?'build':key==='interiors'?'design':'property'} size={22}/></span>
        <span><small>{item.eyebrow}</small><b>{item.title}</b><em>{item.subtitle}</em></span>
        <i><Icon name="arrow" size={17}/></i>
      </button>)}
    </section>

    <div className={'sol-flow sol-flow-'+activeKey} key={active.flowKey}>
      <RequirementWizard flowKey={active.flowKey}/>
    </div>
  </main>
}
