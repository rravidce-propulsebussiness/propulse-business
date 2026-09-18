import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './UpcomingFeatures.css'

const fallback=[
  {name:'WhatsApp API',category:'Business Communication',short_description:'Connect WhatsApp with business workflows.',description:'Business-focused WhatsApp API capabilities for enquiries, notifications, customer communication and workflow automation.',icon:'◉',status:'In development',timeline:'Coming soon',highlighted:true},
  {name:'Project Management Apps',category:'Business Software',short_description:'Plan projects, teams, tasks and progress.',description:'Project management applications for organizing projects, teams, tasks, updates, documents and delivery workflows.',icon:'▦',status:'Planned',timeline:'Coming soon'},
  {name:'Website Builder',category:'Business Software',short_description:'Build and manage business websites faster.',description:'A website-building platform for creating, editing, publishing and managing business websites with reusable sections and tools.',icon:'▤',status:'In development',timeline:'Coming soon',highlighted:true},
  {name:'Billing Software',category:'Business Software',short_description:'Simplify billing and business transactions.',description:'Business billing software for invoices, customers, products, transactions and operational records.',icon:'₹',status:'Planned',timeline:'Coming soon'},
  {name:'Construction Consultation',category:'Consultation',short_description:'Technology-enabled support for construction businesses.',description:'Construction-focused consultation and technology support covering business workflows, digital systems and project-related requirements.',icon:'⌂',status:'Planned',timeline:'Coming soon'},
  {name:'Interior Consultation',category:'Consultation',short_description:'Digital support for interior businesses and projects.',description:'Interior consultation capabilities designed around customer requirements, project processes and digital operations.',icon:'◇',status:'Planned',timeline:'Coming soon'},
  {name:'Real Estate Consultation',category:'Consultation',short_description:'Digital and business support for real estate.',description:'Real-estate-focused consultation covering digital workflows, customer acquisition, technology and business processes.',icon:'⌖',status:'Planned',timeline:'Coming soon'},
  {name:'Brochure Builder',category:'Creative Tools',short_description:'Create professional brochures and marketing material.',description:'A browser-based builder for creating, editing and exporting business brochures and marketing collateral.',icon:'▧',status:'Planned',timeline:'Coming soon'},
  {name:'Marketing Automation',category:'Marketing Technology',short_description:'Automate repetitive marketing workflows.',description:'Marketing automation capabilities for campaigns, follow-ups, lead workflows, segmentation and business communication.',icon:'⚡',status:'In development',timeline:'Coming soon',highlighted:true},
  {name:'AI Audio Calling',category:'AI & Automation',short_description:'AI-assisted audio calling for business workflows.',description:'AI-powered audio calling capabilities intended for business communication, follow-up and workflow automation, subject to product and compliance controls.',icon:'◌',status:'Researching',timeline:'Future release'},
  {name:'Construction & Interior Material Marketplace',category:'Marketplaces',short_description:'Discover materials, products and suppliers in one place.',description:'A future marketplace for construction and interior materials, products, suppliers and related business opportunities.',icon:'◆',status:'Researching',timeline:'Future release'},
  {name:'More Business Technology',category:'Platform',short_description:'More tools are being planned.',description:'Additional software, automation, AI and business technology products will be added as the platform evolves.',icon:'＋',status:'Planned',timeline:'More to come'}
]

const statusClass=value=>String(value||'planned').toLowerCase().replaceAll(' ','-')

export default function UpcomingFeatures(){
  const [items,setItems]=useState(fallback)
  const [loading,setLoading]=useState(true)
  const [active,setActive]=useState('all')
  useEffect(()=>{
    let live=true
    publicRequest('/upcoming-features').then(data=>{
      if(!live)return
      if(Array.isArray(data)&&data.length)setItems(data)
    }).catch(()=>{}).finally(()=>live&&setLoading(false))
    return()=>{live=false}
  },[])
  useEffect(()=>{
    const nodes=[...document.querySelectorAll('.uf-reveal')]
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('visible')}),{threshold:.12})
    nodes.forEach(node=>observer.observe(node))
    return()=>observer.disconnect()
  },[items])
  const categories=useMemo(()=>['all',...Array.from(new Set(items.map(item=>item.category).filter(Boolean)))],[items])
  const visible=useMemo(()=>active==='all'?items:items.filter(item=>item.category===active),[active,items])
  return <div className="upcoming-page">
    <header className="uf-header">
      <Link className="uf-brand" to="/"><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link>
      <nav><Link to="/">Home</Link><Link to="/leads">Buy Leads</Link><a href="/#how-it-works">How It Works</a><a href="/#pricing">Pricing</a><a href="/#about">About</a><Link className="uf-active" to="/upcoming-features">Upcoming Features</Link><a href="/#contact">Contact</a><a href="/#faq">FAQ</a></nav>
      <div className="uf-actions"><Link className="uf-login" to="/login">Login</Link><Link className="uf-start" to="/signup">Get Started <span>→</span></Link></div>
    </header>
    <main>
      <section className="uf-hero">
        <div className="uf-orbit orbit-one"/><div className="uf-orbit orbit-two"/>
        <div className="uf-hero-copy">
          <span className="uf-kicker">PRODUCT ROADMAP · PROPULSE</span>
          <h1>What’s next for <em>your business.</em></h1>
          <p>Propulse is building a growing technology ecosystem for businesses — from communication and project software to automation, AI, marketplaces and specialist business support.</p>
          <div className="uf-hero-points"><span>✓ Business-first products</span><span>✓ Connected digital workflows</span><span>✓ More tools coming</span></div>
        </div>
        <div className="uf-roadmap-card">
          <div className="uf-roadmap-top"><span>ROADMAP</span><b>{loading?'…':items.length}</b></div>
          <div className="uf-roadmap-line"><i/><i/><i/><i/></div>
          <strong>Build → Connect → Automate → Scale</strong>
          <small>One technology ecosystem, expanding over time.</small>
        </div>
      </section>

      <section className="uf-intro uf-reveal">
        <div><span className="uf-kicker">UPCOMING FEATURES</span><h2>More than a marketplace.</h2><p>We’re building tools that extend beyond lead sales and help businesses create, operate, market and scale digitally.</p></div>
        <Link to="/contact" className="uf-intro-cta">Discuss your requirement <span>→</span></Link>
      </section>

      <section className="uf-filter-wrap uf-reveal">
        <div className="uf-filter-head"><span>ROADMAP AREAS</span><small>{visible.length} product{visible.length===1?'':'s'}</small></div>
        <div className="uf-filters">{categories.map(category=><button key={category} type="button" className={active===category?'active':''} onClick={()=>setActive(category)}>{category==='all'?'All':category}</button>)}</div>
      </section>

      <section className="uf-grid">
        {visible.map((item,index)=><article key={item.id||item.slug||item.name} className={item.highlighted?'uf-card uf-card-featured uf-reveal':'uf-card uf-reveal'} style={{'--uf-delay':`${Math.min(index,8)*70}ms`}}>
          {item.highlighted&&<span className="uf-featured">IN DEVELOPMENT</span>}
          <div className="uf-card-head"><span className="uf-icon">{item.icon||'✦'}</span><div><span className="uf-category">{item.category}</span><span className={`uf-status ${statusClass(item.status)}`}>{item.status}</span></div></div>
          <h3>{item.name}</h3>
          <strong>{item.short_description}</strong>
          <p>{item.description}</p>
          <div className="uf-card-foot"><span><small>Timeline</small><b>{item.timeline}</b></span><span className="uf-arrow">↗</span></div>
        </article>)}
      </section>

      <section className="uf-bottom uf-reveal">
        <div><span className="uf-kicker">THE ROADMAP KEEPS GROWING</span><h2>And this is only the beginning.</h2><p>New technology products and business capabilities can be added to the roadmap as Propulse evolves.</p></div>
        <div className="uf-bottom-actions"><Link to="/leads">Explore Leads <span>→</span></Link><a href="/#contact">Talk to Propulse <span>→</span></a></div>
      </section>
    </main>
    <footer className="uf-footer"><div className="uf-footer-brand"><Link to="/"><img src="/brand/propulse-logo.png" alt="Propulse"/></Link><p>IT technology, digital growth and business solutions.</p></div><div><b>Platform</b><Link to="/leads">Buy Leads</Link><Link to="/upcoming-features">Upcoming Features</Link><a href="/#pricing">Services &amp; Pricing</a></div><div><b>Company</b><a href="/#about">About</a><a href="/#contact">Contact</a><Link to="/login">Login</Link></div><div><b>Roadmap</b><span>{items.length} planned capabilities</span><span>More being added</span></div><small>© {new Date().getFullYear()} Propulse Business Technologies Private Limited</small></footer>
  </div>
}
