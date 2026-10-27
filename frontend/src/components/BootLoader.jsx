import './BootLoader.css'

export default function BootLoader({message='Loading your workspace'}) {
  return <div className="propulse-route-loading" role="status" aria-live="polite">
    <div className="propulse-route-loader">
      <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <circle cx="50" cy="50" r="38" stroke="#dee9f0" strokeWidth="4"/>
        <g className="propulse-boot-orbit"><circle cx="50" cy="12" r="5" fill="#ed9f55"/><circle cx="50" cy="88" r="3" fill="#367493"/></g>
        <path className="propulse-boot-stroke" d="M36 72V27h18c11 0 18 6 18 17s-7 17-18 17H36"
          stroke="#225875" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <strong>ProPulse</strong>
      <span>{message}</span>
    </div>
  </div>
}
