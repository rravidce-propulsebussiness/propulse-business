import { useEffect, useState } from 'react'
import { useInView, useReducedMotion } from './useHomeMotion'

// Illustrative product mock-up of the ProPulse Business OS. Values are sample
// data for the demo, not company metrics.
const FEED = [
  { tone: 'green', title: 'Slab casting photos shared', meta: 'Site team · Villa project' },
  { tone: 'blue', title: 'Quotation v2 sent to client', meta: 'Quotes · Interiors' },
  { tone: 'orange', title: 'New enquiry: G+1 house, 200 sq yd', meta: 'CRM · Lead captured' },
  { tone: 'green', title: 'Milestone payment received', meta: 'Finance · Invoice paid' },
  { tone: 'blue', title: 'Kitchen design approved', meta: 'Client portal' },
]
const MODULES = [
  { label: 'CRM & leads', title: 'Enquiry pipeline', bars: [['Qualified', 68], ['Site visits', 45], ['Converted', 22]] },
  { label: 'Quotations', title: 'Quotes this month', bars: [['Drafted', 90], ['Sent', 64], ['Approved', 38]] },
  { label: 'Projects', title: 'Villa, Gachibowli', bars: [['Structure', 82], ['Electrical', 56], ['Interiors', 24]] },
  { label: 'Finance', title: 'Milestone billing', bars: [['Billed', 72], ['Collected', 61], ['Overdue', 8]] },
  { label: 'Client portal', title: 'Shared with client', bars: [['Photos', 88], ['Approvals', 54], ['Documents', 70]] },
]

export default function TechDashboard() {
  const reduced = useReducedMotion()
  const [ref, inView] = useInView({ threshold: 0.25 })
  const [seenRef, seen] = useInView({ once: true, threshold: 0.25 })
  const [tick, setTick] = useState(0)
  const [module, setModule] = useState(2)

  useEffect(() => {
    if (!inView || reduced) return undefined
    const timer = window.setInterval(() => setTick(value => value + 1), 2600)
    return () => window.clearInterval(timer)
  }, [inView, reduced])

  const visibleFeed = [0, 1, 2].map(offset => FEED[(tick + offset) % FEED.length])
  return (
    <div className={'ph-dash' + (seen ? ' is-in' : '')} ref={seenRef}>
      <div ref={ref}>
      <div className="ph-dash-top"><i/><i/><i/><span>ProPulse Business OS</span><em>Sample data</em></div>
      <div className="ph-dash-body">
        <nav className="ph-dash-nav" aria-label="Software modules (demo)">
          {MODULES.map((item, index) => <button key={item.label} type="button" aria-pressed={index === module} className={index === module ? 'is-active' : ''} onClick={() => setModule(index)}>{item.label}</button>)}
        </nav>
        <div className="ph-dash-main">
          <div className="ph-dash-head"><div><small>{MODULES[module].label}</small><b>{MODULES[module].title}</b></div><span className="ph-dash-live"><i/>Live</span></div>
          <div className="ph-dash-progress">
            {MODULES[module].bars.map(([label, value], index) => <div key={index}><span>{label}</span><div><i style={{ '--w': value + '%' }}/></div><b>{value}%</b></div>)}
          </div>
          <svg className="ph-dash-chart" viewBox="0 0 300 90" aria-hidden="true" preserveAspectRatio="none">
            <defs><linearGradient id="ph-dash-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f6fed" stopOpacity=".28"/><stop offset="1" stopColor="#2f6fed" stopOpacity="0"/></linearGradient></defs>
            <path d="M0 78 40 70 80 72 120 52 160 56 200 34 240 38 300 14V90H0z" fill="url(#ph-dash-fill)"/>
            <path className="ph-dash-line" d="M0 78 40 70 80 72 120 52 160 56 200 34 240 38 300 14" fill="none" stroke="#2f6fed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <ul className="ph-dash-feed" aria-live="off">
            {visibleFeed.map((item, index) => <li key={tick + '-' + index} className={'tone-' + item.tone} style={{ '--i': index }}><i/><div><b>{item.title}</b><small>{item.meta}</small></div></li>)}
          </ul>
        </div>
      </div>
      </div>
    </div>
  )
}
