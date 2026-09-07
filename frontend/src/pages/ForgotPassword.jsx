import { useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Auth.css'
import './AuthExtras.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    if (!email.trim()) return setError('Enter your email address.')
    try {
      setLoading(true)
      const result = await publicRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
      setMessage(result.message || 'If an account exists for that email, a reset link has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
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
          {message && <div className="auth-success" role="status">{message}</div>}
          <form onSubmit={submit}>
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required /></label>
            <button className="auth-submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'} <span>→</span></button>
          </form>
          <p className="auth-switch"><Link to="/login">← Back to sign in</Link></p>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
