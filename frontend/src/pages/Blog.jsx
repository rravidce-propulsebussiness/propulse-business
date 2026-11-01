import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CONSTRUCTION_GUIDES } from '../seo/constructionGuides'
import { HYDERABAD_HOMEOWNER_TOPIC_GROUPS, HYDERABAD_HOMEOWNER_TOPICS } from '../seo/hyderabadHomeownerTopics'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import './Blog.css'

const FEATURED = CONSTRUCTION_GUIDES.slice(0, 3)

export default function Blog() {
  const [topicQuery, setTopicQuery] = useState('')
  const [topicCategory, setTopicCategory] = useState('All topics')
  const filteredTopics = useMemo(() => HYDERABAD_HOMEOWNER_TOPICS.filter(topic => (topicCategory === 'All topics' || topic.category === topicCategory) && (!topicQuery.trim() || (topic.title + ' ' + topic.subject + ' ' + topic.intent + ' ' + topic.description).toLowerCase().includes(topicQuery.trim().toLowerCase()))), [topicQuery, topicCategory])
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
    <section className="blog-topic-directory" id="hyderabad-homeowner-topics">
      <div className="blog-shell">
        <div className="blog-section-heading"><div><span>HYDERABAD HOMEOWNER SEARCH LIBRARY</span><h2>Real questions homeowners search before building</h2></div><p>Question-led guides researched from Google search patterns, with practical explanations for homeowners in Hyderabad and across India.</p></div>
        <div className="blog-topic-intro"><b>Research note</b><p>These are distinct homeowner-style search questions informed by Google Trends research guidance, public search-result patterns and common construction decisions. Google Trends shows relative interest, not exact monthly counts. Exact volume rankings require Keyword Planner data. Each question includes an explanation of what the article should answer.</p></div>
        <div className="blog-topic-controls">
          <label className="blog-topic-search"><span>⌕</span><input type="search" value={topicQuery} onChange={event => setTopicQuery(event.target.value)} placeholder="Search topics: 2BHK cost, waterproofing, BuildNow..." aria-label="Search Hyderabad homeowner topics" /></label>
          <select value={topicCategory} onChange={event => setTopicCategory(event.target.value)} aria-label="Filter topics by category"><option>All topics</option>{HYDERABAD_HOMEOWNER_TOPIC_GROUPS.map(group=><option key={group.category}>{group.category}</option>)}</select>
        </div>
        <p className="blog-topic-count">Showing <b>{filteredTopics.length.toLocaleString('en-IN')}</b> of <b>{HYDERABAD_HOMEOWNER_TOPICS.length.toLocaleString('en-IN')}</b> topic ideas</p>
        {HYDERABAD_HOMEOWNER_TOPIC_GROUPS.filter(group => topicCategory === 'All topics' || group.category === topicCategory).map(group => {
          const topics = filteredTopics.filter(topic => topic.category === group.category)
          if (!topics.length) return null
          return <details className="blog-topic-group" key={group.category} open={Boolean(topicQuery) || topicCategory !== 'All topics'}>
            <summary><span>{group.category}</span><b>{topics.length} topics</b><i>+</i></summary>
            <ol>{topics.map(topic=><li key={topic.id}><span>{topic.title}</span><small>{topic.description}</small></li>)}</ol>
          </details>
        })}
        <p className="blog-topic-footnote">Search topics are research-informed, not a verified Google search-volume ranking. Technical, safety, legal and approval guidance must be reviewed against current standards and official sources before publication.</p>
      </div>
    </section>
    <section className="blog-cta"><div className="blog-shell"><span>READY TO TAKE THE NEXT STEP?</span><h2>Turn what you’ve learned into a clear project brief.</h2><p>Share your location, scope, preferences and timeline with ProPulse to start planning your construction or interior project.</p><Link to="/quote">Start a project requirement <span>→</span></Link></div></section>
    <PublicFooter />
  </main>
}
