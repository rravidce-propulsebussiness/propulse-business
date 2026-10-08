import { useEffect, useState } from 'react'
import './HeroBlueprintAnimation.css'

const stages = [
  ['PLOT', 'Find the right plot'],
  ['BUILD', 'Build it right'],
  ['HOME', 'Your dream home'],
  ['INTERIOR', 'Design your space'],
]

export default function HeroBlueprintAnimation() {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const timer = window.setTimeout(() => setStage((stage + 1) % stages.length), stage === 3 ? 5200 : 4000)
    return () => window.clearTimeout(timer)
  }, [stage])

  return (
    <div className="pp-artcol">
      <div className="pp-art" data-p={stage}>
        <div className="pp-photo-scenes" aria-hidden="true">
          <div className="pp-photo-scene pp-photo-plot" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1100&q=85)' }} />
          <div className="pp-photo-scene pp-photo-build" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1100&q=85)' }} />
          <div className="pp-photo-scene pp-photo-home" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=85)' }} />
          <div className="pp-photo-scene pp-photo-interior" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=85)' }} />
          <div className="pp-photo-vignette" />
        </div>
        <svg className="pp-photo-fallback" viewBox="0 0 520 440" fill="none" role="img" aria-label="Animated plot, construction, completed house and furnished interior">
          <defs>
            <clipPath id="pp-clip"><rect width="520" height="440" rx="24"/></clipPath>
            <linearGradient id="pp-sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1d437c"/><stop offset="1" stopColor="#0d2547"/></linearGradient>
            <linearGradient id="pp-window" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffe3bd"/><stop offset="1" stopColor="#ffb877"/></linearGradient>
            <linearGradient id="pp-stone" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffaf0"/><stop offset=".45" stopColor="#d6d3c8"/><stop offset="1" stopColor="#8e9699"/></linearGradient>
            <linearGradient id="pp-concrete" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e8e8e4"/><stop offset=".5" stopColor="#b0b9b9"/><stop offset="1" stopColor="#5e7379"/></linearGradient>
            <linearGradient id="pp-glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#bde9f2"/><stop offset=".42" stopColor="#2e708b"/><stop offset=".5" stopColor="#163f59"/><stop offset="1" stopColor="#081e35"/></linearGradient>
            <linearGradient id="pp-wood" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e5bc85"/><stop offset=".5" stopColor="#ab724b"/><stop offset="1" stopColor="#60422f"/></linearGradient>
            <linearGradient id="pp-earth" x1="0" y1="0" x2=".5" y2="1"><stop stopColor="#a6b57a"/><stop offset=".45" stopColor="#607b4d"/><stop offset="1" stopColor="#243f32"/></linearGradient>
            <filter id="pp-shadow" x="-30%" y="-40%" width="160%" height="190%"><feGaussianBlur stdDeviation="10"/></filter>
          </defs>
          <g clipPath="url(#pp-clip)">
            <rect width="520" height="440" fill="url(#pp-sky)"/>
            <g fill="white" opacity=".55"><circle cx="60" cy="60" r="1.5"/><circle cx="200" cy="40" r="1.2"/><circle cx="330" cy="70" r="1.5"/><circle cx="480" cy="40" r="1.2"/></g>
            <circle className="pp-glow" cx="430" cy="82" r="62" fill="#d2602f" opacity=".22"/><circle cx="430" cy="82" r="26" fill="#f08a5a"/>
            <g className="pp-cloud" fill="#fff" opacity=".12"><ellipse cx="120" cy="100" rx="50" ry="12"/><ellipse cx="150" cy="92" rx="30" ry="10"/></g>
            <rect y="360" width="520" height="80" fill="#0f2547"/><path d="M0 360h520" stroke="#2c5088" strokeWidth="2"/>
            <g className="pp-plot">
              <path d="M90 300l170-95 170 95-170 92z" transform="translate(0 12)" fill="#030d1b" opacity=".5" filter="url(#pp-shadow)"/>
              <path d="M90 300l170-95 170 95-170 92z" fill="url(#pp-earth)"/>
              <path d="M90 300l170-95 170 95-170 92z" fill="none" stroke="#c4d0a2" strokeWidth="7"/>
              <path d="M102 301l158-88 158 88-158 82z" fill="none" stroke="#e9d9b5" strokeWidth="1" strokeDasharray="3 7" opacity=".65"/>
              <path d="M90 300l170-95 170 95-170 92z" fill="#295575" stroke="#68c2dd" strokeWidth="3" strokeDasharray="12 8" className="pp-march"/>
              <path d="M260 205v187M90 300l340 0" stroke="#68c2dd" strokeDasharray="7 8" opacity=".5"/>
              <g fill="#f08a5a"><circle cx="90" cy="300" r="7"/><circle cx="260" cy="205" r="7"/><circle cx="430" cy="300" r="7"/><circle cx="260" cy="392" r="7"/></g>
              <path d="M260 190v-30m-8 8 8-8 8 8" stroke="#f08a5a" strokeWidth="3"/>
            </g>
            <g className="pp-build">
              <path d="M108 352l304 0 26 15-309 0z" fill="#111b29" opacity=".65"/>
              <path d="M108 349l304 0 20 12-304 0z" fill="url(#pp-concrete)"/>
              <path d="M108 225l304 0 20 12-304 0z" fill="#c2c8c5"/>
              <path d="M402 225l20 12v124l-20-11z" fill="#5f737b"/>
              <path d="M115 282h290" stroke="#fff" strokeWidth="2" opacity=".35"/>
              <g stroke="#adbdbe" strokeWidth="2" opacity=".85"><path d="M128 215v-30m6 30v-30m65 30v-30m6 30v-30m102 30v-30m6 30v-30m82 30v-30m6 30v-30"/></g>
              <path d="M108 352V225h304v127" fill="#173d63" stroke="#75b5d0" strokeWidth="3"/>
              <g className="pp-columns" stroke="#e3b27c" strokeWidth="12"><path d="M118 350V225M205 350V225M315 350V225M402 350V225"/></g>
              <g className="pp-beams" stroke="#e3b27c" strokeWidth="10"><path d="M110 230h300M110 285h300M110 350h300"/></g>
              <g stroke="#6ca6c7" strokeWidth="2"><path d="M118 230l87 55-87 65m87-120-87 55 87 65m110-120 87 55-87 65m87-120-87 55 87 65"/></g>
              <g className="pp-crane" stroke="#f4b765" strokeWidth="6"><path d="M300 190V65M235 65h190M300 65l-65 40m65-40 80 40M360 65v102" /><path d="M351 167l9 14 9-14" strokeWidth="4"/></g>
              <g className="pp-hook" stroke="#ffe3bd" strokeWidth="3"><path d="M360 181v18q0 16 13 7"/></g>
            </g>
            <g className="pp-facade">
              <path d="M110 215l300 0 20 16v130l-20-1V215z" fill="#8d9696"/>
              <path d="M110 215l300 0 20 16-302 0z" fill="#f8f2e6"/>
              <path d="M105 355l315 0 18 12H123z" fill="#c6b39a"/>
              <rect x="115" y="220" width="290" height="134" fill="url(#pp-stone)"/>
              <path d="M118 230h284M118 350h284" stroke="#fff" opacity=".6"/>
              <path d="M115 230h290" stroke="#b8a99a" opacity=".5"/>
              <path d="M115 225v128m290-128v128" stroke="#fff" strokeWidth="4" opacity=".6"/>
              <rect x="110" y="215" width="300" height="145" fill="#f3e6d4"/>
              <rect x="110" y="215" width="95" height="145" fill="#d7c8b4"/>
              <path d="M205 215v145M310 215v145" stroke="#ad9a82" strokeWidth="4"/>
              <rect x="138" y="240" width="48" height="65" rx="3" fill="url(#pp-glass)"/><path d="M162 240v65" stroke="#7e8d98" strokeWidth="5"/>
              <rect x="230" y="238" width="56" height="75" rx="3" fill="url(#pp-window)"/><path d="M258 238v75" stroke="#7e8d98" strokeWidth="5"/>
              <rect x="334" y="240" width="50" height="65" rx="3" fill="url(#pp-window)"/><path d="M359 240v65" stroke="#7e8d98" strokeWidth="5"/>
              <rect x="234" y="317" width="52" height="43" fill="#825f4d"/><circle cx="277" cy="341" r="3" fill="#f4c58b"/>
              <path d="M95 360h330" stroke="#e2b888" strokeWidth="8"/>
            </g>
            <g className="pp-roof"><path d="M95 220l165-104 169 104 8 13-177-100-177 100z" fill="#562b28"/><path d="M92 218l168-102 168 102z" fill="#d2602f"/><path d="M92 218l168-102 0 17-143 85z" fill="#f08a5a" opacity=".5"/><path d="M92 218h336" stroke="#a94524" strokeWidth="8"/></g>
            <g className="pp-trees"><path d="M55 360v-45M468 360v-42" stroke="#604630" strokeWidth="8"/><circle cx="55" cy="298" r="28" fill="#2f8f6b"/><circle cx="70" cy="312" r="18" fill="#267a5b"/><circle cx="469" cy="307" r="25" fill="#2f8f6b"/></g>
            <g className="pp-interior">
              <path d="M110 212h300v148H110z" fill="url(#pp-stone)"/>
              <path d="M110 360l300 0 24 14-299 0z" fill="url(#pp-wood)"/>
              <path d="M114 234h292" stroke="#fff" strokeWidth="3" opacity=".8"/>
              <path d="M115 356h292" stroke="#a87854" strokeWidth="5"/>
              <path d="M118 237v111m286-111v111" stroke="#fff" opacity=".55"/>
              <rect x="126" y="236" width="79" height="82" rx="3" fill="url(#pp-glass)"/>
              <path d="M165 236v82m-39-42h79" stroke="#d6e4e5" strokeWidth="4"/>
              <path d="M132 244l24-6-24 32z" fill="#fff" opacity=".25"/>
              <ellipse cx="268" cy="350" rx="92" ry="12" fill="#291c1a" opacity=".23" filter="url(#pp-shadow)"/>
              <rect x="110" y="212" width="300" height="148" fill="#fff0df"/>
              <rect x="110" y="212" width="300" height="15" fill="#e4c7a5"/>
              <path d="M110 360h300" stroke="#a87953" strokeWidth="12"/>
              <rect x="130" y="236" width="70" height="80" rx="3" fill="#d9a875"/><rect x="137" y="243" width="56" height="66" fill="#fff1d8"/><path d="M165 243v66" stroke="#b48b62" strokeWidth="4"/>
              <g className="pp-furniture"><rect x="210" y="302" width="125" height="42" rx="10" fill="#a87d69"/><rect x="202" y="284" width="140" height="39" rx="12" fill="#c79d83"/><rect x="215" y="279" width="52" height="26" rx="8" fill="#f9d3b2"/><rect x="280" y="279" width="48" height="26" rx="8" fill="#f9d3b2"/><path d="M225 344v15m102-15v15" stroke="#664634" strokeWidth="7"/></g>
              <g className="pp-furniture"><rect x="350" y="240" width="44" height="100" rx="4" fill="#aa734e"/><rect x="355" y="245" width="34" height="40" fill="#e8bb8d"/><rect x="355" y="290" width="34" height="44" fill="#e8bb8d"/><circle cx="381" cy="267" r="2" fill="#fff"/><circle cx="381" cy="311" r="2" fill="#fff"/></g>
              <g className="pp-furniture"><path d="M235 222v28" stroke="#f9d5a1" strokeWidth="3"/><path d="M219 250h32l-8 12h-16z" fill="#f4b765"/><circle cx="235" cy="265" r="26" fill="#ffcf89" opacity=".16"/></g>
              <g className="pp-furniture"><rect x="132" y="331" width="48" height="10" rx="5" fill="#a77555"/><path d="M155 331v-29" stroke="#5d9167" strokeWidth="4"/><ellipse cx="145" cy="303" rx="13" ry="7" fill="#39996e"/><ellipse cx="166" cy="296" rx="14" ry="8" fill="#2f8f6b"/></g>
            </g>
          </g>
        </svg>
        <div className="pp-stage-caption" aria-live="polite"><small>STEP {stage + 1} · {stages[stage][0]}</small><b>{stages[stage][1]}</b></div>
      </div>
      <div className="pp-stage-tabs" role="tablist" aria-label="Project journey">
        {stages.map(([name], index) => (
          <button key={name} type="button" role="tab" aria-selected={stage === index} className={stage === index ? 'is-active' : ''} onClick={() => setStage(index)}>
            {name === 'BUILD' ? 'Build' : name === 'INTERIOR' ? 'Interior' : name === 'PLOT' ? 'Plot' : 'Home'}
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}
