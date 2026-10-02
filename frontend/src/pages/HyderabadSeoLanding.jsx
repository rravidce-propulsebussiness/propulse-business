import {Link, Navigate, useParams} from 'react-router-dom'
import {
  HYDERABAD_CITY_SEO_ROUTE,
  HYDERABAD_CONSTRUCTION_COST_ROUTE,
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
import {CONSTRUCTION_PACKAGE_CATALOG} from '../data/constructionPackageCatalog'
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

    <section className="local-seo-city-links"><h2>Plan and compare Hyderabad options</h2><div><Link to="/hyderabad/construction-cost">House construction cost in Hyderabad</Link>{services.map(service=><Link key={service.slug} to={'/hyderabad/'+service.slug+'/compare-options'}>Compare {service.label} options in Hyderabad</Link>)}</div></section>

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

    {service.slug==='construction'&&<section className="local-seo-experience-note">
      <div><span>HYDERABAD OPERATING BACKGROUND</span><h2>Built with hands-on construction and interiors experience</h2><p>ProPulse is a technology and requirement platform informed by prior hands-on residential construction and interior execution experience in Hyderabad.</p></div>
      <Link to="/about#ab-industry-experience">Read the operating experience background</Link>
    </section>}

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

    <section className="local-seo-city-links"><h2>Explore more Hyderabad planning pages</h2><div>{service.slug==='construction'&&<Link to="/hyderabad/construction-cost">House construction cost in Hyderabad</Link>}{['construction','interior-designers','real-estate'].map(serviceBySlug).filter(item=>item.slug!==service.slug).map(item=><Link key={item.slug} to={'/hyderabad/'+item.slug}>{item.heading}</Link>)}<Link to={'/hyderabad/'+service.slug+'/compare-options'}>Compare {service.label} options in Hyderabad</Link></div></section>

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
      <div className="local-seo-actions"><Link className="primary" to={quoteRoute(service)}>Get Construction Quotes</Link><Link className="secondary" to="/estimate/construction-cost-estimator">Try Construction Estimator</Link></div>
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
      <article><span>COST PLANNING</span><h2>What can change a construction estimate?</h2><p>A locality name alone does not determine the final cost. Plot conditions, built-up area, number of floors, structural design, specifications, finishes, approvals and project timing can all change the quotation.</p><Link className="local-inline-link" to="/estimate/construction-cost-estimator">Use the construction estimator</Link></article>
      <article><span>LOCALITY DETAIL</span><h2>Make the {locality.name} site unambiguous</h2><p>Include the exact locality, PIN code or site pin, plot details and nearby landmark information available to you. This prevents a broad “Hyderabad” enquiry from being interpreted as a different project area.</p><Link className="local-inline-link" to={quoteRoute(service)}>Create a requirement for {locality.name}</Link></article>
    </section>

    <section className="local-seo-city-links"><h2>Nearby Hyderabad construction pages</h2><div><Link to="/hyderabad/construction-cost">Construction cost in Hyderabad</Link>{nearby.map(item=><Link key={item.slug} to={localityPagePath('construction',item.slug)}>{service.localityHeading(item.name)}</Link>)}<Link to="/hyderabad/construction">All Hyderabad construction areas</Link></div></section>

    <section className="local-seo-faq"><div className="local-seo-section-title"><span>FAQ</span><h2>Construction in {locality.name}: common questions</h2></div><div>{faqs.map(item=><article key={item.q}><h3>{item.q}</h3><p>{item.a}</p></article>)}</div></section>

    <section className="local-seo-cta"><span>{locality.name.toUpperCase()} · HYDERABAD</span><h2>Turn your search into one clear construction requirement</h2><p>Add the site, scope, budget and timeline you already know, then compare actual project-specific responses.</p><Link to={quoteRoute(service)}>Start Construction Requirement</Link></section>
  </main>
}


function ConstructionCostGuidePage(){
  const service=serviceBySlug('construction')
  const packages=Object.values(CONSTRUCTION_PACKAGE_CATALOG)
  const sampleAreas=[1000,1500,2000]
  const rupees=value=>'₹'+Number(value||0).toLocaleString('en-IN')
  const faqs=[
    {q:'What is the house construction cost per sq ft in Hyderabad?',a:'There is no single fixed Hyderabad rate for every project. ProPulse currently shows package reference rates from '+rupees(packages[0]?.rate)+' per sq ft through '+rupees(packages[packages.length-1]?.rate)+' per sq ft, depending on the selected package specifications. Final quotations can change with site conditions, design, scope, exclusions and current commercial terms.'},
    {q:'How do I estimate G+1 construction cost in Hyderabad?',a:'First estimate the total built-up area across both floors, then multiply that built-up area by the relevant planning rate. Add items that are outside the chosen package scope and confirm structural, approval and site-specific requirements before treating the result as a project budget.'},
    {q:'Does construction cost use plot area or built-up area?',a:'Construction rates are generally compared against built-up construction area, not only the land or plot area. A plot can have a different total built-up area depending on setbacks, floor count, design and approvals.'},
    {q:'Are the ProPulse rates final contractor quotations?',a:'No. The rates on this guide are package brochure references from the current ProPulse construction package catalog. Use them for initial planning, then create a site-specific requirement and obtain actual quotations.'},
  ]
  return <main className="local-seo-page construction-cost-page">
    <Header/>
    <section className="local-seo-hero">
      <div className="local-seo-breadcrumb"><Link to="/">Home</Link><span>›</span><Link to="/hyderabad">Hyderabad</Link><span>›</span><b>Construction Cost</b></div>
      <span className="local-seo-eyebrow">HYDERABAD CONSTRUCTION BUDGET GUIDE</span>
      <h1>{HYDERABAD_CONSTRUCTION_COST_ROUTE.heading}</h1>
      <p>{HYDERABAD_CONSTRUCTION_COST_ROUTE.summary}</p>
      <div className="local-seo-actions"><Link className="primary" to="/estimate/construction-cost-estimator">Calculate Construction Estimate</Link><Link className="secondary" to="/packages#construction">Compare Packages</Link></div>
      <div className="local-seo-trust"><span>Current ProPulse package rates</span><span>Built-up-area examples</span><span>Actual quote still required</span></div>
    </section>

    <section className="cost-rate-section">
      <div className="local-seo-section-title"><span>CURRENT PROPULSE REFERENCES</span><h2>Construction package rates used for initial planning</h2><p>These are brochure reference rates from the same package catalog used on ProPulse. They are not a Hyderabad-wide market average and they are not a final contractor quotation.</p></div>
      <div className="cost-rate-grid">
        {packages.map(item=><article key={item.key}><span>{item.name.toUpperCase()}</span><strong>{rupees(item.rate)}</strong><small>per sq ft</small><p>{item.specs?.Architecture||'Package specifications apply.'}</p><Link to={'/packages#construction'}>Review package specifications</Link></article>)}
      </div>
    </section>

    <section className="cost-example-section">
      <div className="local-seo-section-title"><span>QUICK BUDGET EXAMPLES</span><h2>What the package rate means for common built-up areas</h2><p>Example budgets below are simple built-up-area × package-rate calculations. They do not add land cost or items outside the selected construction package.</p></div>
      <div className="cost-table-wrap"><table className="cost-example-table"><thead><tr><th>Built-up area</th>{packages.map(item=><th key={item.key}>{item.name}<small>{rupees(item.rate)}/sq ft</small></th>)}</tr></thead><tbody>{sampleAreas.map(area=><tr key={area}><th>{area.toLocaleString('en-IN')} sq ft</th>{packages.map(item=><td key={item.key}>{rupees(area*item.rate)}</td>)}</tr>)}</tbody></table></div>
      <p className="cost-note">For G+1 or multi-floor homes, use the approximate total built-up area across all floors rather than multiplying the plot area blindly.</p>
    </section>

    <section className="local-seo-grid">
      <article><span>WHAT CHANGES THE FINAL COST</span><h2>Why two Hyderabad homes with the same area can cost differently</h2><ul><li>Soil condition and foundation requirements</li><li>Number of floors and structural design</li><li>Site access and logistics</li><li>Architectural complexity and elevation</li><li>Steel, cement, brick or block specifications</li><li>Flooring, doors, windows and sanitaryware</li><li>Electrical, plumbing and waterproofing scope</li><li>Items excluded from the construction package</li></ul></article>
      <article><span>COMPARE THE FULL SCOPE</span><h2>Do not choose a contractor on per-sq-ft rate alone</h2><p>Ask every business to quote against the same built-up area, drawings, specifications and exclusions. A lower rate can represent a different material allowance or a smaller included scope.</p><ul><li>Confirm material brands or allowances</li><li>Check architectural and structural deliverables</li><li>Review payment milestones and variation rules</li><li>Confirm taxes, approvals and external works</li><li>Check warranty and handover obligations</li></ul></article>
    </section>

    <section className="local-seo-process"><div className="local-seo-section-title"><span>FROM SEARCH TO PROJECT BUDGET</span><h2>A safer way to estimate house construction cost in Hyderabad</h2></div><div className="local-seo-process-grid">
      <article><b>01</b><h3>Calculate built-up area</h3><p>Start with the approximate construction area across all proposed floors.</p></article>
      <article><b>02</b><h3>Select specifications</h3><p>Use a package or specification level that matches the materials and finish you actually expect.</p></article>
      <article><b>03</b><h3>Add project-specific items</h3><p>Account for site conditions, approvals, external works and anything excluded from the base package.</p></article>
      <article><b>04</b><h3>Request actual quotations</h3><p>Send the same drawings, area and scope to relevant construction businesses and compare like for like.</p></article>
    </div></section>

    <section className="cost-search-intent">
      <div className="local-seo-section-title"><span>COMMON HYDERABAD SEARCHES</span><h2>Construction cost questions this guide is designed to answer</h2></div>
      <div className="local-seo-chip-grid">{HYDERABAD_CONSTRUCTION_COST_ROUTE.searchTerms.map(term=><span key={term}>{term}</span>)}</div>
    </section>

    <section className="local-seo-city-links"><h2>Continue planning your Hyderabad project</h2><div><Link to="/estimate/construction-cost-estimator">Construction cost estimator</Link><Link to="/packages#construction">Construction packages</Link><Link to="/hyderabad/construction">Construction in Hyderabad</Link><Link to="/hyderabad/construction/compare-options">Compare construction options in Hyderabad</Link><Link to="/hyderabad/construction/uppal">Construction in Uppal</Link><Link to="/hyderabad/construction/kothapet">Construction in Kothapet</Link><Link to="/hyderabad/construction/gachibowli">Construction in Gachibowli</Link></div></section>

    <section className="local-seo-faq"><div className="local-seo-section-title"><span>FAQ</span><h2>Hyderabad construction cost questions</h2></div><div>{faqs.map(item=><article key={item.q}><h3>{item.q}</h3><p>{item.a}</p></article>)}</div></section>

    <section className="local-seo-cta"><span>HYDERABAD</span><h2>Move from an indicative cost to a site-specific construction quote</h2><p>Use the estimator for initial planning, then share your actual site, built-up area, floors and specifications with relevant businesses.</p><Link to={quoteRoute(service)}>Request Construction Quotes</Link></section>
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

    {Array.isArray(entry.searchTerms)&&entry.searchTerms.length>0&&<section className="cost-search-intent comparison-search-intent"><div className="local-seo-section-title"><span>COMMON SEARCHES</span><h2>Company and category searches customers use in Hyderabad</h2><p>These phrases are included to help users who are already researching named providers. ProPulse remains independent and does not claim affiliation with the brands listed above.</p></div><div className="local-seo-chip-grid">{entry.searchTerms.map(term=><span key={term}>{term}</span>)}</div></section>}

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
  if(window.location.pathname==='/hyderabad/construction-cost')return <ConstructionCostGuidePage/>
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
