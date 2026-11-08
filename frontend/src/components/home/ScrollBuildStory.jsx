import { useEffect, useRef, useState } from 'react'
import { HouseScene } from './HomeScenes'

// Scroll-driven construction story: the drawing stays pinned while each step
// scrolls past, and the house gains the layer that step describes.
const STEPS = [
  { title: 'Plot & soil check', text: 'We start with your plot: boundaries, orientation, soil and local approvals. This decides what can be built and how.', tag: 'Week 0' },
  { title: 'Foundation', text: 'Footings and plinth are designed for your soil and the number of floors, so the house stands on the right base.', tag: 'Base' },
  { title: 'RCC structure', text: 'Columns, beams and slabs go up floor by floor, with checks before every concrete pour.', tag: 'Frame' },
  { title: 'Walls, plumbing & electrical', text: 'Blockwork, window openings, conduits and pipes are laid to the agreed drawings before plastering.', tag: 'Services' },
  { title: 'Finishes & handover', text: 'Flooring, glazing, cladding, paint and fittings are completed, reviewed with you and handed over with documents.', tag: 'Keys' },
]

export default function ScrollBuildStory() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const sectionRef = useRef(null)
  const stepRefs = useRef([])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setActive(STEPS.length - 1); return undefined }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActive(Number(entry.target.dataset.step))
      })
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 })
    stepRefs.current.forEach(node => node && observer.observe(node))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const node = sectionRef.current
      if (!node) return
      const header = document.querySelector('.public-site-header')
      const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0
      node.style.setProperty('--ph-sticky-top', Math.round(headerBottom + 12) + 'px')
      const rect = node.getBoundingClientRect()
      const span = rect.height - window.innerHeight * 0.6
      const value = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - rect.top) / Math.max(1, span)))
      setProgress(value)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure) }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame) }
  }, [])

  return (
    <div className="ph-story" ref={sectionRef}>
      <div className="ph-story-visual">
        <div className="ph-story-card">
          <HouseScene stage={active} idPrefix="story"/>
          <div className="ph-story-meter" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }}/></div>
          <div className="ph-story-now"><span>{String(active + 1).padStart(2, '0')}</span><b>{STEPS[active].title}</b></div>
        </div>
      </div>
      <ol className="ph-story-steps">
        {STEPS.map((step, index) => <li key={step.title} ref={node => { stepRefs.current[index] = node }} data-step={index} className={index === active ? 'is-active' : index < active ? 'is-past' : ''}>
          <span className="ph-story-index">{String(index + 1).padStart(2, '0')}</span>
          <div><small>{step.tag}</small><h3>{step.title}</h3><p>{step.text}</p></div>
        </li>)}
      </ol>
    </div>
  )
}
