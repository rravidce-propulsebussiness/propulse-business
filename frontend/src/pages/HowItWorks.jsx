import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './HowItWorks.css'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'

const FLOWS = [
  {
    key: 'construction',
    label: 'Construction',
    subtitle: 'Plot to completed home',
    kicker: 'BUILD WITH A CLEAR PLAN',
    title: 'From your plot to your keys.',
    description: 'Understand the steps behind a home construction project, from sharing your requirement and choosing a package to drawings, site execution and final handover.',
    image: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1400&q=85',
    route: '/quote#construction',
    action: 'Share Construction Requirement',
    secondary: { label: 'Compare Construction Packages', route: '/packages' },
    reminder: 'Confirm the plot details, design scope, material brands, stage-wise payments, inspection responsibilities and warranty terms with your selected builder before work starts.',
    phases: [
      {
        tag: 'DISCOVER & COMPARE',
        title: 'First, make the right choices.',
        intro: 'Start with your needs, then compare packages and real professional work.',
        steps: [
          { icon: 'clipboard', title: 'Fill your requirement form', text: 'Share location, plot size, built-up area, floors, budget, timeline and other construction needs.', check: 'A clear brief for relevant professionals' },
          { icon: 'calculator', title: 'Explore & compare packages', text: 'Review available construction packages, inclusions, material specifications and indicative rates.', check: 'Know what each package includes' },
          { icon: 'home', title: 'Review plans & completed work', text: 'Explore layouts, designs and published projects. Shortlist approaches that suit your plot and lifestyle.', check: 'Discuss a preferred plan and style' },
        ],
      },
      {
        tag: 'DESIGN & APPROVE',
        title: 'Agree on the details before work.',
        intro: 'Your chosen professional helps turn an initial idea into an executable scope.',
        steps: [
          { icon: 'people', title: 'Consultation & site assessment', text: 'Connect with businesses and arrange a site review, measurements and feasibility discussion as needed.', check: 'Validate site conditions and requirements' },
          { icon: 'receipt', title: 'Quotation, drawings & contract', text: 'Review architectural and structural drawings, detailed scope, material brands, exclusions, budget and payment milestones.', check: 'Approve the final quote and agreement' },
          { icon: 'shield', title: 'Approvals & site preparation', text: 'Confirm applicable permits, engineering assessments, soil testing, schedule and site preparation with appointed experts.', check: 'Clear pre-construction requirements' },
        ],
      },
      {
        tag: 'EXECUTE & HAND OVER',
        title: 'Watch the project take shape.',
        intro: 'Execution and inspections follow the agreed scope and project milestones.',
        steps: [
          { icon: 'building', title: 'Construction execution', text: 'The selected contractor carries out foundation, structure, masonry, electrical, plumbing, waterproofing and finishes as contracted.', check: 'Review milestone progress with the contractor' },
          { icon: 'check', title: 'Quality checks & final inspection', text: 'Have responsible professionals inspect critical stages, workmanship, curing, waterproofing and outstanding defects.', check: 'Close the agreed inspection and snag list' },
          { icon: 'handshake', title: 'Home handover & aftercare', text: 'Walk through the finished home and collect agreed keys, drawings, manuals, certificates and warranty information.', check: 'Complete documented handover' },
        ],
      },
    ],
  },
  {
    key: 'interiors',
    label: 'Interiors',
    subtitle: 'Empty space to finished home',
    kicker: 'DESIGN YOUR EVERYDAY',
    title: 'From your ideas to a finished space.',
    description: 'See how an interior project moves from a room-by-room brief and package selection through layouts, 3D designs, production, installation and handover.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85',
    route: '/quote#interiors',
    action: 'Share Interior Requirement',
    secondary: { label: 'Compare Interior Packages', route: '/packages' },
    reminder: 'Ask the selected designer to confirm final measurements, plywood and laminate brands, hardware, finishes, 3D design approval, delivery milestones and after-sales terms.',
    phases: [
      {
        tag: 'DISCOVER & COMPARE',
        title: 'Begin with how you want to live.',
        intro: 'Capture your room requirements, preferred style and budget.',
        steps: [
          { icon: 'clipboard', title: 'Fill your interior requirement', text: 'Choose BHK, rooms, location, budget, style and the work needed for kitchens, wardrobes, furniture and finishes.', check: 'Room-wise needs recorded' },
          { icon: 'calculator', title: 'Select & compare packages', text: 'Explore interior package options, specifications, materials, finishes and what is included or excluded.', check: 'Shortlist a suitable package and budget' },
          { icon: 'spark', title: 'Explore plans & 3D concepts', text: 'Discuss space plans, reference designs, mood boards and visualisations with the professional you select.', check: 'Agree on a design direction' },
        ],
      },
      {
        tag: 'DESIGN & APPROVE',
        title: 'Finalise before manufacturing.',
        intro: 'Turn the chosen design into approved drawings, materials and costs.',
        steps: [
          { icon: 'people', title: 'Site visit & measurements', text: 'The selected team checks site dimensions, electrical points, plumbing, doors, windows and execution feasibility.', check: 'Site-validated measurements' },
          { icon: 'receipt', title: 'Final drawings & quotation', text: 'Review 2D/3D designs, material brands, hardware, line-item costs, revisions and the proposed execution schedule.', check: 'Approve drawings, scope and payment stages' },
          { icon: 'shield', title: 'Materials & design sign-off', text: 'Confirm plywood, laminates, colours, finishes, fixtures and samples before ordering or fabrication begins.', check: 'Sign off the final material list' },
        ],
      },
      {
        tag: 'PRODUCE & HAND OVER',
        title: 'Bring every detail to life.',
        intro: 'Production, on-site work and quality control complete the space.',
        steps: [
          { icon: 'chair', title: 'Production & installation', text: 'As contracted, the team coordinates modular fabrication, civil and electrical work, delivery and on-site installation.', check: 'Track installation milestones' },
          { icon: 'check', title: 'Finish checks & snag closure', text: 'Inspect alignment, edges, shutters, hardware, lighting, finishes and function; record and resolve agreed snags.', check: 'Walk through the finished rooms' },
          { icon: 'handshake', title: 'Final handover & support', text: 'Confirm the completed scope and collect care instructions, invoices and applicable product or workmanship warranties.', check: 'Receive the agreed handover documents' },
        ],
      },
    ],
  },
  {
    key: 'realestate',
    label: 'Real Estate',
    subtitle: 'Property search to possession',
    kicker: 'MAKE AN INFORMED MOVE',
    title: 'From property search to possession.',
    description: 'A practical property journey for buyers, sellers and investors: defining requirements, exploring options, site visits, independent checks, agreement, registration and possession.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1400&q=85',
    route: '/quote#property',
    action: 'Share Property Requirement',
    secondary: { label: 'Explore Professionals', route: '/experts' },
    reminder: 'Before paying or signing, independently verify ownership, title chain, encumbrances, applicable RERA registration, permissions, total costs and contract terms with qualified advisers.',
    phases: [
      {
        tag: 'EXPLORE & SHORTLIST',
        title: 'Know what you are looking for.',
        intro: 'Define your needs and compare suitable opportunities.',
        steps: [
          { icon: 'clipboard', title: 'Share your property requirement', text: 'Tell us whether you want to buy, sell or invest, along with location, property type, area, budget and preferences.', check: 'A clear property brief' },
          { icon: 'search', title: 'Explore relevant options', text: 'Discuss suitable property leads and available options with relevant real-estate professionals.', check: 'A shortlist that fits your priorities' },
          { icon: 'building', title: 'Compare locations & properties', text: 'Consider neighbourhood, access, layout, amenities, price, ongoing costs and future requirements.', check: 'Prioritise the best-fit choices' },
        ],
      },
      {
        tag: 'VISIT & VERIFY',
        title: 'Check before you commit.',
        intro: 'Compare on the ground and independently review important documents.',
        steps: [
          { icon: 'pin', title: 'Site visits & discussions', text: 'Arrange viewings with the relevant business and inspect condition, measurements, surroundings and suitability.', check: 'Visit and compare shortlisted options' },
          { icon: 'shield', title: 'Legal & project due diligence', text: 'Ask an independent lawyer or qualified expert to check ownership, title, encumbrances, approvals and RERA details when applicable.', check: 'Verify documents before committing funds' },
          { icon: 'receipt', title: 'Offer, costs & agreement', text: 'Negotiate price and terms, review taxes, fees, financing, payment conditions and the draft agreement.', check: 'Understand and approve the transaction terms' },
        ],
      },
      {
        tag: 'CLOSE & TAKE POSSESSION',
        title: 'Complete the transaction confidently.',
        intro: 'Finish the legal transfer and document the property handover.',
        steps: [
          { icon: 'handshake', title: 'Payments & registration', text: 'Follow the agreed payment schedule and complete applicable sale-deed registration or other formalities with authorised parties.', check: 'Collect registered transaction documents' },
          { icon: 'check', title: 'Possession & inspection', text: 'Inspect the property and agreed fixtures, record outstanding items and confirm keys, access and possession conditions.', check: 'Document the possession handover' },
          { icon: 'home', title: 'Post-handover essentials', text: 'Arrange relevant utility transfers, association records, mutation or tax updates and safekeeping of original documents.', check: 'Complete the ownership or move-in checklist' },
        ],
      },
    ],
  },
]

function Icon({name,size=20}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='home')return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if(name==='sofa')return <svg {...p}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/></svg>
  if(name==='building')return <svg {...p}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if(name==='clipboard')return <svg {...p}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/></svg>
  if(name==='calculator')return <svg {...p}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/></svg>
  if(name==='people')return <svg {...p}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if(name==='spark')return <svg {...p}><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z"/></svg>
  if(name==='chair')return <svg {...p}><path d="M7 12V7a2 2 0 0 1 4 0v5M17 12V7a2 2 0 0 0-4 0v5"/><path d="M5 12h14v5H5zM7 17v4M17 17v4"/></svg>
  if(name==='search')return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
  if(name==='handshake')return <svg {...p}><path d="m8 11 3 3c1 1 2 .8 3 0l3-3"/><path d="m3 8 4-4 4 4-4 4zM21 8l-4-4-4 4 4 4z"/><path d="M9 16l2 2c1 1 2 1 3 0l3-3"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='receipt')return <svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
  if(name==='support')return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if(name==='chat')return <svg {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='phone')return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if(name==='check')return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  return null
}


export default function HowItWorks() {
  const [active, setActive] = useState(() => {
    const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1)
    return FLOWS.some(flow => flow.key === hash) ? hash : 'construction'
  })
  const [contactData, setContactData] = useState({})

  useEffect(() => {
    let alive = true
    publicRequest('/contact?audience=website')
      .then(value => { if (alive) setContactData(value || {}) })
      .catch(() => { if (alive) setContactData({}) })
    const syncHash = () => {
      const hash = window.location.hash.slice(1)
      if (FLOWS.some(flow => flow.key === hash)) setActive(hash)
    }
    window.addEventListener('hashchange', syncHash)
    return () => { alive = false; window.removeEventListener('hashchange', syncHash) }
  }, [])

  function selectFlow(key) {
    setActive(key)
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', '/how-it-works#' + key)
    }
  }

  function onTabKeyDown(event, index) {
    const { key } = event
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(key)) return
    event.preventDefault()
    const next = key === 'Home' ? 0 : key === 'End' ? FLOWS.length - 1
      : (index + (key === 'ArrowRight' ? 1 : -1) + FLOWS.length) % FLOWS.length
    selectFlow(FLOWS[next].key)
    document.getElementById('hiw-tab-' + FLOWS[next].key)?.focus()
  }

  const flow = FLOWS.find(item => item.key === active) || FLOWS[0]
  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''

  return <main className="hiw-page">
    <PublicHeader />

    <header className="hiw-hero">
      <div className="hiw-shell hiw-hero-inner">
        <div className="hiw-hero-copy">
          <span className="hiw-eyebrow"><span className="hiw-eyebrow-mark" /> HOW PROPULSE WORKS</span>
          <h1>From first idea to <em>final handover.</em></h1>
          <p>Every successful project starts with the right questions. See the full journey for construction, interiors or real estate—from your requirement form to planning, approvals, delivery and the last checklist.</p>
          <div className="hiw-hero-actions">
            <Link className="hiw-btn hiw-btn-primary" to={flow.route}>Start Your Requirement <Icon name="arrow" size={18}/></Link>
            <a className="hiw-btn hiw-btn-ghost" href="#hiw-choose">Explore the steps <Icon name="arrow" size={17}/></a>
          </div>
        </div>
        <div className="hiw-hero-art" aria-hidden="true">
          <div className="hiw-hero-art-back" />
          <div className="hiw-hero-image"><img src={flow.image} alt="" /></div>
          <div className="hiw-hero-float hiw-hero-float-top"><span><Icon name="clipboard" size={17}/></span> A clear starting brief</div>
          <div className="hiw-hero-float hiw-hero-float-bottom"><span><Icon name="check" size={17}/></span> A confident next step</div>
        </div>
      </div>
    </header>

    <section className="hiw-choose hiw-shell" id="hiw-choose" aria-labelledby="hiw-choose-title">
      <div className="hiw-section-lead">
        <div>
          <span className="hiw-overline">THREE SERVICES · THREE CLEAR JOURNEYS</span>
          <h2 id="hiw-choose-title">What are you planning?</h2>
        </div>
        <p>Select your service to explore each stage in order.</p>
      </div>
      <div className="hiw-tabs" role="tablist" aria-label="Select a project journey">
        {FLOWS.map((item, index) => <button
          key={item.key}
          id={'hiw-tab-' + item.key}
          type="button"
          role="tab"
          aria-selected={active === item.key}
          aria-controls="hiw-process-panel"
          tabIndex={active === item.key ? 0 : -1}
          className={'hiw-tab' + (active === item.key ? ' is-active' : '')}
          onClick={() => selectFlow(item.key)}
          onKeyDown={event => onTabKeyDown(event, index)}
        >
          <span className="hiw-tab-icon"><Icon name={item.key === 'construction' ? 'home' : item.key === 'interiors' ? 'sofa' : 'building'} size={23}/></span>
          <span className="hiw-tab-label"><strong>{item.label}</strong><small>{item.subtitle}</small></span>
          <span className="hiw-tab-arrow"><Icon name="arrow" size={16}/></span>
        </button>)}
      </div>
    </section>

    <section className="hiw-journey hiw-shell" id="hiw-process-panel" role="tabpanel" aria-labelledby={'hiw-tab-' + active} tabIndex={0} key={active}>
      <div className="hiw-journey-head">
        <div className="hiw-journey-head-copy">
          <span className="hiw-overline">{flow.kicker}</span>
          <h2>{flow.title}</h2>
          <p>{flow.description}</p>
          <div className="hiw-journey-facts">
            <span><Icon name="clipboard" size={17}/> 9 clear steps</span>
            <span><Icon name="shield" size={17}/> Decisions & checkpoints</span>
            <span><Icon name="handshake" size={17}/> Handover guidance</span>
          </div>
        </div>
        <div className="hiw-journey-photo"><img src={flow.image} alt="" loading="lazy"/><div className="hiw-photo-caption"><span>YOUR JOURNEY</span><strong>Explore. Decide. Complete.</strong></div></div>
      </div>
      <div className="hiw-stage-index" aria-label="Journey stages">
        {flow.phases.map((phase, i) => <a href={'#hiw-stage-' + (i + 1)} key={phase.tag}>
          <span>{String(i + 1).padStart(2, '0')}</span><strong>{phase.tag}</strong><Icon name="arrow" size={15}/>
        </a>)}
      </div>

      <div className="hiw-phases">
        {flow.phases.map((phase, i) => <section className="hiw-phase" id={'hiw-stage-' + (i + 1)} key={phase.tag}>
          <div className="hiw-phase-heading">
            <span className="hiw-phase-number">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <span className="hiw-overline">{phase.tag}</span>
              <h3>{phase.title}</h3>
              <p>{phase.intro}</p>
            </div>
          </div>
          <div className="hiw-step-grid">
            {phase.steps.map((step, j) => <article className="hiw-step-card" key={step.title}>
              <div className="hiw-step-card-top">
                <span className="hiw-step-number">STEP {String(i * 3 + j + 1).padStart(2, '0')}</span>
                <span className="hiw-step-icon"><Icon name={step.icon} size={22}/></span>
              </div>
              <h4>{step.title}</h4>
              <p>{step.text}</p>
              <div className="hiw-step-check"><Icon name="check" size={16}/><span>{step.check}</span></div>
            </article>)}
          </div>
        </section>)}
      </div>
    </section>

    <section className="hiw-next hiw-shell">
      <div className="hiw-next-main">
        <span className="hiw-overline">READY FOR YOUR FIRST STEP?</span>
        <h2>Start with a requirement. Move forward with clarity.</h2>
        <p>Describe what you need, review your options and choose the right professionals for your project.</p>
        <div className="hiw-next-actions">
          <Link className="hiw-btn hiw-btn-primary" to={flow.route}>{flow.action} <Icon name="arrow" size={18}/></Link>
          <Link className="hiw-btn hiw-btn-outline" to={flow.secondary.route}>{flow.secondary.label}</Link>
          <Link className="hiw-next-simple" to="/projects">Explore Completed Projects <Icon name="arrow" size={16}/></Link>
        </div>
      </div>
      <aside className="hiw-next-aside">
        <span className="hiw-next-aside-icon"><Icon name="shield" size={22}/></span>
        <h3>Before you proceed</h3>
        <p>{flow.reminder}</p>
      </aside>
    </section>

    <section className="hiw-platform-note hiw-shell">
      <Icon name="support" size={20}/>
      <p><strong>How ProPulse fits in:</strong> ProPulse helps you share requirements, explore published packages and projects, and connect with relevant businesses. Designs, quotes, execution, inspections, legal checks and handover are managed by the professionals you engage under their agreed scope; services and deliverables vary by project.</p>
    </section>

    <PublicFooter phone={phone} email={email} />
  </main>
}
