import {useEffect,useState} from 'react'
import {apiRequest} from '../../utils/api'
import './AdminProfessionalOffers.css'

const audienceOptions=[
  ['all','All professionals'],['new_registration','New registrations only'],
  ['verified','Verified businesses'],['unverified','Non-verified businesses'],
  ['non_member','Non-members'],['grow','GROW members'],['scale','SCALE members']
]
const blank=()=>({
  title:'',description:'',eyebrow:'SPECIAL OFFER',cta_label:'Explore offer',
  cta_path:'/membership',image_url:'',audience:'all',registration_window_days:0,
  display_mode:'both',popup_frequency:'once',starts_at:'',expires_at:'',
  priority:100,is_active:false
})
const pad=v=>String(v).padStart(2,'0')
function toLocal(value){
  if(!value)return ''
  const d=new Date(value)
  if(Number.isNaN(d.getTime()))return ''
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const toUtc=value=>value?new Date(value).toISOString():null

export default function AdminProfessionalOffers(){
  const [items,setItems]=useState([])
  const [form,setForm]=useState(blank)
  const [editId,setEditId]=useState(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const update=(key,value)=>setForm(previous=>({...previous,[key]:value}))
  async function load(){
    try{
      setLoading(true)
      const response=await apiRequest('/professional-offers/admin/manage')
      setItems(Array.isArray(response?.offers)?response.offers:[])
    }catch(e){setError(e.message||'Unable to load offers')}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[])
  function edit(item){
    setEditId(item.id)
    setForm({...blank(),...item,starts_at:toLocal(item.starts_at),expires_at:toLocal(item.expires_at)})
    setError('');setMessage('')
    window.scrollTo({top:0,behavior:'smooth'})
  }
  function reset(){setEditId(null);setForm(blank());setError('')}
  async function save(event){
    event.preventDefault()
    setError('');setMessage('');setSaving(true)
    try{
      const payload={...form,registration_window_days:Number(form.registration_window_days)||0,
        priority:Number(form.priority)||0,starts_at:toUtc(form.starts_at),expires_at:toUtc(form.expires_at)}
      await apiRequest('/professional-offers/admin/manage'+(editId?'/'+editId:''),{
        method:editId?'PUT':'POST',body:JSON.stringify(payload)
      })
      setMessage(editId?'Offer updated.':'Offer created. Enable it when ready to publish.')
      reset()
      await load()
    }catch(e){setError(e.message||'Unable to save offer')}
    finally{setSaving(false)}
  }
  async function toggle(item){
    setError('');setMessage('')
    try{
      const payload={...item,is_active:!item.is_active}
      await apiRequest('/professional-offers/admin/manage/'+item.id,{method:'PUT',body:JSON.stringify(payload)})
      setMessage(item.is_active?'Offer paused.':'Offer published.')
      await load()
    }catch(e){setError(e.message||'Unable to change offer status')}
  }
  async function remove(item){
    if(!window.confirm('Delete this offer and its impression history?'))return
    setError('');setMessage('')
    try{
      await apiRequest('/professional-offers/admin/manage/'+item.id,{method:'DELETE'})
      if(editId===item.id)reset()
      setMessage('Offer deleted.')
      await load()
    }catch(e){setError(e.message||'Unable to delete offer')}
  }
  return <main className="pro-offer-admin">
    <header className="pro-offer-admin-hero">
      <div><span>MARKETING / PROFESSIONAL EXPERIENCE</span><h1>Offers & announcements</h1>
        <p>Create elegant welcome offers, dashboard banners and targeted promotions, without interrupting loading or payments.</p>
      </div>
      <div className="pro-offer-hero-stats"><div><strong>{items.length}</strong><small>Campaigns</small></div>
        <div><strong>{items.filter(x=>x.is_active).length}</strong><small>Enabled</small></div>
      </div>
    </header>
    {error&&<p className="pro-offer-alert error" role="alert">{error}</p>}
    {message&&<p className="pro-offer-alert success" role="status">{message}</p>}
    <section className="pro-offer-admin-section">
      <div className="pro-offer-section-heading"><div><small>CAMPAIGN EDITOR</small>
        <h2>{editId?'Edit professional offer':'Create an offer'}</h2>
        <p>Use an existing ProPulse page as the call to action. Creating an offer never automatically grants a lead or applies a coupon.</p></div>
        {editId&&<button type="button" className="pro-offer-secondary" onClick={reset}>New campaign</button>}
      </div>
      <form onSubmit={save}>
        <div className="pro-offer-form-grid">
          <label className="pro-offer-wide">Offer headline<input required maxLength={120} placeholder="Two free leads for your first completed project"
            value={form.title} onChange={e=>update('title',e.target.value)}/></label>
          <label>Short tag<input maxLength={60} value={form.eyebrow} onChange={e=>update('eyebrow',e.target.value)}/></label>
          <label>Audience<select value={form.audience} onChange={e=>update('audience',e.target.value)}>
            {audienceOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="pro-offer-wide">Description<textarea maxLength={600} rows={3}
            value={form.description} onChange={e=>update('description',e.target.value)}
            placeholder="Explain the benefit and qualifying steps clearly."/></label>
          <label>CTA label<input maxLength={48} value={form.cta_label} onChange={e=>update('cta_label',e.target.value)}/></label>
          <label>CTA destination<input required maxLength={350} value={form.cta_path}
            onChange={e=>update('cta_path',e.target.value)} placeholder="/profile or /membership"/></label>
          <label className="pro-offer-wide">Optional image URL<input value={form.image_url||''}
            onChange={e=>update('image_url',e.target.value)}
            placeholder="/brand/offer.png or a Cloudflare R2 image"/>
            <small>Use an existing site image, Unsplash or Cloudflare R2; no uploaded images are needed.</small></label>
          <label>Display position<select value={form.display_mode} onChange={e=>update('display_mode',e.target.value)}>
            <option value="both">Login popup + dashboard banner</option>
            <option value="popup">Popup only (also available in Offers)</option>
            <option value="banner">Dashboard banner only</option>
          </select></label>
          <label>Popup frequency<select value={form.popup_frequency} onChange={e=>update('popup_frequency',e.target.value)}>
            <option value="once">Once per professional / campaign</option>
            <option value="daily">At most once per day</option>
          </select></label>
          <label>Account age limit (days)<input type="number" min="0" max="365"
            value={form.registration_window_days} onChange={e=>update('registration_window_days',e.target.value)}/>
            <small>0 = no account-age limit. For new registrations, signup must also be after campaign creation.</small></label>
          <label>Priority<input type="number" min="0" max="10000" value={form.priority}
            onChange={e=>update('priority',e.target.value)}/></label>
          <label>Start date / time<input type="datetime-local" value={form.starts_at}
            onChange={e=>update('starts_at',e.target.value)}/></label>
          <label>Expiry date / time<input type="datetime-local" value={form.expires_at}
            onChange={e=>update('expires_at',e.target.value)}/></label>
          <label className="pro-offer-checkbox"><input type="checkbox" checked={Boolean(form.is_active)}
            onChange={e=>update('is_active',e.target.checked)}/><span>Published / enabled</span></label>
        </div>
        <div className="pro-offer-form-footer"><span>Professionals can dismiss popups instantly and reopen offers later.</span>
          <button type="submit" disabled={saving}>{saving?'Saving…':editId?'Save changes':'Create campaign'}</button>
        </div>
      </form>
    </section>
    <section className="pro-offer-admin-section">
      <div className="pro-offer-section-heading"><div><small>CAMPAIGNS & RESULTS</small>
        <h2>Published and draft offers</h2><p>View reach, clicks, schedules and targeting without separate tracking software.</p></div>
        <button type="button" className="pro-offer-secondary" onClick={load} disabled={loading}>Refresh</button>
      </div>
      {loading?<p className="pro-offer-empty">Loading campaigns…</p>:
        items.length===0?<p className="pro-offer-empty">No campaigns yet. Create a welcome offer above, then enable it to start showing.</p>:
        <div className="pro-offer-card-grid">{items.map(item=><article className="pro-offer-admin-card" key={item.id}>
          <div className="pro-offer-admin-card-top"><span className={item.is_active?'on':'off'}>{item.is_active?'Enabled':'Draft / paused'}</span>
            <small>Priority {item.priority}</small></div>
          <h3>{item.title}</h3><p>{item.description}</p>
          <div className="pro-offer-admin-tags"><span>{audienceOptions.find(([value])=>value===item.audience)?.[1]}</span>
            <span>{item.display_mode}</span><span>{item.popup_frequency}</span></div>
          <div className="pro-offer-metrics"><div><strong>{item.viewers||0}</strong><small>Viewed</small></div>
            <div><strong>{item.clicks||0}</strong><small>Clicks</small></div>
            <div><strong>{item.dismissals||0}</strong><small>Dismissals</small></div></div>
          <small className="pro-offer-dates">{item.expires_at?'Ends '+new Date(item.expires_at).toLocaleDateString('en-IN'):'No end date'}</small>
          <div className="pro-offer-admin-actions"><button type="button" onClick={()=>edit(item)}>Edit</button>
            <button type="button" onClick={()=>toggle(item)}>{item.is_active?'Pause':'Enable'}</button>
            <button type="button" className="danger" onClick={()=>remove(item)}>Delete</button></div>
        </article>)}</div>}
    </section>
  </main>
}
