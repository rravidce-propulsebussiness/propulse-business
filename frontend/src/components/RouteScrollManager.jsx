import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { chooseScrollPosition } from '../utils/scrollRestoration'

const readPosition = () => ({ top: window.scrollY, left: window.scrollX })
const moveTo = ({ top, left }) => {
  window.scrollTo({ top, left, behavior: 'instant' })
}

/**
 * Preserve viewport position for in-page actions (tabs, filters and search),
 * reset only for real page changes, and restore positions on Back/Forward.
 * Hashes that point to real DOM anchors still take priority.
 */
export default function RouteScrollManager() {
  const { pathname, search, hash, key } = useLocation()
  const navigationType = useNavigationType()
  const activeRoute = useRef(null)
  const scrollPositions = useRef(new Map())

  useLayoutEffect(() => {
    const oldRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    const rememberPosition = () => {
      const active = activeRoute.current
      if (!active) return
      const positions = scrollPositions.current
      positions.set(active.key, readPosition())
      // Cap the history cache for long-running mobile browser sessions.
      if (positions.size > 120) positions.delete(positions.keys().next().value)
    }
    window.addEventListener('scroll', rememberPosition, { passive: true })
    return () => {
      window.removeEventListener('scroll', rememberPosition)
      window.history.scrollRestoration = oldRestoration
    }
  }, [])

  useLayoutEffect(() => {
    const previousRoute = activeRoute.current
    const nextRoute = { pathname, search, hash, key }
    const storedPosition = scrollPositions.current.get(key)
    const previousPosition = previousRoute
      ? (scrollPositions.current.get(previousRoute.key) || readPosition())
      : readPosition()
    const restoreFromHistory = navigationType === 'POP' && Boolean(storedPosition)
    const targetPosition = chooseScrollPosition({
      previousRoute, nextRoute, navigationType, storedPosition, previousPosition,
    })

    // Switch the tracking key before programmatic scroll events can fire.
    activeRoute.current = nextRoute

    // A hash can also be a tab identifier (e.g. /quote#interiors).
    // Scroll only when it is a changed hash pointing at an actual element.
    const newAnchor = Boolean(hash && (hash !== previousRoute?.hash || pathname !== previousRoute?.pathname))
    let anchorId = hash.slice(1)
    try { anchorId = decodeURIComponent(anchorId) } catch { /* Use the raw hash. */ }

    const moveToAnchor = () => {
      if (!newAnchor || restoreFromHistory || !anchorId) return false
      const element = document.getElementById(anchorId)
      if (!element) return false
      element.scrollIntoView({ block: 'start', behavior: 'instant' })
      return true
    }

    if (moveToAnchor()) return undefined
    moveTo(targetPosition)

    // A new route or selected tab may mount in the following frame.
    // Reapply the intended position without resetting in-page controls.
    const frame = window.requestAnimationFrame(() => {
      if (!moveToAnchor()) moveTo(targetPosition)
    })

    if (!newAnchor || restoreFromHistory || !anchorId) {
      return () => window.cancelAnimationFrame(frame)
    }

    // Lazy-loaded sections can contain the requested DOM anchor.
    const observer = new MutationObserver(() => {
      if (moveToAnchor()) {
        window.cancelAnimationFrame(frame)
        observer.disconnect()
      }
    })
    observer.observe(document.getElementById('root') || document.body, {
      childList: true,
      subtree: true,
    })
    const timeout = window.setTimeout(() => observer.disconnect(), 2000)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
      observer.disconnect()
    }
  }, [pathname, search, hash, key, navigationType])

  return null
}
