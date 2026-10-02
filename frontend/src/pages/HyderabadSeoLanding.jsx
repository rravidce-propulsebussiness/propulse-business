import {Link, Navigate, useParams} from 'react-router-dom'
import {
  comparisonByService,
  hyderabadSeoEntry,
  localityGroups,
  serviceBySlug,
} from '../seo/hyderabadSeo'
import './HyderabadSeoLanding.css'

function quoteRoute(service){
  return '/quote#'+service.quoteHash
}

function ServicePage({entry,service}){
  const groups=localityGroups()
  const faqs=[
    {
      q:'How do I start a '+service.label.toLowerCase()+' requirement in Hyderabad?',
      a:'Start with the location, project or property details, approximate budget and timeline. ProPulse turns those inputs into one structured requirement that relevant businesses can understand.',
    },
    {
      q:'Can I specify a Hyderabad locality such as Uppal or Kothapet?',
      a:'Yes. Add the exact locality and any site or property details you already know. That makes the requirement more useful than a generic city-level enquiry.',
    },
    {
      q:'Does ProPulse itself execute '+service.label.toLowerCase()+' work?',
      a:'No. ProPulse is a requirement and discovery platform. The actual service, quotation, credentials, scope and commercial terms come from the businesses you choose to engage with.',
    },
  ]

  return <main className="local-seo-page">
    <header className="local-seo-header">
      <Link className="local-seo-logo" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse Business"/></Link>
      <nav>
        <Link to="/">Home</Link><Link to="/quote">Get Quote</Link><Link to="/experts">Find Professionals</Link>
        <Link to="/projects">Projects</Link><Link to="/packages">Packages</Link><Link to="/contact">Contact</Link>
      </nav>
      <Link className="local-seo-pro" to="/professionals">For Professionals</Link>
    </header>

    <section className="local-seo-hero">
      <div className="local-seo-breadcrumb"><Link to="/">Home</Link><span>›</span><span>Hyderabad</span><span>›</span><b>{service.shortLabel||service.label}</b></div>
      <span className="local-seo-eyebrow">HYDERABAD · TELANGANA</span>
      <h1>{entry.heading}</h1>
      <p>{entry.summary}</p>
      <div className="local-seo-actions">
        <Link className="primary" to={quoteRoute(service)}>Start {service.label} Requirement</Link>
        <Link className="secondary" to="/experts">Find Professionals</Link>
      </div>
      <div className="local-seo-trust">
        <span>One structured requirement</span><span>Locality-aware details</span><span>You choose the business</span>
      </div>
    </section>

    <section className="local-seo-grid">
      <article>
        <span>WHAT YOU CAN REQUEST</span>
        <h2>{service.heading}</h2>
        <p>{entry.description}</p>
        <ul>{service.needs.map(item=><li key={item}>{item}</li>)}</ul>
      </article>
      <article>
        <span>PREPARE BEFORE YOU SUBMIT</span>
        <h2>Details that help businesses respond clearly</h2>
        <p>More complete inputs reduce back-and-forth and make project-specific responses easier to compare.</p>
        <ul>{service.checklist.map(item=><li key={item}>{item}</li>)}</ul>
      </article>
    </section>

    <section className="local-seo-area-index">
      <div className="local-seo-section-title">
        <span>HYDERABAD LOCALITIES</span>
        <h2>Search by the area where your requirement is located</h2>
        <p>Instead of creating dozens of thin location pages, this Hyderabad hub keeps the useful locality information in one place.</p>
      </div>
      <div className="local-seo-zone-list">
        {groups.map(group=><article key={group.zone}>
          <header><span>{group.zone}</span><b>{group.localities.length} areas</b></header>
          <div className="local-seo-locality-grid">
            {group.localities.map(locality=><section id={locality.slug} key={locality.slug}>
              <h3>{service.localityHeading(locality.name)}</h3>
              <p>{service.localityText(locality.name)}</p>
              <Link to={quoteRoute(service)}>Start requirement for {locality.name}</Link>
            </section>)}
          </div>
        </article>)}
      </div>
    </section>

    <section className="local-seo-process">
      <div className="local-seo-section-title"><span>HOW PROPULSE WORKS</span><h2>From Hyderabad requirement to relevant responses</h2></div>
      <div className="local-seo-process-grid">
        <article><b>01</b><h3>Share your requirement</h3><p>Add the locality, scope, budget and timing that matter for your project or property need.</p></article>
        <article><b>02</b><h3>Keep one clear brief</h3><p>Your requirement stays structured so each business is responding to the same core information.</p></article>
        <article><b>03</b><h3>Review relevant options</h3><p>Look at actual responses, public business profiles and completed project information where available.</p></article>
        <article><b>04</b><h3>Choose your next step</h3><p>Verify credentials, scope, price and terms directly with the business before proceeding.</p></article>
      </div>
    </section>

    <section className="local-seo-faq">
      <div className="local-seo-section-title"><span>FAQ</span><h2>{service.label} in Hyderabad: common questions</h2></div>
      <div>{faqs.map(item=><article key={item.q}><h3>{item.q}</h3><p>{item.a}</p></article>)}</div>
    </section>

    <section className="local-seo-city-links">
      <h2>Explore the other Hyderabad requirement categories</h2>
      <div>
        {Object.values({
          construction:serviceBySlug('construction'),
          interiors:serviceBySlug('interior-designers'),
          property:serviceBySlug('real-estate'),
        }).filter(item=>item.slug!==service.slug).map(item=>
          <Link key={item.slug} to={'/hyderabad/'+item.slug}>{item.heading}</Link>
        )}
        <Link to={'/hyderabad/'+service.slug+'/compare-options'}>Compare {service.label} options in Hyderabad</Link>
      </div>
    </section>

    <section className="local-seo-cta">
      <span>HYDERABAD</span>
      <h2>Ready to create your {service.label.toLowerCase()} requirement?</h2>
      <p>Start with the details you already know. Add the exact locality so businesses can understand where the requirement is.</p>
      <Link to={quoteRoute(service)}>Start Free Requirement</Link>
    </section>
  </main>
}

function ComparisonPage({entry,service}){
  return <main className="local-seo-page comparison-page">
    <header className="local-seo-header">
      <Link className="local-seo-logo" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse Business"/></Link>
      <nav><Link to="/">Home</Link><Link to={'/hyderabad/'+service.slug}>{service.label} Hyderabad</Link><Link to="/experts">Find Professionals</Link><Link to="/projects">Projects</Link><Link to="/contact">Contact</Link></nav>
      <Link className="local-seo-pro" to="/professionals">For Professionals</Link>
    </header>

    <section className="local-seo-hero">
      <div className="local-seo-breadcrumb"><Link to="/">Home</Link><span>›</span><Link to={'/hyderabad/'+service.slug}>Hyderabad {service.label}</Link><span>›</span><b>Compare options</b></div>
      <span className="local-seo-eyebrow">INDEPENDENT COMPARISON STARTING POINT</span>
      <h1>{entry.heading}</h1>
      <p>{entry.summary}</p>
      <div className="local-seo-actions"><Link className="primary" to={quoteRoute(service)}>Create One Requirement</Link><Link className="secondary" to="/experts">Browse ProPulse Businesses</Link></div>
    </section>

    <section className="comparison-disclosure">
      <b>Important disclosure</b>
      <p>ProPulse is independent and is not affiliated with, endorsed by, or representing {entry.brands.join(', ')}. Their names are used only because customers may be researching these options. Check each provider's current website, quotation, scope and terms directly before making a decision.</p>
    </section>

    <section className="local-seo-grid comparison-grid">
      <article>
        <span>WHAT YOU MAY ALREADY BE RESEARCHING</span>
        <h2>Brands and options customers compare in Hyderabad</h2>
        <div className="comparison-brands">{entry.brands.map(brand=><b key={brand}>{brand}</b>)}</div>
        <p>Large brands, local studios, contractors, brokers and specialist businesses can operate differently. A project-specific response is more useful than a generic ranking.</p>
      </article>
      <article>
        <span>HOW PROPULSE DIFFERS</span>
        <h2>One requirement instead of another execution brand</h2>
        <p>ProPulse does not claim to be the same type of service as the brands above. It helps you structure your need and discover relevant businesses so you have more context before deciding who to contact.</p>
        <ul><li>One structured requirement</li><li>Public business profiles where available</li><li>Completed project information where published</li><li>Your choice of whom to contact</li></ul>
      </article>
    </section>

    <section className="local-seo-process">
      <div className="local-seo-section-title"><span>COMPARE USING YOUR OWN PROJECT</span><h2>Use the same brief for every option you review</h2></div>
      <div className="local-seo-process-grid">
        <article><b>01</b><h3>Define scope</h3><p>Write down the actual project or property need instead of comparing generic advertising claims.</p></article>
        <article><b>02</b><h3>Fix your budget range</h3><p>Use one realistic budget band so each response starts from comparable assumptions.</p></article>
        <article><b>03</b><h3>Verify the provider</h3><p>Check current portfolio, credentials, terms, exclusions and after-sales obligations directly.</p></article>
        <article><b>04</b><h3>Compare the final quote</h3><p>Review scope, materials, timeline and commercial terms before deciding.</p></article>
      </div>
    </section>

    <section className="local-seo-cta">
      <span>HYDERABAD</span>
      <h2>Compare with your own requirement, not a generic brand ranking</h2>
      <p>Submit the details that matter to you, review actual responses and verify every provider before proceeding.</p>
      <Link to={quoteRoute(service)}>Create Requirement</Link>
    </section>
  </main>
}

export default function HyderabadSeoLanding(){
  const {serviceSlug}=useParams()
  const service=serviceBySlug(serviceSlug)
  const comparison=window.location.pathname.endsWith('/compare-options')
  const entry=hyderabadSeoEntry(serviceSlug,comparison)
  if(!entry||!service)return <Navigate to="/quote" replace/>
  return comparison?<ComparisonPage entry={comparisonByService(serviceSlug)} service={service}/>:<ServicePage entry={entry} service={service}/>
}
