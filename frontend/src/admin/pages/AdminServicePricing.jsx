import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../utils/api'
import './AdminServicePricing.css'

const blank={category:'Marketing',name:'',slug:'',tagline:'',description:'',price_label:'Custom quote',billing_note:'Scope-based pricing',features:[],cta_label:'Get Started',cta_url:'/contact',highlighted:false,sort_order:0,is_active:true}
const categories=['Marketing','Lead Sales','Government Compliance','Grow','Scale']
const slugify=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
export default function AdminServicePricing(){
  const [items,setItems]=useState([]),[form,setForm]=useState(blank),[editing,setEditing]=useState(null)
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[imageBusy,setImageBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('')
  const imageInputRef=useRef(null)
  async function load(){try{setLoading(true);setError('');const d=await apiRequest('/admin/service-pricing');setItems(Array.isArray(d)?d:[])}catch(e){setError(e.message||'Unable to load pricing')}finally{setLoading(false)}}
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[])
  const update=(k,v)=>setForm(x=>({...x,[k]:v}))
  const edit=item=>{setEditing(item.id);setForm({...blank,...item,features:Array.isArray(item.features)?item.features:[]});setError('');setOk('');window.scrollTo({top:0,behavior:'smooth'})}
  const reset=()=>{setEditing(null);setForm({...blank,sort_order:(items.length+1)*10})}
  const save=async e=>{e.preventDefault();try{setSaving(true);setError('');setOk('');const payload={...form,slug:slugify(form.slug||form.name),sort_order:Number(form.sort_order||0),features:form.features};const d=editing?await apiRequest('/admin/service-pricing/'+editing,{method:'PUT',body:JSON.stringify(payload)}):await apiRequest('/admin/service-pricing',{method:'POST',body:JSON.stringify(payload)});setOk(`${d.name} saved successfully.`);reset();await load()}catch(e){setError(e.message||'Unable to save pricing')}finally{setSaving(false)}}
  const uploadImage=async file=>{
    if(!editing||!file)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Only JPG, PNG and WebP images are supported.');return}
    if(file.size>7*1024*1024){setError('Each image must be 7 MB or smaller.');return}
    try{
      setImageBusy(true);setError('');setOk('')
      const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Unable to read image'));reader.readAsDataURL(file)})
      const d=await apiRequest('/admin/service-pricing/'+editing+'/image',{method:'POST',body:JSON.stringify({dataUrl})})
      setForm(x=>({...x,image_url:d.image_url||''}));setOk('Pricing image uploaded successfully.');await load()
    }catch(e){setError(e.message||'Unable to upload pricing image')}finally{setImageBusy(false);if(imageInputRef.current)imageInputRef.current.value=''}
  }
  const removeImage=async()=>{
    if(!editing)return
    try{setImageBusy(true);const d=await apiRequest('/admin/service-pricing/'+editing+'/image',{method:'DELETE'});setForm(x=>({...x,image_url:d.image_url||''}));setOk('Pricing image reset.');await load()}catch(e){setError(e.message||'Unable to reset image')}finally{setImageBusy(false)}
  }
  const remove=async item=>{if(!window.confirm(`Delete ${item.name}?`))return;try{await apiRequest('/admin/service-pricing/'+item.id,{method:'DELETE'});setOk('Pricing item deleted.');await load()}catch(e){setError(e.message||'Unable to delete pricing')}}
  const addFeature=()=>{const v=window.prompt('Feature name');if(v?.trim())update('features',[...form.features,v.trim()])}
  return <main className="admin-service-pricing-page">
    <section className="asp-hero"><div><span>COMMERCIAL CONTENT</span><h1>Service Pricing</h1><p>Edit public service, GROW and SCALE pricing without changing code.</p></div><div className="asp-mark">₹</div></section>
    {error&&<div className="asp-alert error">{error}</div>}{ok&&<div className="asp-alert success">{ok}</div>}
    <section className="asp-editor">
      <div className="asp-editor-head"><div><span>{editing?'EDIT PRICING':'NEW PRICING'}</span><h2>{editing?'Update '+form.name:'Add a service or pricing card'}</h2></div>{editing&&<button type="button" onClick={reset}>Cancel edit</button>}</div>
      <form onSubmit={save}>
        <div className="asp-grid">
          <label>Category<select value={form.category} onChange={e=>update('category',e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Name<input value={form.name} onChange={e=>update('name',e.target.value)} required /></label>
          <label>Slug<input value={form.slug} onChange={e=>update('slug',e.target.value)} placeholder="auto-generated" /></label>
          <label>Price display<input value={form.price_label} onChange={e=>update('price_label',e.target.value)} placeholder="Custom quote / ₹9,999 / Pay per lead" required /></label>
          <label>Billing note<input value={form.billing_note} onChange={e=>update('billing_note',e.target.value)} placeholder="Monthly / Scope-based pricing" /></label>
          <label>CTA label<input value={form.cta_label} onChange={e=>update('cta_label',e.target.value)} /></label>
          <label>CTA URL<input value={form.cta_url} onChange={e=>update('cta_url',e.target.value)} /></label>
          <label>Display order<input type="number" value={form.sort_order} onChange={e=>update('sort_order',e.target.value)} /></label>
        </div>
        <label>Tagline<input value={form.tagline} onChange={e=>update('tagline',e.target.value)} /></label>
        <section className="asp-image-editor"><div><strong>Service card image</strong><span>Use a professional photo for the public pricing card.</span></div><div className="asp-image-preview">{form.image_url?<img src={form.image_url} alt="" />:<div>No image</div>}</div><div className="asp-image-actions"><input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>uploadImage(e.target.files?.[0])}/>{editing&&<button type="button" onClick={()=>imageInputRef.current?.click()} disabled={imageBusy}>{imageBusy?'Uploading…':'Upload image'}</button>}<input className="asp-image-url" value={form.image_url||''} onChange={e=>update('image_url',e.target.value)} placeholder="Or paste an image URL" /><button type="button" onClick={removeImage} disabled={!editing||imageBusy||!form.image_url}>Reset image</button></div></section>
        <label>Description<textarea rows="3" value={form.description} onChange={e=>update('description',e.target.value)} /></label>
        <div className="asp-feature-editor"><div className="asp-feature-head"><strong>Features</strong><button type="button" onClick={addFeature}>＋ Add feature</button></div><div className="asp-chips">{form.features.map((x,i)=><span key={i}>{x}<button type="button" onClick={()=>update('features',form.features.filter((_,n)=>n!==i))}>×</button></span>)}</div></div>
        <div className="asp-options"><label><input type="checkbox" checked={form.highlighted} onChange={e=>update('highlighted',e.target.checked)} /> Highlight on public pricing</label><label><input type="checkbox" checked={form.is_active} onChange={e=>update('is_active',e.target.checked)} /> Published</label></div>
        <button className="asp-save" disabled={saving}>{saving?'Saving…':editing?'Save changes':'Create pricing item'} <span>→</span></button>
      </form>
    </section>
    <section className="asp-list">{loading?<div className="asp-empty">Loading pricing…</div>:items.map(item=><article key={item.id} className="asp-item"><div className="asp-item-copy"><span>{item.category}</span><h3>{item.name}</h3><p>{item.tagline}</p><strong>{item.price_label}</strong></div><div className="asp-item-meta"><b className={item.is_active?'on':'off'}>{item.is_active?'Published':'Hidden'}</b>{item.highlighted&&<b className="featured">Featured</b>}<button onClick={()=>edit(item)}>Edit</button><button onClick={()=>remove(item)}>Delete</button></div></article>)}</section>
  </main>
}
