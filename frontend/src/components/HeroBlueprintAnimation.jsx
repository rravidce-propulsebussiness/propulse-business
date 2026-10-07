import './HeroBlueprintAnimation.css'

export default function HeroBlueprintAnimation(){
  return <div className="ag-hero" role="img" aria-label="Animated journey from plot to construction, finished home and interior">
    <div className="ag-sky"/><div className="ag-sun"/><div className="ag-city"/>
    <svg className="ag-scene" viewBox="0 0 1600 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="soil" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8c6042"/><stop offset="1" stopColor="#3d2a25"/></linearGradient>
        <linearGradient id="grass" x1="0" x2="1"><stop stopColor="#315c3c"/><stop offset=".55" stopColor="#56764c"/><stop offset="1" stopColor="#243f31"/></linearGradient>
        <linearGradient id="wall" x1="0" x2="1"><stop stopColor="#f2eee7"/><stop offset=".7" stopColor="#c9c6c0"/><stop offset="1" stopColor="#999da0"/></linearGradient>
        <linearGradient id="wood" x1="0" x2="1"><stop stopColor="#8b5b36"/><stop offset="1" stopColor="#3e281e"/></linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#153e5a"/><stop offset=".55" stopColor="#09253a"/><stop offset="1" stopColor="#ff9d58"/></linearGradient>
        <linearGradient id="warm" x1="0" x2="1"><stop stopColor="#ffb36f"/><stop offset="1" stopColor="#ff5f24"/></linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="20" stdDeviation="18" floodColor="#000" floodOpacity=".38"/></filter>
        <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path className="ag-land" d="M-50 610 505 350 1660 585 1110 840-60 810Z"/>
      <path className="ag-road" d="M-80 688 503 410 1660 640 1600 770 514 532-20 790Z"/>
      <g className="ag-plot">
        <path className="ag-soil" d="M400 544 706 397 1164 492 836 648Z"/>
        <path className="ag-boundary" d="M400 544 706 397 1164 492 836 648Z"/>
        <path className="ag-grid" d="M468 511 903 606M541 477 976 572M616 442 1050 538M690 408 1124 504M505 593 812 448M608 615 915 470M711 637 1018 492"/>
        <circle className="ag-pin" cx="400" cy="544" r="8"/><circle className="ag-pin" cx="706" cy="397" r="8"/><circle className="ag-pin" cx="1164" cy="492" r="8"/><circle className="ag-pin" cx="836" cy="648" r="8"/>
      </g>
      <g className="ag-build">
        <path className="ag-slab" d="M442 546 716 416 1115 500 825 638Z"/>
        <g className="ag-columns"><path d="M493 548V375M622 590V330M764 609V360M914 568V383M1055 525V427"/><path d="M493 375 622 316 1055 405 914 470 764 438 622 500ZM622 316 764 347 914 383"/></g>
        <g className="ag-beams"><path d="M493 375 914 470 1055 405M622 316 1055 405M493 460 914 552 1055 492"/></g>
      </g>
      <g className="ag-home" filter="url(#shadow)">
        <path className="ag-home-side" d="M755 314 1128 402V568L816 682V444Z"/>
        <path className="ag-home-front" d="M414 469V345L755 208V444L816 682 414 568Z"/>
        <path className="ag-upper" d="M504 342V246L758 145 1037 212V372L755 466Z"/>
        <path className="ag-roof" d="M475 247 752 126 1068 202 1038 229 756 162 505 265Z"/>
        <path className="ag-canopy" d="M392 342 756 194 1084 275 1045 298 756 229 419 365Z"/>
        <path className="ag-glass g1" d="M542 274 723 203V351L542 420Z"/><path className="ag-glass g2" d="M792 194 993 241V344L792 294Z"/>
        <path className="ag-glass g3" d="M459 382 612 321V514L459 568Z"/><path className="ag-glass g4" d="M653 306 743 272V556L653 587Z"/>
        <path className="ag-wood" d="M821 389 1054 443V547L821 630Z"/>
        <path className="ag-balcony" d="M516 430 763 337 1035 402M516 430V449M1035 402V420"/>
        <g className="ag-lights"><circle cx="532" cy="253" r="5"/><circle cx="749" cy="170" r="5"/><circle cx="1017" cy="225" r="5"/><circle cx="439" cy="369" r="5"/><circle cx="1060" cy="295" r="5"/></g>
      </g>
      <g className="ag-interior" filter="url(#shadow)">
        <path className="ag-room-wall" d="M320 570V220L780 120V430M780 120 1280 250V585"/>
        <path className="ag-room-floor" d="M320 570 780 430 1280 585 807 746Z"/>
        <path className="ag-room-glass" d="M365 273 663 207V419L365 490ZM914 198 1199 272V454L914 374Z"/>
        <g className="ag-sofa"><path d="M515 551 703 493 893 551 702 616Z"/><path d="M515 551V617L702 684 893 616V551"/><path d="M556 503 704 458 852 502 704 551Z"/></g>
        <g className="ag-table"><ellipse cx="990" cy="590" rx="105" ry="40"/><path d="M928 594V666M1050 594V650"/></g>
        <path className="ag-tv" d="M396 365 548 330V440L396 477Z"/>
        <path className="ag-cabinet" d="M1056 366 1195 402V536L1056 494ZM1102 378V507M1149 390V520"/>
        <g className="ag-lamps"><path d="M785 141V264M746 264H824"/><ellipse cx="785" cy="278" rx="58" ry="16"/></g>
      </g>
    </svg>
    <div className="ag-flare"/><div className="ag-dust d1"/><div className="ag-dust d2"/><div className="ag-dust d3"/>
  </div>
}
