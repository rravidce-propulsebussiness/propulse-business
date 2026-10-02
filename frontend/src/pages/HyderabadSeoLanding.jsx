import {Link, Navigate, useParams} from 'react-router-dom'
import {
  HYDERABAD_CITY_SEO_ROUTE,
  HYDERABAD_LOCALITIES,
  comparisonByService,
  hyderabadSeoEntry,
  localityBySlug,
  localityGroups,
  localityPagePath,
  localitySeoEntry,
  nearbyLocalities,
  serviceBySlug,
} from '../seo/hyderabadSeo'
import './HyderabadSeoLanding.css'

function quoteRoute(service){
  return '/quote#'+service.quoteHash
}

function Header(){
  return <header className="local-seo-header">
    <Link className="local-seo-logo" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse Business"/></Link>
    <nav>
      <Link to="/">Home</Link><Link to="/hyderabad">Hyderabad</Link><Link to="/quote">Get Quote</Link>
      <Link to="/experts">Find Professionals</Link><Link to="/projects">Projects</Link><Link to="/packages">Packages</Link><Link to="/contact">Contact</Link>
    </nav>
    <Link className="local-seo-pro" to="/professionals">For Professionals</Link>
  </header>
}

function CityHubPage(){
  const services=['construction','interior-designers','real-estate'].map(serviceBySlug)
  const construction=serviceBySlug('construction')
  return <main className="local-seo-page city-hub-page">
    <Header/>
    <section className="local-seo-hero">
      <div className="local-seo-breadcrumb"><Link to="/">Home</Link><span>›</span><b>Hyderabad</b></div>
      <span className="local-seo-eyebrow">HYDERABAD · TELANGANA</span>
      <h1>{HYDERABAD_CITY_SEO_ROUTE.heading}</h1>
      <p>{HYDERABAD_CITY_SEO_ROUTE.summary}</p>
      <div className="local-seo-actions"><Link className="primary" to="/quote">Start a Requirement</Link><Link className="secondary" to="/experts">Find Professionals</Link></div>
      <div className="local-seo-trust"><span>Locality-aware requirements</span><span>Construction, interiors & property</span><span>You choose the business</span></div>
    </section>

    <section className="local-seo-service-cards">
      <div className="local-seo-section-title"><span>START BY SERVICE</span><h2>What do you need in Hyderabad?</h2><p>Choose the closest service category, then add the area, scope, budget and timing that matter to your requirement.</p></div>
      <div>
        {services.map(service=><article key={service.slug}>
          <span>{service.label.toUpperCase()}</span><h3>{service.heading}</h3><p>{service.summary}</p>
          <Link to={'/hyderabad/'+service.slug}>Explore {service.label} in Hyderabad</Link>
        </article>)}
      </div>
    </section>

    <section className="local-seo-area-index">
      <div className="local-seo-section-title"><span>CONSTRUCTION BY LOCALITY</span><h2>Find construction information for your Hyderabad area</h2><p>These pages are built around actual project-planning inputs such as site location, built-up area, floors, budget, timeline and quote comparison—not just a changed locality name.</p></div>
      <div className="local-seo-chip-grid">
        {HYDERABAD_LOCALITIES.map(locality=><Link key={locality.slug} to={localityPagePath('construction',locality.slug)}>{construction.localityHeading(locality.name)}</Link>)}
      </div>
    </section>

    <section className="local-seo-grid">
      <article><span>PLAN BEFORE CONTACTING</span><h2>Keep one comparable project brief</h2><p>For construction, record plot location, built-up area, floors and approximate budget. For interiors, use the same rooms and finish expectations. For property, keep locality, property type and budget consistent.</p><ul><li>Same scope for every provider</li><li>Same budget assumptions</li><li>Same timeline expectations</li><li>Compare exclusions as well as price</li></ul></article>
      <article><span>DISCOVER OPTIONS</span><h2>Use ProPulse as a starting point</h2><p>ProPulse helps customers structure requirements and discover relevant registered businesses. It does not claim to execute every service itself.</p><ul><li>Browse public business profiles</li><li>Review completed projects where available</li><li>Create a structured requirement</li><li>Verify credentials and terms directly</li></ul></article>
    </section>

    <section className="local-seo-city-links"><h2>Compare Hyderabad options</h2><div>{services.map(service=><Link key={service.slug} to={'/hyderabad/'+service.slug+'/compare-options'}>Compare {service.label} options in Hyderabad</Link>)}</div></section>

    <section className="local-seo-cta"><span>HYDERABAD</span><h2>Start with the location and scope you already know</h2><p>A clear requirement helps businesses understand the project before they respond.</p><Link to="/quote">Start Free Requirement</Link></section>
  </main>
}

function ServicePage({entry,service}){
  const groups=localityGroups()
  const faqs=[
    {q:'How do I start a '+service.label.toLowerCase()+' requirement in Hyderabad?',a:'Start with the location, project or property details, approximate budget and timeline. ProPulse turns those inputs into one structured requirement that relevant businesses can understand.'},
    {q:'Can I specify a Hyderabad locality such as Uppal or Kothapet?',a:'Yes. Add the exact locality and any site or property details you already know. That makes the requirement more useful than a generic city-level enquiry.'},
    {q:'Does ProPulse itself execute '+service.label.toLowerCase()+' work?',a:'No. ProPulse is a requirement and discovery platform. The actual service, quotation, credentials, scope and commercial terms come from the businesses you choose to engage with.'},
  ]

  return <main className="local-seo-page">
    <Header/>
    <section className="local-seo-hero">
      <div className="local-seo-breadcrumb"><Link to="/">Home</Link><span>›</span><Link to="/hyderabad">Hyderabad</Link><span>›</span><b>{service.label}</b></div>
      <span className="local-seo-eyebrow">HYDERABAD · TELANGANA</span><h1>{entry.heading}</h1><p>{entry.summary}</p>
      <div className="local-seo-actions"><Link className="primary" to={quoteRoute(service)}>Start {service.label} Requirement</Link><Link className="secondary" to="/experts">Find Professionals</Link></div>
      <div className="local-seo-trust"><span>One structured requirement</span><span>Locality-aware details</span><span>You choose the business</span></div>
    </section>

    <section className="local-seo-grid">
      <article><span>WHAT YOU CAN REQUEST</span><h2>{service.heading}</h2><p>{entry.description}</p><p>{service.citySearchIntent}</p><ul>{service.needs.map(item=><li key={item}>{item}</li>)}</ul></article>
      <article><span>PREPARE BEFORE YOU SUBMIT</span><h2>Details that help businesses respond clearly</h2><p>More complete inputs reduce back-and-forth and make project-specific responses easier to compare.</p><ul>{service.checklist.map(item=><li key={item}>{item}</li>)}</ul></article>
    </section>

    <section className="local-seo-area-index">
      <div className="local-seo-section-title"><span>HYDERABAD LOCALITIES</span><h2>Search by the area where your requirement is located</h2><p>{service.slug==='construction'?'Open a dedicated construction page for each target locality, then start a project brief with the same core inputs.':'Use this Hyderabad hub to add the locality directly to your requirement without creating thin, repetitive pages.'}</p></div>
      <div className="local-seo-zone-list">
        {groups.map(group=><article key={group.zone}><header><span>{group.zone}</span><b>{group.localities.length} areas</b></header><div className="local-seo-locality-grid">
          {group.localities.map(locality=><section id={locality.slug} key={locality.slug}><h3>{service.localityHeading(locality.name)}</h3><p>{service.localityText(locality.name)}</p><Link to={service.slug==='construction'?localityPagePath(service.slug,locality.slug):quoteRoute(service)}>{service.slug==='construction'?'View '+service.localityHeading(locality.name):'Start requirement for '+locality.name}</Link></section>)}
        </div></article>)}
      </div>
    </section>

    <section className="local-seo-process"><div className="local-seo-section-title"><span>HOW PROPULSE WORKS</span><h2>From Hyderabad requirement to relevant responses</h2></div><div className="local-seo-process-grid">
      <article><b>01</b><h3>Share your requirement</h3><p>Add the locality, scope, budget and timing that matter for your project or property need.</p></article>
      <article><b>02</b><h3>Keep one clear brief</h3><p>Your requirement stays structured so each business is responding to the same core information.</p></article>
      <article><b>03</b><h3>Review relevant options</h3><p>Look at actual responses, public business profiles and completed project information where available.</p></article>
      <article><b>04</b><h3>Choose your next step</h3><p>Verify credentials, scope, price and terms directly with the business before proceeding.</p></article>
    </div></section>

    <section className="local-seo-faq"><div className="local-seo-section-title"><span>FAQ</span><h2>{service.label} in Hyderabad: common questions</h2></div><div>{faqs.map(item=><article key={item.q}><h3>{item.q}</h3><p>{item.a}</p></article>)}</div></section>

    <section className="local-seo-city-links"><h2>Explore the other Hyderabad requirement categories</h2><div>{['construction','interior-designers','real-estate'].map(serviceBySlug).filter(item=>item.slug!==service.slug).map(item=><Link key={item.slug} to={'/hyderabad/'+item.slug}>{item.heading}</Link>)}<Link to={'/hyderabad/'+service.slug+'/compare-options'}>Compare {service.label} options in Hyderabad</Link></div></section>

    <section className="local-seo-cta"><span>HYDERABAD</span><h2>Ready to create your {service.label.toLowerCase()} requirement?</h2><p>Start with the details you already know. Add the exact locality so businesses can understand where the requirement is.</p><Link to={quoteRoute(service)}>Start Free Requirement</Link></section>
  </main>
}

function LocalityPage({entry,service,locality}){
  const nearby=nearbyLocalities(locality)
  const faqs=[
    {q:'How do I request construction in '+locality.name+'?',a:'Add the exact site location, plot or built-up area, floor count, project type, approximate budget and preferred start timeline. That gives construction businesses enough context to respond to one consistent brief.'},
    {q:'What should I compare in a construction quotation?',a:'Compare the included scope, structural specifications, material brands or grades, exclusions, payment milestones, timeline, change-order rules, warranty terms and taxes—not only the headline price.'},
    {q:'Can I use ProPulse to find builders or construction companies in '+locality.name+'?',a:'You can create a structured requirement and browse public business information available on ProPulse. Verify the provider’s credentials, site experience, quotation and commercial terms directly before proceeding.'},
  ]
  return <main className="local-seo-page locality-detail-page">
    <Header/>
    <section className="local-seo-hero">
      <div className="local-seo-breadcrumb"><Link to="/">Home</Link><span>›</span><Link to="/hyderabad">Hyderabad</Link><span>›</span><Link to="/hyderabad/construction">Construction</Link><span>›</span><b>{locality.name}</b></div>
      <span className="local-seo-eyebrow">{locality.zone.toUpperCase()} · HYDERABAD</span><h1>{entry.heading}</h1><p>{entry.summary}</p>
      <div className="local-seo-actions"><Link className="primary" to={quoteRoute(service)}>Get Construction Quotes</Link><Link className="secondary" to="/estimate/construction">Try Construction Estimator</Link></div>
      <div className="local-seo-trust"><span>Site-specific brief</span><span>Comparable project scope</span><span>No forced provider choice</span></div>
    </section>

    <section className="local-seo-grid locality-intent-grid">
      <article><span>COMMON PROJECT INTENT</span><h2>Construction searches around {locality.name}</h2><p>Customers may describe the same need in different ways. The useful next step is to turn that search into one site-specific project brief.</p><ul>{entry.searchTerms.map(term=><li key={term}>{term}</li>)}</ul></article>
      <article><span>QUOTE INPUTS</span><h2>What to include before asking for a quote</h2><p>Keep these inputs consistent when you speak with different contractors or construction companies.</p><ul>{service.checklist.map(item=><li key={item}>{item}</li>)}</ul></article>
    </section>

    <section className="local-seo-process locality-planning"><div className="local-seo-section-title"><span>COMPARE LIKE FOR LIKE</span><h2>Four checks before choosing a construction option in {locality.name}</h2></div><div className="local-seo-process-grid">
      <article><b>01</b><h3>Confirm site scope</h3><p>Use the same plot dimensions, built-up area, floor count and project type for every quotation.</p></article>
      <article><b>02</b><h3>Check specifications</h3><p>Compare structural scope, material grades, finishing assumptions and items excluded from the quoted amount.</p></article>
      <article><b>03</b><h3>Review milestones</h3><p>Understand payment stages, approval points, expected timeline and how changes or additional work are priced.</p></article>
      <article><b>04</b><h3>Verify the provider</h3><p>Review relevant completed work, credentials, contract terms and responsibilities before you commit.</p></article>
    </div></section>

    <section className="local-seo-grid">
      <article><span>COST PLANNING</span><h2>What can change a construction estimate?</h2><p>A locality name alone does not determine the final cost. Plot conditions, built-up area, number of floors, structural design, specifications, finishes, approvals and project timing can all change the quotation.</p><Link className="local-inline-link" to="/estimate/construction">Use the construction estimator</Link></article>
      <article><span>LOCALITY DETAIL</span><h2>Make the {locality.name} site unambiguous</h2><p>Include the exact locality, PIN code or site pin, plot details and nearby landmark information available to you. This prevents a broad “Hyderabad” enquiry from being interpreted as a different project area.</p><Link className="local-inline-link" to={quoteRoute(service)}>Create a requirement for {locality.name}</Link></article>
    </section>

    <section className="local-seo-city-links"><h2>Nearby Hyderabad construction pages</h2><div>{nearby.map(item=><Link key={item.slug} to={localityPagePath('construction',item.slug)}>{service.localityHeading(item.name)}</Link>)}<Link to="/hyderabad/construction">All Hyderabad construction areas</Link></div></section>

    <section className="local-seo-faq"><div className="local-seo-section-title"><span>FAQ</span><h2>Construction in {locality.name}: common questions</h2></div><div>{faqs.map(item=><article key={item.q}><h3>{item.q}</h3><p>{item.a}</p></article>)}</div></section>

    <section className="local-seo-cta"><span>{locality.name.toUpperCase()} · HYDERABAD</span><h2>Turn your search into one clear construction requirement</h2><p>Add the site, scope, budget and timeline you already know, then compare actual project-specific responses.</p><Link to={quoteRoute(service)}>Start Construction Requirement</Link></section>
  </main>
}

function ComparisonPage({entry,service}){
  return <main className="local-seo-page comparison-page">
    <Header/>
    <section className="local-seo-hero">
      <div className="local-seo-breadcrumb"><Link to="/">Home</Link><span>›</span><Link to="/hyderabad">Hyderabad</Link><span>›</span><Link to={'/hyderabad/'+service.slug}>{service.label}</Link><span>›</span><b>Compare options</b></div>
      <span className="local-seo-eyebrow">INDEPENDENT COMPARISON STARTING POINT</span><h1>{entry.heading}</h1><p>{entry.summary}</p>
      <div className="local-seo-actions"><Link className="primary" to={quoteRoute(service)}>Create One Requirement</Link><Link className="secondary" to="/experts">Browse ProPulse Businesses</Link></div>
    </section>

    <section className="comparison-disclosure"><b>Important disclosure</b><p>ProPulse is independent and is not affiliated with, endorsed by, or representing {entry.brands.join(', ')}. Their names are used only because customers may be researching these options. Check each provider's current website, quotation, scope and terms directly before making a decision.</p></section>

    <section className="local-seo-grid comparison-grid">
      <article><span>WHAT YOU MAY ALREADY BE RESEARCHING</span><h2>Brands and options customers compare in Hyderabad</h2><div className="comparison-brands">{entry.brands.map(brand=><b key={brand}>{brand}</b>)}</div><p>{entry.searchIntent}</p></article>
      <article><span>HOW PROPULSE DIFFERS</span><h2>One requirement instead of another execution brand</h2><p>ProPulse does not claim to be the same type of service as the brands above. It helps you structure your need and discover relevant businesses so you have more context before deciding who to contact.</p><ul><li>One structured requirement</li><li>Public business profiles where available</li><li>Completed project information where published</li><li>Your choice of whom to contact</li></ul></article>
    </section>

    <section className="local-seo-process"><div className="local-seo-section-title"><span>COMPARE USING YOUR OWN PROJECT</span><h2>Use the same brief for every option you review</h2></div><div className="local-seo-process-grid">
      <article><b>01</b><h3>Define scope</h3><p>Write down the actual project or property need instead of comparing generic advertising claims.</p></article>
      <article><b>02</b><h3>Fix your budget range</h3><p>Use one realistic budget band so each response starts from comparable assumptions.</p></article>
      <article><b>03</b><h3>Verify the provider</h3><p>Check current portfolio, credentials, terms, exclusions and after-sales obligations directly.</p></article>
      <article><b>04</b><h3>Compare the final quote</h3><p>Review scope, materials, timeline and commercial terms before deciding.</p></article>
    </div></section>

    <section className="local-seo-cta"><span>HYDERABAD</span><h2>Compare with your own requirement, not a generic brand ranking</h2><p>Submit the details that matter to you, review actual responses and verify every provider before proceeding.</p><Link to={quoteRoute(service)}>Create Requirement</Link></section>
  </main>
}

export default function HyderabadSeoLanding(){
  const {serviceSlug,localitySlug}=useParams()
  if(!serviceSlug)return <CityHubPage/>
  const service=serviceBySlug(serviceSlug)
  if(!service)return <Navigate to="/hyderabad" replace/>
  if(localitySlug){
    const locality=localityBySlug(localitySlug)
    const entry=localitySeoEntry(serviceSlug,localitySlug)
    if(!entry||!locality)return <Navigate to={'/hyderabad/'+serviceSlug} replace/>
    return <LocalityPage entry={entry} service={service} locality={locality}/>
  }
  const comparison=window.location.pathname.endsWith('/compare-options')
  const entry=hyderabadSeoEntry(serviceSlug,comparison)
  if(!entry)return <Navigate to="/hyderabad" replace/>
  return comparison?<ComparisonPage entry={comparisonByService(serviceSlug)} service={service}/>:<ServicePage entry={entry} service={service}/>
}
