import { Link } from 'react-router-dom'
import { getUser, getToken } from '../utils/auth'
import './Home.css'

const leadPreviews = [
  { service: 'Interior Design', location: 'Hyderabad', requirement: '3 BHK complete interior design', tag: 'HIGH INTENT' },
  { service: 'Modular Kitchen', location: 'Bengaluru', requirement: 'Modular kitchen for new apartment', tag: 'NEW' },
  { service: 'Home Construction', location: 'Pune', requirement: 'Independent house construction', tag: 'ACTIVE' },
]

function Home() {
  const token = getToken()
  const user = getUser()
  const loggedIn = Boolean(token && user)
  const dashboardPath = user?.role === 'admin' ? '/admin' : '/dashboard'

  return (
    <div className="home-page">
      <header className="public-header">
        <Link className="brand" to="/" aria-label="Propulse Business home">
          <img src="/brand/propulse-logo.png" alt="Propulse Business" />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#leads">Leads</a>
          <a href="#industries">Industries</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="header-actions">
          {loggedIn ? (
            <Link className="header-dashboard" to={dashboardPath}>Dashboard <span>→</span></Link>
          ) : (
            <>
              <Link className="header-login" to="/login">Login</Link>
              <Link className="header-signup" to="/signup">Sign up</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="hero-kicker">PROPULSE BUSINESS · LEAD MARKETPLACE</span>
            <h1>Find the right leads.<br /><em>Grow your business.</em></h1>
            <p>Discover qualified business opportunities matched to the services and locations you serve.</p>
            <div className="hero-actions">
              <Link className="hero-primary" to={loggedIn ? dashboardPath : '/login'}>{loggedIn ? 'View my dashboard' : 'Explore available leads'} <span>→</span></Link>
              {!loggedIn && <Link className="hero-secondary" to="/signup">Create business account</Link>}
            </div>
            <div className="hero-trust"><span>✓</span> Built for service businesses <i /> <span>✓</span> Location-based matching</div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-card hero-card-main">
              <div className="hero-card-top"><span className="status-dot" /> LIVE LEAD</div>
              <strong>Interior Design</strong>
              <span>Hyderabad · 3 BHK</span>
              <div className="locked-line"><span>••••••••••</span><b>LOGIN TO ACCESS</b></div>
            </div>
            <div className="hero-float hero-float-one"><b>+24</b><span>new opportunities</span></div>
            <div className="hero-float hero-float-two"><b>Matched</b><span>Service + location</span></div>
          </div>
        </section>

        <section className="quick-strip" aria-label="Propulse benefits">
          <div><b>Qualified opportunities</b><span>Leads generated around real service demand.</span></div>
          <div><b>Service matching</b><span>Connect leads with what your business offers.</span></div>
          <div><b>Location matching</b><span>Focus on the areas you actually serve.</span></div>
        </section>

        <section className="section-block" id="leads">
          <div className="section-heading">
            <div><span className="section-kicker">LEAD MARKETPLACE</span><h2>Opportunities are waiting.</h2><p>Preview the kind of business opportunities available on Propulse.</p></div>
            <Link to={loggedIn ? dashboardPath : '/login'} className="section-link">{loggedIn ? 'View dashboard' : 'Login to access'} <span>→</span></Link>
          </div>
          <div className="lead-grid">
            {leadPreviews.map((lead) => (
              <article className="lead-card" key={`${lead.service}-${lead.location}`}>
                <div className="lead-card-top"><span>{lead.tag}</span><span className="lock">🔒</span></div>
                <h3>{lead.service}</h3>
                <p>{lead.requirement}</p>
                <div className="lead-location">⌖ {lead.location}</div>
                <div className="lead-protected">Lead details protected <Link to="/login">Sign in to access</Link></div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block industries-section" id="industries">
          <div className="section-heading centered"><span className="section-kicker">EXPLORE DEMAND</span><h2>Popular business categories</h2><p>Build your profile around the services you sell and the locations you cover.</p></div>
          <div className="category-grid">
            {['Interior & Modular', 'Construction', 'Home Services', 'Real Estate', 'Digital Services', 'Professional Services'].map((name, index) => (
              <Link to="/industries" className="category-card" key={name}><span>0{index + 1}</span><strong>{name}</strong><b>→</b></Link>
            ))}
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading centered"><span className="section-kicker">HOW PROPULSE WORKS</span><h2>From profile to opportunity.</h2></div>
          <div className="steps-grid">
            <div className="step"><b>01</b><h3>Create your business profile</h3><p>Add your services, subservices and service locations.</p></div>
            <div className="step"><b>02</b><h3>Get matched with leads</h3><p>Propulse connects relevant opportunities with your business.</p></div>
            <div className="step"><b>03</b><h3>Access and grow</h3><p>Review qualified opportunities and turn them into customers.</p></div>
          </div>
        </section>

        {!loggedIn && <section className="final-cta"><div><span className="section-kicker">READY TO GROW?</span><h2>Start getting better business opportunities.</h2><p>Create your Propulse Business account and build your profile.</p></div><Link to="/signup">Create business account <span>→</span></Link></section>}
      </main>

      <footer className="public-footer"><span>© {new Date().getFullYear()} Propulse Business</span><div><Link to="/">Home</Link><Link to="/login">Login</Link><Link to="/signup">Sign up</Link></div></footer>
    </div>
  )
}

export default Home
