import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import './HowItWorks.css'

const FLOWS = [
  {
    key: "construction",
    label: "Construction",
    summary: "From your plot to a finished home.",
    route: "/quote#construction",
    action: "Fill Construction Form",
    secondary: {"label":"View Construction Packages","route":"/packages"},
    phases: [
      {
        title: "Plan",
        description: "Decide what you want to build.",
        steps: [
          { title: "Fill the requirement form", detail: "Share your location, plot size, number of floors, budget and needs." },
          { title: "Select a package", detail: "Compare construction packages, prices, materials and inclusions." },
          { title: "Review plans and designs", detail: "Discuss floor plans, layout and design preferences with a professional." }
        ]
      },
      {
        title: "Approve",
        description: "Agree on the work before it begins.",
        steps: [
          { title: "Meet a professional", detail: "Talk to suitable builders and arrange a site visit if needed." },
          { title: "Finalise quotation and scope", detail: "Check drawings, specifications, timeline, payment stages and the agreement." },
          { title: "Complete required approvals", detail: "Confirm permits, engineering checks and site readiness with appointed experts." }
        ]
      },
      {
        title: "Build and hand over",
        description: "Follow execution through final checks.",
        steps: [
          { title: "Start construction", detail: "The selected contractor builds according to the agreed plan and milestones." },
          { title: "Check quality at each stage", detail: "Review structural work, waterproofing, services and finishes with responsible experts." },
          { title: "Inspect and take handover", detail: "Close pending issues and collect keys, documents and agreed warranties." }
        ]
      }
    ],
    note: "Your selected builder and qualified professionals are responsible for site work, approvals, inspections and any agreed warranty."
  },
  {
    key: "interiors",
    label: "Interiors",
    summary: "From an empty space to finished interiors.",
    route: "/quote#interiors",
    action: "Fill Interior Form",
    secondary: {"label":"View Interior Packages","route":"/packages"},
    phases: [
      {
        title: "Plan",
        description: "Choose the look, scope and budget.",
        steps: [
          { title: "Fill the requirement form", detail: "Share your BHK, rooms, location, budget and style preferences." },
          { title: "Select a package", detail: "Compare interior packages, finishes, materials and inclusions." },
          { title: "Review layouts and 3D designs", detail: "Discuss room layouts, storage, colours and design ideas with your designer." }
        ]
      },
      {
        title: "Approve",
        description: "Confirm the exact design and cost.",
        steps: [
          { title: "Take site measurements", detail: "The selected team checks dimensions and service points at the property." },
          { title: "Approve design and quotation", detail: "Finalise drawings, costs, schedule, work scope and payment stages." },
          { title: "Choose materials and finishes", detail: "Confirm plywood, laminates, hardware, colours and product brands." }
        ]
      },
      {
        title: "Install and hand over",
        description: "Bring the approved design to life.",
        steps: [
          { title: "Manufacture and install", detail: "The contracted team makes, delivers and installs the interior work." },
          { title: "Inspect finishing and functions", detail: "Check shutters, fittings, lighting, edges and finishing; resolve pending issues." },
          { title: "Complete final handover", detail: "Collect care instructions, invoices and applicable warranty information." }
        ]
      }
    ],
    note: "Final designs, material selections, production, installation and warranties depend on your agreement with the chosen interior professional."
  },
  {
    key: "realestate",
    label: "Real Estate",
    summary: "From property search to possession.",
    route: "/quote#property",
    action: "Fill Property Form",
    secondary: {"label":"Find Professionals","route":"/experts"},
    phases: [
      {
        title: "Search",
        description: "Find the right property options.",
        steps: [
          { title: "Fill the requirement form", detail: "Choose buy, sell or invest, then share location, property type and budget." },
          { title: "Explore matching options", detail: "Connect with real-estate professionals to discuss suitable properties." },
          { title: "Shortlist properties", detail: "Compare prices, locations, features and ongoing costs." }
        ]
      },
      {
        title: "Visit and verify",
        description: "Check the property before committing.",
        steps: [
          { title: "Visit the property", detail: "Inspect the site, surroundings, layout and actual condition." },
          { title: "Verify property documents", detail: "Have a qualified expert review title, approvals and applicable RERA details." },
          { title: "Agree on price and terms", detail: "Review the total cost, payment schedule, financing and agreement." }
        ]
      },
      {
        title: "Complete and take possession",
        description: "Finish the transaction and handover.",
        steps: [
          { title: "Complete payment and registration", detail: "Follow the agreement and complete applicable registration formalities." },
          { title: "Inspect and take possession", detail: "Confirm property condition, pending items, keys and access." },
          { title: "Finish handover tasks", detail: "Collect documents and arrange relevant utility or ownership record updates." }
        ]
      }
    ],
    note: "Use an independent qualified lawyer or adviser for ownership, title, registration, tax and other property checks."
  }
]

const JOURNEY_HEADLINES = [
  { lead: 'From Design', accent: ' to Handover' },
  { lead: 'From Dream', accent: ' to Possession' },
  { lead: 'From Blueprint', accent: ' to Reality' },
  { lead: 'From Vision', accent: ' to Your New Home' },
]

export default function HowItWorks() {
  const [active, setActive] = useState(() => {
    const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1)
    return FLOWS.some(flow => flow.key === hash) ? hash : 'construction'
  })
  const [contact, setContact] = useState({})
  const [typing, setTyping] = useState({ index: 0, length: 0, phase: 'typing' })
  const headline = JOURNEY_HEADLINES[typing.index]

  useEffect(() => {
    let mounted = true
    publicRequest('/contact?audience=website')
      .then(data => { if (mounted) setContact(data || {}) })
      .catch(() => {})
    const syncFromHash = () => {
      const key = window.location.hash.slice(1)
      if (FLOWS.some(flow => flow.key === key)) setActive(key)
    }
    window.addEventListener('hashchange', syncFromHash)
    return () => {
      mounted = false
      window.removeEventListener('hashchange', syncFromHash)
    }
  }, [])


  // Use the same type/hold/erase rhythm as the homepage, without layout shifts.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      if (typing.phase !== 'static') {
        setTyping({
          index: 0,
          length: JOURNEY_HEADLINES[0].lead.length + JOURNEY_HEADLINES[0].accent.length,
          phase: 'static',
        })
      }
      return undefined
    }
    const timer = window.setTimeout(() => {
      setTyping(current => {
        const phrase = JOURNEY_HEADLINES[current.index]
        const total = phrase.lead.length + phrase.accent.length
        if (current.phase === 'typing') {
          return current.length < total ? { ...current, length: current.length + 1 } : { ...current, phase: 'holding' }
        }
        if (current.phase === 'holding') return { ...current, phase: 'erasing' }
        if (current.phase === 'erasing') {
          return current.length > 0
            ? { ...current, length: current.length - 1 }
            : { index: (current.index + 1) % JOURNEY_HEADLINES.length, length: 0, phase: 'typing' }
        }
        return current
      })
    }, typing.phase === 'holding' ? 2200 : typing.phase === 'erasing' ? 34 : 65)
    return () => window.clearTimeout(timer)
  }, [typing])

  const current = FLOWS.find(flow => flow.key === active) || FLOWS[0]
  const phone = contact.phone || contact.phone_number || contact.mobile || ''
  const email = contact.email || contact.support_email || ''

  function selectFlow(key) {
    setActive(key)
    window.history.replaceState(window.history.state, '', '/how-it-works#' + key)
  }

  function handleTabKey(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? FLOWS.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + FLOWS.length) % FLOWS.length
    selectFlow(FLOWS[next].key)
    document.getElementById('hiw-tab-' + FLOWS[next].key)?.focus()
  }

  return <main className="hiw-page">
    <PublicHeader />
    <div className="hiw-main">
      <header className="hiw-intro">
        <h1 className="hiw-typewriter">
          <span className="hiw-typewriter-a11y">From Design to Handover. From Dream to Possession. From Blueprint to Reality.</span>
          <span className="hiw-typewriter-measure" aria-hidden="true">From Vision to Your New Home</span>
          <span className="hiw-typewriter-active" aria-hidden="true">
            <span className="hiw-typewriter-lead">{headline.lead.slice(0, typing.length)}</span>
            <span className="hiw-typewriter-accent">{headline.accent.slice(0, Math.max(0, typing.length - headline.lead.length))}</span>
            <span className="hiw-typewriter-caret" />
          </span>
        </h1>
      </header>

      <section className="hiw-content" aria-label="Explore service journeys">
        <div className="hiw-service-tabs" role="tablist" aria-label="Choose your service">
          {FLOWS.map((flow, index) => <button
            type="button"
            role="tab"
            id={'hiw-tab-' + flow.key}
            key={flow.key}
            aria-selected={active === flow.key}
            aria-controls="hiw-service-panel"
            tabIndex={active === flow.key ? 0 : -1}
            className={'hiw-service-tab' + (active === flow.key ? ' active' : '')}
            onClick={() => selectFlow(flow.key)}
            onKeyDown={event => handleTabKey(event, index)}
          >{flow.label}</button>)}
        </div>

        <div className="hiw-panel" id="hiw-service-panel" role="tabpanel" aria-labelledby={'hiw-tab-' + active} tabIndex={0}>
          <div className="hiw-panel-heading">
            <h2>{current.label}: step by step</h2>
            <p>{current.summary}</p>
          </div>

          <div className="hiw-phases">
            {current.phases.map((phase, phaseIndex) => <section className="hiw-phase" key={phase.title} aria-labelledby={'hiw-phase-' + phaseIndex}>
              <div className="hiw-phase-heading">
                <span className="hiw-phase-label">PHASE {phaseIndex + 1}</span>
                <h3 id={'hiw-phase-' + phaseIndex}>{phase.title}</h3>
                <p>{phase.description}</p>
              </div>
              <div className="hiw-step-list">
                {phase.steps.map((step, stepIndex) => <article className="hiw-step" key={step.title}>
                  <span className="hiw-step-number" aria-hidden="true">{phaseIndex * 3 + stepIndex + 1}</span>
                  <div className="hiw-step-details">
                    <h4>{step.title}</h4>
                    <p>{step.detail}</p>
                  </div>
                </article>)}
              </div>
            </section>)}
          </div>

          <div className="hiw-actions">
            <h3>Ready to get started?</h3>
            <p>Share your requirement and explore the next steps.</p>
            <div className="hiw-action-buttons">
              <Link className="hiw-primary" to={current.route}>{current.action} <span aria-hidden="true">→</span></Link>
              <Link className="hiw-secondary" to={current.secondary.route}>{current.secondary.label}</Link>
            </div>
          </div>
          <p className="hiw-service-note"><strong>Before you proceed:</strong> {current.note}</p>
        </div>
      </section>
      <p className="hiw-about-platform">ProPulse helps you share requirements, compare options and connect with relevant businesses. Actual designs, execution, inspections, legal services and handover depend on the professionals you choose and their agreed scope.</p>
    </div>
    <PublicFooter phone={phone} email={email} />
  </main>
}
