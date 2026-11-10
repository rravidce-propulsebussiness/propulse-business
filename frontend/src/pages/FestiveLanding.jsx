import {useEffect,useRef,useMemo,useState} from 'react'
import {Link,Navigate,useLocation,useParams} from 'react-router-dom'
import {PublicHeader,PublicFooter} from '../components/PublicSiteChrome'
import {activeFestival,activeFestivals,campaignStatus,CAMPAIGN_SERVICES,FESTIVAL_EVENTS,festivalBySlug,festivalPath,indiaToday} from '../seo/festiveCampaigns'
import {publicRequest} from '../utils/auth'
import './FestiveLanding.css'

const prettyDate=value=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(value+'T12:00:00+05:30'))
const constructionImage='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=84'
const interiorsImage='https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=84'

function OccasionArtwork({event,service='construction'}){
  const ref=useRef(null)
  useEffect(()=>{
    const element=ref.current
    const target=element?.closest('.fc-hero')
    if(!element||!target||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
    const move=e=>{const box=element.getBoundingClientRect();element.style.setProperty('--art-x',((e.clientX-box.left)/box.width-.5)*12+'px');element.style.setProperty('--art-y',((e.clientY-box.top)/box.height-.5)*12+'px')}
    const reset=()=>{element.style.setProperty('--art-x','0px');element.style.setProperty('--art-y','0px')}
    target.addEventListener('pointermove',move);target.addEventListener('pointerleave',reset)
    return ()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerleave',reset)}
  },[])
  return <div ref={ref} className="fc-artwork" aria-hidden="true"><svg viewBox="0 0 640 540" fill="none"><circle cx="320" cy="265" r="226" stroke="currentColor" strokeWidth=".6"/><circle cx="320" cy="265" r="204" stroke="currentColor" strokeDasharray="2 12"/>{Array.from({length:12},(_,i)=><path key={i} d="M320 18V46M312 32H328" stroke="currentColor" transform={'rotate('+i*30+' 320 265)'}/>) }<g className="fc-art-lines" stroke="currentColor" strokeWidth="1.5">{service==='construction'?<><path d="M110 414V254L317 113L527 254V414H110ZM150 414V274L317 161L487 274V414M273 414V301H362V414M181 288H236V348H181ZM399 288H454V348H399Z"/><path d="M85 435H553M110 455H527M317 113V77M300 94H334"/></>:<><path d="M132 402V135H507V402M132 165H507M166 165V262M474 165V262M166 262Q220 213 266 262M474 262Q420 213 374 262M203 395V331Q203 312 222 312H418Q437 312 437 331V395M186 356H453V408H186ZM218 408V428M421 408V428M288 356V312M351 356V312M310 165V208M285 224Q310 189 335 224Z"/><path d="M112 432H529M460 432V341M447 341H476L487 305H436Z"/></>}</g><text x="320" y="492" textAnchor="middle" fill="currentColor" stroke="none" fontSize="12" letterSpacing="6">{event.theme.toUpperCase()}</text></svg></div>
}

const serviceOffer=service=>service.key==='construction'?'Construction benefits up to ₹5 lakh':'10% off interiors'

function useOccasionMotion(enabled=true){
  const location=useLocation()
  useEffect(()=>{
    if(!enabled||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return undefined
    const root=document.querySelector('.fc-page')
    if(!root)return undefined
    const revealSelectors='.fc-hero-content,.fc-hero-visual,.fc-feature-strip,.fc-intro>*,.fc-benefit-grid>article,.fc-planning>*,.fc-faq-grid>details,.fc-cta .fc-container,.fc-service-card,.fc-event-card,.fc-home-principles>*,.fc-also>*,.fc-hub-hero .fc-container,.fc-hub-heading,.fc-search-row,.fc-hub-list>.fc-terms,.fc-memorial-hero .fc-container,.fc-memorial-content>*,.public-site-footer'
    const revealItems=[...root.querySelectorAll(revealSelectors)]
    revealItems.forEach((element,index)=>{
      element.classList.add('fc-3d-reveal')
      element.style.setProperty('--fc-reveal-delay',Math.min(index%6,5)*65+'ms')
    })
    let observer
    if('IntersectionObserver' in window){
      observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('fc-3d-visible');observer.unobserve(entry.target)}
      }),{threshold:.12,rootMargin:'0px 0px -7% 0px'})
      revealItems.forEach(element=>observer.observe(element))
    }else revealItems.forEach(element=>element.classList.add('fc-3d-visible'))

    const move=event=>{
      if(event.pointerType!=='mouse')return
      const card=event.target.closest('.fc-hero-visual,.fc-offer-panel,.fc-service-card,.fc-event-card,.fc-feature-strip>span,.fc-home-principles>*,.fc-benefit-grid>article,.fc-faq-grid>details')
      if(!card||!root.contains(card))return
      const box=card.getBoundingClientRect()
      const x=(event.clientX-box.left)/box.width-.5
      const y=(event.clientY-box.top)/box.height-.5
      card.style.setProperty('--fc-tilt-x',(-y*5).toFixed(2)+'deg')
      card.style.setProperty('--fc-tilt-y',(x*7).toFixed(2)+'deg')
    }
    const reset=event=>{
      const card=event.target.closest('.fc-hero-visual,.fc-offer-panel,.fc-service-card,.fc-event-card,.fc-feature-strip>span,.fc-home-principles>*,.fc-benefit-grid>article,.fc-faq-grid>details')
      if(!card||!root.contains(card)||(event.relatedTarget&&card.contains(event.relatedTarget)))return
      card.style.setProperty('--fc-tilt-x','0deg');card.style.setProperty('--fc-tilt-y','0deg')
    }
    root.addEventListener('pointermove',move,{passive:true});root.addEventListener('pointerout',reset,{passive:true})
    return()=>{observer?.disconnect();root.removeEventListener('pointermove',move);root.removeEventListener('pointerout',reset)}
  },[enabled,location.pathname])
}

function OccasionWhatsAppButton({event,service}){
  const [phone,setPhone]=useState('919000360812')
  useEffect(()=>{
    let active=true
    publicRequest('/contact?audience=website').then(value=>{
      const raw=String(value?.whatsapp||value?.phone||'').replace(/\D/g,'')
      const number=raw.length===10?'91'+raw:raw.length===11&&raw.startsWith('0')?'91'+raw.slice(1):raw
      if(active&&number.length>=10)setPhone(number)
    }).catch(()=>{})
    return()=>{active=false}
  },[])
  const topic=service?event.name+' '+service.label.toLowerCase()+' project':event.name+' home project'
  const message=encodeURIComponent('Hi ProPulse, I would like to discuss my '+topic+' in Hyderabad.')
  return <a className="fc-whatsapp" href={'https://wa.me/'+phone+'?text='+message} target="_blank" rel="noopener noreferrer" aria-label={'Chat with ProPulse about '+topic+' on WhatsApp'}>
    <span className="fc-whatsapp-orbit" aria-hidden="true"/><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.02 3.2A12.64 12.64 0 0 0 5.19 22.36L3.5 28.55l6.33-1.66a12.7 12.7 0 1 0 6.19-23.69Zm0 22.8c-1.85 0-3.66-.49-5.25-1.42l-.38-.22-3.76.99 1-3.66-.25-.4a10.1 10.1 0 1 1 8.64 4.71Zm5.55-7.57c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.18.2-.35.23-.65.08-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.77-1.64-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.21 5.1 4.5.71.3 1.27.48 1.7.62.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.13-.27-.2-.57-.35Z"/></svg>
    <span className="fc-whatsapp-label">WhatsApp</span><span className="fc-whatsapp-pulse" aria-hidden="true"/>
  </a>
}

function OfferPanel({event,service,showImage=true}){
  const status=campaignStatus(event)
  const construction=service.key==='construction'
  return <div className={'fc-offer-panel fc-offer-panel--'+service.key+(showImage?'':' fc-offer-panel--text')}>
    {showImage&&<img className="fc-offer-photo" src={construction?constructionImage:interiorsImage} alt={construction?'Contemporary home construction exterior':'Premium contemporary living room interiors'} loading="lazy"/>}
    <div className="fc-offer-copy"><span className="fc-offer-name">{event.name} {construction?'Construction':'Interior'} Offer{status==='past'?' · Ended':status==='upcoming'?' · Upcoming':''}</span>
      <strong>{construction?<><small>Construction benefits up to</small>₹5 lakh</>:<>10% <small>off interiors</small></>}</strong>
      <p>{status==='past'?'This '+event.name+' offer has ended. Ask us for a current quotation.':status==='upcoming'?'Plan ahead for '+event.name+'.':construction?'Plan your new home for '+event.name+'.':'Refresh your home for '+event.name+'.'}</p>
      <small>For eligible projects during {prettyDate(event.start)} – {prettyDate(event.end)}. Scope and offer terms confirmed in your written quotation.</small>
    </div>
  </div>
}

function OfferDisclaimer({event,service}){
  return <p className="fc-terms">{event.name} offer window: {prettyDate(event.start)}–{prettyDate(event.end)} (Hyderabad/IST). {event.tentative?'Observance dates are provisional. ':''}Offer: {service?serviceOffer(service):'Construction benefits up to ₹5 lakh and 10% off interiors'}. Available for eligible projects within these dates. Scope, eligibility, discount basis, taxes and exclusions are confirmed in your written quotation.</p>
}

function StatusTag({event}){
  const status=campaignStatus(event)
  return <span className={'fc-status fc-status--'+status}>{event.kind==='remembrance'?(status==='active'?'Remembrance period':status==='upcoming'?'Upcoming remembrance':'Observance completed'):(status==='active'?'Offer live':status==='upcoming'?'Upcoming offer': 'Offer ended')}</span>
}

function ServiceCard({event,service,compact=false}){
  const image=service.key==='construction'?constructionImage:interiorsImage
  return <article className={'fc-service-card'+(compact?' fc-service-card--compact':'')}>
    <div className="fc-service-image"><img src={image} alt={service.key==='construction'?'Modern family home exterior for construction planning':'Warm modern living room for interior design inspiration'} loading="lazy"/><span>{service.label}</span></div>
    <div className="fc-service-copy"><p className="fc-overline">PROPULSE {service.label.toUpperCase()}</p>
      <h3>{event.name} {service.title}</h3><OfferPanel event={event} service={service} showImage={false}/>
      <p>{service.key==='construction'?'Begin with your plot, estimate, material choices and a detailed construction scope.':'Explore room-wise design, modular kitchen, wardrobes, lighting and finishes that work for your household.'}</p>
      <Link to={festivalPath(event,service.key)} className="fc-card-link">View {service.label.toLowerCase()} offer <span aria-hidden="true">↗</span></Link>
    </div>
  </article>
}

function Faq({event,service}){
  return <section className="fc-faq fc-container" aria-label="Frequently asked questions">
    <p className="fc-overline">GOOD TO KNOW</p>
    <h2>Your {event.name} {service.name.toLowerCase()} questions</h2>
    <div className="fc-faq-grid">
      <details open><summary>{service.question}</summary><p>{service.answer}</p></details>
      <details><summary>How does the {event.name} offer apply?</summary><p>{campaignStatus(event)==='past'?'This offer has ended. Request a current quotation for today’s pricing.':'Offer: '+serviceOffer(service)+'. Eligible projects must fall within the published offer dates.'} The final scope, eligibility and offer calculation are confirmed in your written ProPulse quotation.</p></details>
      <details><summary>Can I request a quote after the festival?</summary><p>Yes. You can request a current quotation after the offer ends. The team will review current scope, pricing and availability.</p></details>
      <details><summary>Does ProPulse work in Hyderabad?</summary><p>ProPulse discusses selected home construction and interior execution projects in Hyderabad, subject to location, scope and availability confirmation. You can also explore independent professionals on the platform.</p></details>
    </div>
  </section>
}


function MemorialLanding({event,service}){
  useOccasionMotion()
  const other=CAMPAIGN_SERVICES[service.key==='construction'?'interiors':'construction']
  return <div className="fc-page fc-memorial"><PublicHeader/><main>
    <section className="fc-memorial-hero"><div className="fc-container">
      <nav className="fc-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/offers">Occasions and commemorations</Link><span>/</span>{event.name} · {service.label}</nav>
      <p className="fc-memorial-overline">IN RESPECTFUL REMEMBRANCE · HYDERABAD</p>
      <h1>{event.icon} {event.name} <span>{event.date.slice(0,4)}</span></h1>
      <p className="fc-memorial-lead">{event.inspiration}</p>
      <p className="fc-memorial-date">Observed on {prettyDate(event.date)} · India Standard Time</p>
    </div></section>
    <section className="fc-container fc-memorial-content">
      <p className="fc-overline">REMEMBER WITH DIGNITY</p>
      <h2>We remember. We honour. We reflect.</h2>
      <p>ProPulse pays its respects to the people and families remembered on this day. This page is a commemorative message, not a festive sale or a promotional announcement.</p>
      <div className="fc-memorial-service">
        <h2>{service.name}: spaces designed with responsibility</h2>
        <p>{service.key==='construction'?'Thoughtful home construction prioritises structural safety, dependable materials, long-term durability and accessibility.':'Thoughtful home interiors prioritise safe circulation, useful lighting, durable materials and inclusive living spaces.'} These are general commitments to responsible design; they are not offers associated with this observance.</p>
        <p>Learn about ProPulse independently of this remembrance day through our main website and service information.</p>
        <div className="fc-memorial-links"><Link to={festivalPath(event,other.key)}>Read the {other.label.toLowerCase()} remembrance page ↗</Link><Link to="/about">About ProPulse ↗</Link><Link to="/offers">All important dates ↗</Link></div>
      </div>
      <section className="fc-memorial-faq" aria-label="Frequently asked questions"><h2>Frequently asked questions</h2>
        <h3>What does {event.name} commemorate?</h3><p>{event.inspiration}</p>
        <h3>Are there promotions connected to this day?</h3><p>No. This page is solely a respectful observance. ProPulse does not present remembrance days as festival sales.</p>
      </section>
    </section>
  </main><PublicFooter/><OccasionWhatsAppButton event={event} service={service}/></div>
}

function MemorialHome({event}){
  useOccasionMotion()
  return <div className="fc-page fc-home fc-memorial"><PublicHeader/><main>
    <section className="fc-memorial-hero fc-memorial-hero--home"><div className="fc-container">
      <p className="fc-memorial-overline">PROPULSE · REMEMBRANCE</p>
      <h1>{event.icon} {event.name} <span>{event.date.slice(0,4)}</span></h1>
      <p className="fc-memorial-lead">{event.inspiration}</p>
      <p className="fc-memorial-date">Remembering with dignity · {prettyDate(event.date)}</p>
    </div></section>
    <section className="fc-container fc-memorial-content">
      <h2>A moment for reflection, not promotion.</h2>
      <p>On this occasion, ProPulse pauses commercial festival messaging to offer a respectful tribute. There are no promotional offers linked to this remembrance day.</p>
      <div className="fc-memorial-links"><Link to={festivalPath(event,'construction')}>Construction remembrance page ↗</Link><Link to={festivalPath(event,'interiors')}>Interiors remembrance page ↗</Link></div>
      <p className="fc-memorial-date">In remembrance · {prettyDate(event.date)}.</p>
    </section>
  </main><PublicFooter/><OccasionWhatsAppButton event={event}/></div>
}

function SingleOffer({event,service}){
  useOccasionMotion(event.kind!=='remembrance')
  if(event.kind==='remembrance')return <MemorialLanding event={event} service={service}/>
  const status=campaignStatus(event)
  return <div className="fc-page">
    <PublicHeader/>
    <main>
      <section className={'fc-hero fc-hero--'+service.key}><OccasionArtwork event={event} service={service.key}/>
        <div className="fc-hero-orb fc-hero-orb--one" aria-hidden="true"/><div className="fc-hero-orb fc-hero-orb--two" aria-hidden="true"/>
        <div className="fc-container fc-hero-grid">
          <div className="fc-hero-content">
            <nav aria-label="Breadcrumb" className="fc-breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/offers">Festival offers</Link><span>/</span><span>{event.name} · {service.label}</span></nav>
            <div className="fc-tags"><span className="fc-year">{event.icon} {event.name} {event.date.slice(0,4)}</span><StatusTag event={event}/></div>
            <p className="fc-eyebrow">CELEBRATE NEW POSSIBILITIES · HYDERABAD</p>
            <h1>{event.name} {service.name} <em>Special Offer</em></h1>
            <p className="fc-lead">{event.inspiration} ProPulse helps Hyderabad homeowners plan your {service.name.toLowerCase()} project with a clear scope, budget and material choices.</p>
            <div className="fc-actions"><Link className="fc-button fc-button--gold" to={service.to}>{service.action} <span aria-hidden="true">↗</span></Link><Link className="fc-button fc-button--outline" to="/packages">View packages</Link></div><OfferPanel event={event} service={service}/>
            <p className="fc-festival-date">{event.tentative?'Indicative date / season: ':'Festival date: '}{prettyDate(event.date)} <span>•</span> Timings in India Standard Time</p>
          </div>
          <div className="fc-hero-visual"><img src={service.key==='construction'?constructionImage:interiorsImage} alt={service.key==='construction'?'Modern residential house in warm evening light':'Elegant warm contemporary living space'} fetchPriority="high"/><div className="fc-visual-shine" aria-hidden="true"/><div className="fc-floating-badge"><span>{event.icon}</span><div><b>{event.name} {service.label} Offer</b><small>{event.theme}</small></div></div></div>
        </div>
      </section>
      <div className="fc-container"><div className={'fc-feature-strip'+(service.key==='construction'?' fc-feature-strip--construction':'')}>
        {(service.key==='construction'?[
          '500+ quality checks',
          '12-year structural warranty',
          'Dedicated engineer supervision',
          'On-time delivery',
          'Branded materials',
          'Implemented as per ISI standards',
        ]:['Hyderabad focused','Scope-based estimates','Material & finish clarity','Written project proposal']).map(item=><span key={item}>{item}</span>)}
      </div></div>
      <section className="fc-intro fc-container">
        <div><p className="fc-overline">MADE FOR YOUR NEXT CHAPTER</p><h2>Celebrate {event.name} with a home plan that lasts beyond the season.</h2></div>
        <div><p>{event.inspiration} Before committing to {service.core}, it helps to separate inspiration from cost, scope and execution decisions. A good project starts with practical choices and a transparent, written proposal.</p><p>Share what matters to your family and how you use your rooms. ProPulse can discuss a brief tailored to your Hyderabad location, property type and preferred timeline with pricing based on the agreed scope and specifications.</p></div>
      </section>
      <section className="fc-plan"><div className="fc-container">
        <div className="fc-section-heading"><p className="fc-overline">SMART PROJECT PLANNING</p><h2>Three things to get right from the start</h2><p>Plan the layout, specifications and execution stages for a home that works every day.</p></div>
        <div className="fc-benefit-grid">{service.benefits.map(([heading,detail],index)=><article key={heading}><span>0{index+1}</span><h3>{heading}</h3><p>{detail}</p></article>)}</div>
      </div></section>
      <section className="fc-container fc-planning"><div><p className="fc-overline">YOUR REQUIREMENT CHECKLIST</p><h2>Get a clearer {service.name.toLowerCase()} quotation</h2><p>Use these points before submitting an enquiry or comparing quotations. Exact scope, taxes, timing and promotions must be agreed in writing.</p><Link to={service.to} className="fc-text-link">{service.action} ↗</Link></div><ol>{service.checklist.map(item=><li key={item}>{item}</li>)}</ol></section>
      <Faq event={event} service={service}/>
      <section className="fc-cta"><div className="fc-container"><p className="fc-overline">YOUR NEXT HOME PROJECT</p><h2>{status==='past'?'Your plans can continue after '+event.name+'.':'This '+event.name+', make a plan worth building.'}</h2><p>Send your Hyderabad project requirements to receive a quotation based on your project scope.</p><div className="fc-actions"><Link className="fc-button fc-button--gold" to={service.to}>Request a project quote ↗</Link><Link className="fc-button fc-button--outline" to="/contact">Talk to ProPulse</Link></div><OfferDisclaimer event={event} service={service}/></div></section>
    </main><PublicFooter/><OccasionWhatsAppButton event={event} service={service}/>
  </div>
}

function FestivalHome({event}){
  useOccasionMotion(event.kind!=='remembrance')
  if(event.kind==='remembrance')return <MemorialHome event={event}/>
  const additional=activeFestivals().filter(item=>item.slug!==event.slug)
  return <div className="fc-page fc-home">
    <PublicHeader/>
    <main>
      <section className="fc-hero fc-hero--home"><div className="fc-home-photo" aria-hidden="true"><img src={constructionImage} alt="" fetchPriority="high"/></div><OccasionArtwork event={event}/><div className="fc-hero-orb fc-hero-orb--one" aria-hidden="true"/><div className="fc-hero-orb fc-hero-orb--two" aria-hidden="true"/>
      <div className="fc-container fc-home-hero"><div className="fc-tags"><span className="fc-year">{event.icon} {event.name} {event.date.slice(0,4)}</span><StatusTag event={event}/></div>
        <p className="fc-eyebrow">PROPULSE CONSTRUCTION SOLUTIONS &amp; INTERIOR SOLUTIONS</p><h1>Celebrate {event.name}. <em>Make space for a new beginning.</em></h1>
        <p className="fc-lead">{event.inspiration} Explore separate construction and interior offers for your Hyderabad home.</p>
        <div className="fc-actions"><Link className="fc-button fc-button--gold" to={festivalPath(event,'construction')}>Explore Construction ↗</Link><Link className="fc-button fc-button--outline" to={festivalPath(event,'interiors')}>Explore Interiors ↗</Link></div><div className="fc-home-offers">{Object.values(CAMPAIGN_SERVICES).map(service=><OfferPanel key={service.key} event={event} service={service}/>)}</div>
        <p className="fc-festival-date">Offer dates: {prettyDate(event.start)} – {prettyDate(event.end)} · Hyderabad, India{event.tentative?' · Date subject to local confirmation':''}</p>
      </div></section>
      {additional.length>0&&<section className="fc-container fc-also" aria-label="Other active festival campaigns"><p className="fc-overline">ALSO CELEBRATING IN HYDERABAD</p><h2>Explore other festival campaigns active today</h2><div className="fc-also-grid">{additional.map(item=><article key={item.slug}><strong>{item.icon} {item.name}</strong><span>{prettyDate(item.date)}</span><div><Link to={festivalPath(item,'construction')}>Construction ↗</Link><Link to={festivalPath(item,'interiors')}>Interiors ↗</Link></div></article>)}</div></section>}
      <section className="fc-container fc-home-options"><div className="fc-section-heading"><p className="fc-overline">TWO WAYS TO START</p><h2>Your home, your next chapter.</h2><p>Choose your project to see festival-themed inspiration, practical planning points and the next step for a quotation.</p></div><div className="fc-card-grid">{Object.values(CAMPAIGN_SERVICES).map(service=><ServiceCard key={service.key} event={event} service={service}/>)}</div></section>
      <section className="fc-container fc-home-principles"><div><b>01</b><h3>Define your requirements</h3><p>Tell us about the plot or rooms and the scope you have in mind.</p></div><div><b>02</b><h3>Discuss specifications</h3><p>Compare materials, finishes, inclusions, exclusions and project stages.</p></div><div><b>03</b><h3>Get a written proposal</h3><p>Review the offer, inclusions and exclusions before you commit.</p></div></section>
      <section className="fc-cta"><div className="fc-container"><p className="fc-overline">EXPLORE PROPULSE</p><h2>A celebration today. A home planned for years.</h2><p>Construction, interiors and technology support from one ProPulse platform.</p><div className="fc-actions"><Link className="fc-button fc-button--gold" to="/quote">Start your project ↗</Link><Link className="fc-button fc-button--outline" to="/offers">See upcoming festivals</Link></div><OfferDisclaimer event={event}/></div></section>
  </main><PublicFooter/><OccasionWhatsAppButton event={event}/>
  </div>
}

export function FestivalHub(){
  useOccasionMotion()
  const [filter,setFilter]=useState('all')
  const [search,setSearch]=useState('')
  const today=indiaToday()
  const events=useMemo(()=>FESTIVAL_EVENTS.filter(event=>(filter==='all'||campaignStatus(event,today)===filter)&&[event.name,event.theme,event.date].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[filter,today,search])
  return <div className="fc-page"><PublicHeader/><main>
    <section className="fc-hub-hero"><div className="fc-container"><nav aria-label="Breadcrumb" className="fc-breadcrumb"><Link to="/">Home</Link><span>/</span>Festivals and important dates</nav><p className="fc-eyebrow">PROPULSE · HYDERABAD</p><h1>Festivals and important dates. <em>A year to remember.</em></h1><p>Explore cultural festivals, national days and remembrance observances for Hyderabad. Each has two distinct pages for Construction and Interiors. Memorial pages are respectful, non-commercial tributes.</p></div></section>
    <section className="fc-container fc-hub-list"><div className="fc-hub-heading"><div><p className="fc-overline">FESTIVALS & IMPORTANT DATES</p><h2>November 2026 – November 2027 · {FESTIVAL_EVENTS.length} occasions</h2></div><div className="fc-filters" role="group" aria-label="Filter campaigns">{[['all','All dates'],['active','Live'],['upcoming','Upcoming'],['past','Ended']].map(([value,label])=><button type="button" key={value} className={filter===value?'selected':''} onClick={()=>setFilter(value)} aria-pressed={filter===value}>{label}</button>)}</div></div>
    <div className="fc-search-row"><label htmlFor="festival-search">Find a festival or important date<input id="festival-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Diwali, Ugadi or 2027-01…"/></label><p role="status">{events.length} {events.length===1?'occasion':'occasions'} found</p></div>
    <div className="fc-hub-grid">{events.map(event=><article key={event.slug} className="fc-event-card"><div className="fc-event-top"><span className="fc-event-icon">{event.icon}</span><StatusTag event={event}/></div><h3>{event.name} <small>{event.date.slice(0,4)}</small></h3><p className="fc-event-date">{event.tentative?'Indicative: ':''}{prettyDate(event.date)}</p><p className="fc-window">Featured {prettyDate(event.start)}–{prettyDate(event.end)}</p><p>{event.inspiration}</p>{event.kind!=='remembrance'&&<p className="fc-calendar-offer">Construction benefits up to ₹5 lakh · Interiors 10% off</p>}<div className="fc-event-links"><Link to={festivalPath(event,'construction')}>Construction ↗</Link><Link to={festivalPath(event,'interiors')}>Interiors ↗</Link></div></article>)}</div>
    {events.length===0&&<div className="fc-empty"><h3>No matching dates</h3><p>Try another name or reset the filters to browse the full calendar.</p><button type="button" className="fc-button fc-button--dark" onClick={()=>{setFilter('all');setSearch('')}}>Reset filters</button></div>}
    <p className="fc-terms">All dates use India Standard Time (Hyderabad). Remembrance pages carry no sales promotions. Moon-dependent and region-specific observances can change. Published campaigns do not imply an automatic discount; written quotation terms apply.</p>
    </section>
  </main><PublicFooter/><OccasionWhatsAppButton event={{name:'Website enquiry'}}/></div>
}

export default function FestiveLanding({homeMode=false,event:homeEvent=null}){
  const {festivalSlug,serviceSlug}=useParams()
  const event=homeMode?(homeEvent||activeFestival()):festivalBySlug(festivalSlug)
  if(!event)return <Navigate to={homeMode?'/':'/offers'} replace/>
  if(homeMode)return <FestivalHome event={event}/>
  const service=CAMPAIGN_SERVICES[serviceSlug]
  if(!service)return <Navigate to="/offers" replace/>
  return <SingleOffer event={event} service={service}/>
}
