import {Link, Navigate, useParams} from 'react-router-dom'
import {CONSTRUCTION_PACKAGE_CATALOG} from '../data/constructionPackageCatalog'
import {districtBySlug,districtPath,stateBySlug} from '../seo/regionalSeo'
import './RegionalSeoLanding.css'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'

function Header(){ return <PublicHeader/> }
function Footer(){ return <PublicFooter/> }

function PackageCards({districtName=''}) {
  const packages=Object.values(CONSTRUCTION_PACKAGE_CATALOG)
  const rupees=value=>'₹'+Number(value||0).toLocaleString('en-IN')
  return <section className="regional-packages">
    <div className="regional-section-title"><span>CONSTRUCTION PACKAGES</span><h2>{districtName?'Package starting points for '+districtName:'Compare construction package starting points'}</h2><p>Package rates are planning references. Final pricing depends on drawings, built-up area, site conditions, selected materials, taxes and exclusions.</p></div>
    <div className="regional-package-grid">
      {packages.map(item=><article key={item.key} className={item.key==='premium'?'featured':''}>
        <span>{item.name.toUpperCase()}</span><strong>{rupees(item.rate)}</strong><small>reference rate / sq ft</small>
        <p>{item.specs?.Architecture||'Construction package specifications apply.'}</p>
        <ul>{Object.values(item.specs||{}).slice(0,3).map((value,index)=><li key={index}>{String(value)}</li>)}</ul>
        <Link to={'/quote?package='+item.key+'#construction'}>Get {item.name} Quote</Link>
      </article>)}
    </div>
  </section>
}

function StateHub({state}){
  return <main className="regional-page">
    <Header/>
    <section className="regional-hero">
      <div className="regional-breadcrumb"><Link to="/">Home</Link><span>›</span><b>{state.name}</b><span>›</span><b>Construction</b></div>
      <span className="regional-eyebrow">{state.districtCount} DISTRICTS · DISTRICT-WISE CONSTRUCTION</span>
      <h1>{state.heading}</h1><p>{state.summary}</p>
      <div className="regional-actions"><Link className="primary" to="/quote?package=standard#construction">Get Construction Quote</Link><Link className="secondary" to="/packages#construction">View Packages</Link></div>
      <div className="regional-trust"><span>District-specific landing pages</span><span>Package comparison</span><span>Structured quote flow</span></div>
    </section>

    <section className="regional-district-index">
      <div className="regional-section-title"><span>CHOOSE YOUR DISTRICT</span><h2>Construction companies, builders and quotes by district</h2><p>Select the district where your site is located. Each page gives you major-area prompts, package references and a consistent construction-partner comparison checklist.</p></div>
      <div className="regional-district-grid">{state.districts.map(item=><Link key={item.slug} to={districtPath(state.slug,item.slug)}><span>{item.region}</span><b>{item.name}</b><small>{item.centers.join(' · ')}</small><em>Open district construction page →</em></Link>)}</div>
    </section>

    <PackageCards/>

    <section className="regional-guides">
      <div className="regional-section-title"><span>HOME CONSTRUCTION GUIDES</span><h2>Research materials, quality and contractor selection before you build</h2><p>These guides answer common construction questions that apply across districts, then link back into project-specific quote flows.</p></div>
      <div className="regional-guide-grid">
        <Link to="/guides/best-steel-for-house-construction">Best steel for house construction</Link>
        <Link to="/guides/prevent-cracks-in-house">Precautions to reduce cracks in a new house</Link>
        <Link to="/guides/choose-construction-contractor-hyderabad">How to choose a construction contractor</Link>
        <Link to="/guides/home-construction-checklist">Home construction checklist</Link>
        <Link to="/guides/waterproofing-precautions-new-house">Waterproofing precautions</Link>
        <Link to="/guides/2bhk-interiors-hyderabad">2BHK interior planning guide</Link>
        <Link to="/guides/best-cement-for-house-construction">Best cement for house construction</Link>
        <Link to="/guides/m-sand-vs-river-sand-house-construction">M-sand vs river sand</Link>
        <Link to="/guides/soil-test-before-house-construction">Soil test before construction</Link>
        <Link to="/guides/electrical-planning-new-house">Electrical planning for a new house</Link>
        <Link to="/guides">Browse all construction guides</Link>
      </div>
    </section>

    <section className="regional-process">
      <div className="regional-section-title"><span>COMPARE CONSISTENTLY</span><h2>Use one scope across every construction company you review</h2></div>
      <div className="regional-process-grid">
        <article><b>01</b><h3>Fix site and built-up area</h3><p>Share the exact location, plot details, expected built-up area and number of floors.</p></article>
        <article><b>02</b><h3>Choose specification level</h3><p>Use the same package or material expectations for every quotation.</p></article>
        <article><b>03</b><h3>Compare complete scope</h3><p>Review structural work, materials, exclusions, approvals, timelines and payment stages.</p></article>
        <article><b>04</b><h3>Verify before proceeding</h3><p>Check relevant project work, written terms, responsibilities and final commercial scope.</p></article>
      </div>
    </section>

    <section className="regional-cta"><span>{state.name.toUpperCase()}</span><h2>Start your construction requirement</h2><p>Choose the closest package starting point, add your district and site details, then compare project-specific responses.</p><Link to="/quote?package=standard#construction">Get Construction Quote</Link></section>
  <Footer/></main>
}

function DistrictPage({state,district}){
  const searches=[
    'construction company in '+district.name,
    'builders in '+district.name,
    'construction contractors in '+district.name,
    'home construction in '+district.name,
    'house construction company in '+district.name,
    'construction services in '+district.name+' district',
    ...district.centers.flatMap(center=>[
      'construction in '+center,
      'construction company in '+center,
    ]),
  ]
  const faqs=[
    {q:'How do I get construction quotes in '+district.name+' district?',a:'Share the site location, built-up area, floors, project type, budget and preferred timeline. Use the same brief when reviewing different construction businesses.'},
    {q:'How do I compare builders in '+district.name+'?',a:'Compare relevant completed work, material specifications, exclusions, milestone payments, timeline, warranty terms and the final written scope rather than only the headline rate.'},
    {q:'Can I select a construction package before requesting a quote?',a:'Yes. Use Standard, Premium or Royal package references as a starting point, then confirm the site-specific specification and final quotation with the business you choose.'},
  ]
  return <main className="regional-page district-page">
    <Header/>
    <section className="regional-hero district-hero">
      <div className="regional-breadcrumb"><Link to="/">Home</Link><span>›</span><Link to={'/'+state.slug+'/construction'}>{state.name}</Link><span>›</span><b>{district.name}</b></div>
      <span className="regional-eyebrow">{district.region.toUpperCase()} · {state.name.toUpperCase()}</span>
      <h1>Construction in {district.name} district</h1>
      <p>Looking for construction companies, builders or contractors in {district.name}? Start with one site-specific brief, compare package levels and review project-specific quotations against the same scope.</p>
      <div className="regional-actions"><Link className="primary" to="/quote?package=standard#construction">Get Construction Quote</Link><Link className="secondary" to="/packages#construction">Compare Packages</Link></div>
      <div className="regional-trust"><span>{district.name} district requirement</span><span>Major-area prompts</span><span>Relevant business discovery</span></div>
    </section>

    <section className="regional-centers">
      <div className="regional-section-title"><span>MAJOR AREAS TO SPECIFY</span><h2>Where is your construction site in {district.name}?</h2><p>District-level searches are broad. Add the exact town, mandal, locality, PIN code or site pin in the quote flow so businesses understand the real project location.</p></div>
      <div className="regional-center-grid">{district.centers.map(name=><article key={name}><span>AREA</span><b>{name}</b><p>Add the exact site, plot dimensions, built-up area, floors and preferred start timeline.</p></article>)}</div>
    </section>

    <PackageCards districtName={district.name}/>

    <section className="regional-partner">
      <div className="regional-section-title"><span>FIND THE RIGHT CONSTRUCTION PARTNER</span><h2>How to compare construction companies in {district.name}</h2></div>
      <div className="regional-process-grid">
        <article><b>01</b><h3>Same drawings and area</h3><p>Keep built-up area, floor count and structural drawings consistent across quotes.</p></article>
        <article><b>02</b><h3>Same material assumptions</h3><p>Compare cement, steel, masonry, flooring, doors, windows, electrical and plumbing allowances.</p></article>
        <article><b>03</b><h3>Check exclusions</h3><p>Confirm approvals, external works, utility connections, compound walls and other excluded items.</p></article>
        <article><b>04</b><h3>Review contract terms</h3><p>Compare milestones, variation pricing, completion expectations, warranties and handover scope.</p></article>
      </div>
      <div className="regional-partner-actions"><Link to="/experts">Find ProPulse Professionals</Link><Link to="/quote?package=standard#construction">Create Construction Requirement</Link></div>
    </section>

    <section className="regional-searches">
      <div className="regional-section-title"><span>DISTRICT SEARCH INTENT</span><h2>Construction searches around {district.name}</h2><p>These are closely related ways customers search for the same underlying project need. Use one clear site-specific requirement rather than comparing generic claims.</p></div>
      <div>{searches.map(term=><span key={term}>{term}</span>)}</div>
    </section>

    <section className="regional-guides">
      <div className="regional-section-title"><span>CONSTRUCTION KNOWLEDGE</span><h2>Useful guides before choosing materials or a contractor</h2></div>
      <div className="regional-guide-grid">
        <Link to="/guides/best-steel-for-house-construction">Best steel for house construction</Link>
        <Link to="/guides/prevent-cracks-in-house">How to reduce cracks in a new house</Link>
        <Link to="/guides/choose-construction-contractor-hyderabad">How to compare construction contractors</Link>
        <Link to="/guides/home-construction-checklist">Home construction checklist</Link>
        <Link to="/guides/waterproofing-precautions-new-house">Waterproofing precautions</Link>
        <Link to="/guides/best-cement-for-house-construction">Best cement for house construction</Link>
        <Link to="/guides/m-sand-vs-river-sand-house-construction">M-sand vs river sand</Link>
        <Link to="/guides/soil-test-before-house-construction">Soil test before construction</Link>
        <Link to="/guides">Browse all construction guides</Link>
      </div>
    </section>

    <section className="regional-nearby-districts">
      <div className="regional-section-title"><span>OTHER {state.name.toUpperCase()} DISTRICTS</span><h2>Explore construction pages across {state.name}</h2></div>
      <div>{state.districts.filter(item=>item.slug!==district.slug).slice(0,8).map(item=><Link key={item.slug} to={districtPath(state.slug,item.slug)}>{item.name}</Link>)}<Link to={'/'+state.slug+'/construction'}>View all {state.districtCount} districts</Link></div>
    </section>

    <section className="regional-faq">
      <div className="regional-section-title"><span>FAQ</span><h2>Construction in {district.name}: common questions</h2></div>
      <div>{faqs.map(item=><article key={item.q}><h3>{item.q}</h3><p>{item.a}</p></article>)}</div>
    </section>

    <section className="regional-cta"><span>{district.name.toUpperCase()} · {state.name.toUpperCase()}</span><h2>Start your district-specific construction requirement</h2><p>Add the exact site and project scope, choose a package starting point and compare relevant responses consistently.</p><Link to="/quote?package=standard#construction">Get Construction Quote</Link></section>
  <Footer/></main>
}

export default function RegionalSeoLanding(){
  const {stateSlug,districtSlug}=useParams()
  const state=stateBySlug(stateSlug)
  if(!state)return <Navigate to="/" replace/>
  if(!districtSlug)return <StateHub state={state}/>
  const district=districtBySlug(stateSlug,districtSlug)
  if(!district)return <Navigate to={'/'+state.slug+'/construction'} replace/>
  return <DistrictPage state={state} district={district}/>
}
