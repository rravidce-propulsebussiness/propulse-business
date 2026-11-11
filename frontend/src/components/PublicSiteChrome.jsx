import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './PublicSiteChrome.css'
import './PublicSiteChromeFix.css'

const NAV_ITEMS = [
  { to: '/', label: 'Home', match: path => path === '/' },
  { to: '/packages', label: 'Packages', match: path => path.startsWith('/packages') },
  { to: '/projects', label: 'Projects', match: path => path.startsWith('/projects') },
  // Cost & Guides, About and FAQ live in the footer only.
  { to: '/technology', label: 'Products & Services', match: path => path.startsWith('/technology') },
  { to: '/contact', label: 'Contact', match: path => path.startsWith('/contact') },
]

function ArrowIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>
}
function PinIcon({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
}
function PhoneIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
}

export function PublicHeader() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = location.pathname.replace(/\/+$/, '') || '/'
  const activeLabel = useMemo(() => NAV_ITEMS.find(item => item.match(pathname))?.label || '', [pathname])

  useEffect(() => { setOpen(false) }, [pathname, location.hash])
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 1020) setOpen(false) }
    const onKeyDown = event => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKeyDown); window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('resize', onResize) }
  }, [])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMenu = () => setOpen(false)
  return <>
    <div className="public-site-topbar">
      <div className="public-site-topbar__inner">
        <span><PinIcon/> Hyderabad, Telangana</span>
        <a href="tel:+919000360812"><PhoneIcon/> +91 90003 60812</a>
        <a href="mailto:info@propulsetechnologies.online">✉ info@propulsetechnologies.online</a>
        <Link to="/contact?audience=lead_partners">For Business / Partnerships <ArrowIcon/></Link>
      </div>
    </div>
    <header className={'public-site-header' + (scrolled ? ' is-scrolled' : '')}>
      <div className="public-site-header__inner">
        <Link className="public-site-logo" to="/" aria-label="ProPulse home"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
        <nav className="public-site-nav" aria-label="Main navigation">
          {NAV_ITEMS.slice(0, 3).map(item => <Link className={activeLabel === item.label ? 'active' : ''} to={item.to} key={item.to} aria-current={activeLabel === item.label ? 'page' : undefined}>{item.label}</Link>)}
          <Link className={pathname.startsWith('/experts') ? 'active' : ''} to="/experts" aria-current={pathname.startsWith('/experts') ? 'page' : undefined}>Find Professionals</Link>
          {NAV_ITEMS.slice(3).map(item => <Link className={activeLabel === item.label ? 'active' : ''} to={item.to} key={item.to} aria-current={activeLabel === item.label ? 'page' : undefined}>{item.label}</Link>)}
        </nav>
        <div className="public-site-actions">
          <Link className="public-site-login" to="/login">Professional Login</Link>
          <Link className="public-site-join" to="/professionals">Join as a Professional <ArrowIcon/></Link>
          <Link className="public-site-quote" to="/quote#construction">Get a Quote <ArrowIcon/></Link>
        </div>
        <button className={'public-site-menu-toggle' + (open ? ' open' : '')} type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="public-mobile-navigation" onClick={() => setOpen(value => !value)}>
          <span/><span/><span/>
        </button>
        <div id="public-mobile-navigation" className={'public-site-mobile-menu' + (open ? ' open' : '')}>
          <div className="public-site-mobile-menu-head"><span>Explore ProPulse</span><button type="button" onClick={closeMenu} aria-label="Close menu">×</button></div>
          <nav aria-label="Mobile navigation">
            {NAV_ITEMS.map(item => <Link className={activeLabel === item.label ? 'active' : ''} to={item.to} key={item.to} onClick={closeMenu} aria-current={activeLabel === item.label ? 'page' : undefined}>{item.label}</Link>)}
            <Link to="/experts" onClick={closeMenu}>Find Professionals</Link>
            <Link to="/professionals" onClick={closeMenu}>Join as a Professional</Link>
            <Link to="/login" onClick={closeMenu}>Professional Login</Link>
          </nav>
          <div className="public-site-mobile-actions">
            <Link className="public-site-quote" to="/quote#construction" onClick={closeMenu}>Get a Quote <ArrowIcon/></Link>
            <Link className="public-site-pro" to="/contact?audience=lead_partners" onClick={closeMenu}>For Business / Partnerships</Link>
          </div>
          <div className="public-site-mobile-contact"><a href="tel:+919000360812">+91 90003 60812</a><a href="mailto:info@propulsetechnologies.online">info@propulsetechnologies.online</a></div>
        </div>
      </div>
    </header>
    <div className="public-site-header-spacer" aria-hidden="true"/>
  </>
}

export function PublicFooter({ phone = '', email = '', address = 'Hyderabad, India', description = 'ProPulse directly delivers construction and interiors, operates a professional lead marketplace and provides websites, apps, Chrome extensions, digital marketing, social media and CRM services.' }) {
  const displayPhone = phone || '+91 9000360812'
  const displayEmail = email || 'info@propulsetechnologies.online'
  const phoneHref = 'tel:' + String(displayPhone).replace(/[^+\d]/g, '')
  return <footer className="public-site-footer">
    <div className="public-site-footer__inner">
      <div className="public-site-footer-brand"><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>{description}</p></div>
      <div><b>Homeowners</b><Link to="/">Home</Link><Link to="/experts">Find Professionals</Link></div>
      <div><b>Services</b><Link to="/contact">Direct ProPulse Projects</Link><Link to="/technology">Products &amp; Services</Link><Link to="/quote#construction">Home Construction</Link><Link to="/quote#interiors">Interior Design</Link><Link to="/quote#property">Real Estate</Link><Link to="/offers">Festive Offers</Link><Link to="/hyderabad/construction-cost">Construction Cost Guide</Link></div>
      <div><b>Support</b><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/faq">FAQ</Link><Link to="/blog">Blog</Link><Link to="/contact">Contact</Link></div>
      <div><b>Contact</b><a href={phoneHref}>{displayPhone}</a><a href={'mailto:' + displayEmail}>{displayEmail}</a><span><PinIcon/>{address}</span></div>
    </div>
    <div className="public-site-footer__bottom"><span>© {new Date().getFullYear()} ProPulse</span><Link to="/professionals">Professional portal</Link></div>
  </footer>
}
export default PublicHeader
