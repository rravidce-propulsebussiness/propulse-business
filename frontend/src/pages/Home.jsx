import { Link } from 'react-router-dom'
import { getUser, getToken } from '../utils/auth'
import './Home.css'

const leadPreviews = [
  { service: 'Interior Design', location: 'Hyderabad', requirement: '3 BHK complete interior design', tag: 'HIGH INTENT' },
  { service: 'Solar Energy', location: 'Bengaluru', requirement: 'Residential rooftop solar requirement', tag: 'NEW' },
  { service: 'Home Construction', location: 'Pune', requirement: 'Independent house construction', tag: 'ACTIVE' },
]

const categories = [
  { name: 'Interior & Modular', query: 'interior' },
  { name: 'Construction', query: 'construction' },
  { name: 'Home Services', query: 'home-services' },
  { name: 'Real Estate', query: 'real-estate' },
  { name: 'Education', query: 'education' },
  { name: 'Financial Services', query: 'finance' },
]

const faqs = [
  ['What is Propulse Business?', 'Propulse Business connects service businesses with relevant lead opportunities based on the services they offer and the locations they serve.'],
  ['Can I browse leads without signing in?', 'Yes. Anyone can browse the public lead marketplace. Sign in or create an account when you want to buy or access protected lead details.'],
  ['How are leads matched?', 'Your business profile, services, subservices and service locations are used to surface relevant opportunities.'],
  ['What are Basic and Premium leads?', 'Lead types help businesses choose the level of opportunity they want to access. Availability and pricing are shown on eligible leads.'],
  ['What is an Exclusive lead?', 'Exclusive leads are protected opportunities that can be made available to Pro members immediately and released to other eligible buyers after the configured delay.'],
]

function Home() {
  const token = getToken()
  const user = getUser()
  const loggedIn = Boolean(token && user)
  const dashboardPath = user?.role === 'admin' ? '/admin' : '/dashboard'

  return (
    <div className="home-page">
      <header className="public-header">
        <Link className="brand" to="/" aria-label="Propulse Business home"><img src="/brand/propulse-logo.png" alt="Propulse Business" /></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link to="/leads">Leads</Link>
          <a href="#industries">Categories</a>
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="header-actions">
          {loggedIn ? <Link className="header-dashboard" to={dashboardPath}>{user?.role === 'admin' ? 'Admin Panel' : 'Dashboard'} <span>→</span></Link> : <><Link className="header-login" to="/login">Login</Link><Link className="header-signup" to="/signup">Get started</Link></>}
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="hero-kicker">PROPULSE BUSINESS · LEAD MARKETPLACE</span>
            <h1>Turn demand into<br /><em>your next customer.</em></h1>
            <p>Discover business opportunities matched to what you sell and where you operate. Browse the marketplace freely and unlock leads when you are ready.</p>
            <div className="hero-actions">
              <Link className="hero-primary" to="/leads">Explore live leads <span>→</span></Link>
              {!loggedIn && <Link className="hero-secondary" to="/signup">Create business account</Link>}
            </div>
            <div className="hero-trust"><span>✓</span> Service-based matching <i /><span>✓</span> Location-based opportunities <i /><span>✓</span> Basic · Premium · Exclusive</div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-glow" />
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <div className="hero-card hero-card-main">
              <div className="hero-card-top"><span className="status-dot" /> LIVE OPPORTUNITY <b>PREMIUM</b></div>
              <strong>Interior Design</strong><span>Hyderabad · 3 BHK</span>
              <div className="hero-match"><span>Matched to your business</span><b>94%</b></div>
              <div className="locked-line"><span>••••••••••</span><b>UNLOCK LEAD</b></div>
            </div>
            <div className="hero-float hero-float-one"><b>24</b><span>new opportunities</span></div>
            <div className="hero-float hero-float-two"><b>EXCLUSIVE</b><span>Pro access available</span></div>
          </div>
        </section>

        <section className="proof-strip"><div><strong>01</strong><b>Browse freely</b><span>See marketplace opportunities before signing in.</span></div><div><strong>02</strong><b>Match smarter</b><span>Focus on industries and locations you serve.</span></div><div><strong>03</strong><b>Unlock growth</b><span>Sign in when you are ready to access or buy.</span></div></section>

        <section className="section-block" id="leads">
          <div className="section-heading"><div><span className="section-kicker">LIVE MARKETPLACE</span><h2>See what is available.</h2><p>Preview real-style opportunities and discover where demand is moving.</p></div><Link to="/leads" className="section-link">Browse all leads <span>→</span></Link></div>
          <div className="lead-grid">
            {leadPreviews.map((lead) => <article className="lead-card" key={`${lead.service}-${lead.location}`}><div className="lead-card-top"><span>{lead.tag}</span><span className="lead-type">LEAD</span></div><h3>{lead.service}</h3><p>{lead.requirement}</p><div className="lead-location">⌖ {lead.location}</div><div className="lead-protected"><span>Protected customer details</span><Link to="/leads">View opportunity →</Link></div></article>)}
          </div>
        </section>

        <section className="section-block industries-section" id="industries">
          <div className="section-heading centered"><span className="section-kicker">EXPLORE DEMAND</span><h2>Find your market.</h2><p>Explore categories and jump directly into relevant opportunities.</p></div>
          <div className="category-grid">{categories.map((category, index) => <Link to={`/leads?category=${encodeURIComponent(category.query)}`} className="category-card" key={category.name}><span>0{index + 1}</span><strong>{category.name}</strong><b>→</b></Link>)}</div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading centered"><span className="section-kicker">HOW IT WORKS</span><h2>A simpler way to find business.</h2><p>From discovering demand to converting the right opportunity.</p></div>
          <div className="steps-grid"><div className="step"><b>01</b><h3>Browse the marketplace</h3><p>Anyone can explore available lead opportunities without signing in.</p></div><div className="step"><b>02</b><h3>Build your profile</h3><p>Add your industries, services and locations so opportunities can match your business.</p></div><div className="step"><b>03</b><h3>Unlock opportunities</h3><p>Sign in to access protected details and purchase eligible leads.</p></div></div>
        </section>

        <section className="faq-section" id="faq"><div className="section-heading centered"><span className="section-kicker">FAQ</span><h2>Questions, answered.</h2><p>Everything you need to know before getting started.</p></div><div className="faq-list">{faqs.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>

        {!loggedIn && <section className="final-cta"><div><span className="section-kicker">READY WHEN YOU ARE</span><h2>More demand. Better opportunities.</h2><p>Create your business profile and start turning relevant leads into customers.</p></div><Link to="/signup">Get started <span>→</span></Link></section>}
      </main>
      <footer className="public-footer"><span>© {new Date().getFullYear()} Propulse Business</span><div><Link to="/">Home</Link><Link to="/leads">Leads</Link><Link to="/login">Login</Link><Link to="/signup">Sign up</Link></div></footer>
    </div>
  )
}

export default Home
