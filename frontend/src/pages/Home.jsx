import { Link } from 'react-router-dom'
import { getUser, getToken } from '../utils/auth'
import './Home.css'

const services = [
  { number: '01', title: 'Website', text: 'Build a professional online presence that makes your business credible and ready to convert visitors.' },
  { number: '02', title: 'SEO', text: 'Improve your visibility in search so potential customers can find your business when they need you.' },
  { number: '03', title: 'Landing Pages', text: 'Create focused pages for campaigns, offers and services that turn attention into enquiries.' },
  { number: '04', title: 'Social Media', text: 'Keep your brand active, consistent and professional across your social presence.' },
  { number: '05', title: 'Lead Generation', text: 'Put your business in front of relevant demand and create more opportunities to talk to customers.' },
  { number: '06', title: 'Ongoing Support', text: 'Maintain, improve and manage the digital foundation as your business grows.' },
]

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
  ['What is Propulse Business?', 'Propulse Business helps growing businesses build their digital presence and create customer opportunities without needing to build a full marketing team from day one.'],
  ['Why use Propulse instead of hiring a team?', 'A growing business may need a website, SEO, landing pages, social media and lead generation. Propulse brings these growth needs together so you can start lean, reduce overhead and add support as you grow.'],
  ['Does Propulse provide leads?', 'Yes. Lead generation is a core part of Propulse. Businesses can also browse the lead marketplace and explore opportunities relevant to their services and locations.'],
  ['Can I use only one Propulse service?', 'Yes. You can start with the service or support your business needs most and expand as your growth requirements change.'],
  ['Are results guaranteed?', 'No business can honestly guarantee a specific number of customers or sales. Propulse focuses on building the right foundation, generating opportunities and continuously improving the system.'],
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
          <Link to="/">Home</Link>
          <a href="#services">Services</a>
          <a href="#why-propulse">Why Propulse</a>
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="header-actions">
          <Link className="header-leads" to="/leads">See Leads</Link>
          {loggedIn ? (
            <Link className="header-dashboard" to={dashboardPath}>
              {user?.role === 'admin' ? 'Admin Panel' : 'Dashboard'} <span>→</span>
            </Link>
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
            <span className="hero-kicker">PROPULSE BUSINESS · GROWTH SUPPORT</span>
            <h1>Grow your business<br /><em>without the overhead.</em></h1>
            <p>Website, SEO, landing pages, social media and lead generation — the essentials you need to start attracting customers, without having to build a full marketing team from day one.</p>
            <div className="hero-actions">
              <Link className="hero-primary" to={loggedIn ? dashboardPath : '/signup'}>{loggedIn ? 'Go to dashboard' : 'Get started'} <span>→</span></Link>
              <Link className="hero-secondary" to="/leads">See live leads</Link>
            </div>
            <div className="hero-trust">
              <span>✓</span> Start lean <i /><span>✓</span> One growth partner <i /><span>✓</span> Scale as you grow
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-glow" />
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="growth-board">
              <div className="board-top"><span>YOUR GROWTH STACK</span><b>PROPULSE</b></div>
              <div className="board-main">
                <div className="board-core"><span>GROW</span><strong>∞</strong><small>ONE PARTNER</small></div>
                <div className="board-pill pill-one">WEBSITE</div>
                <div className="board-pill pill-two">SEO</div>
                <div className="board-pill pill-three">LEADS</div>
                <div className="board-pill pill-four">SOCIAL</div>
              </div>
              <div className="board-bottom"><span>Build</span><i /><span>Attract</span><i /><span>Convert</span><i /><span>Scale</span></div>
            </div>
            <div className="hero-float hero-float-one"><b>01</b><span>growth partner</span></div>
            <div className="hero-float hero-float-two"><b>LEADS</b><span>available to explore</span></div>
          </div>
        </section>

        <section className="problem-section">
          <div className="problem-intro">
            <span className="section-kicker">THE REAL PROBLEM</span>
            <h2>Running a business is hard enough. Building a marketing team shouldn't be another problem.</h2>
          </div>
          <div className="problem-grid">
            <div><strong>01</strong><h3>Website</h3><p>Your business needs a credible online presence.</p></div>
            <div><strong>02</strong><h3>SEO</h3><p>You need to be visible when customers search.</p></div>
            <div><strong>03</strong><h3>Content & Social</h3><p>Your brand needs consistent digital activity.</p></div>
            <div><strong>04</strong><h3>Lead Generation</h3><p>You need a reliable flow of opportunities.</p></div>
          </div>
          <div className="problem-bottom">Hiring separately can mean <b>2–3 people, multiple vendors and more overhead</b> — before you even know what is working.</div>
        </section>

        <section className="section-block services-section" id="services">
          <div className="section-heading">
            <div><span className="section-kicker">WHAT PROPULSE HANDLES</span><h2>Everything you need to start growing.</h2><p>Bring the important pieces of your digital growth system together.</p></div>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <article className="service-card" key={service.number}>
                <span>{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <b>Propulse support <em>→</em></b>
              </article>
            ))}
          </div>
        </section>

        <section className="why-section" id="why-propulse">
          <div className="why-copy">
            <span className="section-kicker">WHY PROPULSE</span>
            <h2>Start lean.<br /><em>Scale smart.</em></h2>
            <p>You don't need a big team before you have a big business. Propulse gives you access to the growth support you need now, then lets you expand that support as your business grows.</p>
            <Link to={loggedIn ? dashboardPath : '/signup'} className="why-cta">Build your growth system <span>→</span></Link>
          </div>
          <div className="why-list">
            <div><strong>Less overhead</strong><span>Reduce the need to hire multiple specialists at the beginning.</span></div>
            <div><strong>One growth partner</strong><span>Keep your digital growth work coordinated instead of scattered across vendors.</span></div>
            <div><strong>Flexible support</strong><span>Start with what matters most and add capabilities as you scale.</span></div>
            <div><strong>Real opportunities</strong><span>Access Propulse's lead marketplace alongside your broader growth strategy.</span></div>
          </div>
        </section>

        <section className="section-block leads-section" id="leads">
          <div className="section-heading">
            <div><span className="section-kicker">SEE LEADS</span><h2>Looking for customers right now?</h2><p>Explore the Propulse marketplace and discover opportunities relevant to your business.</p></div>
            <Link to="/leads" className="section-link">See all leads <span>→</span></Link>
          </div>
          <div className="lead-grid">
            {leadPreviews.map((lead) => (
              <article className="lead-card" key={`${lead.service}-${lead.location}`}>
                <div className="lead-card-top"><span>{lead.tag}</span><span className="lead-type">LEAD</span></div>
                <h3>{lead.service}</h3>
                <p>{lead.requirement}</p>
                <div className="lead-location">⌖ {lead.location}</div>
                <div className="lead-protected"><span>Customer details protected</span><Link to="/leads">View →</Link></div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block industries-section" id="industries">
          <div className="section-heading centered"><span className="section-kicker">EXPLORE DEMAND</span><h2>Find opportunities in your market.</h2><p>Explore categories and jump directly into relevant leads.</p></div>
          <div className="category-grid">
            {categories.map((category, index) => (
              <Link to={`/leads?category=${encodeURIComponent(category.query)}`} className="category-card" key={category.name}>
                <span>0{index + 1}</span><strong>{category.name}</strong><b>→</b>
              </Link>
            ))}
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading centered"><span className="section-kicker">HOW IT WORKS</span><h2>A simpler way to start growing.</h2><p>Build the foundation first, then keep improving as demand grows.</p></div>
          <div className="steps-grid">
            <div className="step"><b>01</b><h3>Tell us your business goals</h3><p>Share what you sell, who you want to reach and where you operate.</p></div>
            <div className="step"><b>02</b><h3>Build your growth foundation</h3><p>Set up the website, SEO, landing pages, social presence or lead strategy you need.</p></div>
            <div className="step"><b>03</b><h3>Attract and convert demand</h3><p>Use the system to create opportunities, learn what works and improve over time.</p></div>
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="section-heading centered"><span className="section-kicker">FAQ</span><h2>Questions, answered.</h2><p>Everything you need to know before getting started.</p></div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details className="faq-item" key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>
            ))}
          </div>
        </section>

        {!loggedIn && (
          <section className="final-cta">
            <div><span className="section-kicker">READY TO GROW?</span><h2>You don't need a bigger team to take the next step.</h2><p>Start with the growth support your business needs today and build from there.</p></div>
            <Link to="/signup">Create your business account <span>→</span></Link>
          </section>
        )}
      </main>

      <footer className="public-footer">
        <span>© {new Date().getFullYear()} Propulse Business</span>
        <div><Link to="/">Home</Link><Link to="/leads">See Leads</Link><Link to="/login">Login</Link><Link to="/signup">Sign up</Link><a href="#faq">FAQ</a></div>
      </footer>
    </div>
  )
}

export default Home
