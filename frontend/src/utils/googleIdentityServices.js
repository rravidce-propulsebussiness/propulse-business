const GIS_SRC = 'https://accounts.google.com/gsi/client'
const GIS_PROMISE_KEY = '__propulse_gis_loader__'

export function getGoogleClientId() {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
}

export function getBrowserOrigin() {
  return typeof window === 'undefined' ? '' : window.location.origin
}

export function loadGoogleIdentityServices() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Identity Services requires a browser'))
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  if (window[GIS_PROMISE_KEY]) return window[GIS_PROMISE_KEY]

  window[GIS_PROMISE_KEY] = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="' + GIS_SRC + '"]')
    const script = existing || document.createElement('script')
    let settled = false
    let timeout
    let check
    const finish = (error) => {
      if (settled) return
      settled = true
      if (check) window.clearInterval(check)
      if (timeout) window.clearTimeout(timeout)
      if (error) {
        window[GIS_PROMISE_KEY] = null
        reject(error)
      } else if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id)
      } else {
        window[GIS_PROMISE_KEY] = null
        reject(new Error('Google Identity Services loaded without the Google Identity API'))
      }
    }

    script.async = true
    script.defer = true
    script.src = GIS_SRC
    script.onload = () => finish()
    script.onerror = () => finish(new Error('Unable to load Google Identity Services'))
    if (!existing) document.head.appendChild(script)

    timeout = window.setTimeout(() => finish(new Error('Google Identity Services timed out')), 10000)
    check = window.setInterval(() => {
      if (window.google?.accounts?.id) finish()
    }, 50)
  })

  return window[GIS_PROMISE_KEY]
}

export function assertGoogleConfiguration() {
  const clientId = getGoogleClientId()
  const origin = getBrowserOrigin()
  if (!clientId) throw new Error('Google Sign-In is not configured: VITE_GOOGLE_CLIENT_ID is missing.')
  if (!origin) throw new Error('Google Sign-In requires a browser origin.')
  return { clientId, origin }
}
