import { PublicHeader, PublicFooter } from '../components/PublicSiteChrome'
import './Technology.css'

const serviceGroups = [
  { icon: 'code', title: 'Website Development', shortTitle: 'website development', description: 'Business websites, landing pages and portals that convert visitors into enquiries.' },
  { icon: 'mobile', title: 'Mobile App Development', shortTitle: 'mobile apps', description: 'Android and iOS apps for your customers, teams and operations.' },
  { icon: 'apps', title: 'Custom Software & Web Apps', shortTitle: 'custom software', description: 'Dashboards, booking systems and tools built around your workflow.' },
  { icon: 'crm', title: 'CRM & Business Automation', shortTitle: 'CRM and automation', description: 'Lead tracking, follow-ups, quotations and automated workflows.' },
  { icon: 'search', title: 'SEO & AI Search', shortTitle: 'SEO and AI search', description: 'Rank higher on Google, Maps and AI search answers.' },
  { icon: 'megaphone', title: 'Digital Marketing & Lead Generation', shortTitle: 'digital marketing', description: 'Google, Meta and performance ads that bring qualified leads.' },
  { icon: 'social', title: 'Social Media Management', shortTitle: 'social media management', description: 'Content calendars, posting, reels and community management.' },
  { icon: 'whatsapp', title: 'WhatsApp Marketing & Automation', shortTitle: 'WhatsApp marketing', description: 'Broadcasts, chatbots and instant replies on WhatsApp Business.' },
  { icon: 'design', title: 'Branding & Graphic Design', shortTitle: 'branding and design', description: 'Logos, brand identity, brochures and creatives for every channel.' },
  { icon: 'video', title: 'Video & Media Production', shortTitle: 'video and media', description: 'Reels, ad films, walkthroughs and professional video editing.' },
  { icon: 'cart', title: 'E-commerce Solutions', shortTitle: 'e-commerce', description: 'Online stores with catalogue, payments and order management.' },
  { icon: 'ux', title: 'UI/UX Design', shortTitle: 'UI/UX design', description: 'User research, wireframes and app or website designs people enjoy using.' },
  { icon: 'pin', title: 'Google Business Profile & Local SEO', shortTitle: 'local SEO', description: 'Show up on Google Maps and local searches in your area.' },
  { icon: 'pen', title: 'Content Writing & Copywriting', shortTitle: 'content writing', description: 'Website copy, blogs, ad copy and captions that sell.' },
  { icon: 'mail', title: 'Email & SMS Marketing', shortTitle: 'email and SMS marketing', description: 'Newsletters, offers and automated follow-up campaigns.' },
  { icon: 'star', title: 'Online Reputation Management', shortTitle: 'reputation management', description: 'Grow reviews, respond to feedback and protect your brand online.' },
  { icon: 'users', title: 'Influencer Marketing', shortTitle: 'influencer marketing', description: 'Collaborations with creators to reach the right audience.' },
  { icon: 'bot', title: 'AI Chatbots & AI Automation', shortTitle: 'AI automation', description: 'AI assistants, chatbots and smart workflows for your business.' },
  { icon: 'camera', title: 'Photography & Product Shoots', shortTitle: 'photography', description: 'Product, property and brand photography for web and social.' },
  { icon: 'chart', title: 'Analytics & Reporting', shortTitle: 'analytics and reporting', description: 'Tracking setup, dashboards and clear monthly performance reports.' },
  { icon: 'plug', title: 'Payment Gateway & Integrations', shortTitle: 'integrations', description: 'Payments, APIs and connections between the tools you already use.' },
  { icon: 'tools', title: 'Website Maintenance & Support', shortTitle: 'maintenance and support', description: 'Updates, backups, security fixes and ongoing technical support.' },
  { icon: 'compass', title: 'Digital Strategy & Consulting', shortTitle: 'digital strategy', description: 'A clear roadmap for your brand, channels, budget and growth.' },
  { icon: 'server', title: 'Hosting & Digital Infrastructure', shortTitle: 'hosting and infrastructure', description: 'Reliable hosting, domains, business email and cloud setup.' },
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
  if (name === 'ux') return <svg {...common}><rect x="6" y="8" width="36" height="28" rx="4"/><path d="M6 15h36M12 22h10v8H12zM27 22h9M27 28h6M18 42h12"/></svg>
  if (name === 'pin') return <svg {...common}><path d="M24 43s-13-12.4-13-23a13 13 0 0 1 26 0c0 10.6-13 23-13 23Z"/><circle cx="24" cy="20" r="5"/></svg>
  if (name === 'pen') return <svg {...common}><path d="M10 38h28M14 32l3-9 16-16 6 6-16 16-9 3Z"/><path d="m29 11 6 6"/></svg>
  if (name === 'mail') return <svg {...common}><rect x="6" y="11" width="36" height="26" rx="4"/><path d="m7 13 17 13 17-13"/></svg>
  if (name === 'star') return <svg {...common}><path d="m24 6 5.4 11.2 12.3 1.6-9 8.6 2.3 12.2L24 33.7l-11 5.9 2.3-12.2-9-8.6 12.3-1.6Z"/></svg>
  if (name === 'users') return <svg {...common}><circle cx="18" cy="17" r="6"/><circle cx="33" cy="19" r="5"/><path d="M6 38c1.3-6.5 6-10 12-10s10.7 3.5 12 10M29 29c5.5-.4 10 2.8 12 8"/></svg>
  if (name === 'bot') return <svg {...common}><rect x="9" y="15" width="30" height="24" rx="7"/><path d="M24 15V8M20 8h8"/><circle cx="18" cy="26" r="2.5"/><circle cx="30" cy="26" r="2.5"/><path d="M19 33h10M5 25v6M43 25v6"/></svg>
  if (name === 'camera') return <svg {...common}><path d="M6 16a4 4 0 0 1 4-4h6l3-4h10l3 4h6a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4Z"/><circle cx="24" cy="25" r="8"/></svg>
  if (name === 'chart') return <svg {...common}><path d="M7 7v34h34"/><path d="M14 33v-8M22 33V17M30 33v-12M38 33V11"/></svg>
  if (name === 'plug') return <svg {...common}><path d="M17 6v9M31 6v9M12 15h24v8a12 12 0 0 1-24 0Z"/><path d="M24 35v7"/></svg>
  if (name === 'tools') return <svg {...common}><path d="M29 8a9 9 0 0 0-8.5 12L8 32.5a3.5 3.5 0 0 0 5 5L25.5 25A9 9 0 0 0 38 16l-6 2-4-4 2-6Z"/></svg>
  if (name === 'compass') return <svg {...common}><circle cx="24" cy="24" r="17"/><path d="m31 17-4.5 9.5L17 31l4.5-9.5Z"/></svg>
  if (name === 'mobile') return <svg {...common}><rect x="14" y="5" width="20" height="38" rx="5"/><path d="M21 10h6M22 37h4"/><path d="m19 24 4 4 7-8"/></svg>
  if (name === 'apps') return <svg {...common}><rect x="7" y="7" width="14" height="14" rx="3"/><rect x="27" y="7" width="14" height="14" rx="3"/><rect x="7" y="27" width="14" height="14" rx="3"/><path d="M34 27v14M27 34h14"/></svg>
  if (name === 'crm') return <svg {...common}><circle cx="17" cy="16" r="6"/><path d="M6 37c1.5-7 6-10 11-10s9.5 3 11 10"/><path d="M30 13h12M30 21h12M33 29h9"/></svg>
  if (name === 'social') return <svg {...common}><circle cx="34" cy="12" r="5"/><circle cx="14" cy="24" r="5"/><circle cx="34" cy="36" r="5"/><path d="m18.5 21.5 11-7M18.5 26.5l11 7"/></svg>
  if (name === 'cart') return <svg {...common}><path d="M6 9h6l4 22h22l4-15H14"/><circle cx="19" cy="39" r="2.5"/><circle cx="35" cy="39" r="2.5"/></svg>
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
            <p>Websites, mobile apps, software, CRM, SEO, digital marketing, social media management, branding and video, everything your business needs to build a strong digital presence, reach more customers and operate more efficiently.</p>

            <div className="ps-trust-row">
              <div><span className="ps-trust-icon">ϟ</span><span><b>Expert Team</b><small>Skilled Professionals</small></span></div>
              <div><span className="ps-trust-icon">✓</span><span><b>Premium Quality</b><small>On-Time Delivery</small></span></div>
              <div><span className="ps-trust-icon">↗</span><span><b>Business Focused</b><small>Real Growth</small></span></div>
            </div>

            <div className="ps-hero-actions">
              <a className="ps-primary-btn" href="#services">Explore Our Services <span>→</span></a>
              <a className="ps-secondary-btn" href="#products">Explore Business OS <span aria-hidden="true">→</span></a>
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
            <div className="ps-float ps-float-video"><Icon name="mobile" size={19}/><span>Mobile<br/>Apps</span></div>
            <div className="ps-float ps-float-design"><Icon name="social" size={19}/><span>Social Media<br/>Management</span></div>
            <div className="ps-arrow">↗</div>
          </div>
        </div>
      </section>

      <section className="ps-services" id="services">
        <div className="ps-wrap">
          <div className="ps-section-heading">
            <div className="ps-section-kicker"><span/> Our Services <span/></div>
            <h2>Comprehensive Digital Services</h2>
            <p>24 services under one roof: development, design, marketing, social media, content, CRM, AI automation and support for businesses of every kind.</p>
          </div>

          <div className="ps-service-grid">
            {serviceGroups.map(service => (
              <article className="ps-service-card" key={service.title}>
                <div className={'ps-service-icon ps-icon-' + service.icon}><Icon name={service.icon}/></div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <a href="/contact" className="ps-learn-more" aria-label={'Discuss ' + service.shortTitle}>
                  Discuss {service.shortTitle} <span aria-hidden="true">→</span>
                </a>
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
            <span className="ps-product-pill">Industry Product</span>
            <h2>ProPulse Business OS</h2>
            <p>Alongside our digital services, we build ready-to-use software for construction, interior and real estate businesses.</p>
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
