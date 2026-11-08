import { useEffect, useRef, useState } from 'react'
import { HouseScene, RoomScene, TechScene } from './home/HomeScenes'
import { HOUSE_STAGES, ROOM_STAGES, TECH_STAGES } from './home/homeSceneSteps'
import { useInView, useReducedMotion } from './home/useHomeMotion'

// Interactive hero stage: Construction, Interiors and Technology each "build"
// themselves in five steps, then the stage moves to the next division.
const PILLARS = [
  { key: 'construction', label: 'Construction', caption: 'Plot to handover', steps: HOUSE_STAGES, Scene: HouseScene },
  { key: 'interiors', label: 'Interiors', caption: 'Shell to styled home', steps: ROOM_STAGES, Scene: RoomScene },
  { key: 'technology', label: 'Technology', caption: 'Software that runs projects', steps: TECH_STAGES, Scene: TechScene },
]
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

  const Scene = current.Scene
  return (
    <div className="ph-stage" ref={rootRef} data-pillar={current.key} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <div className="ph-stage-tabs" role="tablist" aria-label="ProPulse divisions" onKeyDown={onKeyDown}>
        {PILLARS.map((item, index) => <button key={item.key} ref={node => { tabRefs.current[index] = node }} type="button" role="tab" id={'ph-tab-' + item.key} aria-selected={index === pillar} aria-controls="ph-stage-panel" tabIndex={index === pillar ? 0 : -1} className={index === pillar ? 'is-active' : ''} onClick={() => choose(index)}>
          <span className={'ph-tab-dot ph-dot-' + item.key} aria-hidden="true"/>{item.label}
          {index === pillar && auto && !reduced && <i className="ph-tab-timer" aria-hidden="true" key={pillar}/>}
        </button>)}
      </div>
      <div className="ph-stage-frame" id="ph-stage-panel" role="tabpanel" aria-labelledby={'ph-tab-' + current.key}>
        <div className="ph-stage-canvas" key={current.key}><Scene stage={shownStage} idPrefix={'hero-' + current.key}/></div>
        <div className="ph-stage-caption" aria-live="polite">
          <div><small>{current.caption}</small><b>{current.steps[shownStage]}</b></div>
          <ol aria-label={current.label + ' steps'}>{current.steps.map((step, index) => <li key={step} className={index <= shownStage ? 'is-done' : ''} title={step}><span className="sr-only">{step}</span></li>)}</ol>
        </div>
      </div>
    </div>
  )
}
