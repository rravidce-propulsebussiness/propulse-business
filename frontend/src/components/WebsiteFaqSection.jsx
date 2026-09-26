import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './WebsiteFaqSection.css'

const CATEGORY_LABELS={
  general:'General',
  leads:'Leads',
  payments:'Payments',
  withdrawals:'Withdrawals',
  account:'Account',
  reports:'Reports'
}

function categoryLabel(value){
  return CATEGORY_LABELS[value]||String(value||'General').replace(/[_-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase())
}

export default function WebsiteFaqSection({variant='home'}){
  const standalone=variant==='page'
  const [faqs,setFaqs]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [open,setOpen]=useState(null)
  const [search,setSearch]=useState('')
  const [category,setCategory]=useState('all')

  async function load(){
    try{
      setLoading(true)
      setError('')
      const data=await publicRequest('/faqs?audience=website')
      const items=Array.isArray(data)?data.filter(item=>item?.is_active!==false):[]
      setFaqs(items)
      setOpen(current=>items.some(item=>item.id===current)?current:null)
    }catch(e){
      setFaqs([])
      setError(e.message||'Unable to load FAQs')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[])

  const categories=useMemo(()=>{
    const counts=new Map()
    faqs.forEach(item=>{const key=item.category||'general';counts.set(key,(counts.get(key)||0)+1)})
    return [...counts.entries()].map(([key,count])=>({key,label:categoryLabel(key),count}))
  },[faqs])

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase()
    return faqs.filter(item=>{
      if(category!=='all'&&(item.category||'general')!==category)return false
      return !q||[item.question,item.answer,item.category].join(' ').toLowerCase().includes(q)
    })
  },[faqs,search,category])

  const faqList=<div className="website-faq-list">
    {loading&&<div className="website-faq-state">Loading FAQs…</div>}
    {!loading&&error&&<div className="website-faq-state error"><strong>FAQs are temporarily unavailable.</strong><button type="button" onClick={load}>Try again</button></div>}
    {!loading&&!error&&!visible.length&&<div className="website-faq-state"><strong>No FAQs are published here yet.</strong><span>Admin can publish questions from the FAQ manager.</span></div>}
    {!loading&&!error&&visible.map((item,index)=>{
      const expanded=open===item.id
      const answerId=`website-faq-answer-${item.id}`
      return <article className={`website-faq-item${expanded?' open':''}`} key={item.id}>
        <button type="button" className="website-faq-question" onClick={()=>setOpen(expanded?null:item.id)} aria-expanded={expanded} aria-controls={answerId}>
          {standalone&&<span className="website-faq-number">{String(index+1).padStart(2,'0')}</span>}
          <span className="website-faq-question-copy"><small>{categoryLabel(item.category)}</small><strong>{item.question}</strong></span>
          <span className="website-faq-toggle" aria-hidden="true">{expanded?'−':'+'}</span>
        </button>
        {expanded&&<div className="website-faq-answer" id={answerId}><p>{item.answer}</p></div>}
      </article>
    })}
  </div>

  if(!standalone)return <section className="website-faq website-faq-home" id="faq">
    <div className="website-faq-home-head">
      <div><span className="website-faq-kicker">FAQ</span><h2>Questions, clearly answered.</h2><p>Everything you need to understand Propulse, its services and the lead marketplace before you get started.</p></div>
      <Link to="/contact?audience=users">Need more help? <span>→</span></Link>
    </div>
    <div className="website-faq-home-layout">
      {faqList}
      <aside className="website-faq-support">
        <span className="website-faq-kicker">SUPPORT</span>
        <h3>Talk to Propulse.</h3>
        <p>Have a technology, digital marketing, lead or business-support requirement? Start a conversation with the team.</p>
        <Link to="/contact?audience=users">Contact Propulse <span>→</span></Link>
      </aside>
    </div>
  </section>

  return <main className="website-faq website-faq-standalone">
    <section className="website-faq-hero">
      <div className="website-faq-hero-copy">
        <span className="website-faq-eyebrow"><i/> CUSTOMER HELP CENTRE</span>
        <h1>Answers for your <em>Propulse journey.</em></h1>
        <p>Find clear answers about the marketplace, leads, payments, your account and using Propulse for business growth.</p>
        <div className="website-faq-hero-stats">
          <span><strong>{faqs.length}</strong><small>Published questions</small></span>
          <span><strong>{categories.length}</strong><small>Help topics</small></span>
          <span><strong>Admin</strong><small>Managed content</small></span>
        </div>
      </div>
      <div className="website-faq-hero-mark" aria-hidden="true"><b>?</b><span>PROPULSE GUIDE</span></div>
    </section>

    <section className="website-faq-tools">
      <div className="website-faq-search"><span>⌕</span><input value={search} onChange={e=>{setSearch(e.target.value);setOpen(null)}} placeholder="Search questions, answers or topics…"/></div>
      <div className="website-faq-filters">
        <button type="button" className={category==='all'?'active':''} onClick={()=>{setCategory('all');setOpen(null)}}>All <span>{faqs.length}</span></button>
        {categories.map(item=><button type="button" key={item.key} className={category===item.key?'active':''} onClick={()=>{setCategory(item.key);setOpen(null)}}>{item.label} <span>{item.count}</span></button>)}
      </div>
    </section>

    <section className="website-faq-page-layout">
      <div className="website-faq-library">
        <div className="website-faq-library-head"><div><span className="website-faq-kicker">FAQ LIBRARY</span><h2>{category==='all'?'Frequently asked questions':categoryLabel(category)}</h2></div><small>{visible.length} question{visible.length===1?'':'s'}</small></div>
        {faqList}
      </div>
      <aside className="website-faq-side">
        <div className="website-faq-side-card primary"><span>NEED MORE HELP?</span><h3>Talk to our team.</h3><p>Contact Propulse for account, marketplace or service-related support.</p><Link to="/contact?audience=users">Contact Propulse <b>→</b></Link></div>
        <div className="website-faq-side-card"><span>QUICK ACCESS</span><Link to="/leads">Explore Leads <b>↗</b></Link><Link to="/purchased-leads">Purchased Leads <b>↗</b></Link><Link to="/wallet">Wallet <b>↗</b></Link></div>
      </aside>
    </section>
  </main>
}
