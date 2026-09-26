import { useEffect, useMemo, useState } from 'react';
import LeadPartnerSidebar from '../components/LeadPartnerSidebar';
import { Link, useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import './LeadPartnerFaq.css';

const CATEGORIES=[['all','All Questions','All available Lead Partner FAQs','▦'],['general','General','Platform basics','▣'],['leads','Leads','Buying, uploading & lead quality','◈'],['payments','Payments','Pricing & earnings','₹'],['withdrawals','Withdrawals','Earnings & payouts','⇩'],['account','Account','Profile & payout account','◎'],['reports','Reports','Lead quality reports','▥']];
const QUICK=[
  ['How do I upload leads?','leads'],['How are leads verified?','leads'],['How do withdrawals work?','withdrawals'],['Why was a lead invalidated?','leads'],['How can I check my earnings?','payments'],['How do I manage my payout account?','account']
];
export default function LeadPartnerFaq(){
  const navigate=useNavigate(),user=getUser();
  const [faqs,setFaqs]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [category,setCategory]=useState('all'),[search,setSearch]=useState(''),[open,setOpen]=useState(null);
  const load=async()=>{try{setLoading(true);setError('');setFaqs(await authRequest('/lead-partner/faqs'))}catch(e){setError(e.message||'Unable to load FAQs')}finally{setLoading(false)}};
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[]);
  const visible=useMemo(()=>faqs.filter(f=>{
    const q=search.trim().toLowerCase();
    return (category==='all'||f.category===category)&&(!q||[f.question,f.answer,f.category].join(' ').toLowerCase().includes(q));
  }),[faqs,category,search]);
  const counts=useMemo(()=>Object.fromEntries(CATEGORIES.map(([key])=>[key,key==='all'?faqs.length:faqs.filter(f=>f.category===key).length])),[faqs]);

  function signOut(){clearSession();localStorage.removeItem('propulse_session_mode');navigate('/login',{replace:true})}
  return <div className="faq-shell">
    <LeadPartnerSidebar user={user} onSignOut={signOut} />
    <main className="faq-main">
      <header className="faq-topbar"><div className="faq-breadcrumb"><span>Lead Partner</span><b>/</b><strong>FAQs</strong></div></header>
      <div className="faq-content">
        <section className="faq-hero">
          <div className="faq-hero-copy"><h1>How can we help you?</h1>
            <div className="faq-search"><span>⌕</span><input value={search} onChange={e=>{setSearch(e.target.value);setOpen(null)}} placeholder="Search FAQs… e.g. payment, lead validity, withdrawal"/><button type="button">Search</button></div>
            <div className="faq-popular"><span>Popular:</span>{['lead validity','payment','withdrawal','refund','lead quality','account','reports'].map(x=><button type="button" key={x} onClick={()=>setSearch(x)}>{x}</button>)}</div>
          </div>
          <div className="faq-hero-art" aria-hidden="true"><div className="faq-bubble big">?</div><div className="faq-bubble small">≡</div><div className="faq-leaf">◒</div></div>
        </section>

        {error&&<div className="faq-alert">{error}<button onClick={load}>Retry</button></div>}

        <section className="faq-category-grid">
          {CATEGORIES.map(([key,title,sub,icon])=><button type="button" key={key} className={category===key?'active':''} onClick={()=>{setCategory(key);setOpen(null)}}><span>{icon}</span><div><strong>{title}</strong><small>{sub}</small><em>{counts[key]} question{counts[key]===1?'':'s'}</em></div></button>)}
        </section>

        <div className="faq-main-grid">
          <section className="faq-card faq-list-card">
            <div className="faq-card-head"><div><h2>{category==='all'?'Frequently Asked Questions':CATEGORIES.find(x=>x[0]===category)?.[1]+' Questions'}</h2></div><span className="faq-count">{visible.length} question{visible.length===1?'':'s'}</span></div>
            {loading?<div className="faq-loading">Loading FAQs…</div>:!visible.length?<div className="faq-empty"><span>?</span><strong>No matching questions</strong><p>Try another search or category.</p></div>:<div className="faq-questions">{visible.map((item)=><article key={item.id} className={open===item.id?'open':''}><button type="button" onClick={()=>setOpen(open===item.id?null:item.id)}><span className="faq-q-icon">{open===item.id?'−':'+'}</span><strong>{item.question}</strong><span className="faq-chevron">{open===item.id?'⌃':'⌄'}</span></button>{open===item.id&&<div className="faq-answer"><p>{item.answer}</p></div>}</article>)}</div>}
          </section>

          <aside className="faq-side">
            <section className="faq-card quick-help"><div className="faq-card-head"><div><h2>Common guides</h2></div></div>{QUICK.map(([q,cat])=><button type="button" key={q} onClick={()=>{setCategory(cat);setSearch('')}}><span>↗</span><div><strong>{q}</strong><small>{CATEGORIES.find(x=>x[0]===cat)?.[2]}</small></div><b>›</b></button>)}</section>
            <section className="faq-support"><div className="faq-support-icon">◉</div><div><span>STILL NEED HELP?</span><h3>We're here to help.</h3><p>Contact your ProPulse administrator with your lead, report or withdrawal reference.</p></div><Link to="/lead-partner/reports">Open Reports →</Link></section>
            <section className="faq-card resources"><div className="faq-card-head"><div><h2>Lead Partner tools</h2></div></div><Link to="/lead-partner/inventory">Lead Inventory <b>›</b></Link><Link to="/lead-partner/pricing">Pricing &amp; Revenue <b>›</b></Link><Link to="/lead-partner/withdrawals">Earnings &amp; Withdrawals <b>›</b></Link><Link to="/lead-partner/account">Account &amp; Payout <b>›</b></Link></section>
          </aside>
        </div>

        <section className="faq-bottom-help"><div><h2>Can't find what you're looking for?</h2></div><Link to="/lead-partner/account">Account &amp; payout settings →</Link></section>
      </div>
    </main>
  </div>
}