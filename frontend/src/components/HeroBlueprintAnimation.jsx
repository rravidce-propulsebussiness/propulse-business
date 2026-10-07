import './HeroBlueprintAnimation.css'

export default function HeroBlueprintAnimation() {
  return <div className="hero-journey" aria-label="Animated journey from plot to completed home and interior" role="img">
    <div className="hero-journey-grid" />
    <div className="hero-journey-scan" />
    <span className="journey-particle p1"/><span className="journey-particle p2"/><span className="journey-particle p3"/><span className="journey-particle p4"/><span className="journey-particle p5"/>

    <svg className="journey-scene" viewBox="0 0 1200 610" role="presentation">
      <defs>
        <linearGradient id="journeyGlass" x1="0" x2="1"><stop stopColor="#173e59"/><stop offset="1" stopColor="#071e31"/></linearGradient>
        <linearGradient id="journeyWarm" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffb26d"/><stop offset="1" stopColor="#ff6427"/></linearGradient>
        <filter id="journeyGlow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      <g className="journey-stage stage-plot">
        <path className="ground" d="M185 405 540 240 936 394 570 565Z"/>
        <path className="plot-edge" d="M185 405 540 240 936 394 570 565 185 405Z"/>
        <path className="plot-grid" d="M252 374 608 527M322 342 676 496M393 309 746 466M464 277 816 436M530 261 870 407M264 439 617 275M345 474 696 310M426 510 778 344M507 545 859 378"/>
        <circle className="node" cx="185" cy="405" r="7"/><circle className="node" cx="540" cy="240" r="7"/><circle className="node" cx="936" cy="394" r="7"/><circle className="node" cx="570" cy="565" r="7"/>
      </g>

      <g className="journey-stage stage-structure">
        <path className="foundation" d="M246 420 541 282 866 408 562 548Z"/>
        <path className="structure-line" d="M302 430V329M408 480V279M541 418V282M690 480V339M815 425V388"/>
        <path className="structure-line" d="M302 329 541 218 815 325 690 382 541 325 408 387 302 329ZM408 279 541 218 690 277M541 218V325"/>
        <path className="structure-line" d="M302 430 562 548 815 425M408 480 690 350M541 418 815 325"/>
      </g>

      <g className="journey-stage stage-home">
        <path className="home-wall" d="M285 430V315L522 205 815 320V432L562 548Z"/>
        <path className="home-side" d="M522 205 815 320V432L562 548V323Z"/>
        <path className="home-roof" d="M250 314 516 178 850 307 814 337 520 222 286 342Z"/>
        <path className="home-detail" d="M332 341V429L414 466V303ZM455 286V484M603 337V490M704 365V453M753 383V430"/>
        <path className="home-window" d="M620 341 683 366V443L620 418ZM715 378 772 400V444L715 423Z"/>
        <path className="home-door" d="M471 303 540 330V493L471 463Z"/>
      </g>

      <g className="journey-stage stage-interior">
        <path className="room-floor" d="M237 441 525 304 874 433 575 570Z"/>
        <path className="room-wall" d="M237 441V260L525 126V304M525 126 874 255V433"/>
        <path className="room-window" d="M281 282 428 215V329L281 394ZM630 206 794 266V347L630 288Z"/>
        <path className="sofa" d="M337 422 465 363 591 410 463 470ZM337 422V467L463 516 591 455V410M370 390 465 347 558 382"/>
        <path className="table" d="M602 443 695 400 776 431 681 475ZM625 454V497M751 442V480"/>
        <path className="cabinet" d="M713 315 817 353V425L713 386ZM748 328V399M783 341V412"/>
        <path className="warm-line" d="M259 445 574 593 898 445M224 248 522 108 895 246"/>
      </g>
    </svg>

    <div className="journey-orbit orbit-a"/><div className="journey-orbit orbit-b"/>
    <div className="journey-progress"><i/><i/><i/><i/></div>
  </div>
}
