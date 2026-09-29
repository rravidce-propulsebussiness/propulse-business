import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../utils/api'
import './AdminHomepageMedia.css'

const slots=[
  {key:'hero',label:'Customer homepage hero',description:'Main homeowner hero visual shown behind “Your Dream Home Starts Here”.',defaultPath:'/homepage/default-hero.svg',wide:true},
  {key:'residential',label:'Construction service card',description:'Visual used for the Home Construction card on the customer homepage.',defaultPath:'/homepage/default-residential.svg'},
  {key:'interior',label:'Interior service card',description:'Visual used for the Interior Design card on the customer homepage.',defaultPath:'/homepage/default-interior.svg'},
  {key:'commercial',label:'Real Estate service card',description:'Visual used for the Real Estate card on the customer homepage.',defaultPath:'/homepage/default-commercial.svg'},
  {key:'why_homeowners',label:'Why Homeowners background',description:'Background visual for the homeowner trust section.',defaultPath:'/homepage/default-interior.svg',wide:true},
  {key:'final_cta',label:'Final consultation banner',description:'Closing visual behind the “Ready to Plan Your Home?” call to action.',defaultPath:'/homepage/default-residential.svg',wide:true},
  {key:'turnkey',label:'Construction estimator card',description:'Visual used for the Construction Cost Estimator entry point.',defaultPath:'/homepage/default-turnkey.svg'},
  {key:'plot_land',label:'Property / plot fallback',description:'Fallback visual available for real-estate and plot-focused customer journeys.',defaultPath:'/homepage/default-plot-land.svg'}
]

const initial={hero_image_url:'',category_images:{}}

function urlFor(settings,slot){
  return slot.key==='hero'
    ? settings.hero_image_url || slot.defaultPath
    : settings.category_images?.[slot.key] || slot.defaultPath
}

export default function AdminHomepageMedia(){
  const [settings,setSettings]=useState(initial)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [ok,setOk]=useState('')
  const refs=useRef({})

  async function load(){
    try{
      setLoading(true);setError('')
      const data=await apiRequest('/admin/homepage-media')
      setSettings({hero_image_url:data?.hero_image_url||'',category_images:data?.category_images||{}})
    }catch(e){setError(e.message||'Unable to load homepage media')}
    finally{setLoading(false)}
  }
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[])

  async function upload(slot,file){
    if(!file)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
      setError('Only JPG, PNG and WebP images are supported.')
      return
    }
    if(file.size>7*1024*1024){
      setError('Each image must be 7 MB or smaller.')
      return
    }
    try{
      setBusy(slot.key);setError('');setOk('')
      const dataUrl=await new Promise((resolve,reject)=>{
        const reader=new FileReader()
        reader.onload=()=>resolve(String(reader.result))
        reader.onerror=()=>reject(new Error('Unable to read the image'))
        reader.readAsDataURL(file)
      })
      const data=await apiRequest('/admin/homepage-media',{
        method:'POST',
        body:JSON.stringify({slot:slot.key,dataUrl})
      })
      setSettings({hero_image_url:data?.hero_image_url||'',category_images:data?.category_images||{}})
      setOk(`${slot.label} updated successfully.`)
    }catch(e){setError(e.message||'Unable to upload image')}
    finally{
      setBusy('')
      const input=refs.current[slot.key]
      if(input) input.value=''
    }
  }

  async function remove(slot){
    if(!window.confirm(`Remove the custom image for ${slot.label}? The built-in default will be shown instead.`))return
    try{
      setBusy(slot.key);setError('');setOk('')
      const data=await apiRequest('/admin/homepage-media/'+encodeURIComponent(slot.key),{method:'DELETE'})
      setSettings({hero_image_url:data?.hero_image_url||'',category_images:data?.category_images||{}})
      setOk(`${slot.label} reverted to the default image.`)
    }catch(e){setError(e.message||'Unable to remove image')}
    finally{setBusy('')}
  }

  if(loading)return <main className="admin-home-media-page"><div className="admin-home-media-loading"><div className="admin-home-media-spinner"/>Loading homepage media…</div></main>

  const customCount=(settings.hero_image_url?1:0)+slots.filter(slot=>slot.key!=='hero'&&settings.category_images?.[slot.key]).length
  const defaultCount=slots.length-customCount

  return <main className="admin-home-media-page">
    <section className="admin-home-media-hero">
      <div className="admin-home-media-hero-copy"><span>CONTENT / HOMEPAGE MEDIA</span><h1>Homepage media</h1><p>Manage the customer-first homepage hero and project journey visuals without changing application code.</p><div className="admin-home-media-hero-meta"><span><b>{slots.length}</b> media slots</span><span><b>{customCount}</b> custom images</span><span><b>{defaultCount}</b> defaults active</span></div></div>
      <div className="admin-home-media-hero-actions"><a href="/" target="_blank" rel="noreferrer"><span>↗</span><div><b>Open homepage</b><small>Preview redesigned homepage</small></div></a><button type="button" onClick={load}><span>↻</span><div><b>Refresh media</b><small>Reload saved settings</small></div></button></div>
    </section>
    {error&&<div className="admin-home-media-alert error">{error}</div>}
    {ok&&<div className="admin-home-media-alert success">{ok}</div>}

    <section className="admin-home-media-note">
      <div className="admin-home-media-note-icon">i</div><div><strong>Production media storage</strong><span>Uploads are stored under <code>backend/uploads/homepage</code> while the database keeps the file URL. Keep this folder on persistent storage and include it in backups.</span></div>
    </section>

    <section className="admin-home-media-grid">
      {slots.map(slot=>{
        const source=urlFor(settings,slot)
        const custom=slot.key==='hero'?Boolean(settings.hero_image_url):Boolean(settings.category_images?.[slot.key])
        return <article className={`admin-home-media-card ${slot.wide?'wide':''}`} key={slot.key}>
          <div className="admin-home-media-preview"><img src={source} alt={slot.label}/><span className={custom?'custom':'default'}>{custom?'Custom':'Default'}</span></div>
          <div className="admin-home-media-copy"><span className="admin-home-media-kicker">{slot.key.replace('_',' ').toUpperCase()}</span><h2>{slot.label}</h2><p>{slot.description}</p><small>{custom?'File-backed custom image':'Built-in file default'}</small></div>
          <div className="admin-home-media-actions">
            <input ref={el=>{refs.current[slot.key]=el}} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>upload(slot,e.target.files?.[0])}/>
            <button type="button" className="upload" disabled={busy===slot.key} onClick={()=>refs.current[slot.key]?.click()}>{busy===slot.key?'Saving…':'Replace image'}</button>
            {custom&&<button type="button" className="remove" disabled={busy===slot.key} onClick={()=>remove(slot)}>Use default</button>}
          </div>
        </article>
      })}
    </section>

    <div className="admin-home-media-footer">
      <span><b>Recommended:</b> WebP or optimized JPG/PNG, up to 7 MB.</span>
      <span>Changes become available to the homepage after the upload completes.</span>
    </div>
  </main>
}
