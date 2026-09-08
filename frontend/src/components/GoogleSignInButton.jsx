import { useEffect, useRef } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function GoogleSignInButton({ onCredential, text = 'continue_with', width = 350 }) {
  const ref = useRef(null)
  const initializedClient = useRef('')

  useEffect(() => {
    if (!CLIENT_ID || !ref.current || typeof window === 'undefined') return

    const render = () => {
      if (!window.google?.accounts?.id || !ref.current) return
      ref.current.innerHTML = ''

      if (initializedClient.current !== CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: response => onCredential?.(response.credential),
        })
        initializedClient.current = CLIENT_ID
      }

      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline',
        size: 'large',
        text,
        shape: 'rectangular',
        width,
      })
    }

    if (window.google?.accounts?.id) {
      render()
      return
    }

    const scriptId = 'google-identity-services-script'
    let script = document.getElementById(scriptId)
    const handleLoad = () => render()
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', handleLoad)
    return () => script?.removeEventListener('load', handleLoad)
  }, [onCredential, text, width])

  if (!CLIENT_ID) return null
  return <div ref={ref} className="google-signin-button" />
}
