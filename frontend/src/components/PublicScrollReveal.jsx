import { useEffect } from 'react'
import './PublicScrollReveal.css'

// Animate editorial sections and cards, not forms, menus, or application workspaces.
const REVEAL_SELECTOR = [
  '.premium-public main:not(.quote-page) > section:not(:first-of-type)',
  '.premium-public main:not(.quote-page) article',
  '.premium-public .hc-service-card',
  '.premium-public .hc-benefit-grid > article',
  '.premium-public .hc-step-grid > article',
  '.premium-public .hc-project-grid > article',
  '.premium-public .pkg-premium-card',
  '.premium-public .pj-project-card',
  '.premium-public .expert-card',
  '.premium-public .hiw-step-card',
].join(', ')

export default function PublicScrollReveal({ pathname }) {
  useEffect(() => {
    const root = document.querySelector('.premium-public')
    if (!root || !('IntersectionObserver' in window) || !('MutationObserver' in window)
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    const seen = new WeakSet()
    const pending = new Set()
    const activeTimers = new Set()
    let frame = 0

    const reveal = (element) => {
      if (!pending.has(element)) return
      pending.delete(element)
      observer.unobserve(element)
      element.dataset.scrollReveal = 'visible'
      const timer = window.setTimeout(() => {
        activeTimers.delete(timer)
        if (element.isConnected) element.removeAttribute('data-scroll-reveal')
      }, 800)
      activeTimers.add(timer)
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) reveal(entry.target)
      })
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.03 })

    const scan = () => {
      frame = 0
      const activationLine = window.innerHeight * 0.88
      root.querySelectorAll(REVEAL_SELECTOR).forEach(element => {
        if (seen.has(element)
          || element.closest('[data-no-scroll-reveal], [role="dialog"], [aria-modal="true"]')) return
        const rect = element.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        seen.add(element)
        // Anything already visible on first paint remains immediately usable.
        if (rect.top < activationLine) return
        element.dataset.scrollReveal = 'pending'
        pending.add(element)
        observer.observe(element)
      })
    }

    const scheduleScan = () => {
      if (!frame) frame = window.requestAnimationFrame(scan)
    }
    const changes = new MutationObserver(scheduleScan)
    changes.observe(root, { childList: true, subtree: true })
    scan()

    return () => {
      changes.disconnect()
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
      activeTimers.forEach(timer => window.clearTimeout(timer))
      pending.forEach(element => element.removeAttribute('data-scroll-reveal'))
    }
  }, [pathname])

  return null
}
