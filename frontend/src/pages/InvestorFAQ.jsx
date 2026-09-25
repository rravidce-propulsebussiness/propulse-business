import { useState } from 'react'
import './InvestorFAQ.css'

const faqs=[
  ['What is an investment cycle?','Each investment cycle is a separate accounting period. New funds added while a cycle is open stay in that cycle. When the cycle closes, the next real investment starts a fresh cycle.'],
  ['How does Auto-Invest work?','With Auto-Invest ON, eligible investor earnings can be consumed by future advertising. The available-for-ads amount is based on the current cycle ledger.'],
  ['When can I withdraw earnings?','Only realized investor earnings are withdrawable. Your invested principal is never treated as withdrawable. Pending withdrawal requests reserve the requested amount until they are paid or rejected.'],
  ['What happens when a lead is shared?','A lead can be sold as one or more shares up to its buyer capacity. History shows unique leads, single-share sales, shared sales, total shares, gross sale value and your investor earnings separately.'],
  ['Are previous cycles mixed with the current cycle?','No. Current-cycle balances and activity are kept separate from closed-cycle history so investment, ad spend, revenue and withdrawals are not combined.'],
  ['What happens during final exit?','Final exit stops new lead assignment for the cycle. Existing leads can finish resolving, after which the cycle can close.']
]

export default function InvestorFAQ(){
  const [open,setOpen]=useState(0)

  return <main className="investor-faq-page">
    <div className="investor-faq-shell">
      <section className="investor-faq-hero">
        <div className="investor-faq-hero-copy">
          <span className="investor-faq-eyebrow"><i aria-hidden="true" /> Investor FAQ</span>
          <h1>Frequently asked questions</h1>
          <p>Understand cycles, earnings, advertising usage, shared lead sales and withdrawals.</p>
          <div className="investor-faq-meta" aria-label="FAQ overview">
            <span><strong>{faqs.length}</strong> essential topics</span>
            <span>Cycles · Earnings · Leads · Withdrawals</span>
          </div>
        </div>
        <div className="investor-faq-hero-mark" aria-hidden="true">
          <span>?</span>
          <small>Investor guide</small>
        </div>
      </section>

      <section className="investor-faq-content" aria-labelledby="investor-faq-list-title">
        <div className="investor-faq-intro">
          <div>
            <span>HELP CENTRE</span>
            <h2 id="investor-faq-list-title">Everything you need, in one place</h2>
          </div>
          <p>Open any question to view the answer.</p>
        </div>

        <div className="investor-faq-list">
          {faqs.map(([q,a],i)=>{
            const expanded=open===i
            const answerId=`investor-faq-answer-${i}`
            return <article className={`investor-faq-card${expanded?' open':''}`} key={q}>
              <button
                className="investor-faq-question"
                type="button"
                onClick={()=>setOpen(expanded?-1:i)}
                aria-expanded={expanded}
                aria-controls={answerId}
              >
                <span className="investor-faq-number">{String(i+1).padStart(2,'0')}</span>
                <span className="investor-faq-question-text">{q}</span>
                <span className="investor-faq-toggle" aria-hidden="true">{expanded?'−':'+'}</span>
              </button>
              {expanded&&<div className="investor-faq-answer" id={answerId}>
                <div>{a}</div>
              </div>}
            </article>
          })}
        </div>
      </section>
    </div>
  </main>
}
