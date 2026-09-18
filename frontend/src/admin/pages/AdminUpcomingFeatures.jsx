import { useEffect, useState } from 'react'
import { apiRequest } from '../../utils/api'
import './AdminUpcomingFeatures.css'

const statuses=['Planned','In development','Researching','Coming soon','Future release']
const blank={name:'',slug:'',category:'Platform',short_description:'',description:'',icon:'✦',status:'Planned',timeline:'Coming soon',sort_order:10,highlighted:false,is_active:true}
const slugify=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
export default function AdminUpcomingFeatures(){
  const [items,setItems]=useState([]),[form,setForm]=useState(blank),[editId,setEditId]=useState(null)
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('')
  async function load(){try{setLoading(true);setError('');const d=await apiRequest('/admin/upcoming-features');setItems(Array.isArray(d)?d:[])}catch(e){setError(e.message||'Unable to load upcoming features')}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  const update=(k,v)=>setForm(x=>({...x,[k]:v}))
  const edit=item=>{setEditId(item.id);setForm({...blank,...item});setError('');setOk('');window.scrollTo({top:0,behavior:'smooth'})}
  const reset=()=>{setEditId(null);setForm({...blank,sort_order:(items.length+1)*10})}
  async function save(e){e.preventDefault();try{setSaving(true);setError('');setOk('');const body={...form,slug:slugify(form.slug||form.name),sort_order:Number(form.sort_order||0)};const d=editId?await apiRequest('/admin/upcoming-features/'+editId,{method:'PUT',body:JSON.stringify(body)}):await apiRequest('/admin/upcoming-features',{method:'POST',body:JSON.stringify(body)});setOk(`${d.name} saved successfully.`);reset();await load()}catch(e){setError(e.message||'Unable to save feature')}finally{setSaving(false)}}
  async function remove(item){if(!window.confirm(`Delete ${item.name}?`))return;try{await apiRequest('/admin/upcoming-features/'+item.id,{method:'DELETE'});setOk('Feature deleted.');await load()}catch(e){setError(e.message||'Unable to delete feature')}}
  return <main className="admin-upcoming-page">
    <section className="auf-hero"><div><span>PRODUCT ROADMAP</span><h1>Upcoming Features</h1><p>Manage every roadmap item displayed on the public Propulse Upcoming Features page.</p></div><div className="auf-mark">✦</div></section>
    {error&&<div className="auf-alert error">{error}</div>}{ok&&<div className="auf-alert success">{ok}</div>}
    <section className="auf-editor">
      <div className="auf-editor-head"><div><span>{editId?'EDIT ROADMAP ITEM':'NEW ROADMAP ITEM'}</span><h2>{editId?'Update '+form.name:'Add an upcoming capability'}</h2><p>Name, description, status, timeline, highlighting and publication are all editable.</p></div>{editId&&<button type="button" onClick={reset}>Cancel</button>}</div>
      <form onSubmit={save}>
        <div className="auf-grid">
          <label>Name<input required value={form.name} onChange={e=>update('name',e.target.value)} /></label>
          <label>Category<input value={form.category} onChange={e=>update('category',e.target.value)} placeholder="Business Software, AI & Automation…" /></label>
          <label>Status<select value={form.status} onChange={e=>update('status',e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
          <label>Timeline<input value={form.timeline} onChange={e=>update('timeline',e.target.value)} placeholder="Coming soon / Future release" /></label>
          <label>Icon<input value={form.icon} onChange={e=>update('icon',e.target.value)} maxLength={8} /></label>
          <label>Sort order<input type="number" value={form.sort_order} onChange={e=>update('sort_order',e.target.value)} /></label>
        </div>
        <label>Slug<input value={form.slug} onChange={e=>update('slug',e.target.value)} placeholder="Auto-generated from name" /></label>
        <label>Short description<input value={form.short_description} onChange={e=>update('short_description',e.target.value)} required /></label>
        <label>Full description<textarea rows="4" value={form.description} onChange={e=>update('description',e.target.value)} /></label>
        <div className="auf-options"><label><input type="checkbox" checked={form.highlighted} onChange={e=>update('highlighted',e.target.checked)} /> Highlight this roadmap item</label><label><input type="checkbox" checked={form.is_active} onChange={e=>update('is_active',e.target.checked)} /> Published</label></div>
        <button className="auf-save" disabled={saving}>{saving?'Saving…':editId?'Save changes':'Create feature'} <span>→</span></button>
      </form>
    </section>
    <section className="auf-list">{loading?<div className="auf-empty">Loading roadmap…</div>:items.map(item=><article className="auf-item" key={item.id}><div className="auf-item-icon">{item.icon||'✦'}</div><div className="auf-item-copy"><div><span>{item.category}</span><b className={item.highlighted?'highlight':''}>{item.highlighted?'Featured':''}</b></div><h3>{item.name}</h3><p>{item.short_description}</p><small>{item.status} · {item.timeline}</small></div><div className="auf-item-actions"><b className={item.is_active?'published':'hidden'}>{item.is_active?'Published':'Hidden'}</b><button onClick={()=>edit(item)}>Edit</button><button className="danger" onClick={()=>remove(item)}>Delete</button></div></article>)}</section>
  </main>
}
