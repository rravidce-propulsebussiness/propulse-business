import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import './Projects.css'

const CONCEPTS = [
  {
    id: 'home-exteriors',
    category: 'construction',
    title: 'Contemporary Home Exteriors',
    description: 'Clean elevations, natural light and thoughtfully planned spaces.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85',
    link: '/packages#construction',
  },
  {
    id: 'living-spaces',
    category: 'design',
    title: 'Warm Contemporary Interiors',
    description: 'Layered lighting, inviting finishes and timeless living areas.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85',
    link: '/packages#interior',
  },
  {
    id: 'modular-kitchens',
    category: 'design',
    title: 'Modular Kitchen Ideas',
    description: 'Smart storage, durable materials and everyday convenience.',
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=85',
    link: '/packages#interior',
  },
  {
    id: 'villa-interiors',
    category: 'design',
    title: 'Refined Villa Interiors',
    description: 'Elegant details, comfortable layouts and coordinated finishes.',
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85',
    link: '/packages#interior',
  },
]

const PAGE_SIZE = 18
const CATEGORIES = [
  { id: 'all', label: 'All Projects' },
  { id: 'construction', label: 'Construction' },
  { id: 'design', label: 'Interiors' },
  { id: 'property', label: 'Real Estate' },
]

function categoryOf(value) {
  const type = String(value || '').toLowerCase()
  if (type.includes('interior') || type.includes('design')) return 'design'
  if (type.includes('estate') || type.includes('property') || type.includes('plot')) return 'property'
  return 'construction'
}

function categoryLabel(category) {
  return category === 'design' ? 'Interior Design' : category === 'property' ? 'Real Estate' : 'Construction'
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function publicMediaUrl(value) {
  const valueText = clean(value)
  if (!valueText) return ''
  try {
    const url = new URL(valueText, window.location.origin)
    return (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : ''
  } catch {
    return ''
  }
}

function normalizeProject(project, index) {
  const category = categoryOf(project.project_type)
  return {
    id: clean(project.project_id || project.id || ('entry-' + index)),
    category,
    type: clean(project.project_type) || categoryLabel(category),
    title: clean(project.title) || 'Professional Project',
    description: clean(project.description),
    location: clean(project.location_text),
    area: clean(project.area_text),
    cost: clean(project.budget_text),
    completionYear: clean(project.completion_year),
    businessName: clean(project.business_name),
    verified: project.is_verified === true,
    image: publicMediaUrl(project.cover_image_url),
    document: publicMediaUrl(project.plan_url),
    video: publicMediaUrl(project.video_url),
    publishedAt: clean(project.published_at),
  }
}

function Icon({ name, size = 18 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'pin') return <svg {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if (name === 'arrow') return <svg {...props}><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
  if (name === 'search') return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
  if (name === 'file') return <svg {...props}><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/></svg>
  if (name === 'check') return <svg {...props}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'shield') return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'layers') return <svg {...props}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5m-18 0 9 5 9-5"/></svg>
  return null
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [contactData, setContactData] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    let active = true
    publicRequest('/contact?audience=website')
      .then(value => { if (active) setContactData(value || {}) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    publicRequest('/experts/projects?page=1&pageSize=' + PAGE_SIZE)
      .then(value => {
        if (!active) return
        const rows = Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []
        setProjects(rows.map(normalizeProject))
        setHasNext(Boolean(value?.pagination?.hasNextPage))
        setPage(1)
        setLoadError('')
      })
      .catch(() => { if (active) setLoadError('Projects could not be loaded. Please try again shortly.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function loadMore() {
    if (loadingMore || !hasNext) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const value = await publicRequest('/experts/projects?page=' + next + '&pageSize=' + PAGE_SIZE)
      const rows = Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []
      setProjects(current => {
        const found = new Set(current.map(project => project.id))
        return [...current, ...rows.map(normalizeProject).filter(project => !found.has(project.id))]
      })
      setHasNext(Boolean(value?.pagination?.hasNextPage))
      setPage(next)
      setLoadError('')
    } catch {
      setLoadError('More projects could not be loaded. Please try again.')
    } finally {
      setLoadingMore(false)
    }
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return projects.filter(project => {
      if (category !== 'all' && project.category !== category) return false
      if (!term) return true
      return [project.title, project.location, project.businessName, project.type, project.description]
        .some(value => value.toLowerCase().includes(term))
    })
  }, [projects, category, query])

  useEffect(() => {
    if (!selectedProject) return undefined
    const oldOverflow = document.body.style.overflow
    const originalFocus = document.activeElement
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('button')?.focus()
    const handleKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSelectedProject(null)
      }
      if (event.key !== 'Tab') return
      const elements = [...(dialogRef.current?.querySelectorAll('a[href],button:not([disabled])') || [])]
        .filter(element => element.getClientRects().length)
      if (!elements.length) return
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = oldOverflow
      document.removeEventListener('keydown', handleKey)
      if (originalFocus?.isConnected) originalFocus.focus()
    }
  }, [selectedProject])

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''
  const isPdf = value => /\.pdf(?:[?#]|$)/i.test(value)
  const similarQuoteHash = project => project.category === 'design' ? 'interiors' : project.category === 'property' ? 'property' : 'construction'

  return <main className="pj-page">
    <PublicHeader />

    <section className="pj-portfolio-hero" aria-labelledby="pj-page-heading">
      <div className="pj-container">
        <span className="pj-kicker"><span /> THE PROJECT EDIT</span>
        <h1 id="pj-page-heading">Real spaces. <em>Beautiful possibilities.</em></h1>
        <p>Browse work shared by professionals, discover inspiring spaces and find the right direction for your own project.</p>
        <div className="pj-hero-actions">
          <a href="#completed-projects" className="pj-hero-primary">Explore Projects <Icon name="arrow" size={17}/></a>
          <Link to="/quote#construction" className="pj-hero-secondary">Get Your Quote <Icon name="arrow" size={17}/></Link>
        </div>
      </div>
    </section>

    <section className="pj-portfolio-section" id="completed-projects" aria-labelledby="pj-completed-heading">
      <div className="pj-container">
        <div className="pj-section-heading">
          <div>
            <span className="pj-overline">PROFESSIONAL PORTFOLIO</span>
            <h2 id="pj-completed-heading">Projects by professionals</h2>
            <p>Published work with real project details, shown as provided by the professional.</p>
          </div>
        </div>

        <div className="pj-toolbar">
          <div className="pj-tabs" role="group" aria-label="Project categories">
            {CATEGORIES.map(item => <button type="button" key={item.id} className={category === item.id ? 'active' : ''} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
          </div>
          <label className="pj-search"><Icon name="search"/><span className="pj-sr-only">Search projects</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by project or location"/></label>
        </div>

        {loading ? <div className="pj-loading" role="status"><span className="pj-loading-shimmer" /><span className="pj-loading-shimmer" /><span className="pj-loading-shimmer" /></div> : null}
        {!loading && filtered.length > 0 && <div className="pj-project-grid">
          {filtered.map(project => <article key={project.id} className="pj-project-card">
            <button type="button" className="pj-card-open" onClick={() => setSelectedProject(project)} aria-label={'View details for ' + project.title}>
              <div className="pj-project-photo">
                {project.image ? <img src={project.image} loading="lazy" alt={project.title}/> : <div className="pj-image-placeholder"><Icon name="layers" size={32}/><span>Project imagery coming soon</span></div>}
                <span className="pj-category-badge">{categoryLabel(project.category)}</span>
                <span className="pj-photo-cue">View Project <Icon name="arrow" size={15}/></span>
              </div>
              <div className="pj-project-copy">
                <div className="pj-project-title-row"><h3>{project.title}</h3><Icon name="arrow" size={19}/></div>
                {project.location && <p className="pj-location"><Icon name="pin" size={15}/>{project.location}</p>}
                {project.businessName && <p className="pj-company">{project.businessName}{project.verified && <span title="Verified professional"><Icon name="check" size={12}/> Verified</span>}</p>}
                <div className="pj-project-details">
                  {project.completionYear && <span>Completed {project.completionYear}</span>}
                  {project.area && <span>{project.area}</span>}
                </div>
                {project.cost && <div className="pj-cost"><small>Reported cost / budget</small><strong>{project.cost}</strong></div>}
                <span className="pj-view-link">Explore Details <Icon name="arrow" size={15}/></span>
              </div>
            </button>
          </article>)}
        </div>}

        {!loading && filtered.length === 0 && <div className="pj-empty">
          <div className="pj-empty-symbol"><Icon name="layers" size={29}/></div>
          <h3>{loadError ? 'Unable to load projects right now' : projects.length ? 'No matching projects yet' : 'Professional projects are coming soon'}</h3>
          <p>{loadError || (projects.length ? 'Try another category or search term to discover more work.' : 'This portfolio will feature published projects from professionals. We only display actual submissions, not placeholder completed work.')}</p>
          <div className="pj-empty-actions">
            {projects.length > 0 && <button type="button" onClick={() => { setCategory('all'); setQuery('') }}>Clear Filters</button>}
            <Link to="/experts">Find a Professional <Icon name="arrow" size={15}/></Link>
          </div>
        </div>}
        {!loading && loadError && filtered.length > 0 && <p className="pj-load-error" role="status">{loadError}</p>}
        {!loading && hasNext && <button className="pj-load-more" type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading more projects…' : 'View More Projects'} <Icon name="arrow" size={16}/></button>}
      </div>
    </section>

    <section className="pj-ideas-section" aria-labelledby="pj-ideas-heading">
      <div className="pj-container">
        <div className="pj-section-heading pj-ideas-heading">
          <div><span className="pj-overline">DESIGN INSPIRATION</span><h2 id="pj-ideas-heading">Ideas for your next space</h2><p>Illustrative concepts to help you picture what is possible. These are not claimed as completed client projects.</p></div>
          <Link to="/packages">Explore Packages <Icon name="arrow" size={16}/></Link>
        </div>
        <div className="pj-ideas-grid">
          {CONCEPTS.map(concept => <article className="pj-idea-card" key={concept.id}>
            <img src={concept.image} alt={concept.title} loading="lazy"/>
            <div className="pj-idea-copy"><span>{concept.category === 'design' ? 'INTERIOR CONCEPT' : 'CONSTRUCTION CONCEPT'}</span><h3>{concept.title}</h3><p>{concept.description}</p><Link to={concept.link}>Explore Packages <Icon name="arrow" size={15}/></Link></div>
          </article>)}
        </div>
      </div>
    </section>

    <section className="pj-bottom-cta">
      <div className="pj-container"><div><span>YOUR NEXT PROJECT STARTS HERE</span><h2>Bring your vision to life.</h2><p>Share your requirements and discover suitable packages and professionals.</p></div><Link to="/quote#construction">Start Your Project <Icon name="arrow" size={18}/></Link></div>
    </section>

    {selectedProject && <div className="pj-detail-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedProject(null) }}>
      <section className="pj-detail-modal" role="dialog" aria-modal="true" aria-label={selectedProject.title + ' details'} ref={dialogRef} tabIndex={-1}>
        <button className="pj-detail-close" type="button" onClick={() => setSelectedProject(null)} aria-label="Close project details">×</button>
        <div className="pj-detail-media">
          {selectedProject.image ? <img src={selectedProject.image} alt={selectedProject.title}/> : <div className="pj-image-placeholder"><Icon name="layers" size={40}/>Project photo not supplied</div>}
          <span className="pj-category-badge">{categoryLabel(selectedProject.category)}</span>
        </div>
        <div className="pj-detail-content">
          <span className="pj-overline">PROFESSIONAL PROJECT</span>
          <h2>{selectedProject.title}</h2>
          {selectedProject.location && <p className="pj-detail-location"><Icon name="pin" size={16}/>{selectedProject.location}</p>}
          {selectedProject.businessName && <p className="pj-detail-professional">Shared by <strong>{selectedProject.businessName}</strong>{selectedProject.verified && <span><Icon name="check" size={12}/> Verified</span>}</p>}
          <div className="pj-facts">
            <div><span>Project type</span><strong>{selectedProject.type}</strong></div>
            {selectedProject.area && <div><span>Project area</span><strong>{selectedProject.area}</strong></div>}
            {selectedProject.completionYear && <div><span>Completion</span><strong>{selectedProject.completionYear}</strong></div>}
            {selectedProject.cost && <div className="pj-fact-cost"><span>Reported project cost / budget</span><strong>{selectedProject.cost}</strong></div>}
          </div>
          {selectedProject.description && <div className="pj-detail-overview"><h3>About the project</h3><p>{selectedProject.description}</p></div>}
          <div className="pj-detail-documents">
            <h3>Project information</h3>
            <p>Packages, material specifications and final costs may vary by project. Contact a professional to confirm what is included.</p>
            <div className="pj-detail-buttons">
              {selectedProject.document && <a href={selectedProject.document} target="_blank" rel="noopener noreferrer"><Icon name="file" size={17}/>{isPdf(selectedProject.document) ? 'Open / Download Project PDF' : 'View Project Document'}</a>}
              {selectedProject.video && <a href={selectedProject.video} target="_blank" rel="noopener noreferrer"><Icon name="arrow" size={17}/> View Project Video</a>}
              <Link to="/packages" onClick={() => setSelectedProject(null)}><Icon name="layers" size={17}/> Compare Packages</Link>
            </div>
          </div>
          <div className="pj-modal-cta"><div><strong>Planning something similar?</strong><span>Get a quotation tailored to your site and scope.</span></div><Link to={'/quote#' + similarQuoteHash(selectedProject)} onClick={() => setSelectedProject(null)}>Get Quote <Icon name="arrow" size={17}/></Link></div>
          <p className="pj-data-disclaimer">Project information is supplied by the publishing professional. Confirm scope, specifications and final pricing before proceeding.</p>
        </div>
      </section>
    </div>}

    <PublicFooter phone={phone} email={email}/>
  </main>
}
