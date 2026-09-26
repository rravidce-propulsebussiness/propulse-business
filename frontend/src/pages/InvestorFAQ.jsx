import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'
import './InvestorFAQ.css'

const DEFAULT_FAQS=[
  {question:'What is an investment cycle?',answer:'Each investment cycle is a separate accounting period. New funds added while a cycle is open stay in that cycle. When the cycle closes, the next real investment starts a fresh cycle.'},
  {question:'How does Auto-Invest work?',answer:'With Auto-Invest ON, eligible investor earnings can be consumed by future advertising. The available-for-ads amount is based on the current cycle ledger.'},
  {question:'When can I withdraw earnings?',answer:'Only realized investor earnings are withdrawable. Your invested principal is never treated as withdrawable. Pending withdrawal requests reserve the requested amount until they are paid or rejected.'},
  {question:'What happens when a lead is shared?',answer:'A lead can be sold as one or more shares up to its buyer capacity. History shows unique leads, single-share sales, shared sales, total shares, gross sale value and your investor earnings separately.'},
  {question:'Are previous cycles mixed with the current cycle?',answer:'No. Current-cycle balances and activity are kept separate from closed-cycle history so investment, ad spend, revenue and withdrawals are not combined.'},
  {question:'What happens during final exit?',answer:'Final exit stops new lead assignment for the cycle. Existing leads can finish resolving, after which the cycle can close.'}
]

export default function InvestorFAQ(){
  const [faqs,setFaqs]=useState(DEFAULT_FAQS)
  const [open,setOpen]=useState(0)

  useEffect(()=>{
    let active=true
    apiRequest('/faqs?audience=investor',{},false).then(data=>{
      if(!active)return
      const items=Array.isArray(data)?data.filter(item=>item?.is_active!==false):[]
      setFaqs(items)
      setOpen(items.length?0:-1)
    }).catch(()=>{})
    return()=>{active=false}
  },[])

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
          {!faqs.length&&<div className="investor-faq-empty">No investor FAQs are currently published.</div>}
          {faqs.map((item,i)=>{
            const expanded=open===i
            const answerId=`investor-faq-answer-${item.id??i}`
            return <article className={`investor-faq-card${expanded?' open':''}`} key={item.id??item.question}>
              <button
                className="investor-faq-question"
                type="button"
                onClick={()=>setOpen(expanded?-1:i)}
                aria-expanded={expanded}
                aria-controls={answerId}
              >
                <span className="investor-faq-number">{String(i+1).padStart(2,'0')}</span>
                <span className="investor-faq-question-text">{item.question}</span>
                <span className="investor-faq-toggle" aria-hidden="true">{expanded?'−':'+'}</span>
              </button>
              {expanded&&<div className="investor-faq-answer" id={answerId}>
                <div>{item.answer}</div>
              </div>}
            </article>
          })}
        </div>
      </section>
    </div>
  </main>
}
