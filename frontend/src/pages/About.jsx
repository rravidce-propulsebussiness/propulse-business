import { useEffect, useState } from 'react'
import { publicRequest } from '../utils/auth'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import './About.css'

export default function About() {
  const [contact, setContact] = useState({})

  useEffect(() => {
    let active = true
    publicRequest('/contact?audience=website')
      .then(value => { if (active) setContact(value || {}) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const phone = contact.phone || contact.phone_number || contact.mobile || ''
  const email = contact.email || contact.support_email || ''

  return <main className="ab-page">
    <PublicHeader />

    <header className="ab-story-hero">
      <div className="ab-wrap ab-story-hero-inner">
        <div className="ab-story-intro">
          <span className="ab-eyebrow"><span aria-hidden="true" className="ab-eyebrow-line" /> OUR STORY</span>
          <h1>Why we started <em>ProPulse.</em></h1>
          <p>We started with one belief: building a home should be easier for customers, and running a business should be easier for the professionals who build it.</p>
          <div className="ab-story-caption"><span aria-hidden="true" /> Built from real industry experience</div>
        </div>
        <aside className="ab-story-quote" aria-label="The idea behind ProPulse">
          <span className="ab-quote-label">THE IDEA THAT STARTED IT ALL</span>
          <p>Better opportunities for professionals. <strong>Better outcomes for homeowners.</strong></p>
          <span className="ab-quote-rule" aria-hidden="true" />
          <small>One shared goal: work done with greater clarity, trust and care.</small>
        </aside>
      </div>
    </header>

    <section className="ab-origin" aria-labelledby="ab-origin-title">
      <div className="ab-wrap ab-origin-layout">
        <div className="ab-origin-label">
          <span className="ab-section-number">01 / THE BEGINNING</span>
          <h2 id="ab-origin-title">It began with <em>experience.</em></h2>
        </div>
        <div className="ab-story-prose">
          <p>Before starting ProPulse, we worked as Managing Director with two companies. That experience gave us a close view of construction and interior projects — not just from the business side, but from the experiences of clients and homeowners too.</p>
          <p>We saw that both sides were facing challenges. Homeowners wanted professionals they could trust, clear expectations and confidence in the quality of work. Professionals wanted better opportunities, clearer customer requirements and a simpler way to do business.</p>
          <p>We realised these were not two separate problems. They were connected. And that is where the idea for ProPulse began.</p>
        </div>
      </div>
    </section>

    <section className="ab-reason" aria-labelledby="ab-reason-title">
      <div className="ab-wrap">
        <div className="ab-reason-heading">
          <span className="ab-section-number">02 / WHY WE BUILT PROPULSE</span>
          <h2 id="ab-reason-title">A better experience for <em>both sides.</em></h2>
          <p>We wanted to close the gap between the people dreaming of a better space and the professionals capable of creating it.</p>
        </div>
        <div className="ab-two-sides">
          <article className="ab-side">
            <div className="ab-side-mark" aria-hidden="true">01</div>
            <h3>For clients & homeowners</h3>
            <p>Finding the right professional should not feel uncertain. We want customers to have clarity about their needs, choices, project scope and the quality they can expect.</p>
          </article>
          <article className="ab-side">
            <div className="ab-side-mark" aria-hidden="true">02</div>
            <h3>For professionals & businesses</h3>
            <p>Great work deserves the right opportunities. We want to help professionals connect with relevant customers, understand requirements clearly and grow their businesses with less friction.</p>
          </article>
        </div>
      </div>
    </section>

    <section className="ab-vision" aria-labelledby="ab-vision-title">
      <div className="ab-wrap ab-vision-layout">
        <div>
          <span className="ab-section-number">03 / OUR VISION</span>
          <h2 id="ab-vision-title">Make business easy. <em>Make quality the standard.</em></h2>
        </div>
        <div className="ab-vision-copy">
          <p>Our vision is to make business easier and help deliver India's best construction and interior service experience.</p>
          <p>We are working toward a future where customers can expect dependable, quality-focused execution — with clear specifications, accountability and meaningful quality guarantees defined in their project agreements.</p>
          <p>For homeowners, that means greater confidence in the spaces they create. For professionals, it means a stronger foundation to build and grow.</p>
          <strong>That is why we started ProPulse.</strong>
        </div>
      </div>
    </section>

    <PublicFooter phone={phone} email={email} />
  </main>
}
