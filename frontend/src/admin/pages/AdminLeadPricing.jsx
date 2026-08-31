import { useEffect, useState } from 'react';
import { getToken } from '../../utils/auth';
import './AdminLeadPricing.css';

const API='http://localhost:5000/api';
const emptyPricing=()=>({shares:[{shares:1,normal:0,pro:0},{shares:3,normal:0,pro:0},{shares:5,normal:0,pro:0}]});
const emptyForm=()=>({industryId:'',cityId:'',leadType:'basic',pricing:emptyPricing(),isActive:true});

export default function AdminLeadPricing(){
 const [industries,setIndustries]=useState([]),[cities,setCities]=useState([]),[rules,setRules]=useState([]);
 const [form,setForm]=useState(emptyForm()),[editId,setEditId]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
 const req=async(p,o={})=>{const r=await fetch(API+p,{...o,headers:{Authorization:`Bearer ${getToken()}`,'Content-Type':'application/json',...(o.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d};
 const load=async()=>{try{setLoading(true);const [a,b,c]=await Promise.all([fetch(API+'/industries').then(r=>r.json()),fetch(API+'/cities').then(r=>r.json()),req('/leads/pricing/rules')]);setIndustries(Array.isArray(a)?a:[]);setCities(Array.isArray(b)?b:[]);setRules(Array.isArray(c)?c:[])}catch(e){setError(e.message)}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const setTier=(i,key,value)=>setForm(f=>({...f,pricing:{...f.pricing,shares:f.pricing.shares.map((x,n)=>n===i?{...x,[key]:value}:x)}}));
 const reset=()=>{setEditId(null);setForm(emptyForm());setError('');};
 const edit=r=>{setEditId(r.id);setForm({industryId:r.industry_id??'',cityId:r.city_id??'',leadType:r.lead_type||'basic',pricing:r.pricing||emptyPricing(),isActive:r.is_active});setOk('');window.scrollTo({top:0,behavior:'smooth'})};
 const save=async()=>{try{setSaving(true);setError('');setOk('');await req(editId?`/leads/pricing/rules/${editId}`:'/leads/pricing/rules',{method:editId?'PUT':'POST',body:JSON.stringify(form)});setOk(editId?'Pricing rule updated.':'Pricing rule created.');reset();await load()}catch(e){setError(e.message)}finally{setSaving(false)}};
 const del=async id=>{if(!confirm('Delete this pricing rule?'))return;try{await req(`/leads/pricing/rules/${id}`,{method:'DELETE'});await load()}catch(e){setError(e.message)}};
 const addTier=()=>setForm(f=>({...f,pricing:{...f.pricing,shares:[...f.pricing.shares,{shares:10,normal:0,pro:0}]}}));
 return <main className="pricing-page">
  <style>{`\n    .pricing-hero > div:first-child{flex:1;text-align:center}\n    .create-head,.rules-head{position:relative;justify-content:center;text-align:center;min-height:70px}\n    .create-head > div,.rules-head > div{max-width:700px;margin:0 auto}\n    .create-head .outline-btn,.rules-head .outline-btn{position:absolute;right:0;top:0}\n    @media(max-width:700px){\n      .create-head,.rules-head{min-height:0}\n      .create-head .outline-btn,.rules-head .outline-btn{position:static;width:100%;margin-top:10px}\n    }\n  `}</style>
  <section className="pricing-hero"><div><span className="hero-kicker">REVENUE CONTROL</span><h1>Lead Pricing</h1><p>Set market-specific prices for Basic and Premium leads.</p></div><div className="hero-mark">₹</div></section>
  {error&&<div className="pricing-alert error">{error}</div>}{ok&&<div className="pricing-alert success">{ok}</div>}
  <section className="pricing-panel create-panel">
   <div className="panel-head create-head"><div><span className="kicker">{editId?'EDIT PRICING RULE':'CREATE PRICING RULE'}</span><h2>{editId?'Update pricing rule':'Create pricing rule'}</h2><p>Choose the market first, then set separate prices for each lead type.</p></div>{editId&&<button className="outline-btn" onClick={reset}>Cancel</button>}</div>
   <div className="scope-grid">
    <label>Industry<select value={form.industryId} onChange={e=>setForm({...form,industryId:e.target.value})}><option value="">All industries</option>{industries.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <label>City<select value={form.cityId} onChange={e=>setForm({...form,cityId:e.target.value})}><option value="">All cities</option>{cities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <label className="active-box">Status<span><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/> Active</span></label>
   </div>
   <div className="lead-type-switch"><button className={form.leadType==='basic'?'selected basic':''} onClick={()=>setForm({...form,leadType:'basic'})}><strong>Basic</strong><small>Standard leads</small></button><button className={form.leadType==='premium'?'selected premium':''} onClick={()=>setForm({...form,leadType:'premium'})}><strong>Premium</strong><small>High-value leads</small></button></div>
   <div className="pricing-box"><div className="pricing-box-head"><div><h3>{form.leadType==='premium'?'Premium':'Basic'} pricing</h3><p>Configure any number of sharing levels.</p></div><button className="add-tier" onClick={addTier}>+ Add tier</button></div>
    <div className="tier-head"><span>SHARES</span><span>NORMAL</span><span>PRO</span><span></span></div>
    {form.pricing.shares.map((x,i)=><div className="tier-row" key={i}><div className="field"><span>Shares</span><input type="number" min="1" value={x.shares} onChange={e=>setTier(i,'shares',e.target.value)}/></div><div className="field money"><span>Normal</span><div>₹<input type="number" min="0" value={x.normal} onChange={e=>setTier(i,'normal',e.target.value)}/></div></div><div className="field money"><span>Pro</span><div>₹<input type="number" min="0" value={x.pro} onChange={e=>setTier(i,'pro',e.target.value)}/></div></div><button className="remove-tier" disabled={form.pricing.shares.length===1} onClick={()=>setForm(f=>({...f,pricing:{...f.pricing,shares:f.pricing.shares.filter((_,n)=>n!==i)}}))}>×</button></div>)}
   </div>
   <div className="panel-foot"><span>Sheet pricing can override this configured price when a lead is uploaded.</span><button className="primary-btn" disabled={saving} onClick={save}>{saving?'Saving…':editId?'Update rule':'Save rule'}</button></div>
  </section>
  <section className="pricing-panel rules-panel"><div className="panel-head compact rules-head"><div><span className="kicker">PRICING MATRIX</span><h2>Configured rules</h2><p>Each card represents one Industry + City + Lead Type combination.</p></div><button className="outline-btn" onClick={load}>Refresh</button></div>
   {loading?<div className="empty">Loading pricing rules…</div>:rules.length===0?<div className="empty">No pricing rules configured yet.</div>:<div className="rule-cards">{rules.map(r=><article className="rule-card" key={r.id}><div className="rule-top"><div><span className={`type-pill ${r.lead_type}`}>{r.lead_type==='premium'?'PREMIUM':'BASIC'}</span><h3>{r.industry_name||'All industries'}</h3><p>{r.city_name||'All cities'}</p></div><span className={r.is_active?'status active':'status'}>{r.is_active?'ACTIVE':'OFF'}</span></div><div className="rule-prices">{(r.pricing?.shares||[]).map(x=><div key={x.shares}><b>{x.shares}</b><span>Normal <strong>₹{x.normal}</strong></span><span>Pro <strong>₹{x.pro}</strong></span></div>)}</div><div className="card-actions"><button onClick={()=>edit(r)}>Edit</button><button onClick={()=>del(r.id)}>Delete</button></div></article>)}</div>}
  </section>
 </main>;
}
