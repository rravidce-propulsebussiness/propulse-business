import { useEffect, useState } from 'react'
import { useInView, useReducedMotion } from './useHomeMotion'

// Illustrative mock-up of ProPulse digital services (websites, apps, marketing,
// social media, CRM and Business OS). Values are sample data, not company metrics.
const FEED = [
  { tone: 'green', title: 'New website launched', meta: 'Web development · Client site' },
  { tone: 'orange', title: 'Lead from Google Ads added to CRM', meta: 'Marketing · CRM' },
  { tone: 'blue', title: 'Instagram reel scheduled', meta: 'Social media · Content calendar' },
  { tone: 'green', title: 'Android app update released', meta: 'Mobile apps' },
  { tone: 'blue', title: 'Keyword moved to Google page 1', meta: 'SEO & AI search' },
]
const MODULES = [
  { label: 'Websites & apps', title: 'Builds in progress', bars: [['Design', 90], ['Development', 64], ['Launched', 40]] },
  { label: 'SEO', title: 'Search visibility', bars: [['Pages indexed', 86], ['Top-10 keywords', 52], ['AI answers', 30]] },
  { label: 'Digital ads', title: 'Lead campaigns', bars: [['Reach', 82], ['Clicks', 56], ['Leads', 28]] },
  { label: 'Social media', title: 'Monthly calendar', bars: [['Planned', 92], ['Published', 70], ['Engagement', 46]] },
  { label: 'CRM', title: 'Lead pipeline', bars: [['Contacted', 74], ['Follow-up', 48], ['Converted', 22]] },
]

export default function TechDashboard() {
  const reduced = useReducedMotion()
  const [ref, inView] = useInView({ threshold: 0.25 })
  const [seenRef, seen] = useInView({ once: true, threshold: 0.25 })
  const [tick, setTick] = useState(0)
  const [module, setModule] = useState(0)

  useEffect(() => {
    if (!inView || reduced) return undefined
    const timer = window.setInterval(() => setTick(value => value + 1), 2600)
    return () => window.clearInterval(timer)
  }, [inView, reduced])

  const visibleFeed = [0, 1, 2].map(offset => FEED[(tick + offset) % FEED.length])
  return (
    <div className={'ph-dash' + (seen ? ' is-in' : '')} ref={seenRef}>
      <div ref={ref}>
      <div className="ph-dash-top"><i/><i/><i/><span>ProPulse Digital Services</span></div>
      <div className="ph-dash-body">
        <nav className="ph-dash-nav" aria-label="Digital service modules (demo)">
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
