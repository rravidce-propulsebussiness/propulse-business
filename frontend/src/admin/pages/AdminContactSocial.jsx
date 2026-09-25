import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../utils/api';
import './AdminContactSocial.css';

const AUDIENCES=[
  {key:'website',label:'Website (Public)',sub:'Shown on the main website',icon:'◎'},
  {key:'users',label:'Users (Customers)',sub:'Shown to registered users',icon:'♙'},
  {key:'lead_partners',label:'Lead Partners',sub:'Shown to lead partners',icon:'◆'},
  {key:'common',label:'Common Settings',sub:'Shared across all sections',icon:'⚙'}
];
const fresh={audience:'website',company_name:'',email:'',phone:'',whatsapp:'',address:'',business_hours:'',support_email:'',careers_email:'',maps_url:'',website_url:'/',social_handles:[]};
const makeId=()=> 'social-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);

export default function AdminContactSocial(){
  const [audience,setAudience]=useState('website');
  const [form,setForm]=useState(fresh);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
  const [loaded,setLoaded]=useState({});
  async function loadAudience(key=audience){
    try{
      setLoading(true);setError('');
      const data=await apiRequest('/admin/contact-social?audience='+encodeURIComponent(key));
      const next={...fresh,...data,audience:key,social_handles:Array.isArray(data?.social_handles)?data.social_handles:[]};
      setForm(next);setLoaded(prev=>({...prev,[key]:next}));
    }catch(e){setError(e.message||'Unable to load contact settings')}
    finally{setLoading(false)}
  }
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)loadAudience('website')});return()=>{active=false}},[]);
  function switchAudience(key){
    setAudience(key);setError('');setOk('');
    if(loaded[key]) setForm({...loaded[key],audience:key});
    else loadAudience(key);
  }
  const update=(key,value)=>setForm(v=>({...v,[key]:value}));
  const updateSocial=(id,key,value)=>setForm(v=>({...v,social_handles:v.social_handles.map(s=>s.id===id?{...s,[key]:value}:s)}));
  const addSocial=()=>setForm(v=>({...v,social_handles:[...v.social_handles,{id:makeId(),platform:'New Platform',url:'',enabled:true}]}));
  const removeSocial=id=>setForm(v=>({...v,social_handles:v.social_handles.filter(s=>s.id!==id)}));
  async function save(e){
    e.preventDefault();
    try{
      setSaving(true);setError('');setOk('');
      const saved=await apiRequest('/admin/contact-social?audience='+encodeURIComponent(audience),{method:'PATCH',body:JSON.stringify({...form,audience})});
      const next={...fresh,...saved,audience,social_handles:Array.isArray(saved?.social_handles)?saved.social_handles:[]};
      setForm(next);setLoaded(prev=>({...prev,[audience]:next}));
      setOk(AUDIENCES.find(x=>x.key===audience)?.label+' settings saved successfully.');
    }catch(e){setError(e.message||'Unable to save contact settings')}
    finally{setSaving(false)}
  }
  const publishedCount=useMemo(()=>form.social_handles.filter(s=>s.enabled&&s.url).length,[form.social_handles]);
  const hiddenCount=useMemo(()=>form.social_handles.filter(s=>!s.enabled).length,[form.social_handles]);
  const current= AUDIENCES.find(x=>x.key===audience);
  if(loading&&!form.company_name&&!loaded[audience]) return <main className="admin-contact-page"><div className="admin-contact-empty">Loading contact settings…</div></main>;

  return <main className="admin-contact-page">
    <section className="admin-contact-hero">
      <div><span className="admin-contact-kicker">CONTENT CONTROL</span><h1>Contact &amp; Social Management</h1><p>Manage contact information and social media handles for each audience of the platform.</p></div>
      <div className="admin-contact-hero-mark">↗</div>
    </section>
    {error&&<div className="admin-contact-alert error">{error}</div>}
    {ok&&<div className="admin-contact-alert success">{ok}</div>}

    <section className="admin-contact-audience-tabs">
      {AUDIENCES.map(item=><button type="button" key={item.key} className={audience===item.key?'active':''} onClick={()=>switchAudience(item.key)}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.sub}</small></div></button>)}
    </section>

    <form onSubmit={save}>
      <div className="admin-contact-audience-note"><div><strong>{current?.label}</strong><span>{current?.sub}</span></div><span className="admin-contact-audience-badge">{audience==='common'?'Shared':'Audience specific'}</span></div>
      <div className="admin-contact-layout">
        <div className="admin-contact-left">
          <section className="admin-contact-card"><div className="admin-contact-card-head"><div><span className="admin-contact-kicker">BUSINESS INFORMATION</span><h2>Contact details</h2><p>These values are stored separately for the selected audience.</p></div></div>
            <div className="admin-contact-fields">
              <label>Company name<input value={form.company_name} onChange={e=>update('company_name',e.target.value)} required={audience!=='common'}/></label>
              <label>Email address<input type="email" value={form.email} onChange={e=>update('email',e.target.value)}/></label>
              <div className="admin-contact-two"><label>Phone<input value={form.phone} onChange={e=>update('phone',e.target.value)}/></label><label>WhatsApp<input value={form.whatsapp} onChange={e=>update('whatsapp',e.target.value)}/></label></div>
              <label>Address<textarea rows="3" value={form.address} onChange={e=>update('address',e.target.value)}/></label>
              <label>Business hours<input value={form.business_hours} onChange={e=>update('business_hours',e.target.value)}/></label>
              <div className="admin-contact-two"><label>Support email<input type="email" value={form.support_email} onChange={e=>update('support_email',e.target.value)}/></label><label>Careers email<input type="email" value={form.careers_email} onChange={e=>update('careers_email',e.target.value)}/></label></div>
            </div>
          </section>
          <section className="admin-contact-card"><div className="admin-contact-card-head"><div><span className="admin-contact-kicker">MAP &amp; WEBSITE</span><h2>Location settings</h2><p>Set the map and website destination for the selected audience.</p></div></div>
            <div className="admin-contact-fields"><label>Google Maps link<input value={form.maps_url} onChange={e=>update('maps_url',e.target.value)} placeholder="https://maps.google.com/..."/></label><label>Website URL<input value={form.website_url} onChange={e=>update('website_url',e.target.value)} placeholder="/"/></label></div>
          </section>
        </div>

        <div className="admin-contact-right">
          <section className="admin-contact-card"><div className="admin-contact-card-head"><div><span className="admin-contact-kicker">SOCIAL MEDIA</span><h2>Social media handles</h2><p>Each audience has its own editable social links.</p></div><button type="button" className="admin-contact-add" onClick={addSocial}>＋ Add social</button></div>
            <div className="admin-social-list">{form.social_handles.map((s,index)=><div className="admin-social-row" key={s.id}><div className="admin-social-index">{index+1}</div><div className="admin-social-inputs"><input aria-label="Platform name" value={s.platform} onChange={e=>updateSocial(s.id,'platform',e.target.value)} placeholder="Platform name"/><input aria-label="Profile URL" value={s.url} onChange={e=>updateSocial(s.id,'url',e.target.value)} placeholder="https://instagram.com/yourhandle"/></div><label className="admin-social-toggle"><input type="checkbox" checked={s.enabled} onChange={e=>updateSocial(s.id,'enabled',e.target.checked)}/><span>Published</span></label><button type="button" className="admin-social-delete" onClick={()=>removeSocial(s.id)} aria-label="Remove social">×</button></div>)}{!form.social_handles.length&&<div className="admin-contact-empty">No social handles configured for this audience. Add one above.</div>}</div>
            <div className="admin-contact-note">Social handles are fully dynamic. A platform added here belongs only to the selected audience.</div>
          </section>
          <section className="admin-contact-card"><div className="admin-contact-card-head"><div><span className="admin-contact-kicker">LIVE CONTENT</span><h2>Publication status</h2><p>Only enabled links with a URL are visible to end users.</p></div></div><div className="admin-contact-status-grid"><div><strong>{form.social_handles.length}</strong><span>Total social links</span></div><div><strong>{publishedCount}</strong><span>Published links</span></div><div><strong>{hiddenCount}</strong><span>Hidden</span></div></div></section>
        </div>
      </div>
      <div className="admin-contact-actions"><a href={audience==='website'?'/contact':'/'} target="_blank" rel="noreferrer" className="admin-contact-preview">{audience==='website'?'View Contact page':'View website ↗'}</a><button type="submit" className="admin-contact-save" disabled={saving}>{saving?'Saving…':'Save '+current?.label} <span>→</span></button></div>
    </form>
  </main>
}