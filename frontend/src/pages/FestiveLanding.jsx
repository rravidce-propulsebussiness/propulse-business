import {useMemo,useState} from 'react'
import {Link,Navigate,useParams} from 'react-router-dom'
import {PublicHeader,PublicFooter} from '../components/PublicSiteChrome'
import {activeFestival,activeFestivals,campaignStatus,CAMPAIGN_SERVICES,FESTIVAL_EVENTS,festivalBySlug,festivalPath,indiaToday} from '../seo/festiveCampaigns'
import './FestiveLanding.css'

const prettyDate=value=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(value+'T12:00:00+05:30'))
const constructionImage='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=84'
const interiorsImage='https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=84'

function OfferDisclaimer({event}){
  return <p className="fc-terms">Campaign window: {prettyDate(event.start)}–{prettyDate(event.end)} (Hyderabad/IST). {event.tentative?'Festival observance is provisional and may vary with moon sighting or local temple schedules. ':''}Promotional pricing or inclusions apply only when expressly confirmed in a written ProPulse quotation. No fixed discount or free service is implied.</p>
}

function StatusTag({event}){
  const status=campaignStatus(event)
  return <span className={'fc-status fc-status--'+status}>{event.kind==='remembrance'?(status==='active'?'Remembrance today':status==='upcoming'?'Upcoming remembrance':'Observance completed'):(status==='active'?'Festival campaign live':status==='upcoming'?'Coming up': 'Campaign window finished')}</span>
}

function ServiceCard({event,service,compact=false}){
  const image=service.key==='construction'?constructionImage:interiorsImage
  return <article className={'fc-service-card'+(compact?' fc-service-card--compact':'')}>
    <div className="fc-service-image"><img src={image} alt={service.key==='construction'?'Modern family home exterior for construction planning':'Warm modern living room for interior design inspiration'} loading="lazy"/><span>{service.label}</span></div>
    <div className="fc-service-copy"><p className="fc-overline">PROPULSE {service.label.toUpperCase()}</p>
      <h3>{event.name} {service.title}</h3>
      <p>{service.key==='construction'?'Begin with your plot, estimate, material choices and a detailed construction scope.':'Explore room-wise design, modular kitchen, wardrobes, lighting and finishes that work for your household.'}</p>
      <Link to={festivalPath(event,service.key)} className="fc-card-link">Explore {service.label.toLowerCase()} campaign <span aria-hidden="true">↗</span></Link>
    </div>
  </article>
}

function Faq({event,service}){
  return <section className="fc-faq fc-container" aria-label="Frequently asked questions">
    <p className="fc-overline">GOOD TO KNOW</p>
    <h2>Questions about the {event.name} {service.name.toLowerCase()} campaign</h2>
    <div className="fc-faq-grid">
      <details open><summary>{service.question}</summary><p>{service.answer}</p></details>
      <details><summary>Is a discount automatically applied during {event.name}?</summary><p>No. Package discounts, availability and additional inclusions are not guaranteed. Any current promotion and its eligibility must be confirmed by ProPulse in your written quotation.</p></details>
      <details><summary>Can I request a quote after the festival?</summary><p>Yes. You can still submit a project requirement when the campaign period has ended. The team will review current scope, pricing and availability.</p></details>
      <details><summary>Does ProPulse work in Hyderabad?</summary><p>ProPulse discusses selected home construction and interior execution projects in Hyderabad, subject to location, scope and availability confirmation. You can also explore independent professionals on the platform.</p></details>
    </div>
  </section>
}


function MemorialLanding({event,service}){
  const other=CAMPAIGN_SERVICES[service.key==='construction'?'interiors':'construction']
  return <div className="fc-page fc-memorial"><PublicHeader/><main>
    <section className="fc-memorial-hero"><div className="fc-container">
      <nav className="fc-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/offers">Occasions and commemorations</Link><span>/</span>{event.name} · {service.label}</nav>
      <p className="fc-memorial-overline">IN RESPECTFUL REMEMBRANCE · HYDERABAD</p>
      <h1>{event.icon} {event.name} <span>{event.date.slice(0,4)}</span></h1>
      <p className="fc-memorial-lead">{event.inspiration}</p>
      <p className="fc-memorial-date">Observed {prettyDate(event.date)} · Displayed {prettyDate(event.start)}–{prettyDate(event.end)} (IST)</p>
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
  </main><PublicFooter/></div>
}

function MemorialHome({event}){
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
      <p className="fc-memorial-date">Homepage remembrance: {prettyDate(event.start)}–{prettyDate(event.end)} (IST).</p>
    </section>
  </main><PublicFooter/></div>
}

function SingleOffer({event,service}){
  if(event.kind==='remembrance')return <MemorialLanding event={event} service={service}/>
  const status=campaignStatus(event)
  const other=CAMPAIGN_SERVICES[service.key==='construction'?'interiors':'construction']
  return <div className="fc-page">
    <PublicHeader/>
    <main>
      <section className={'fc-hero fc-hero--'+service.key}>
        <div className="fc-hero-orb fc-hero-orb--one" aria-hidden="true"/><div className="fc-hero-orb fc-hero-orb--two" aria-hidden="true"/>
        <div className="fc-container fc-hero-grid">
          <div className="fc-hero-content">
            <nav aria-label="Breadcrumb" className="fc-breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/offers">Festival offers</Link><span>/</span><span>{event.name} · {service.label}</span></nav>
            <div className="fc-tags"><span className="fc-year">{event.icon} {event.name} {event.date.slice(0,4)}</span><StatusTag event={event}/></div>
            <p className="fc-eyebrow">CELEBRATE NEW POSSIBILITIES · HYDERABAD</p>
            <h1>{event.name} {service.name} <em>Festival Special</em></h1>
            <p className="fc-lead">{event.inspiration} ProPulse helps Hyderabad homeowners turn ideas into a measurable {service.name.toLowerCase()} project brief.</p>
            <div className="fc-actions"><Link className="fc-button fc-button--gold" to={service.to}>{service.action} <span aria-hidden="true">↗</span></Link><Link className="fc-button fc-button--outline" to="/packages">View packages</Link></div>
            <p className="fc-festival-date">{event.tentative?'Indicative date / season: ':'Festival date: '}{prettyDate(event.date)} <span>•</span> Timings in India Standard Time</p>
          </div>
          <div className="fc-hero-visual"><img src={service.key==='construction'?constructionImage:interiorsImage} alt={service.key==='construction'?'Modern residential house in warm evening light':'Elegant warm contemporary living space'} fetchPriority="high"/><div className="fc-visual-shine" aria-hidden="true"/><div className="fc-floating-badge"><span>{event.icon}</span><div><b>Festival season</b><small>{event.theme}</small></div></div></div>
        </div>
      </section>
      <div className="fc-container"><div className="fc-feature-strip"><span>Hyderabad focused</span><span>Scope-based estimates</span><span>Material &amp; finish clarity</span><span>Written project proposal</span></div></div>
      <section className="fc-intro fc-container">
        <div><p className="fc-overline">MADE FOR YOUR NEXT CHAPTER</p><h2>Celebrate {event.name} with a home plan that lasts beyond the season.</h2></div>
        <div><p>{event.inspiration} Before committing to {service.core}, it helps to separate inspiration from cost, scope and execution decisions. A good project starts with practical choices and a transparent, written proposal.</p><p>Share what matters to your family and how you use your rooms. ProPulse can discuss a brief tailored to your Hyderabad location, property type and preferred timeline without promising a standard price for every project.</p></div>
      </section>
      <section className="fc-plan"><div className="fc-container">
        <div className="fc-section-heading"><p className="fc-overline">SMART PROJECT PLANNING</p><h2>Three things to get right from the start</h2><p>More than decorations and festive colours: plan what makes the project work day after day.</p></div>
        <div className="fc-benefit-grid">{service.benefits.map(([heading,detail],index)=><article key={heading}><span>0{index+1}</span><h3>{heading}</h3><p>{detail}</p></article>)}</div>
      </div></section>
      <section className="fc-container fc-planning"><div><p className="fc-overline">YOUR REQUIREMENT CHECKLIST</p><h2>Get a clearer {service.name.toLowerCase()} quotation</h2><p>Use these points before submitting an enquiry or comparing quotations. Exact scope, taxes, timing and promotions must be agreed in writing.</p><Link to={service.to} className="fc-text-link">{service.action} ↗</Link></div><ol>{service.checklist.map(item=><li key={item}>{item}</li>)}</ol></section>
      <section className="fc-cross-promo fc-container"><div><span>{event.icon} {event.name} inspiration</span><h2>Planning {other.name.toLowerCase()} too?</h2><p>Explore a separately tailored page for {other.core}.</p></div><Link to={festivalPath(event,other.key)} className="fc-button fc-button--dark">Explore {other.label} ↗</Link></section>
      <Faq event={event} service={service}/>
      <section className="fc-cta"><div className="fc-container"><p className="fc-overline">YOUR NEXT HOME PROJECT</p><h2>{status==='past'?'Your plans can continue after '+event.name+'.':'This '+event.name+', make a plan worth building.'}</h2><p>Send your Hyderabad project requirements to get a scope-based conversation started.</p><div className="fc-actions"><Link className="fc-button fc-button--gold" to={service.to}>Request a project quote ↗</Link><Link className="fc-button fc-button--outline" to="/contact">Talk to ProPulse</Link></div><OfferDisclaimer event={event}/></div></section>
    </main><PublicFooter/>
  </div>
}

function FestivalHome({event}){
  if(event.kind==='remembrance')return <MemorialHome event={event}/>
  const additional=activeFestivals().filter(item=>item.slug!==event.slug)
  return <div className="fc-page fc-home">
    <PublicHeader/>
    <main>
      <section className="fc-hero fc-hero--home"><div className="fc-hero-orb fc-hero-orb--one" aria-hidden="true"/><div className="fc-hero-orb fc-hero-orb--two" aria-hidden="true"/>
      <div className="fc-container fc-home-hero"><div className="fc-tags"><span className="fc-year">{event.icon} {event.name} {event.date.slice(0,4)}</span><StatusTag event={event}/></div>
        <p className="fc-eyebrow">PROPULSE CONSTRUCTION SOLUTIONS &amp; INTERIOR SOLUTIONS</p><h1>Celebrate {event.name}. <em>Make space for a new beginning.</em></h1>
        <p className="fc-lead">{event.inspiration} Explore our festival-season construction and interior planning pages, created for Hyderabad homeowners.</p>
        <div className="fc-actions"><Link className="fc-button fc-button--gold" to={festivalPath(event,'construction')}>Explore Construction ↗</Link><Link className="fc-button fc-button--outline" to={festivalPath(event,'interiors')}>Explore Interiors ↗</Link></div>
        <p className="fc-festival-date">Homepage runs {prettyDate(event.start)}–{prettyDate(event.end)} (2 days before + festival day) · Hyderabad, India{event.tentative?' · Date subject to local confirmation':''}</p>
      </div></section>
      {additional.length>0&&<section className="fc-container fc-also" aria-label="Other active festival campaigns"><p className="fc-overline">ALSO CELEBRATING IN HYDERABAD</p><h2>Explore other festival campaigns active today</h2><div className="fc-also-grid">{additional.map(item=><article key={item.slug}><strong>{item.icon} {item.name}</strong><span>{prettyDate(item.date)}</span><div><Link to={festivalPath(item,'construction')}>Construction ↗</Link><Link to={festivalPath(item,'interiors')}>Interiors ↗</Link></div></article>)}</div></section>}
      <section className="fc-container fc-home-options"><div className="fc-section-heading"><p className="fc-overline">TWO WAYS TO START</p><h2>Your home, your next chapter.</h2><p>Choose your project to see festival-themed inspiration, practical planning points and the next step for a quotation.</p></div><div className="fc-card-grid">{Object.values(CAMPAIGN_SERVICES).map(service=><ServiceCard key={service.key} event={event} service={service}/>)}</div></section>
      <section className="fc-container fc-home-principles"><div><b>01</b><h3>Define your requirements</h3><p>Tell us about the plot or rooms and the scope you have in mind.</p></div><div><b>02</b><h3>Discuss specifications</h3><p>Compare materials, finishes, inclusions, exclusions and project stages.</p></div><div><b>03</b><h3>Get a written proposal</h3><p>Promotional terms, if any, are confirmed before you commit.</p></div></section>
      <section className="fc-cta"><div className="fc-container"><p className="fc-overline">EXPLORE PROPULSE</p><h2>A celebration today. A home planned for years.</h2><p>Construction, interiors and technology support from one ProPulse platform.</p><div className="fc-actions"><Link className="fc-button fc-button--gold" to="/quote">Start your project ↗</Link><Link className="fc-button fc-button--outline" to="/offers">See upcoming festivals</Link></div><OfferDisclaimer event={event}/></div></section>
    </main><PublicFooter/>
  </div>
}

export function FestivalHub(){
  const [filter,setFilter]=useState('all')
  const today=indiaToday()
  const events=useMemo(()=>FESTIVAL_EVENTS.filter(event=>filter==='all'||campaignStatus(event,today)===filter),[filter,today])
  return <div className="fc-page"><PublicHeader/><main>
    <section className="fc-hub-hero"><div className="fc-container"><nav aria-label="Breadcrumb" className="fc-breadcrumb"><Link to="/">Home</Link><span>/</span>Festivals and important dates</nav><p className="fc-eyebrow">PROPULSE · HYDERABAD</p><h1>Festivals and important dates. <em>A year to remember.</em></h1><p>Explore cultural festivals, national days and remembrance observances for Hyderabad. Each has two distinct pages for Construction and Interiors. Memorial pages are respectful, non-commercial tributes.</p></div></section>
    <section className="fc-container fc-hub-list"><div className="fc-hub-heading"><div><p className="fc-overline">FESTIVALS & IMPORTANT DATES</p><h2>November 2026 – November 2027 · {FESTIVAL_EVENTS.length} occasions</h2></div><div className="fc-filters" role="group" aria-label="Filter campaigns">{[['all','All dates'],['active','Live'],['upcoming','Upcoming']].map(([value,label])=><button type="button" key={value} className={filter===value?'selected':''} onClick={()=>setFilter(value)} aria-pressed={filter===value}>{label}</button>)}</div></div>
    <div className="fc-hub-grid">{events.map(event=><article key={event.slug} className="fc-event-card"><div className="fc-event-top"><span className="fc-event-icon">{event.icon}</span><StatusTag event={event}/></div><h3>{event.name} <small>{event.date.slice(0,4)}</small></h3><p className="fc-event-date">{event.tentative?'Indicative: ':''}{prettyDate(event.date)}</p><p className="fc-window">Featured {prettyDate(event.start)}–{prettyDate(event.end)}</p><p>{event.inspiration}</p><div className="fc-event-links"><Link to={festivalPath(event,'construction')}>Construction ↗</Link><Link to={festivalPath(event,'interiors')}>Interiors ↗</Link></div></article>)}</div>
    {events.length===0&&<p>No campaign in this group. Browse all dates to explore the calendar.</p>}
    <p className="fc-terms">Celebrations and important dates use Hyderabad/IST. Memorial pages carry no sales promotions. Festival dates use Hyderabad/IST. Moon-dependent and region-specific observances can change. Published campaigns do not imply an automatic discount; written quotation terms apply.</p>
    </section>
  </main><PublicFooter/></div>
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
