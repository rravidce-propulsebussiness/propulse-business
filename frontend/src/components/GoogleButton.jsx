import { useEffect, useRef, useState } from 'react'
import { assertGoogleConfiguration, loadGoogleIdentityServices } from '../utils/googleIdentityServices'

const GOOGLE_STATE_KEY = '__propulse_google_state__'

function getGoogleState() {
  if (!window[GOOGLE_STATE_KEY]) {
    window[GOOGLE_STATE_KEY] = { initialized: false, callback: null, clientId: null }
  }
  return window[GOOGLE_STATE_KEY]
}

function GoogleButton({ onCredential, disabled = false }) {
  const containerRef = useRef(null)
  const credentialRef = useRef(onCredential)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    credentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (disabled) return undefined
    let cancelled = false

    async function mount() {
      try {
        const { clientId, origin } = assertGoogleConfiguration()
        const googleId = await loadGoogleIdentityServices()
        if (cancelled || !containerRef.current) return

        const googleState = getGoogleState()
        googleState.callback = credentialRef.current

        if (!googleState.initialized || googleState.clientId !== clientId) {
          googleId.initialize({
            client_id: clientId,
            callback: response => getGoogleState().callback?.(response.credential),
            use_fedcm_for_button: true,
          })
          googleState.initialized = true
          googleState.clientId = clientId
        }

        containerRef.current.innerHTML = ''
        googleId.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(360, Math.max(260, containerRef.current.clientWidth || 360)),
        })
        setReady(true)
        setLoadError('')
        if (import.meta.env.DEV) {
          console.info('[Propulse][GIS] ready', { clientId, origin })
        }
      } catch (error) {
        if (cancelled) return
        setReady(false)
        setLoadError(error?.message || 'Google Sign-In could not be initialized.')
        if (import.meta.env.DEV) {
          console.error('[Propulse][GIS] initialization failed:', error)
        }
      }
    }

    mount()
    return () => {
      cancelled = true
    }
  }, [disabled])

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return <div className="google-unconfigured">Continue with Google is not configured.</div>
  }

  return (
    <div className="google-button-wrap">
      <div ref={containerRef} />
      {!ready && !loadError && <span>Loading Google sign-in…</span>}
      {loadError && <span role="status">{loadError}</span>}
    </div>
  )
}

export default GoogleButton
