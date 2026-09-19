import { useEffect, useRef, useState } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Google Identity Services is a singleton. Keep initialization/callback state
// on window so React StrictMode and HMR cannot initialize it repeatedly.
const GOOGLE_STATE_KEY = '__propulse_google_state__'
function getGoogleState() {
  if (!window[GOOGLE_STATE_KEY]) window[GOOGLE_STATE_KEY] = { initialized: false, callback: null, clientId: null }
  return window[GOOGLE_STATE_KEY]
}

function GoogleButton({ onCredential, disabled = false }) {
  const containerRef = useRef(null)
  const credentialRef = useRef(onCredential)
  const initializedRef = useRef(false)
  const [ready, setReady] = useState(Boolean(window.google?.accounts?.id))

  useEffect(() => {
    credentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || disabled) return undefined
    let cancelled = false

    function render() {
      if (cancelled || initializedRef.current || !window.google?.accounts?.id || !containerRef.current) return
      initializedRef.current = true
      setReady(true)
      containerRef.current.innerHTML = ''
      const googleState = getGoogleState()
      googleState.callback = credentialRef.current
      if (!googleState.initialized || googleState.clientId !== GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: response => getGoogleState().callback?.(response.credential),
        })
        googleState.initialized = true
        googleState.clientId = GOOGLE_CLIENT_ID
      }
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.min(360, Math.max(260, containerRef.current.clientWidth || 360)),
      })
    }

    if (window.google?.accounts?.id) {
      render()
      return undefined
    }

    const interval = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        window.clearInterval(interval)
        render()
      }
    }, 100)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [disabled])

  if (!GOOGLE_CLIENT_ID) {
    return <div className="google-unconfigured">Continue with Google is ready after <code>VITE_GOOGLE_CLIENT_ID</code> is added.</div>
  }

  return (
    <div className={`google-button-wrap${!ready ? ' is-loading' : ''}`}>
      <div ref={containerRef} />
      {!ready && <span>Loading Google sign-in…</span>}
    </div>
  )
}

export default GoogleButton
