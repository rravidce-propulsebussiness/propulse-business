import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import UserHeader from '../components/UserHeader'
import { publicRequest } from '../utils/auth'
import './UpcomingFeatures.css'

const statusClass=value=>String(value||'planned').toLowerCase().replace(/[^a-z0-9]+/g,'-')

export default function UpcomingFeatures({audience='homeowner'}){
  const professional=audience==='professional'
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  const load=useCallback(async()=>{
    try{
      setLoading(true)
      setError('')
      const data=await publicRequest('/upcoming-features?audience='+encodeURIComponent(audience))
      setItems(Array.isArray(data)?data.filter(item=>item?.is_active!==false):[])
    }catch(e){
      setItems([])
      setError(e.message||'Unable to load upcoming features')
    }finally{
      setLoading(false)
    }
  },[audience])

  useEffect(()=>{window.scrollTo(0,0);let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[load])

  const featured=useMemo(()=>items.filter(item=>item.highlighted),[items])
  const regular=useMemo(()=>items.filter(item=>!item.highlighted),[items])

  const card=item=><article className={'upf-card'+(item.highlighted?' featured':'')} key={item.id}>
    <div className="upf-card-top">
      <span className="upf-icon">{item.icon||'✦'}</span>
      <span className={'upf-status '+statusClass(item.status)}>{item.status||'Planned'}</span>
    </div>
    <small>{item.category||'Platform'}</small>
    <h2>{item.name}</h2>
    <p>{item.short_description||item.description||'More details will be announced soon.'}</p>
    {item.description&&item.description!==item.short_description&&<div className="upf-description">{item.description}</div>}
    <div className="upf-timeline"><span>Timeline</span><b>{item.timeline||'Coming soon'}</b></div>
  </article>

  return <div className={professional?"upf-page upf-professional-page":"upf-page"}>
    {professional?<UserHeader/>:<PublicHeader/>}
    <main>
      <section className="upf-hero">
        <span className="upf-kicker">{professional?'PROFESSIONAL / PRODUCT ROADMAP':'HOMEOWNER / PRODUCT ROADMAP'}</span>
        <h1>Upcoming <em>Features</em></h1>
        <p>{professional?'Discover upcoming tools for leads, CRM, business automation, payments and professional workflows.':'See what is planned for homeowners exploring construction, interiors and real estate.'}</p>
      </section>

      {loading?<section className="upf-state">Loading upcoming features…</section>:
        error?<section className="upf-state error"><strong>Upcoming features are temporarily unavailable.</strong><button type="button" onClick={load}>Try again</button></section>:
        !items.length?<section className="upf-state"><strong>No upcoming features are published yet.</strong></section>:
        <>
          {featured.length>0&&<section className="upf-section"><div className="upf-section-head"><span>FEATURED ROADMAP</span><h2>What we're working on next</h2></div><div className="upf-grid featured-grid">{featured.map(card)}</div></section>}
          <section className="upf-section"><div className="upf-section-head"><span>ROADMAP</span><h2>{featured.length?'More upcoming capabilities':'What is coming next'}</h2></div><div className="upf-grid">{(featured.length?regular:items).map(card)}</div></section>
        </>
      }
    </main>
    {professional?<footer className="upf-professional-footer"><span>ProPulse for Professionals</span><div><Link to="/professional-faq">Professional FAQ</Link><Link to="/professional-contact">Professional Support</Link></div></footer>:<PublicFooter />}
  </div>
}
