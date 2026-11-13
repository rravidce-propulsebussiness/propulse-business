// Hand-built SVG scenes for the homepage. Each scene takes a `stage` (0-4) and
// reveals one layer per stage; CSS in Home.css animates the transitions, so the
// same drawing can be driven by a timer (hero) or by scroll (build story).

import { HOUSE_STAGES } from './homeSceneSteps'

const on = (stage, n) => (stage >= n ? ' is-on' : '')


export function HouseScene({ stage = 4, idPrefix = 'hs' }) {
  const g = id => `${idPrefix}-${id}`
  const columns = [124, 228, 332, 428]
  return (
    <svg className={'ph-scene ph-house stage-' + stage} viewBox="0 0 560 440" role="img" aria-label={'House construction illustration: ' + HOUSE_STAGES[stage]}>
      <defs>
        <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e9f1f7"/><stop offset="1" stopColor="#f8f4ec"/></linearGradient>
        <linearGradient id={g('earth')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c7a47c"/><stop offset="1" stopColor="#8a6a4b"/></linearGradient>
        <linearGradient id={g('glass')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe2b8"/><stop offset=".55" stopColor="#f6b066"/><stop offset="1" stopColor="#d9783a"/></linearGradient>
        <linearGradient id={g('glass-cold')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#cfe3ef"/><stop offset="1" stopColor="#7ea7c2"/></linearGradient>
        <pattern id={g('grid')} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0v20" fill="none" stroke="#1f5f99" strokeOpacity=".08"/></pattern>
        <pattern id={g('slats')} width="8" height="10" patternUnits="userSpaceOnUse"><rect width="8" height="10" fill="#b77c4b"/><rect width="2" height="10" fill="#8f5a31"/></pattern>
        <radialGradient id={g('glow')}><stop offset="0" stopColor="#ffb867" stopOpacity=".55"/><stop offset="1" stopColor="#ffb867" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="560" height="440" fill={`url(#${g('sky')})`}/>
      <rect width="560" height="350" fill={`url(#${g('grid')})`}/>
      <circle className={'ph-sun' + on(stage, 4)} cx="96" cy="84" r="30" fill="#f5a35b"/>

      {/* Ground + soil section */}
      <rect y="350" width="560" height="90" fill={`url(#${g('earth')})`}/>
      <path d="M0 350h560" stroke="#6b513a" strokeWidth="2"/>
      <g className="ph-soil" fill="#6b513a" opacity=".35"><circle cx="40" cy="380" r="2"/><circle cx="90" cy="412" r="2.5"/><circle cx="160" cy="430" r="2"/><circle cx="270" cy="420" r="2"/><circle cx="390" cy="426" r="2.5"/><circle cx="500" cy="402" r="2"/><circle cx="530" cy="430" r="2"/></g>

      {/* Stage 0: plot pegs, survey line, soil test */}
      <g className={'ph-layer ph-plot' + on(stage, 0)}>
        <path className="ph-draw" d="M100 344H500" stroke="#e65b26" strokeWidth="2.5" strokeDasharray="10 7"/>
        {[100, 500].map(x => <g key={x}><path d={`M${x} 350v-26`} stroke="#102f46" strokeWidth="3"/><path d={`M${x} 324l10 5-10 5z`} fill="#e65b26"/></g>)}
        <g className="ph-dimension"><path d="M100 318H500M100 312v12M500 312v12" stroke="#1f5f99" strokeWidth="1.5"/><rect x="246" y="306" width="68" height="18" rx="9" fill="#fff" stroke="#1f5f99" strokeOpacity=".3"/><text x="280" y="319" textAnchor="middle" className="ph-svg-label">Plot line</text></g>
        <g className={'ph-drill' + (stage === 0 ? ' is-active' : '')}><path d="M60 350V300" stroke="#102f46" strokeWidth="3"/><path d="M50 300h20l-4-14h-12z" fill="#e65b26"/><path className="ph-bore" d="M60 352v60" stroke="#102f46" strokeWidth="3" strokeDasharray="4 4"/></g>
      </g>

      {/* Stage 1: footings */}
      <g className={'ph-layer ph-footings' + on(stage, 1)}>
        {columns.map((x, i) => <g key={x} style={{ '--d': i * 90 + 'ms' }}><rect x={x - 16} y="392" width="44" height="12" rx="2" fill="#9aa4a8"/><rect x={x} y="350" width="12" height="44" fill="#b9c1c4"/></g>)}
        <rect x="112" y="346" width="336" height="8" rx="2" fill="#a9b2b6"/>
        <rect x="448" y="346" width="58" height="8" rx="2" fill="#a9b2b6"/>
        <g style={{ '--d': '360ms' }}><rect x="488" y="392" width="24" height="10" rx="2" fill="#9aa4a8"/><rect x="494" y="350" width="10" height="44" fill="#b9c1c4"/></g>
      </g>

      {/* Stage 2: RCC frame */}
      <g className={'ph-layer ph-frame' + on(stage, 2)}>
        {columns.map((x, i) => <rect key={x} className="ph-rise" style={{ '--d': i * 80 + 'ms' }} x={x} y="182" width="12" height="168" fill="#c9cfd1" stroke="#9aa4a8"/>)}
        <rect className="ph-rise" style={{ '--d': '320ms' }} x="494" y="270" width="10" height="80" fill="#c9cfd1" stroke="#9aa4a8"/>
        <rect className="ph-slab" style={{ '--d': '380ms' }} x="112" y="262" width="400" height="9" rx="1.5" fill="#d6dbdd" stroke="#9aa4a8"/>
        <rect className="ph-slab" style={{ '--d': '520ms' }} x="112" y="174" width="336" height="9" rx="1.5" fill="#d6dbdd" stroke="#9aa4a8"/>
        <g className="ph-rebar" stroke="#8b6a56" strokeWidth="1.2"><path d="M130 174v-14M150 174v-14M170 174v-14M398 174v-14M418 174v-14M438 174v-14"/></g>
      </g>

      {/* Crane works during foundation, frame and walls */}
      <g className={'ph-crane' + (stage >= 1 && stage <= 3 ? ' is-on' : '')}>
        <path d="M530 350V58" stroke="#e8a321" strokeWidth="7"/>
        <path d="M526 350V58M534 350V58" stroke="#b67d12" strokeWidth="1.2"/>
        <path d="M526 340l8-14-8-14 8-14-8-14 8-14-8-14 8-14-8-14 8-14-8-14 8-14-8-14 8-14-8-14 8-14-8-14 8-14-8-14 8-14-8-14" fill="none" stroke="#b67d12" strokeWidth="1.2"/>
        <path d="M270 58h290" stroke="#e8a321" strokeWidth="6"/>
        <path d="M530 58l-12-22h24z" fill="#e8a321"/><path d="M530 36 290 58M530 36l28 22" stroke="#b67d12" strokeWidth="1.2"/>
        <rect x="544" y="58" width="16" height="16" fill="#58646a"/>
        <g className="ph-trolley"><rect x="-8" y="60" width="16" height="6" fill="#58646a"/><path className="ph-cable" d="M0 66v62" stroke="#3c4a50" strokeWidth="1.3"/><path d="M-6 128h12l-6 8z" fill="#3c4a50"/><rect x="-28" y="137" width="56" height="7" rx="1" fill="#b77c4b"/></g>
      </g>

      {/* Stage 3: walls, openings, services */}
      <g className={'ph-layer ph-walls' + on(stage, 3)}>
        <rect x="136" y="271" width="92" height="75" fill="#efe9de"/>
        <rect x="240" y="271" width="92" height="75" fill="#efe9de"/>
        <rect x="344" y="271" width="84" height="75" fill="#efe9de"/>
        <rect x="136" y="183" width="92" height="79" fill="#efe9de"/>
        <rect x="240" y="183" width="92" height="79" fill="#efe9de"/>
        <rect x="344" y="183" width="84" height="79" fill="#e4ddcf"/>
        <rect className="ph-window" x="152" y="288" width="60" height="38" rx="2" fill={`url(#${g('glass-cold')})`}/>
        <rect className="ph-window" x="250" y="280" width="72" height="66" rx="2" fill={`url(#${g('glass-cold')})`}/>
        <rect className="ph-window" x="146" y="198" width="176" height="44" rx="2" fill={`url(#${g('glass-cold')})`}/>
        <path className="ph-conduit" d="M356 300h60v-80h-60M386 300v46" fill="none" stroke="#e65b26" strokeWidth="2" strokeDasharray="5 4"/>
        <path className="ph-conduit" d="M366 230h40M366 244h40" fill="none" stroke="#1f5f99" strokeWidth="2" strokeDasharray="5 4"/>
      </g>

      {/* Stage 4: finishes, light, landscape */}
      <g className={'ph-layer ph-finish' + on(stage, 4)}>
        <circle cx="286" cy="300" r="120" fill={`url(#${g('glow')})`} className="ph-house-glow"/>
        <rect x="344" y="183" width="84" height="79" fill={`url(#${g('slats')})`}/>
        <rect x="152" y="288" width="60" height="38" rx="2" fill={`url(#${g('glass')})`}/>
        <rect x="250" y="280" width="72" height="66" rx="2" fill={`url(#${g('glass')})`}/>
        <rect x="146" y="198" width="176" height="44" rx="2" fill={`url(#${g('glass')})`}/>
        <path d="M286 280v66M182 288v38M234 198v44M278 198v44" stroke="#7a4b28" strokeOpacity=".45" strokeWidth="2"/>
        <path d="M112 166h336M112 166v8M448 166v8M150 166v8M190 166v8M230 166v8M270 166v8M310 166v8M350 166v8M390 166v8M430 166v8" stroke="#3a4a52" strokeWidth="2"/>
        <rect x="104" y="170" width="352" height="6" rx="2" fill="#102f46"/>
        <rect x="104" y="258" width="416" height="6" rx="2" fill="#102f46"/>
        <path d="M440 350h80" stroke="#5b6a70" strokeWidth="4"/>
        <g className="ph-plants"><ellipse cx="116" cy="344" rx="22" ry="14" fill="#5f8a54"/><ellipse cx="96" cy="346" rx="14" ry="10" fill="#76a368"/><ellipse cx="452" cy="344" rx="16" ry="11" fill="#5f8a54"/><path d="M70 350V300" stroke="#6b513a" strokeWidth="4"/><circle cx="70" cy="290" r="24" fill="#6f9e60"/><circle cx="58" cy="300" r="14" fill="#5f8a54"/></g>
        <g className="ph-lamps" fill="#ffd38f"><circle cx="186" cy="276" r="3"/><circle cx="286" cy="276" r="3"/><circle cx="386" cy="276" r="3"/></g>
      </g>

      {stage >= 4 && <g transform="translate(408 96)"><g className="ph-badge"><rect x="-64" y="-20" width="128" height="40" rx="20" fill="#102f46"/><circle cx="-42" cy="0" r="11" fill="#2fb36b"/><path d="m-47 0 4 4 7-8" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/><text x="-24" y="5" className="ph-svg-badge">Handover</text></g></g>}
    </svg>
  )
}
