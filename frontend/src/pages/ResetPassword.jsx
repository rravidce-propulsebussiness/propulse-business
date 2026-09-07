import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Auth.css'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!token) return setError('This reset link is missing its token. Please request a new one.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    try {
      setLoading(true)
      await publicRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
      setDone(true)
      window.setTimeout(() => navigate('/login', { replace: true }), 1200)
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
          <p className="auth-kicker">SECURE YOUR ACCOUNT</p>
          <h1>Set a new password</h1>
          <p className="auth-recovery-copy">Choose a new password with at least 8 characters.</p>
          {error && <div className="auth-error" role="alert">{error}</div>}
          {done && <div className="auth-success" role="status">Password updated. Taking you to sign in…</div>}
          {!done && <form onSubmit={submit}>
            <label>New password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required /><button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
            <label>Confirm password<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat your password" required /></label>
            <button className="auth-submit" disabled={loading}>{loading ? 'Updating…' : 'Update password'} <span>→</span></button>
          </form>}
          <p className="auth-switch"><Link to="/login">← Back to sign in</Link></p>
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
