import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../utils/api'
import './AdminHomepageMedia.css'

const slots=[
  {key:'hero',label:'Hero image',description:'Main homepage hero visual.',defaultPath:'/homepage/default-hero.svg',wide:true},
  {key:'residential',label:'Residential leads',description:'Residential category card image.',defaultPath:'/homepage/default-residential.svg'},
  {key:'interior',label:'Interior leads',description:'Interior category card image.',defaultPath:'/homepage/default-interior.svg'},
  {key:'commercial',label:'Commercial leads',description:'Commercial category card image.',defaultPath:'/homepage/default-commercial.svg'},
  {key:'turnkey',label:'Turnkey projects',description:'Turnkey category card image.',defaultPath:'/homepage/default-turnkey.svg'},
  {key:'plot_land',label:'Plot & land leads',description:'Plot and land category card image.',defaultPath:'/homepage/default-plot-land.svg'}
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
  useEffect(()=>{load()},[])

  async function upload(slot,file){
    if(!file)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
      setError('Only JPG, PNG and WebP images are supported.')
      return
    }
    if(file.size>8*1024*1024){
      setError('Each image must be 8 MB or smaller.')
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

  if(loading)return <main className="admin-home-media-page"><div className="admin-home-media-loading">Loading homepage media…</div></main>

  return <main className="admin-home-media-page">
    <section className="admin-home-media-hero">
      <div><span>HOMEPAGE CONTENT</span><h1>Homepage Images</h1><p>Replace the lead-sales homepage visuals without changing code. Uploaded images are stored as files on the backend server.</p></div>
      <div className="admin-home-media-mark">P</div>
    </section>
    {error&&<div className="admin-home-media-alert error">{error}</div>}
    {ok&&<div className="admin-home-media-alert success">{ok}</div>}

    <section className="admin-home-media-note">
      <strong>Production media storage</strong>
      <span>Images are saved under <code>backend/uploads/homepage</code>. The database stores only the file URL. Keep this folder on persistent VPS storage and include it in your backup plan.</span>
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
      <a href="/" target="_blank" rel="noreferrer">Open homepage ↗</a>
      <span>Recommended: WebP or optimized JPG/PNG, up to 8 MB.</span>
    </div>
  </main>
}
