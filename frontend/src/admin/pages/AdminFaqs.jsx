import { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import './AdminFaqs.css';

const categories=[['general','General'],['leads','Leads'],['payments','Payments'],['withdrawals','Withdrawals'],['account','Account'],['reports','Reports']];
const audiences=[['website','Public Website FAQs','Shown on the main homepage.'],['lead_partner','Lead Partner FAQs','Shown in the Lead Partner portal.']];
const empty={audience:'website',category:'general',question:'',answer:'',sort_order:10,is_active:true};

export default function AdminFaqs(){
  const [rows,setRows]=useState([]),[form,setForm]=useState(empty),[editId,setEditId]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState(''),[search,setSearch]=useState('');
  async function load(audienceKey=form.audience||'website'){try{setLoading(true);setError('');const data=await apiRequest('/admin/faqs?audience='+encodeURIComponent(audienceKey));setRows(Array.isArray(data)?data:[])}catch(e){setError(e.message||'Unable to load FAQs')}finally{setLoading(false)}}
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load(form.audience)});return()=>{active=false}},[form.audience]);
  function reset(){setEditId(null);setForm({...empty});setOk('');setError('')}
  function edit(row){setEditId(row.id);setForm({audience:row.audience||'website',category:row.category,question:row.question,answer:row.answer,sort_order:row.sort_order,is_active:row.is_active});setOk('');setError('');window.scrollTo({top:0,behavior:'smooth'})}
  async function save(e){e.preventDefault();try{setSaving(true);setError('');setOk('');const body={...form,sort_order:Number(form.sort_order)||0};await apiRequest(editId?'/admin/faqs/'+editId:'/admin/faqs',{method:editId?'PUT':'POST',body:JSON.stringify(body)});const successMessage=editId?'FAQ updated successfully.':'FAQ created successfully.';reset();setOk(successMessage);await load();}catch(e){setError(e.message||'Unable to save FAQ')}finally{setSaving(false)}}
  async function remove(id){if(!window.confirm('Delete this FAQ?'))return;try{setError('');await apiRequest('/admin/faqs/'+id,{method:'DELETE'});setOk('FAQ deleted.');await load()}catch(e){setError(e.message||'Unable to delete FAQ')}}
  const filtered=rows.filter(r=>[r.question,r.answer,r.category].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  return <main className="admin-faq-page">
    <section className="admin-faq-hero"><div><span className="admin-faq-kicker">CONTENT CONTROL</span><h1>Website &amp; Lead Partner FAQs</h1><p>Manage the FAQs shown on the public homepage and inside the Lead Partner portal.</p></div><div className="admin-faq-hero-mark">?</div></section>
    {error&&<div className="admin-faq-alert error">{error}</div>}{ok&&<div className="admin-faq-alert success">{ok}</div>}
    <section className="admin-faq-layout">
      <article className="admin-faq-panel admin-faq-editor"><div className="admin-faq-head"><div><span className="admin-faq-kicker">{editId?'EDIT FAQ':'CREATE FAQ'}</span><h2>{editId?'Edit question':'Add a new question'}</h2><p>Changes are reflected in the Lead Partner FAQ page after saving.</p></div>{editId&&<button type="button" className="admin-faq-secondary" onClick={reset}>Cancel</button>}</div>
        <form onSubmit={save} className="admin-faq-form">
          <div className="admin-faq-form-grid"><label>Audience<select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}>{audiences.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label><label>Sort order<input type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})}/></label></div>
          <label>Question<input value={form.question} onChange={e=>setForm({...form,question:e.target.value})} placeholder="Enter the FAQ question" required/></label>
          <label>Answer<textarea rows="7" value={form.answer} onChange={e=>setForm({...form,answer:e.target.value})} placeholder="Write the answer shown to Lead Partners" required/></label>
          <label className="admin-faq-active"><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/><span><b>Publish this FAQ</b><small>Unpublished FAQs are hidden from Lead Partners but remain available to Admin.</small></span></label>
          <button className="admin-faq-primary" disabled={saving}>{saving?'Saving…':editId?'Update FAQ':'Create FAQ'} <span>→</span></button>
        </form>
      </article>
      <aside className="admin-faq-panel admin-faq-summary"><span className="admin-faq-kicker">HELP CENTER</span><h2>{(audiences.find(x=>x[0]===(form.audience||'website'))||audiences[0])[1]}</h2><p>{(audiences.find(x=>x[0]===(form.audience||'website'))||audiences[0])[2]}</p><div className="admin-faq-summary-stats"><div><strong>{rows.length}</strong><span>Total</span></div><div><strong>{rows.filter(r=>r.is_active).length}</strong><span>Published</span></div><div><strong>{rows.filter(r=>!r.is_active).length}</strong><span>Drafts</span></div></div><div className="admin-faq-category-summary">{categories.map(c=><div key={c[0]}><span>{c[1]}</span><b>{rows.filter(r=>r.category===c[0]).length}</b></div>)}</div></aside>
    </section>
    <section className="admin-faq-panel admin-faq-list"><div className="admin-faq-list-head"><div><span className="admin-faq-kicker">FAQ LIBRARY</span><h2>Published &amp; draft questions</h2><p>Edit content, change category, reorder or unpublish any question.</p></div><div className="admin-faq-list-tools"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search FAQs…"/><button type="button" onClick={load}>↻ Refresh</button></div></div>
      {loading?<div className="admin-faq-empty">Loading FAQs…</div>:!filtered.length?<div className="admin-faq-empty">No FAQs found.</div>:<div className="admin-faq-table-wrap"><table className="admin-faq-table"><thead><tr><th>QUESTION</th><th>CATEGORY</th><th>STATUS</th><th>ORDER</th><th>ACTION</th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}><td><b>{row.question}</b><small>{row.answer.length>120?row.answer.slice(0,120)+'…':row.answer}</small></td><td><span className="admin-faq-category-pill">{(categories.find(x=>x[0]===row.category)||[])[1]||row.category}</span></td><td><span className={row.is_active?'admin-faq-status published':'admin-faq-status draft'}>{row.is_active?'Published':'Draft'}</span></td><td>{row.sort_order}</td><td><button onClick={()=>edit(row)}>Edit</button><button className="danger" onClick={()=>remove(row.id)}>Delete</button></td></tr>)}</tbody></table></div>}
    </section>
  </main>
}