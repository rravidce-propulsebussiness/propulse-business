import { useEffect, useRef, useState } from 'react'
import { HOUSE_STAGES, ROOM_STAGES, TECH_STAGES } from './home/homeSceneSteps'
import { useInView, useReducedMotion } from './home/useHomeMotion'

// Interactive hero stage. Each division pairs one photograph with an animated
// SVG blueprint overlay: the drawing is "scanned" into the finished photo in
// five steps, then the stage moves to the next division. Photos are
// illustrative, not completed ProPulse work.
const photo = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&h=720&q=72`
const PILLARS = [
  {
    key: 'construction', label: 'Construction', caption: 'Plot to handover', steps: HOUSE_STAGES, badge: 'Handover',
    image: photo('1613490493576-7fde63acd811'), alt: 'Modern two-storey villa (illustrative)',
    pins: [[13, 70, 'Plot measured'], [30, 58, 'Footings cast'], [52, 22, 'Columns & slabs'], [70, 46, 'Brickwork & services'], [84, 30, 'Keys ready']],
  },
  {
    key: 'interiors', label: 'Interiors', caption: 'Shell to styled home', steps: ROOM_STAGES, badge: 'Styled',
    image: photo('1600210492486-724fe5c67fb0'), alt: 'Styled living room (illustrative)',
    pins: [[12, 30, 'Site measured'], [30, 62, 'Layout planned'], [50, 28, 'Custom joinery'], [68, 56, 'Lights & finishes'], [84, 26, 'Ready to live in']],
  },
  {
    key: 'technology', label: 'Technology', caption: 'Websites, apps & marketing', steps: TECH_STAGES, badge: 'Growing',
    image: photo('1460925895917-afdab827c52f'), alt: 'Laptop showing a business analytics dashboard (illustrative)',
    pins: [[12, 26, 'Brand & UI design'], [30, 52, 'Website & mobile app'], [50, 24, 'SEO & AI search'], [68, 56, 'Ads & social media'], [84, 30, 'Leads in your CRM']],
  },
]

// Line-art drawn over the blueprint side of each scene (viewBox 560 x 440).
const SKETCHES = {
  construction: <>
    <path d="M70 330h420M110 330V190h250v140M360 230h100v100M110 190l-22 0M95 170h280M150 330v-70h60v70M250 215h70v45h-70zM385 255h50v40h-50z"/>
    <path className="ph-photo-dim" d="M110 362h350M110 354v16M460 354v16M500 190v140M492 190h16M492 330h16"/>
  </>,
  interiors: <>
    <path d="M60 110h440v230H60zM60 110l60 50h320l60-50M120 160v130M440 160v130M120 290h320M170 290v-55h120v55M330 290v-90h70v90M210 200h60"/>
    <path className="ph-photo-dim" d="M60 372h440M60 364v16M500 364v16M32 110v230M24 110h16M24 340h16"/>
  </>,
  technology: <>
    <path d="M90 100h300v200H90zM90 130h300M110 115h6M124 115h6M120 160h110M120 180h70M120 210h80v60h-80zM220 210h80v60h-80zM320 210h50v60h-50zM410 150h80v160h-80zM430 290h40"/>
    <path className="ph-photo-dim" d="M90 330h300M90 322v16M390 322v16M120 255l25-18 20 10 30-26"/>
  </>,
}

function PhotoScene({ item, stage, active }) {
  const reveal = stage * 25
  return (
    <div className={'ph-photo stage-' + stage + (active ? ' is-active' : '')} style={{ '--reveal': reveal + '%' }} aria-hidden={!active}>
      <div className="ph-photo-plan">
        <img src={item.image} alt="" decoding="async" loading={item.key === 'construction' ? 'eager' : 'lazy'}/>
        <svg viewBox="0 0 560 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g className="ph-photo-grid">{Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${i * 40 + 20} 0v440`}/>)}{Array.from({ length: 11 }, (_, i) => <path key={'h' + i} d={`M0 ${i * 40 + 20}h560`}/>)}</g>
          <g className="ph-photo-sketch">{SKETCHES[item.key]}</g>
        </svg>
      </div>
      <div className="ph-photo-real"><img src={item.image} alt={active ? item.alt : ''} decoding="async" loading={item.key === 'construction' ? 'eager' : 'lazy'}/></div>
      <span className="ph-photo-scan" aria-hidden="true"><i/></span>
      <svg className="ph-photo-frame" viewBox="0 0 560 440" preserveAspectRatio="none" aria-hidden="true"><path d="M18 52V18h34M508 18h34v34M542 388v34h-34M52 422H18v-34"/></svg>
      {item.pins.map(([x, y, label], index) => (
        <span key={label} className={'ph-pin' + (index <= stage ? ' is-on' : '') + (index === stage ? ' is-current' : '') + (x > 60 ? ' is-left' : '')} style={{ left: x + '%', top: y + '%' }} aria-hidden="true">
          <i/><b>{label}</b>
        </span>
      ))}
      <span className={'ph-photo-badge' + (stage === 4 ? ' is-on' : '')} aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>{item.badge}</span>
      <span className="ph-photo-tag" aria-hidden="true">{stage < 4 ? 'Blueprint → Reality' : 'Illustrative image'}</span>
    </div>
  )
}

const STEP_MS = 950
const HOLD_MS = 2800

export default function HeroBlueprintAnimation() {
  const reduced = useReducedMotion()
  const [rootRef, inView] = useInView({ threshold: 0.2, rootMargin: '0px' })
  const [pillar, setPillar] = useState(0)
  const [stage, setStage] = useState(0)
  const [auto, setAuto] = useState(true)
  const [hovered, setHovered] = useState(false)
  const tabRefs = useRef([])
  const current = PILLARS[pillar]
  const shownStage = reduced ? 4 : stage

  useEffect(() => {
    if (reduced || !inView) return undefined
    if (stage < 4) {
      const timer = window.setTimeout(() => setStage(value => value + 1), stage === 0 ? 650 : STEP_MS)
      return () => window.clearTimeout(timer)
    }
    if (!auto || hovered) return undefined
    const timer = window.setTimeout(() => { setPillar(value => (value + 1) % PILLARS.length); setStage(0) }, HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [stage, auto, hovered, inView, reduced])

  const choose = index => { setAuto(false); setPillar(index); setStage(0) }
  const onKeyDown = event => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = (pillar + delta + PILLARS.length) % PILLARS.length
    choose(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="ph-stage" ref={rootRef} data-pillar={current.key} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <div className="ph-stage-tabs" role="tablist" aria-label="ProPulse divisions" onKeyDown={onKeyDown}>
        {PILLARS.map((item, index) => <button key={item.key} ref={node => { tabRefs.current[index] = node }} type="button" role="tab" id={'ph-tab-' + item.key} aria-selected={index === pillar} aria-controls="ph-stage-panel" tabIndex={index === pillar ? 0 : -1} className={index === pillar ? 'is-active' : ''} onClick={() => choose(index)}>
          <span className={'ph-tab-dot ph-dot-' + item.key} aria-hidden="true"/>{item.label}
          {index === pillar && auto && !reduced && <i className="ph-tab-timer" aria-hidden="true" key={pillar}/>}
        </button>)}
      </div>
      <div className="ph-stage-frame" id="ph-stage-panel" role="tabpanel" aria-labelledby={'ph-tab-' + current.key}>
        <div className="ph-stage-canvas">{PILLARS.map((item, index) => <PhotoScene key={item.key} item={item} active={index === pillar} stage={index === pillar ? shownStage : 0}/>)}</div>
        <div className="ph-stage-caption" aria-live="polite">
          <div><small>{current.caption}</small><b>{current.steps[shownStage]}</b></div>
          <ol aria-label={current.label + ' steps'}>{current.steps.map((step, index) => <li key={step} className={index <= shownStage ? 'is-done' : ''} title={step}><span className="sr-only">{step}</span></li>)}</ol>
        </div>
      </div>
    </div>
  )
}
