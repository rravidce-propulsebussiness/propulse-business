import { PublicHeader, PublicFooter } from '../components/PublicSiteChrome'
import './Technology.css'

const serviceGroups = [
  { icon: 'code', title: 'Website & Software Development', description: 'Modern websites, web apps and business portals.' },
  { icon: 'search', title: 'SEO & AI Search', description: 'Rank higher on Google and AI search.' },
  { icon: 'megaphone', title: 'Digital Marketing & Lead Generation', description: 'Get more leads and grow your business.' },
  { icon: 'design', title: 'Creative & Graphic Design', description: 'Stunning designs for your brand.' },
  { icon: 'video', title: 'Video & Media', description: 'Professional video editing and content creation.' },
  { icon: 'server', title: 'Hosting & Digital Infrastructure', description: 'Reliable hosting, domains and cloud solutions.' },
]

function Icon({ name, size = 30 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  if (name === 'code') return <svg {...common}><rect x="7" y="8" width="34" height="28" rx="5"/><path d="m17 19-5 5 5 5M31 19l5 5-5 5M27 16l-6 16"/></svg>
  if (name === 'search') return <svg {...common}><circle cx="21" cy="21" r="11"/><path d="m30 30 9 9"/><path d="M16 25c2.5 2 6.5 2.2 9.2-.3"/></svg>
  if (name === 'megaphone') return <svg {...common}><path d="m8 24 24-11v22L8 24Z"/><path d="M32 20h5a5 5 0 0 1 0 10h-5"/><path d="m12 30 3 10h7l-3-13"/></svg>
  if (name === 'design') return <svg {...common}><path d="M8 34 31 11a5 5 0 0 1 7 7L15 41H8v-7Z"/><path d="m27 15 7 7M20 22l6 6"/><path d="M8 41h32"/></svg>
  if (name === 'video') return <svg {...common}><rect x="6" y="10" width="27" height="28" rx="5"/><path d="m33 19 9-5v20l-9-5z"/><path d="m17 18 9 6-9 6z"/></svg>
  if (name === 'server') return <svg {...common}><rect x="7" y="7" width="34" height="10" rx="3"/><rect x="7" y="20" width="34" height="10" rx="3"/><rect x="7" y="33" width="34" height="8" rx="3"/><path d="M13 12h.1M13 25h.1M13 37h.1"/></svg>
  return <svg {...common}><path d="M24 7c-9.4 0-17 6.8-17 15.2 0 4.8 2.6 9.1 7 11.8l-2.1 7 7.4-4c1.5.4 3.1.6 4.7.6 9.4 0 17-6.8 17-15.4S33.4 7 24 7Z"/><path d="M18.2 18.2c.5-1.1 1.1-1.1 1.8-1l2.1 3.1c.4.6.3 1.1-.2 1.6l-1.1 1c1.3 2.6 3.2 4.4 5.8 5.7l1-1.2c.5-.5 1-.6 1.6-.2l3.1 2.1c.6.4.5 1.2-.1 1.8-.9 1-2.3 1.4-3.5 1.1-6.2-1.6-11-6.3-12.5-12.5-.3-1.3.1-2.6 1-3.5Z"/></svg>
}

function CheckIcon() {
  return <span className="ps-check" aria-hidden="true">✓</span>
}

export default function Technology() {
  return (
    <main className="ps-page">
      <PublicHeader />

      <section className="ps-hero">
        <div className="ps-wrap ps-hero-inner">
          <div className="ps-hero-copy">
            <span className="ps-pill"><span className="ps-pill-icon">✦</span> Digital Solutions for a Growing Business</span>
            <h1>Build. <span>Grow.</span> Create. <strong>Manage.</strong></h1>
            <p>Everything your business needs to build a strong digital presence, reach more customers and operate more efficiently.</p>

            <div className="ps-trust-row">
              <div><span className="ps-trust-icon">ϟ</span><span><b>Expert Team</b><small>Skilled Professionals</small></span></div>
              <div><span className="ps-trust-icon">✓</span><span><b>Premium Quality</b><small>On-Time Delivery</small></span></div>
              <div><span className="ps-trust-icon">↗</span><span><b>Business Focused</b><small>Real Growth</small></span></div>
            </div>

            <div className="ps-hero-actions">
              <a className="ps-primary-btn" href="#services">Explore Our Services <span>→</span></a>
              <a className="ps-secondary-btn" href="#products"><span className="ps-play">▶</span> Watch Our Work</a>
            </div>
          </div>

          <div className="ps-hero-art" aria-hidden="true">
            <div className="ps-city-haze" />
            <div className="ps-orbit ps-orbit-one" />
            <div className="ps-orbit ps-orbit-two" />
            <div className="ps-laptop">
              <div className="ps-laptop-screen">
                <div className="ps-browser-bar"><span/><span/><span/></div>
                <div className="ps-screen-content">
                  <div className="ps-screen-sidebar"><i/><i/><i/><i/></div>
                  <div className="ps-screen-main">
                    <div className="ps-screen-line wide"/><div className="ps-screen-line"/>
                    <div className="ps-screen-cards"><span/><span/><span/></div>
                    <div className="ps-screen-chart"><b/><b/><b/><b/><b/><b/><b/></div>
                  </div>
                </div>
              </div>
              <div className="ps-laptop-base" />
            </div>
            <div className="ps-rocket">🚀</div>
            <div className="ps-float ps-float-web"><Icon name="code" size={19}/><span>Website<br/>Development</span></div>
            <div className="ps-float ps-float-seo"><Icon name="search" size={19}/><span>SEO &amp;<br/>AEO</span></div>
            <div className="ps-float ps-float-marketing"><Icon name="megaphone" size={19}/><span>Digital<br/>Marketing</span></div>
            <div className="ps-float ps-float-video"><Icon name="video" size={19}/><span>Video Editing<br/>&amp; Media</span></div>
            <div className="ps-float ps-float-design"><Icon name="design" size={19}/><span>Graphic<br/>Design</span></div>
            <div className="ps-arrow">↗</div>
          </div>
        </div>
      </section>

      <section className="ps-services" id="services">
        <div className="ps-wrap">
          <div className="ps-section-heading">
            <div className="ps-section-kicker"><span/> Our Services <span/></div>
            <h2>Comprehensive Digital Services</h2>
            <p>From development to marketing, we provide end-to-end solutions for your business success.</p>
          </div>

          <div className="ps-service-grid">
            {serviceGroups.map(service => (
              <article className="ps-service-card" key={service.title}>
                <div className={'ps-service-icon ps-icon-' + service.icon}><Icon name={service.icon}/></div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <a href="#products" className="ps-learn-more">Learn More <span>→</span></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ps-products" id="products">
        <div className="ps-product-orb ps-product-orb-one" aria-hidden="true" />
        <div className="ps-product-orb ps-product-orb-two" aria-hidden="true" />
        <div className="ps-wrap ps-products-inner">
          <div className="ps-products-copy">
            <span className="ps-product-pill">Our Powerful Products</span>
            <h2>ProPulse Business Products</h2>
            <p>Run your construction, interior or real estate business with our powerful Business OS and integrated tools.</p>
            <a className="ps-primary-btn" href="https://sghomesinterior.in/" target="_blank" rel="noopener noreferrer">Explore ProPulse Business OS <span>→</span></a>
          </div>

          <div className="ps-product-list">
            <div><CheckIcon/> CRM &amp; Lead Management</div>
            <div><CheckIcon/> Quotations &amp; Contracts</div>
            <div><CheckIcon/> Project Management</div>
            <div><CheckIcon/> Finance &amp; Billing</div>
            <div><CheckIcon/> Client Portal &amp; More</div>
          </div>

          <div className="ps-dashboard-mockup" aria-hidden="true">
            <div className="ps-dashboard-top"><b>ProPulse</b><span>Welcome Back!</span><i>●</i></div>
            <div className="ps-dashboard-body">
              <aside><span>⌂</span><span>▣</span><span>◫</span><span>▤</span><span>₹</span></aside>
              <div className="ps-dashboard-main">
                <small>Let's grow your business together</small>
                <div className="ps-metric-row">
                  <div><small>Total Leads</small><b>245</b><em>↗ +12%</em></div>
                  <div><small>Active Projects</small><b>18</b><em>↗ +8%</em></div>
                  <div><small>Revenue</small><b>₹12.5L</b><em>↗ +20%</em></div>
                </div>
                <div className="ps-dashboard-chart"><span/><span/><span/><span/><span/><span/><span/><span/></div>
              </div>
            </div>
          </div>

          <div className="ps-power-chip">♛ <span><b>Powerful. Simple. Complete.</b></span></div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
