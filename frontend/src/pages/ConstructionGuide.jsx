import {Link, Navigate, useParams} from 'react-router-dom'
import {guideBySlug,CONSTRUCTION_GUIDES} from '../seo/constructionGuides'
import './ConstructionGuide.css'

function Header(){
  return <header className="guide-header">
    <Link to="/" className="guide-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse Business"/></Link>
    <nav><Link to="/">Home</Link><Link to="/hyderabad/construction">Construction</Link><Link to="/packages">Packages</Link><Link to="/projects">Projects</Link><Link to="/experts">Professionals</Link><Link to="/quote">Get Quote</Link></nav>
  </header>
}

export default function ConstructionGuide(){
  const {guideSlug}=useParams()
  const guide=guideBySlug(guideSlug)
  if(!guide)return <Navigate to="/hyderabad/construction" replace/>
  const related=CONSTRUCTION_GUIDES.filter(item=>item.slug!==guide.slug).slice(0,5)

  return <main className="guide-page">
    <Header/>
    <section className="guide-hero">
      <div className="guide-breadcrumb"><Link to="/">Home</Link><span>›</span><Link to="/hyderabad/construction">Construction</Link><span>›</span><b>{guide.category}</b></div>
      <span className="guide-eyebrow">{guide.category.toUpperCase()} · PROPULSE GUIDE</span>
      <h1>{guide.heading}</h1>
      <p>{guide.summary}</p>
      <div className="guide-actions"><Link className="primary" to={guide.cta}>{guide.ctaLabel}</Link><Link className="secondary" to="/packages">View Packages</Link></div>
    </section>

    {guide.note&&<section className="guide-note"><b>Important</b><p>{guide.note}</p></section>}

    <section className="guide-content">
      <aside className="guide-toc">
        <span>IN THIS GUIDE</span>
        {guide.sections.map((item,index)=><a key={item.heading} href={'#guide-section-'+index}>{item.heading}</a>)}
        <Link to="/hyderabad/construction-cost">Hyderabad construction cost guide</Link>
      </aside>
      <div className="guide-article">
        {guide.sections.map((item,index)=><section id={'guide-section-'+index} key={item.heading}>
          <span>{String(index+1).padStart(2,'0')}</span>
          <h2>{item.heading}</h2>
          <p>{item.body}</p>
          {item.bullets?.length>0&&<ul>{item.bullets.map(bullet=><li key={bullet}>{bullet}</li>)}</ul>}
        </section>)}
      </div>
    </section>

    <section className="guide-search-intent">
      <div><span>RELATED SEARCHES</span><h2>Questions this guide helps answer</h2><p>These phrases represent closely related research intent. Use the guide to understand the decision, then move into a project-specific requirement where needed.</p></div>
      <div className="guide-chips">{guide.searchTerms.map(term=><span key={term}>{term}</span>)}</div>
    </section>

    <section className="guide-related">
      <div><span>KEEP PLANNING</span><h2>Related construction and interior guides</h2></div>
      <div className="guide-related-grid">{related.map(item=><Link key={item.slug} to={'/guides/'+item.slug}><span>{item.category}</span><b>{item.heading}</b><small>Read guide →</small></Link>)}</div>
    </section>

    <section className="guide-local-links">
      <h2>Continue with Hyderabad project planning</h2>
      <div><Link to="/hyderabad/construction">Construction in Hyderabad</Link><Link to="/hyderabad/construction/uppal">Construction in Uppal</Link><Link to="/hyderabad/construction/kukatpally">Construction in Kukatpally</Link><Link to="/hyderabad/construction/gachibowli">Construction in Gachibowli</Link><Link to="/hyderabad/construction/lb-nagar">Construction in LB Nagar</Link></div>
    </section>

    <section className="guide-cta"><span>READY FOR A PROJECT-SPECIFIC NEXT STEP?</span><h2>Turn research into one clear project requirement</h2><p>Use the guide to prepare your questions, then share the actual site, scope, budget and timeline before comparing businesses or quotations.</p><Link to={guide.cta}>{guide.ctaLabel}</Link></section>
  </main>
}
