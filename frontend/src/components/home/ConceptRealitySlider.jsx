import { useRef, useState } from 'react'

const unsplash = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=82`
const INTERIOR_ROOMS = [
  { key: 'living', label: 'Living room', image: unsplash('1600210492486-724fe5c67fb0'), note: 'Wall panelling, layered lighting and a layout planned around how you sit and talk.' },
  { key: 'kitchen', label: 'Modular kitchen', image: unsplash('1556911220-bff31c812dba'), note: 'Work triangle, storage counts, shutter finish and countertop agreed before fabrication.' },
  { key: 'bedroom', label: 'Bedroom', image: unsplash('1616594039964-ae9021a400a0'), note: 'Wardrobes, bed-back panel, curtains and soft lighting specified room by room.' },
  { key: 'dining', label: 'Dining', image: unsplash('1617806118233-18e1de247200'), note: 'Crockery unit, pendant height and finishes matched to the rest of the home.' },
]

// Drag (or use arrow keys on) the handle to compare the design-stage drawing
// with the finished room. The range input carries the accessible control.
export default function ConceptRealitySlider() {
  const [room, setRoom] = useState(0)
  const [split, setSplit] = useState(52)
  const current = INTERIOR_ROOMS[room]
  const boxRef = useRef(null)
  const dragging = useRef(false)
  const moveTo = clientX => {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return
    setSplit(Math.round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))))
  }
  const onPointerDown = event => { dragging.current = true; event.currentTarget.setPointerCapture?.(event.pointerId); if (event.pointerType === 'mouse') moveTo(event.clientX) }
  const onPointerMove = event => { if (dragging.current) moveTo(event.clientX) }
  const stopDrag = () => { dragging.current = false }
  return (
    <div className="ph-compare-wrap">
      <div className="ph-compare" ref={boxRef} style={{ '--split': split + '%' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
        <img className="ph-compare-real" src={current.image} alt={current.label + ' interior'} loading="lazy" decoding="async"/>
        <div className="ph-compare-concept" aria-hidden="true">
          <img src={current.image} alt="" loading="lazy" decoding="async"/>
          <span className="ph-compare-grid"/>
        </div>
        <span className="ph-compare-label ph-compare-label-left" aria-hidden="true">Design drawing</span>
        <span className="ph-compare-label ph-compare-label-right" aria-hidden="true">Finished space</span>
        <input type="range" min="0" max="100" value={split} onChange={event => setSplit(Number(event.target.value))} aria-label="Compare design drawing with finished space"/>
        <span className="ph-compare-handle" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6-6 6 6 6M15 6l6 6-6 6"/></svg></span>
      </div>
      <div className="ph-room-tabs" role="group" aria-label="Choose a room">
        {INTERIOR_ROOMS.map((item, index) => <button key={item.key} type="button" aria-pressed={index === room} className={index === room ? 'is-active' : ''} onClick={() => { setRoom(index); setSplit(52) }}>{item.label}</button>)}
      </div>
      <p className="ph-room-note">{current.note}</p>
    </div>
  )
}
