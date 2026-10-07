import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import { homeownerSeoFaqs } from '../seo/faqKnowledge'
import './WebsiteFaqSection.css'

const HOMEOWNER_PRIMARY_CATEGORIES=new Set(['construction','interiors','property'])
const HOMEOWNER_BASELINE_READY_COUNT=100

function normalizeQuestion(value){
  return String(value||'').trim().toLowerCase().replace(/\s+/g,' ')
}

function resolveHomeownerFaqs(remote,defaults){
  const primaryRemote=remote.filter(item=>HOMEOWNER_PRIMARY_CATEGORIES.has(String(item?.category||'').toLowerCase()))
  if(primaryRemote.length>=HOMEOWNER_BASELINE_READY_COUNT)return primaryRemote
  const byQuestion=new Map(primaryRemote.map(item=>[normalizeQuestion(item.question),item]))
  const merged=defaults.map(item=>byQuestion.get(normalizeQuestion(item.question))||item)
  const known=new Set(merged.map(item=>normalizeQuestion(item.question)))
  for(const item of primaryRemote){
    const key=normalizeQuestion(item.question)
    if(!known.has(key)){merged.push(item);known.add(key)}
  }
  return merged
}

const CATEGORY_LABELS={
  general:'General',
  leads:'Leads',
  payments:'Payments',
  withdrawals:'Withdrawals',
  account:'Account',
  reports:'Reports',
  construction:'Construction',
  interiors:'Interiors',
  property:'Real Estate'
}

function categoryLabel(value){
  return CATEGORY_LABELS[value]||String(value||'General').replace(/[_-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase())
}

function FaqIcon({category}){
  const common={width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.9',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  const key=String(category||'general').toLowerCase()
  if(key.includes('construct'))return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if(key.includes('consult'))return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>
  if(key.includes('interior'))return <svg {...common}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/><path d="M5 17v2M19 17v2"/></svg>
  if(key.includes('price')||key.includes('cost')||key.includes('payment'))return <svg {...common}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h.01M8 14h2M12 14h2M16 14h.01M8 18h2M12 18h2M16 18h.01"/></svg>
  return <svg {...common}><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z"/><path d="M8 12h8M12 8v8"/></svg>
}

export default function WebsiteFaqSection({variant='home',audience='website'}){
  const standalone=variant==='page'
  const compactHome=variant==='home-compact'
  const [searchParams,setSearchParams]=useSearchParams()
  const [faqs,setFaqs]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [open,setOpen]=useState(null)
  const [search,setSearch]=useState('')
  const requestedCategory=standalone?String(searchParams.get('category')||'all').toLowerCase():'all'
  const initialCategory=audience==='homeowner'&&requestedCategory!=='all'&&!HOMEOWNER_PRIMARY_CATEGORIES.has(requestedCategory)?'all':requestedCategory
  const [category,setCategory]=useState(initialCategory)

  const load=useCallback(async()=>{
    try{
      setLoading(true)
      setError('')
      const data=await publicRequest('/faqs?audience='+encodeURIComponent(audience))
      const remote=Array.isArray(data)?data.filter(item=>item?.is_active!==false):[]
      const defaults=audience==='homeowner'?homeownerSeoFaqs():[]
      const resolved=audience==='homeowner'?resolveHomeownerFaqs(remote,defaults):(remote.length?remote:defaults)
      setFaqs(resolved)
      setOpen(current=>{
        if(resolved.some(item=>item.id===current))return current
        return variant==='home'&&resolved.length?resolved[0].id:null
      })
    }catch(e){
      const defaults=audience==='homeowner'?homeownerSeoFaqs():[]
      setFaqs(defaults)
      if(!defaults.length)setError(e.message||'Unable to load FAQs')
    }finally{
      setLoading(false)
    }
  },[audience,variant])

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[load])
  useEffect(()=>{
    if(!standalone)return undefined
    let active=true
    const requested=String(searchParams.get('category')||'all').toLowerCase()
    const next=audience==='homeowner'&&requested!=='all'&&!HOMEOWNER_PRIMARY_CATEGORIES.has(requested)?'all':requested
    queueMicrotask(()=>{
      if(!active)return
      if(next!==category){setCategory(next);setOpen(null)}
      if(next==='all'&&requested!=='all')setSearchParams({}, {replace:true})
    })
    return()=>{active=false}
  },[searchParams,standalone,category,audience,setSearchParams])

  const categories=useMemo(()=>{
    const counts=new Map()
    faqs.forEach(item=>{const key=item.category||'general';counts.set(key,(counts.get(key)||0)+1)})
    const priority={construction:1,interiors:2,property:3,general:4,consultation:5,privacy:6}
    return [...counts.entries()].map(([key,count])=>({key,label:categoryLabel(key),count})).sort((a,b)=>(priority[a.key]||50)-(priority[b.key]||50)||a.label.localeCompare(b.label))
  },[faqs])

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase()
    return faqs.filter(item=>{
      if(category!=='all'&&(item.category||'general')!==category)return false
      return !q||[item.question,item.answer,item.category,...(Array.isArray(item.keywords)?item.keywords:[])].join(' ').toLowerCase().includes(q)
    })
  },[faqs,search,category])

  const faqList=<div className="website-faq-list">
    {loading&&<div className="website-faq-state">Loading FAQs…</div>}
    {!loading&&error&&<div className="website-faq-state error"><strong>FAQs are temporarily unavailable.</strong><button type="button" onClick={load}>Try again</button></div>}
    {!loading&&!error&&!visible.length&&<div className="website-faq-state"><strong>No FAQs are available yet.</strong></div>}
    {!loading&&!error&&visible.map((item,index)=>{
      const expanded=open===item.id
      const answerId=`website-faq-answer-${item.id}`
      return <article className={`website-faq-item${expanded?' open':''}`} key={item.id}>
        <button type="button" className="website-faq-question" onClick={()=>setOpen(expanded?null:item.id)} aria-expanded={expanded} aria-controls={answerId}>
          {standalone&&<span className="website-faq-number">{String(index+1).padStart(2,'0')}</span>}
          {!standalone&&<span className="website-faq-home-icon"><FaqIcon category={item.category}/></span>}
          <span className="website-faq-question-copy"><small>{categoryLabel(item.category)}</small><strong>{item.question}</strong></span>
          <span className="website-faq-toggle" aria-hidden="true">{expanded?'−':'+'}</span>
        </button>
        {expanded&&<div className="website-faq-answer" id={answerId}><p>{item.answer}</p></div>}
      </article>
    })}
  </div>

  if(compactHome){
    const compactItems=visible.slice(0,4)
    return <section className="website-faq website-faq-compact" id="faq">
      <div className="website-faq-compact-head">
        <div><h2>Frequently Asked Questions</h2></div>
      </div>
      <div className="website-faq-compact-grid">
        {loading&&<div className="website-faq-state">Loading FAQs…</div>}
        {!loading&&error&&<div className="website-faq-state error"><strong>FAQs are temporarily unavailable.</strong><button type="button" onClick={load}>Try again</button></div>}
        {!loading&&!error&&!compactItems.length&&<div className="website-faq-state"><strong>No FAQs available yet.</strong></div>}
        {!loading&&!error&&compactItems.map(item=>{
          const expanded=open===item.id
          return <article className={'website-faq-compact-item'+(expanded?' open':'')} key={item.id}>
            <button type="button" onClick={()=>setOpen(expanded?null:item.id)} aria-expanded={expanded}>
              <strong>{item.question}</strong><span>{expanded?'−':'⌄'}</span>
            </button>
            {expanded&&<p>{item.answer}</p>}
          </article>
        })}
      </div>
    </section>
  }

  if(!standalone)return <section className="website-faq website-faq-home" id="faq">
    <div className="website-faq-home-head">
      <div>
        <span className="website-faq-kicker"><i/> FAQ</span>
        <h2>Questions, <em>clearly answered.</em></h2>
        
      </div>
      <Link className="website-faq-more" to="/contact"><span className="website-faq-more-icon">☵</span> Need more help? <b>→</b></Link>
    </div>
    <div className="website-faq-home-layout">
      {faqList}
      <aside className="website-faq-support">
        <div className="website-faq-support-copy">
          <span className="website-faq-kicker">SUPPORT <i/></span>
          <h3>Talk to <em>ProPulse.</em></h3>
          
          <Link to="/contact">Contact ProPulse <span>→</span></Link>
        </div>
        <div className="website-faq-support-photo" aria-hidden="true">
          <img src="https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=900&q=88" alt="" loading="lazy"/>
        </div>
      </aside>
    </div>
  </section>

  return <main className="website-faq website-faq-standalone">
    <section className="website-faq-hero">
      <div className="website-faq-hero-copy">
        <span className="website-faq-eyebrow"><i/> CUSTOMER HELP CENTRE</span>
        <h1>Search construction, interiors & <em>property answers.</em></h1>
        
        </div>
      <div className="website-faq-hero-mark" aria-hidden="true"><b>?</b><span>PROPULSE GUIDE</span></div>
    </section>

    <section className="website-faq-tools">
      <div className="website-faq-search"><span>⌕</span><input value={search} onChange={e=>{setSearch(e.target.value);setOpen(null)}} placeholder="Search questions, answers or topics…"/></div>
      <div className="website-faq-filters">
        <button type="button" className={category==='all'?'active':''} onClick={()=>{setCategory('all');setOpen(null);if(standalone)setSearchParams({})}}>All <span>{faqs.length}</span></button>
        {categories.map(item=><button type="button" key={item.key} className={category===item.key?'active':''} onClick={()=>{setCategory(item.key);setOpen(null);if(standalone)setSearchParams({category:item.key})}}>{item.label} <span>{item.count}</span></button>)}
      </div>
    </section>

    <section className="website-faq-page-layout">
      <div className="website-faq-library">
        <div className="website-faq-library-head"><div><span className="website-faq-kicker">FAQ LIBRARY</span><h2>{category==='all'?'Frequently asked questions':categoryLabel(category)}</h2></div><small>{visible.length} question{visible.length===1?'':'s'}</small></div>
        {faqList}
      </div>
      <aside className="website-faq-side">
        <div className="website-faq-side-card primary"><span>NEED PROJECT HELP?</span><h3>Start a project requirement.</h3><Link to="/quote">Start Requirement <b>→</b></Link></div>
        <div className="website-faq-side-card"><span>QUICK ACCESS</span><Link to="/guides">Construction Guides <b>↗</b></Link><Link to="/packages">Packages <b>↗</b></Link><Link to="/experts">Find Professionals <b>↗</b></Link></div>
      </aside>
    </section>
  </main>
}
