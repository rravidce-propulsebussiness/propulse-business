import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Auth.css'
import './AuthExtras.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [message, setMessage] = useState('')
  const [deliveryHint, setDeliveryHint] = useState('')
  const [error, setError] = useState('')
  const submittingRef = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    let active = true
    let typingTimer
    let startTimer

    queueMicrotask(() => {
      if (!active) return
      if (!message) {
        setDeliveryHint('')
        return
      }

      const hint = 'Not in your inbox? Check Spam or Promotions.'
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      if (reduceMotion) {
        setDeliveryHint(hint)
        return
      }

      setDeliveryHint('')
      let index = 0
      startTimer = window.setTimeout(() => {
        if (!active) return
        typingTimer = window.setInterval(() => {
          if (!active) return
          index += 1
          setDeliveryHint(hint.slice(0, index))
          if (index >= hint.length) window.clearInterval(typingTimer)
        }, 34)
      }, 420)
    })

    return () => {
      active = false
      if (startTimer) window.clearTimeout(startTimer)
      if (typingTimer) window.clearInterval(typingTimer)
    }
  }, [message])

  async function submit(e) {
    e.preventDefault()
    if (submittingRef.current || loading || cooldown > 0) return
    const normalizedEmail = email.trim().toLowerCase()
    setMessage('')
    setDeliveryHint('')
    setError('')
    if (!normalizedEmail) return setError('Enter your email address.')
    submittingRef.current = true
    try {
      setLoading(true)
      const result = await publicRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail }),
      })
      setMessage(result.message || 'Reset link sent. Please check your email.')
      setCooldown(60)
    } catch (err) {
      if (err.status === 429) {
        const seconds = Math.max(1, Number(err.retryAfter) || 60)
        setCooldown(seconds)
        const minutes = Math.max(1, Math.ceil(seconds / 60))
        setError(`Too many reset requests for this email. Please try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`)
      } else if (err.code === 'ACCOUNT_NOT_FOUND') {
        setError('No user found with this email address.')
      } else if (err.code === 'PASSWORD_RESET_EMAIL_UNAVAILABLE') {
        setError('We could not send the reset email right now. Please try again in a moment.')
      } else {
        setError(err.message || 'Unable to send the reset link right now.')
      }
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className="auth-page auth-simple-page">
      <header className="auth-topbar">
        <Link className="auth-topbar-brand" to="/" aria-label="ProPulse Business home"><img src="/brand/propulse-logo.png" alt="ProPulse Business" /></Link>
        <Link className="auth-home-button" to="/">Homepage</Link>
      </header>
      <main className="auth-simple-wrap">
        <div className="auth-card auth-recovery-card">
          <p className="auth-kicker">ACCOUNT RECOVERY</p>
          <h1>Forgot your password?</h1>
          <p className="auth-recovery-copy">Enter the email you use for ProPulse Business and we'll send you a secure reset link.</p>
          {error && <div className="auth-error" role="alert">{error}</div>}
          {message && (
            <div className="auth-success auth-success-recovery" role="status">
              <div>{message}</div>
              <div className="auth-delivery-hint" aria-label="Not in your inbox? Check Spam or Promotions.">
                <span aria-hidden="true">{deliveryHint}</span><span className="auth-typing-cursor" aria-hidden="true">|</span>
              </div>
            </div>
          )}
          <form onSubmit={submit}>
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required /></label>
            <button className="auth-submit" disabled={loading || cooldown > 0}>
              {loading ? 'Sending…' : cooldown > 0 ? `Try again in ${cooldown}s` : 'Send reset link'} <span>→</span>
            </button>
          </form>
          <p className="auth-switch"><Link to="/login">← Back to sign in</Link></p>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
