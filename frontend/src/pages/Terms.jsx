import { Link } from 'react-router-dom'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import { TERMS_LAST_UPDATED, TERMS_ROUTE, TERMS_SECTIONS } from '../seo/termsContent'
import './Terms.css'

export default function Terms() {
  return <div className="terms-page">
    <PublicHeader />
    <main className="terms-main">
      <header className="premium-page-intro">
        <span className="premium-eyebrow">LEGAL</span>
        <h1>{TERMS_ROUTE.heading}</h1>
        <p>{TERMS_ROUTE.summary}</p>
      </header>
      <article className="terms-body">
        {TERMS_SECTIONS.map(section => <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map(text => <p key={text}>{text}</p>)}
        </section>)}
        <p className="terms-updated">Last updated: {TERMS_LAST_UPDATED}. Questions? <Link to="/contact">Contact ProPulse</Link>.</p>
      </article>
    </main>
    <PublicFooter />
  </div>
}
