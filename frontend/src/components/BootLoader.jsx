import './BootLoader.css'

const GLASS_FACES=['f1','f2','f3','f4','f5','f6']

/**
 * One canonical ProPulse loader for route changes and asynchronous page content.
 * Renders the 3D glass cube mark (same markup as the first-paint boot screen in index.html).
 * contained keeps the current navigation visible; compact works in small panels.
 * Never add a minimum delay -- it disappears as soon as data is ready.
 */
export default function BootLoader({message='',contained=false,compact=false}) {
  const className='propulse-route-loading'+(contained?' is-contained':'')+(compact?' is-compact':'')
  return <div className={className} role="status" aria-live="polite" aria-label="Loading ProPulse">
    <div className="propulse-route-loader">
      <div className="pp-glass" aria-hidden="true">
        <div className="pp-glass-orbit"><i/><i/></div>
        <div className="pp-glass-float">
          <div className="pp-glass-cube">
            {GLASS_FACES.map(face=><span key={face} className={'pp-glass-face '+face}/>)}
          </div>
        </div>
        <svg className="pp-glass-core" viewBox="0 0 100 100" fill="none">
          <path pathLength="100" d="M36 72V27h18c11 0 18 6 18 17s-7 17-18 17H36"
            stroke="#225875" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="pp-glass-shadow"/>
      </div>
      <strong className="pp-glass-title">ProPulse</strong>
      <span className="propulse-loader-tagline">Your dream home starts here</span>
      {message&&<span className="propulse-loader-detail">{message}</span>}
      <span className="pp-glass-bar" aria-hidden="true"/>
    </div>
  </div>
}
