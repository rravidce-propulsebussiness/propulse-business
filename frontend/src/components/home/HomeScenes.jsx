// Hand-built SVG scenes for the homepage. Each scene takes a `stage` (0-4) and
// reveals one layer per stage; CSS in Home.css animates the transitions, so the
// same drawing can be driven by a timer (hero) or by scroll (build story).

import { HOUSE_STAGES, ROOM_STAGES, TECH_STAGES } from './homeSceneSteps'

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

export function RoomScene({ stage = 4, idPrefix = 'rs' }) {
  const g = id => `${idPrefix}-${id}`
  return (
    <svg className={'ph-scene ph-room stage-' + stage} viewBox="0 0 560 440" role="img" aria-label={'Interior design illustration: ' + ROOM_STAGES[stage]}>
      <defs>
        <linearGradient id={g('wall')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3eee6"/><stop offset="1" stopColor="#e8e0d3"/></linearGradient>
        <linearGradient id={g('floor')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c99a6b"/><stop offset="1" stopColor="#a87346"/></linearGradient>
        <linearGradient id={g('sofa')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3f5e6f"/><stop offset="1" stopColor="#2c4655"/></linearGradient>
        <linearGradient id={g('window')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d9ecf5"/><stop offset="1" stopColor="#9cc4da"/></linearGradient>
        <radialGradient id={g('lamp')}><stop offset="0" stopColor="#ffd9a0" stopOpacity=".85"/><stop offset="1" stopColor="#ffd9a0" stopOpacity="0"/></radialGradient>
        <pattern id={g('slats')} width="12" height="10" patternUnits="userSpaceOnUse"><rect width="12" height="10" fill="#b98455"/><rect width="3" height="10" fill="#9a6a40"/></pattern>
      </defs>
      {/* Bare shell */}
      <rect width="560" height="440" fill="#ddd6cb"/>
      <path d="M0 0h560l-110 70H110z" fill="#ebe6dd"/>
      <path d="M0 0l110 70v230L0 440z" fill="#d8d0c3"/>
      <path d="M560 0l-110 70v230l110 140z" fill="#d1c8ba"/>
      <rect x="110" y="70" width="340" height="230" fill={`url(#${g('wall')})`}/>
      <path d="M110 300h340l110 140H0z" fill="#cfc7bb"/>
      <path d="M474 110 528 96v171l-54-33z" fill={`url(#${g('window')})`} stroke="#bfb3a2" strokeWidth="3"/>
      <path d="M501 103v147" stroke="#bfb3a2" strokeWidth="2"/>

      {/* Stage 1: layout markings */}
      <g className={'ph-layer ph-layout' + on(stage, 1)} fill="none" stroke="#1f5f99" strokeWidth="1.6" strokeDasharray="6 5">
        <path className="ph-draw" d="M170 300h220l18 34H152z"/>
        <path className="ph-draw" d="M214 352h132l12 30H202z"/>
        <path d="M130 312h300" stroke="#e65b26" strokeDasharray="0" strokeOpacity=".7"/>
        <rect x="236" y="314" width="88" height="18" rx="9" fill="#fff" stroke="#e65b26" strokeDasharray="0" strokeOpacity=".5"/>
        <text x="280" y="327" textAnchor="middle" className="ph-svg-label" stroke="none">Living zone</text>
      </g>

      {/* Stage 3 finishes go under furniture */}
      <g className={'ph-layer ph-finishes' + on(stage, 3)}>
        <path d="M110 300h340l110 140H0z" fill={`url(#${g('floor')})`}/>
        <path d="M168 300 92 440M226 300 186 440M280 300v140M334 300l40 140M392 300l76 140" stroke="#8b5e37" strokeOpacity=".35"/>
        <rect x="196" y="92" width="168" height="208" fill={`url(#${g('slats')})`}/>
        <path className="ph-cove" d="M110 70h340" stroke="#ffcf87" strokeWidth="5"/>
      </g>

      {/* Stage 2: furniture */}
      <g className={'ph-layer ph-furniture' + on(stage, 2)}>
        <path className="ph-rug" d="M150 334h260l34 54H116z" fill="#e9dccb" stroke="#cdbba3"/>
        <g className="ph-sofa">
          <ellipse cx="280" cy="300" rx="128" ry="10" fill="#000" opacity=".12"/>
          <rect x="166" y="232" width="228" height="50" rx="12" fill={`url(#${g('sofa')})`}/>
          <rect x="166" y="262" width="228" height="34" rx="9" fill="#456879"/>
          <rect x="152" y="246" width="26" height="52" rx="10" fill="#365667"/>
          <rect x="382" y="246" width="26" height="52" rx="10" fill="#365667"/>
          <rect x="196" y="244" width="40" height="26" rx="8" fill="#e5b36d"/>
          <rect x="324" y="244" width="40" height="26" rx="8" fill="#f0e3cf"/>
        </g>
        <g className="ph-table"><ellipse cx="280" cy="368" rx="62" ry="13" fill="#2b2d30"/><path d="M262 380v16M298 380v16" stroke="#2b2d30" strokeWidth="4"/><rect x="266" y="352" width="14" height="10" rx="2" fill="#f0e3cf"/><circle cx="300" cy="358" r="6" fill="#6f9e60"/></g>
        <g className="ph-console"><rect x="120" y="270" width="34" height="56" rx="3" fill="#8f5a31"/><circle cx="137" cy="262" r="10" fill="#f4e6cf"/><path d="M137 272v-4" stroke="#8f5a31" strokeWidth="3"/></g>
      </g>

      {/* Stage 3: lighting */}
      <g className={'ph-layer ph-lighting' + on(stage, 3)}>
        <circle cx="280" cy="170" r="110" fill={`url(#${g('lamp')})`} className="ph-lamp-glow"/>
        <g className="ph-pendant"><path d="M280 0v118" stroke="#3a3a3a" strokeWidth="1.5"/><path d="M256 136q24-30 48 0z" fill="#2b2d30"/><ellipse cx="280" cy="136" rx="24" ry="4" fill="#ffd38f"/></g>
      </g>

      {/* Stage 4: decor */}
      <g className={'ph-layer ph-decor' + on(stage, 4)}>
        <g className="ph-art"><rect x="122" y="118" width="58" height="74" rx="2" fill="#fff" stroke="#c9b9a2" strokeWidth="3"/><path d="M130 178c10-24 20-30 26-18s14-14 18 18z" fill="#e65b26" opacity=".75"/><circle cx="166" cy="136" r="7" fill="#f2b45f"/></g>
        <g className="ph-art"><rect x="380" y="128" width="50" height="62" rx="2" fill="#fff" stroke="#c9b9a2" strokeWidth="3"/><path d="M388 182h34M388 170h26M388 158h30" stroke="#1f5f99" strokeOpacity=".5" strokeWidth="3"/></g>
        <g className="ph-plant"><path d="M440 380l8-46h28l8 46z" fill="#d8cdbd"/><path d="M462 336c-6-26-26-40-40-40 10 14 22 26 36 40M462 336c2-30 16-48 30-54-4 18-14 36-28 54M462 336c-12-14-30-18-44-12 14 6 28 10 42 12" fill="#5f8a54"/></g>
      </g>

      {stage >= 4 && <g transform="translate(28 30)"><g className="ph-swatches"><rect width="150" height="44" rx="22" fill="#fff" opacity=".95"/><circle cx="24" cy="22" r="11" fill="#b98455"/><circle cx="52" cy="22" r="11" fill="#3f5e6f"/><circle cx="80" cy="22" r="11" fill="#e5b36d"/><circle cx="108" cy="22" r="11" fill="#f0e3cf" stroke="#d6c6ae"/><text x="126" y="27" className="ph-svg-label">✓</text></g></g>}
    </svg>
  )
}

export function TechScene({ stage = 4 }) {
  const bars = [46, 62, 54, 78, 70, 92, 84]
  return (
    <svg className={'ph-scene ph-tech stage-' + stage} viewBox="0 0 560 440" role="img" aria-label={'Digital services illustration: ' + TECH_STAGES[stage]}>
      <rect width="560" height="440" fill="#0f2233"/>
      <g opacity=".14" stroke="#5aa6ff">{Array.from({ length: 15 }, (_, i) => <path key={i} d={`M${i * 40} 0v440`}/>)}{Array.from({ length: 12 }, (_, i) => <path key={'h' + i} d={`M0 ${i * 40}h560`}/>)}</g>
      {/* App frame */}
      <g className={'ph-layer ph-app' + on(stage, 0)}>
        <rect x="34" y="34" width="430" height="330" rx="16" fill="#f7f9fc"/>
        <path d="M34 50a16 16 0 0 1 16-16h398a16 16 0 0 1 16 16v14H34z" fill="#e6ecf3"/>
        <circle cx="54" cy="49" r="4.5" fill="#ff6b5a"/><circle cx="68" cy="49" r="4.5" fill="#ffbe3d"/><circle cx="82" cy="49" r="4.5" fill="#2fc26b"/>
        <rect x="34" y="64" width="62" height="300" fill="#102f46"/>
        <rect x="50" y="80" width="30" height="30" rx="8" fill="#e65b26"/>
        <path d="m57 98 8-8 8 8M60 96v8h10v-8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {[132, 170, 208, 246].map(y => <rect key={y} x="54" y={y} width="22" height="22" rx="6" fill="#fff" opacity=".18"/>)}
        <text x="112" y="92" className="ph-svg-title">Digital growth workspace</text>
        <text x="112" y="108" className="ph-svg-muted">Website · App · Social · CRM</text>
      </g>
      {/* KPI cards */}
      <g className={'ph-layer ph-kpis' + on(stage, 1)}>
        {[{ x: 112, t: 'Website', v: 'Live', c: '#e65b26' }, { x: 228, t: 'Leads', v: 'In CRM', c: '#2f6fed' }, { x: 344, t: 'Social', v: 'Posted', c: '#2fb36b' }].map((k, i) => <g key={k.t} className="ph-pop" style={{ '--d': i * 110 + 'ms' }}><rect x={k.x} y="122" width="104" height="58" rx="10" fill="#fff" stroke="#e1e7ee"/><circle cx={k.x + 16} cy="140" r="5" fill={k.c}/><text x={k.x + 28} y="144" className="ph-svg-muted">{k.t}</text><text x={k.x + 14} y="168" className="ph-svg-kpi">{k.v}</text></g>)}
      </g>
      {/* Chart */}
      <g className={'ph-layer ph-chart' + on(stage, 2)}>
        <rect x="112" y="192" width="220" height="156" rx="10" fill="#fff" stroke="#e1e7ee"/>
        <text x="126" y="214" className="ph-svg-muted">Leads vs ad spend</text>
        {bars.map((h, i) => <rect key={i} className="ph-bar" style={{ '--d': i * 70 + 'ms' }} x={130 + i * 27} y={334 - h} width="15" height={h} rx="4" fill={i === bars.length - 1 ? '#e65b26' : '#c9d8ea'}/>)}
        <path className="ph-draw ph-line" d="M137 300 164 286 191 292 218 262 245 270 272 240 299 248" fill="none" stroke="#2f6fed" strokeWidth="2.5" strokeLinecap="round"/>
      </g>
      {/* Milestones */}
      <g className={'ph-layer ph-milestones' + on(stage, 3)}>
        <rect x="344" y="192" width="104" height="156" rx="10" fill="#fff" stroke="#e1e7ee"/>
        <text x="356" y="214" className="ph-svg-muted">Milestones</text>
        {['Website', 'SEO', 'Ads live', 'Reels'].map((m, i) => <g key={m} className="ph-pop" style={{ '--d': i * 160 + 'ms' }}><circle cx="362" cy={236 + i * 28} r="8" fill={i < 3 ? '#2fb36b' : '#e1e7ee'}/>{i < 3 && <path d={`m358 ${236 + i * 28} 3 3 5-6`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>}<text x="376" y={240 + i * 28} className="ph-svg-small">{m}</text></g>)}
      </g>
      {/* Phone notification */}
      <g transform="translate(30 0)"><g className={'ph-layer ph-phone' + on(stage, 4)}>
        <rect x="394" y="178" width="132" height="236" rx="22" fill="#1b2b3a" stroke="#41566a" strokeWidth="2"/>
        <rect x="404" y="192" width="112" height="208" rx="14" fill="#eef3f8"/>
        <rect x="440" y="184" width="40" height="5" rx="2.5" fill="#41566a"/>
        <g className="ph-toast"><rect x="410" y="220" width="100" height="58" rx="10" fill="#fff" stroke="#dbe3ec"/><circle cx="424" cy="236" r="7" fill="#2fb36b"/><text x="436" y="240" className="ph-svg-small">New lead</text><rect x="418" y="250" width="84" height="20" rx="4" fill="#ffd8b8"/><path d="m428 266 10-10 8 7 6-4 10 7" fill="none" stroke="#e65b26" strokeWidth="1.5"/></g>
        <g className="ph-toast ph-toast-2"><rect x="410" y="288" width="100" height="40" rx="10" fill="#fff" stroke="#dbe3ec"/><circle cx="424" cy="303" r="7" fill="#2f6fed"/><text x="436" y="307" className="ph-svg-small">Post published</text><rect x="418" y="315" width="60" height="5" rx="2.5" fill="#dbe3ec"/></g>
        <circle className="ph-ping" cx="510" cy="220" r="7" fill="#e65b26"/>
      </g></g>
    </svg>
  )
}
