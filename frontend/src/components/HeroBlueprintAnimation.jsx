import './HeroBlueprintAnimation.css'

export default function HeroBlueprintAnimation() {
  return <div className="hero-blueprint" aria-hidden="true">
    <div className="hero-blueprint-grid" />
    <div className="hero-blueprint-orbit"><i/><i/><i/></div>
    <div className="hero-blueprint-pulse pulse-one"/><div className="hero-blueprint-pulse pulse-two"/>
    <svg className="hero-blueprint-house" viewBox="0 0 760 520" role="presentation">
      <g className="blueprint-lines">
        <path d="M82 414H684"/>
        <path d="M142 410V254L300 130 448 247V410"/>
        <path d="M448 247 526 190 650 282V410"/>
        <path d="M126 264 299 112 469 253"/>
        <path d="M436 252 526 171 668 281"/>
        <path d="M194 410V292H270V410M330 410V285H407V410"/>
        <path d="M491 410V305H574V410M592 410V313H629V410"/>
        <path d="M207 306H257M343 300H394M504 320H561"/>
        <path d="M144 254H448M448 282H650"/>
        <path d="M111 430H704M160 448H654"/>
      </g>
      <g className="blueprint-accent">
        <circle cx="300" cy="130" r="7"/><circle cx="526" cy="190" r="6"/>
        <path d="M299 112V70M278 88h42"/><path d="M526 171v-35"/>
      </g>
    </svg>
    <span className="hero-blueprint-dot dot-a"/><span className="hero-blueprint-dot dot-b"/><span className="hero-blueprint-dot dot-c"/><span className="hero-blueprint-dot dot-d"/>
    <article className="hero-blueprint-badge badge-verified"><span>✓</span><div><b>Verified Professionals</b><small>Trusted project partners</small></div></article>
    <article className="hero-blueprint-badge badge-warranty"><span>⌂</span><div><b>Warranty Options</b><small>Build with confidence</small></div></article>
  </div>
}
