import { Link } from 'react-router-dom'
import { PublicHeader, PublicFooter } from '../components/PublicSiteChrome'
import './About.css'

export default function Technology() {
  return <main className="ab-page">
    <PublicHeader />
    <header className="ab-story-hero">
      <div className="ab-wrap ab-story-hero-inner">
        <div className="ab-story-intro">
          <span className="ab-eyebrow"><span aria-hidden="true" className="ab-eyebrow-line" /> PROPULSE TECHNOLOGY</span>
          <h1>Technology for <em>construction &amp; interiors.</em></h1>
          <p>ProPulse develops digital tools for construction, interior and real-estate businesses alongside our direct project-execution and professional marketplace services.</p>
          <div className="ab-story-caption"><span aria-hidden="true" /> Business software built for project-based companies</div>
        </div>
        <aside className="ab-story-quote">
          <span className="ab-quote-label">INTERIOR BUSINESS OS</span>
          <p>Manage projects, <strong>not disconnected spreadsheets.</strong></p>
          <span className="ab-quote-rule" aria-hidden="true" />
          <small>CRM · Quotations · Projects · Procurement · Finance</small>
        </aside>
      </div>
    </header>
    <section className="ab-origin" aria-labelledby="tech-product-title">
      <div className="ab-wrap ab-origin-layout">
        <div className="ab-origin-label">
          <span className="ab-section-number">01 / BUSINESS SOFTWARE</span>
          <h2 id="tech-product-title">Business OS for <em>project teams.</em></h2>
        </div>
        <div className="ab-story-prose">
          <p>Business OS is ProPulse technology for construction and interior firms. It brings customer leads, follow-ups, packages, project quotations, agreements, milestone payments and site execution into a coordinated workflow.</p>
          <p>Project teams can manage materials, daily site reports, quality checks, clients, invoices and company websites in one business workspace. Features and availability depend on the deployed product and plan.</p>
          <p><a href="https://sghomesinterior.in/" target="_blank" rel="noopener noreferrer">Explore Business OS</a></p>
        </div>
      </div>
    </section>
    <section className="ab-reason" aria-labelledby="tech-marketplace-title">
      <div className="ab-wrap">
        <div className="ab-reason-heading">
          <span className="ab-section-number">02 / PROPULSE MARKETPLACE</span>
          <h2 id="tech-marketplace-title">Better connections for <em>professionals.</em></h2>
          <p>The ProPulse marketplace helps homeowners find independent construction and interior businesses, while qualified professionals can access project leads and manage their public service profiles.</p>
        </div>
        <div className="ab-two-sides">
          <article className="ab-side">
            <div className="ab-side-mark" aria-hidden="true">01</div>
            <h3>For professionals</h3>
            <p>Discover available leads, publish genuine projects, and manage service packages.</p>
            <p><Link to="/professionals">Professional portal</Link></p>
          </article>
          <article className="ab-side">
            <div className="ab-side-mark" aria-hidden="true">02</div>
            <h3>For homeowners</h3>
            <p>Compare independent businesses, or contact ProPulse itself for direct construction and interior execution.</p>
            <p><Link to="/contact">Contact ProPulse</Link></p>
          </article>
        </div>
      </div>
    </section>
    <PublicFooter/>
  </main>
}
