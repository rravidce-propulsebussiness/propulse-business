import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {publicRequest} from '../utils/auth'
import {openLeadPopup} from '../utils/leadPopup'
import {PublicFooter,PublicHeader} from '../components/PublicSiteChrome'
import './About.css'

const HERO='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1550&q=86'
const BACKGROUND='https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1150&q=84'

const services=[
  {key:'construction',number:'01',name:'Construction',title:'Build your home',description:'Define your plot, scope, budget and preferences before starting conversations with builders.',link:'/quote#construction'},
  {key:'interiors',number:'02',name:'Interiors',title:'Design your space',description:'Organise rooms, styles, materials and budget into one clear interior requirement.',link:'/quote#interiors'},
  {key:'property',number:'03',name:'Real Estate',title:'Find the right property',description:'Explain what you want to buy or sell with the location and details that matter.',link:'/quote#property'},
]

const steps=[
  {number:'01',title:'Tell us what you need',description:'Share your project type, location, budget and important details.'},
  {number:'02',title:'Explore the possibilities',description:'Review helpful information, packages and professional portfolios.'},
  {number:'03',title:'Move ahead with clarity',description:'Discuss your brief with suitable businesses and compare their actual proposals.'},
]

function Arrow({size=18}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>
}

export default function About(){
  const [contact,setContact]=useState({})
  useEffect(()=>{
    let active=true
    publicRequest('/contact?audience=website')
      .then(data=>{if(active)setContact(data||{})})
      .catch(()=>{})
    return()=>{active=false}
  },[])

  const phone=contact.phone||contact.phone_number||contact.mobile||''
  const email=contact.email||contact.support_email||''

  return <main className="ab-page">
    <PublicHeader/>
    <section className="ab-hero" aria-labelledby="ab-page-title">
      <div className="ab-wrap ab-hero-layout">
        <div className="ab-hero-content">
          <span className="ab-eyebrow"><span className="ab-eyebrow-line"/> ABOUT PROPULSE</span>
          <h1 id="ab-page-title">Better spaces start with <em>clearer decisions.</em></h1>
          <p>ProPulse makes it easier to plan construction, interiors and property requirements, understand your options and connect with relevant professionals.</p>
          <div className="ab-actions">
            <button type="button" className="ab-primary" onClick={()=>openLeadPopup('')}>Start Your Project <Arrow/></button>
            <Link className="ab-text-link" to="/how-it-works">How it works <Arrow size={16}/></Link>
          </div>
          <div className="ab-hero-note"><span aria-hidden="true">✓</span> Your project, your priorities, your choice.</div>
        </div>
        <div className="ab-hero-visual">
          <img src={HERO} alt="Modern home architecture, illustrating the kind of spaces homeowners can plan" fetchPriority="high"/>
          <div className="ab-image-label"><span className="ab-label-mark" aria-hidden="true"/> PLAN BETTER. BUILD WITH CLARITY.</div>
        </div>
      </div>
    </section>

    <section className="ab-offerings ab-section" aria-labelledby="ab-offerings-heading">
      <div className="ab-wrap">
        <div className="ab-section-head">
          <div><span className="ab-eyebrow">WHAT WE HELP WITH</span><h2 id="ab-offerings-heading">One place to start. <em>Three clear paths.</em></h2></div>
          <p>Whatever your next space looks like, start with a requirement that makes sense.</p>
        </div>
        <div className="ab-service-grid">
          {services.map(item=><Link to={item.link} className="ab-service-card" key={item.key}>
            <span className="ab-service-number">{item.number} / {item.name}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span className="ab-card-link">Explore {item.name} <Arrow size={16}/></span>
          </Link>)}
        </div>
      </div>
    </section>

    <section className="ab-approach ab-section" aria-labelledby="ab-approach-heading">
      <div className="ab-wrap">
        <div className="ab-section-head ab-section-head--center">
          <span className="ab-eyebrow">A SIMPLER APPROACH</span>
          <h2 id="ab-approach-heading">Less confusion. <em>More clarity.</em></h2>
          <p>From an early idea to your next conversation, know what to do next.</p>
        </div>
        <div className="ab-steps">
          {steps.map(item=><article className="ab-step" key={item.number}>
            <span className="ab-step-number">{item.number}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section className="ab-background ab-section" aria-labelledby="ab-background-heading">
      <div className="ab-wrap ab-background-layout">
        <div className="ab-background-photo">
          <img src={BACKGROUND} alt="Illustrative example of a thoughtfully designed home interior" loading="lazy"/>
        </div>
        <div className="ab-background-content">
          <span className="ab-eyebrow">OUR BACKGROUND</span>
          <h2 id="ab-background-heading">Grounded in real-world <em>project experience.</em></h2>
          <p>Our approach draws on hands-on residential construction and interior execution experience in Hyderabad.</p>
          <p>That background shapes how ProPulse asks the right questions about scope, location, materials and budgets—so project conversations start with better information.</p>
          <div className="ab-background-tags"><span>Construction</span><span>Interiors</span><span>Hyderabad roots</span></div>
        </div>
      </div>
    </section>

    <section className="ab-closing" aria-labelledby="ab-closing-heading">
      <div className="ab-wrap ab-closing-inner">
        <div><span className="ab-eyebrow">LET'S GET STARTED</span><h2 id="ab-closing-heading">Ready to take the next step?</h2><p>Tell us what you're planning. We'll help you put the details in order.</p></div>
        <div className="ab-closing-actions"><button type="button" className="ab-primary" onClick={()=>openLeadPopup('')}>Share Your Requirement <Arrow/></button><Link to="/experts">Browse Professionals <Arrow size={16}/></Link></div>
      </div>
    </section>
    <PublicFooter phone={phone} email={email}/>
  </main>
}
