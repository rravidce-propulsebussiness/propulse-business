import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * React Router reuses the document between pages, so reset window scroll on
 * each navigation. Only actual element anchors (not view-selection hashes)
 * should override the top-of-page behavior.
 */
export default function RouteScrollManager() {
  const { pathname, search, hash, key } = useLocation()

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previous }
  }, [])

  useLayoutEffect(() => {
    // Avoid smooth scrolling through the old page on navigation.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    // Reinforce the reset after a lazily loaded route replaces its fallback.
    const topFrame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    })

    if (!hash) return () => window.cancelAnimationFrame(topFrame)

    // Some routes (e.g. /quote#interiors) use the hash to select a view,
    // while links to a real DOM id should still scroll to that section.
    let id = hash.slice(1)
    try { id = decodeURIComponent(id) } catch { /* Keep the literal id. */ }
    if (!id) return undefined

    const scrollToAnchor = () => {
      const element = document.getElementById(id)
      if (!element) return false
      element.scrollIntoView({ block: 'start', behavior: 'instant' })
      return true
    }

    if (scrollToAnchor()) {
      window.cancelAnimationFrame(topFrame)
      return undefined
    }

    // Lazy route content may mount after the router location changes.
    // Watch briefly for an explicit anchor, without keeping a permanent observer.
    const observer = new MutationObserver(() => {
      if (scrollToAnchor()) {
        window.cancelAnimationFrame(topFrame)
        observer.disconnect()
      }
    })
    observer.observe(document.getElementById('root') || document.body, {
      childList: true,
      subtree: true,
    })
    const timer = window.setTimeout(() => observer.disconnect(), 2000)
    return () => {
      window.cancelAnimationFrame(topFrame)
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [pathname, search, hash, key])

  return null
}
