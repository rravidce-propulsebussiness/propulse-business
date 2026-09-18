import { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import './AdminContactSocial.css';

const fresh={company_name:'',email:'',phone:'',whatsapp:'',address:'',business_hours:'',support_email:'',careers_email:'',maps_url:'',website_url:'/',social_handles:[]};
const makeId=()=> 'social-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);

export default function AdminContactSocial(){
  const [form,setForm]=useState(fresh),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
  async function load(){try{setLoading(true);setError('');const data=await apiRequest('/admin/contact-social');setForm({...fresh,...data,social_handles:Array.isArray(data?.social_handles)?data.social_handles:[]})}catch(e){setError(e.message||'Unable to load contact settings')}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  const update=(key,value)=>setForm(v=>({...v,[key]:value}));
  const updateSocial=(id,key,value)=>setForm(v=>({...v,social_handles:v.social_handles.map(s=>s.id===id?{...s,[key]:value}:s)}));
  const addSocial=()=>setForm(v=>({...v,social_handles:[...v.social_handles,{id:makeId(),platform:'New Platform',url:'',enabled:true}]}));
  const removeSocial=id=>setForm(v=>({...v,social_handles:v.social_handles.filter(s=>s.id!==id)}));
  async function save(e){e.preventDefault();try{setSaving(true);setError('');setOk('');const saved=await apiRequest('/admin/contact-social',{method:'PATCH',body:JSON.stringify(form)});setForm({...fresh,...saved,social_handles:Array.isArray(saved?.social_handles)?saved.social_handles:[]});setOk('Contact details and social handles saved successfully.')}catch(e){setError(e.message||'Unable to save contact settings')}finally{setSaving(false)}}
  if(loading)return <main className="admin-contact-page"><div className="admin-contact-empty">Loading contact settings…</div></main>;
  return <main className="admin-contact-page">
    <section className="admin-contact-hero"><div><span className="admin-contact-kicker">WEBSITE CONTENT</span><h1>Contact &amp; Social</h1><p>Manage the public contact details, location and social media links used across the website.</p></div><div className="admin-contact-hero-mark">↗</div></section>
    {error&&<div className="admin-contact-alert error">{error}</div>}{ok&&<div className="admin-contact-alert success">{ok}</div>}
    <form onSubmit={save}>
      <div className="admin-contact-layout">
        <div className="admin-contact-left">
          <section className="admin-contact-card"><div className="admin-contact-card-head"><div><span className="admin-contact-kicker">BUSINESS INFORMATION</span><h2>Contact details</h2><p>These values are shown on the public Contact page.</p></div></div>
            <div className="admin-contact-fields">
              <label>Company name<input value={form.company_name} onChange={e=>update('company_name',e.target.value)} required/></label>
              <label>Email address<input type="email" value={form.email} onChange={e=>update('email',e.target.value)}/></label>
              <div className="admin-contact-two"><label>Phone<input value={form.phone} onChange={e=>update('phone',e.target.value)}/></label><label>WhatsApp<input value={form.whatsapp} onChange={e=>update('whatsapp',e.target.value)}/></label></div>
              <label>Address<textarea rows="3" value={form.address} onChange={e=>update('address',e.target.value)}/></label>
              <label>Business hours<input value={form.business_hours} onChange={e=>update('business_hours',e.target.value)}/></label>
              <div className="admin-contact-two"><label>Support email<input type="email" value={form.support_email} onChange={e=>update('support_email',e.target.value)}/></label><label>Careers email<input type="email" value={form.careers_email} onChange={e=>update('careers_email',e.target.value)}/></label></div>
            </div>
          </section>
          <section className="admin-contact-card"><div className="admin-contact-card-head"><div><span className="admin-contact-kicker">MAP &amp; WEBSITE</span><h2>Location settings</h2><p>Control the map link and primary website destination.</p></div></div>
            <div className="admin-contact-fields"><label>Google Maps link<input value={form.maps_url} onChange={e=>update('maps_url',e.target.value)} placeholder="https://maps.google.com/..."/></label><label>Website URL<input value={form.website_url} onChange={e=>update('website_url',e.target.value)} placeholder="/"/></label></div>
          </section>
        </div>
        <div className="admin-contact-right">
          <section className="admin-contact-card"><div className="admin-contact-card-head"><div><span className="admin-contact-kicker">SOCIAL MEDIA</span><h2>Social media handles</h2><p>Add, edit, publish or remove any social profile.</p></div><button type="button" className="admin-contact-add" onClick={addSocial}>＋ Add social</button></div>
            <div className="admin-social-list">{form.social_handles.map((s,index)=><div className="admin-social-row" key={s.id}><div className="admin-social-index">{index+1}</div><div className="admin-social-inputs"><input aria-label="Platform name" value={s.platform} onChange={e=>updateSocial(s.id,'platform',e.target.value)} placeholder="Platform name"/><input aria-label="Profile URL" value={s.url} onChange={e=>updateSocial(s.id,'url',e.target.value)} placeholder="https://instagram.com/yourhandle"/></div><label className="admin-social-toggle"><input type="checkbox" checked={s.enabled} onChange={e=>updateSocial(s.id,'enabled',e.target.checked)}/><span>Published</span></label><button type="button" className="admin-social-delete" onClick={()=>removeSocial(s.id)} aria-label="Remove social">×</button></div>)}{!form.social_handles.length&&<div className="admin-contact-empty">No social handles configured. Add one above.</div>}</div>
            <div className="admin-contact-note">Social platforms are fully dynamic. Admin can add a new platform without a frontend code change.</div>
          </section>
          <section className="admin-contact-card"><div className="admin-contact-card-head"><div><span className="admin-contact-kicker">LIVE CONTENT</span><h2>Publication status</h2><p>Only enabled social links appear publicly.</p></div></div><div className="admin-contact-status-grid"><div><strong>{form.social_handles.length}</strong><span>Total social links</span></div><div><strong>{form.social_handles.filter(s=>s.enabled&&s.url).length}</strong><span>Published links</span></div><div><strong>{form.social_handles.filter(s=>!s.enabled).length}</strong><span>Hidden</span></div></div></section>
        </div>
      </div>
      <div className="admin-contact-actions"><a href="/contact" target="_blank" rel="noreferrer" className="admin-contact-preview">View Contact page ↗</a><button type="submit" className="admin-contact-save" disabled={saving}>{saving?'Saving…':'Save changes'} <span>→</span></button></div>
    </form>
  </main>
}
