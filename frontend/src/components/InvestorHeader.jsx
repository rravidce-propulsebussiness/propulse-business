import { Link } from 'react-router-dom'
import { getToken, getUser } from '../utils/auth'
import './InvestorHeader.css'

export default function InvestorHeader() {
  const token = getToken()
  const user = getUser()
  const loggedIn = Boolean(token && user)

  return (
    <header className="public-header investment-public-header">
      <Link className="brand" to="/" aria-label="Propulse home">
        <img src="/brand/propulse-logo.png" alt="Propulse" />
      </Link>

      <nav className="desktop-nav" aria-label="Main navigation">
        <Link to="/">Home</Link>
        <Link to="/leads">Buy Leads</Link>
        <a href="/#how-it-works">How It Works</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#about">About</a>
        <a href="/#contact">Contact</a>
        <a href="/#faq">FAQ</a>
        <a href="/#upcoming-features">Upcoming Features</a>
      </nav>

      <div className="header-actions">
        {loggedIn ? (
          <Link className="header-login" to={user?.role === 'admin' ? '/admin' : '/leads'}>
            Marketplace
          </Link>
        ) : (
          <Link className="header-login" to="/login">Login</Link>
        )}
        <Link className="header-signup" to={loggedIn ? '/leads' : '/signup'}>
          {loggedIn ? 'Explore Leads' : 'Get Started'} <span>→</span>
        </Link>
      </div>
    </header>
  )
}
