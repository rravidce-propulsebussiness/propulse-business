import { useEffect, useRef, useState } from 'react'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return undefined
    const update = () => setReduced(query.matches)
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return reduced
}

// Reports whether the element is on screen. `once` keeps it true after the first sighting.
export function useInView({ once = false, rootMargin = '0px 0px -12% 0px', threshold = 0.15 } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (!('IntersectionObserver' in window)) { setInView(true); return undefined }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        if (once) observer.disconnect()
      } else if (!once) setInView(false)
    }, { rootMargin, threshold })
    observer.observe(node)
    return () => observer.disconnect()
  }, [once, rootMargin, threshold])
  return [ref, inView]
}
