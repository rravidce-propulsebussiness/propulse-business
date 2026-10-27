import './BootLoader.css'

/**
 * One canonical ProPulse loader for route changes and asynchronous page content.
 * contained keeps the current navigation visible; compact works in small panels.
 * Never add a minimum delay -- it disappears as soon as data is ready.
 */
export default function BootLoader({message='',contained=false,compact=false}) {
  const className='propulse-route-loading'+(contained?' is-contained':'')+(compact?' is-compact':'')
  return <div className={className} role="status" aria-live="polite" aria-label="Loading ProPulse">
    <div className="propulse-route-loader">
      <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <circle cx="50" cy="50" r="38" stroke="#dee9f0" strokeWidth="4"/>
        <g className="propulse-boot-orbit"><circle cx="50" cy="12" r="5" fill="#ed9f55"/><circle cx="50" cy="88" r="3" fill="#367493"/></g>
        <path className="propulse-boot-stroke" d="M36 72V27h18c11 0 18 6 18 17s-7 17-18 17H36"
          stroke="#225875" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <strong>ProPulse</strong>
      <span className="propulse-loader-tagline">Get your next project</span>
      {message&&<span className="propulse-loader-detail">{message}</span>}
    </div>
  </div>
}
