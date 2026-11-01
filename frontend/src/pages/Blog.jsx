import { Link } from 'react-router-dom'
import { CONSTRUCTION_GUIDES } from '../seo/constructionGuides'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import './Blog.css'

const FEATURED = CONSTRUCTION_GUIDES.slice(0, 3)

export default function Blog() {
  const categories = [...new Set(CONSTRUCTION_GUIDES.map(item => item.category))]
  return <main className="propulse-blog">
    <PublicHeader />
    <section className="blog-hero">
      <div className="blog-shell">
        <div className="blog-breadcrumb"><Link to="/">Home</Link><span> / </span><b>Blog</b></div>
        <span className="blog-kicker">THE PROPULSE JOURNAL</span>
        <h1>Ideas and practical guidance for building better spaces.</h1>
        <p>Explore useful construction, home-interior and project-planning articles. Make informed decisions before you select materials, compare quotations or begin work.</p>
        <div className="blog-hero-actions"><Link to="/guides">Explore all guides <span>↗</span></Link><Link to="/quote#construction">Plan your project <span>→</span></Link></div>
        <div className="blog-hero-art" aria-hidden="true"><div className="blog-art-window"/><div className="blog-art-wall"/><div className="blog-art-sofa"/><div className="blog-art-table"/><div className="blog-art-plant"/></div>
      </div>
    </section>
    <section className="blog-shell blog-featured">
      <div className="blog-section-heading"><div><span>START READING</span><h2>Featured articles</h2></div><Link to="/guides">View all guides <span>→</span></Link></div>
      <div className="blog-featured-grid">{FEATURED.map((item,index)=><Link className={'blog-featured-card blog-featured-card-'+index} to={'/guides/'+item.slug} key={item.slug}><span className="blog-card-category">{item.category}</span><span className="blog-card-number">0{index+1}</span><div><h3>{item.heading}</h3><p>{item.summary}</p><b>Read article <span>↗</span></b></div></Link>)}</div>
    </section>
    <section className="blog-library">
      <div className="blog-shell">
        <div className="blog-section-heading"><div><span>THE KNOWLEDGE LIBRARY</span><h2>Browse by topic</h2></div><p>Clear, practical information for every stage of your project.</p></div>
        {categories.map(category=><section className="blog-category" key={category}><div className="blog-category-title"><h3>{category}</h3><span>{CONSTRUCTION_GUIDES.filter(item=>item.category===category).length} articles</span></div><div className="blog-article-grid">{CONSTRUCTION_GUIDES.filter(item=>item.category===category).map(item=><Link className="blog-article-card" to={'/guides/'+item.slug} key={item.slug}><span>{item.category}</span><h4>{item.heading}</h4><p>{item.summary}</p><b>Read article <span>→</span></b></Link>)}</div></section>)}
      </div>
    </section>
    <section className="blog-cta"><div className="blog-shell"><span>READY TO TAKE THE NEXT STEP?</span><h2>Turn what you’ve learned into a clear project brief.</h2><p>Share your location, scope, preferences and timeline with ProPulse to start planning your construction or interior project.</p><Link to="/quote">Start a project requirement <span>→</span></Link></div></section>
    <PublicFooter />
  </main>
}
