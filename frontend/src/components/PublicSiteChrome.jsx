import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './PublicSiteChrome.css'

const NAV_ITEMS = [
  { to: '/', label: 'Home', match: path => path === '/' },
  { to: '/packages', label: 'Packages', match: path => path.startsWith('/packages') },
  { to: '/projects', label: 'Projects', match: path => path.startsWith('/projects') },
  { to: '/how-it-works', label: 'How It Works', match: path => path.startsWith('/how-it-works') },
  { to: '/about', label: 'About', match: path => path.startsWith('/about') },
  { to: '/faq', label: 'FAQ', match: path => path.startsWith('/faq') },
  { to: '/contact', label: 'Contact', match: path => path.startsWith('/contact') },
  { to: '/experts', label: 'Find Professionals', match: path => path.startsWith('/experts') },
]

function ArrowIcon({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>
}

function PinIcon({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
}

export function PublicHeader() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const pathname = location.pathname.replace(/\/+$/, '') || '/'
  const activeLabel = useMemo(() => NAV_ITEMS.find(item => item.match(pathname))?.label || '', [pathname])

  useEffect(() => {
    setOpen(false)
  }, [pathname, location.hash])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1020) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return <header className="public-site-header">
    <div className="public-site-header__inner">
      <Link className="public-site-logo" to="/" aria-label="ProPulse home">
        <img src="/brand/propulse-logo.svg" alt="ProPulse"/>
      </Link>

      <nav className="public-site-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(item => <Link className={activeLabel === item.label ? 'active' : ''} to={item.to} key={item.to}>{item.label}</Link>)}
      </nav>

      <div className="public-site-actions">
        <Link className="public-site-quote" to="/quote#interiors">Get Free Quote <ArrowIcon/></Link>
        <Link className="public-site-pro" to="/professionals">For Professionals</Link>
      </div>

      <button
        className={'public-site-menu-toggle' + (open ? ' open' : '')}
        type="button"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span/><span/><span/>
      </button>

      <div className={'public-site-mobile-menu' + (open ? ' open' : '')}>
        <nav aria-label="Mobile navigation">
          {NAV_ITEMS.map(item => <Link className={activeLabel === item.label ? 'active' : ''} to={item.to} key={item.to}>{item.label}</Link>)}
        </nav>
        <div className="public-site-mobile-actions">
          <Link className="public-site-quote" to="/quote#interiors">Get Free Quote <ArrowIcon/></Link>
          <Link className="public-site-pro" to="/professionals">For Professionals</Link>
        </div>
      </div>
    </div>
  </header>
}

export function PublicFooter({
  phone = '',
  email = '',
  address = 'Hyderabad, India',
  description = 'A homeowner-first starting point for construction, interiors and real-estate requirements.',
}) {
  const phoneHref = phone ? 'tel:' + String(phone).replace(/[^+\d]/g, '') : ''

  return <footer className="public-site-footer">
    <div className="public-site-footer__inner">
      <div className="public-site-footer-brand">
        <img src="/brand/propulse-logo.svg" alt="ProPulse"/>
        <p>{description}</p>
      </div>
      <div>
        <b>Homeowners</b>
        <Link to="/">Home</Link>
        <Link to="/packages">Packages</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/experts">Find Professionals</Link>
      </div>
      <div>
        <b>Services</b>
        <Link to="/quote#construction">Home Construction</Link>
        <Link to="/quote#interiors">Interior Design</Link>
        <Link to="/quote#property">Real Estate</Link>
        <Link to="/hyderabad/construction-cost">Construction Cost Guide</Link>
      </div>
      <div>
        <b>Support</b>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
        <Link to="/faq">FAQ</Link>
        <Link to="/contact">Contact</Link>
      </div>
      <div>
        <b>Contact</b>
        {phone && <a href={phoneHref}>{phone}</a>}
        {email && <a href={'mailto:' + email}>{email}</a>}
        <span><PinIcon/>{address}</span>
      </div>
    </div>
    <div className="public-site-footer__bottom">
      <span>© {new Date().getFullYear()} ProPulse</span>
      <Link to="/professionals">Professional portal</Link>
    </div>
  </footer>
}

export default PublicHeader
