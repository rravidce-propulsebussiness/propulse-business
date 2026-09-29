import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../utils/api'
import './AdminHomepageMedia.css'

const slots=[
  {key:'hero',label:'Customer homepage hero',description:'Main Construction + Interiors planning visual shown in the redesigned hero.',defaultPath:'/homepage/default-hero.svg',wide:true},
  {key:'residential',label:'Construction service visual',description:'Main visual used across the public Construction journey.',defaultPath:'/homepage/default-residential.svg'},
  {key:'interior',label:'Interior service visual',description:'Main visual used across the public Interior journey and estimator entry point.',defaultPath:'/homepage/default-interior.svg'},
  {key:'turnkey',label:'Construction estimate visual',description:'Supporting visual used around the Construction estimate journey.',defaultPath:'/homepage/default-turnkey.svg'},
  {key:'showcase_construction_1',label:'Construction showcase 01',description:'Customer-facing project showcase visual for Construction.',defaultPath:'/homepage/default-residential.svg'},
  {key:'showcase_construction_2',label:'Construction showcase 02',description:'Second Construction project showcase visual.',defaultPath:'/homepage/default-turnkey.svg'},
  {key:'showcase_interior_1',label:'Interior showcase 01',description:'Customer-facing project showcase visual for Interiors.',defaultPath:'/homepage/default-interior.svg'},
  {key:'showcase_interior_2',label:'Interior showcase 02',description:'Second Interior project showcase visual.',defaultPath:'/homepage/default-interior.svg'}
]

const defaultContent={
  home:{
    heroKicker:'CONSTRUCTION · INTERIORS · PROJECT ESTIMATES',
    heroTitle:'Build and design your home with',
    heroAccent:'clarity before work begins.',
    heroText:'Explore Construction and Interiors, compare package specifications, get a practical project estimate and speak with our team through a free consultation.',
    servicesHeading:'Construction and Interiors under one roof.',
    servicesText:'Start with the service you need, understand the package and budget, then continue with our project team for planning and execution.',
    showcaseHeading:'See how Construction and Interiors come together.',
    showcaseText:'Explore how structure, services, storage, materials and finishes come together across Construction and complete-home Interiors.',
    estimatorHeading:'Get a useful estimate without a long questionnaire.',
    estimatorText:'Enter the main project details, choose a package and receive an indicative range. Material or finish refinements remain optional.',
    trustHeading:'Professional planning without making the first step complicated.',
    trustText:'You do not need a complete BOQ or technical specification sheet to begin. Start with what you know, then refine the project with our team.',
    consultationHeading:'Prefer to speak with a project expert?',
    consultationText:'Request a free Construction or Interior consultation. The form is short, and our team can continue with your basic project details already available.'
  },
  construction:{
    heroTitle:'Home construction, planned from foundation to finish.',
    heroText:'Compare construction packages, get a practical project estimate and continue with a free construction consultation when you are ready.',
    showcaseHeading:'Visualise the construction journey before you commit.',
    showcaseText:'Project visuals help connect the estimate with the structure, services and finishing decisions that follow.'
  },
  interiors:{
    heroTitle:'Complete home interiors, planned around your space and budget.',
    heroText:'Plan kitchens, wardrobes, finishes and full-home interiors with clear package choices, a practical estimate and a free design consultation.',
    showcaseHeading:'See how complete-home interiors can come together.',
    showcaseText:'Use the showcase as inspiration while the estimate and consultation keep your actual home scope practical.'
  }
}
const mergeContent=value=>({
  home:{...defaultContent.home,...(value?.home||{})},
  construction:{...defaultContent.construction,...(value?.construction||{})},
  interiors:{...defaultContent.interiors,...(value?.interiors||{})},
})
const initial={hero_image_url:'',category_images:{},content:mergeContent({})}

function urlFor(settings,slot){
  return slot.key==='hero'
    ? settings.hero_image_url || slot.defaultPath
    : settings.category_images?.[slot.key] || slot.defaultPath
}

export default function AdminHomepageMedia(){
  const [settings,setSettings]=useState(initial)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [contentSaving,setContentSaving]=useState(false)
  const [error,setError]=useState('')
  const [ok,setOk]=useState('')
  const refs=useRef({})

  async function load(){
    try{
      setLoading(true);setError('')
      const data=await apiRequest('/admin/homepage-media')
      setSettings({hero_image_url:data?.hero_image_url||'',category_images:data?.category_images||{},content:mergeContent(data?.content)})
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
      setSettings({hero_image_url:data?.hero_image_url||'',category_images:data?.category_images||{},content:mergeContent(data?.content)})
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
      setSettings({hero_image_url:data?.hero_image_url||'',category_images:data?.category_images||{},content:mergeContent(data?.content)})
      setOk(`${slot.label} reverted to the default image.`)
    }catch(e){setError(e.message||'Unable to remove image')}
    finally{setBusy('')}
  }

  function updateCopy(section,key,value){
    setSettings(current=>({...current,content:{...current.content,[section]:{...current.content[section],[key]:value}}}))
  }

  async function saveContent(){
    try{
      setContentSaving(true);setError('');setOk('')
      const data=await apiRequest('/admin/homepage-media/content',{method:'PATCH',body:JSON.stringify({content:settings.content})})
      setSettings({hero_image_url:data?.hero_image_url||'',category_images:data?.category_images||{},content:mergeContent(data?.content)})
      setOk('Public website copy updated successfully.')
    }catch(e){setError(e.message||'Unable to save public website copy')}
    finally{setContentSaving(false)}
  }

  if(loading)return <main className="admin-home-media-page"><div className="admin-home-media-loading"><div className="admin-home-media-spinner"/>Loading homepage media…</div></main>

  const customCount=(settings.hero_image_url?1:0)+slots.filter(slot=>slot.key!=='hero'&&settings.category_images?.[slot.key]).length
  const defaultCount=slots.length-customCount

  return <main className="admin-home-media-page">
    <section className="admin-home-media-hero">
      <div className="admin-home-media-hero-copy"><span>CONTENT / WEBSITE</span><h1>Website content &amp; media</h1><p>Manage customer-facing Construction / Interior copy, hero visuals, service images and project showcases without changing application code.</p><div className="admin-home-media-hero-meta"><span><b>{slots.length}</b> media slots</span><span><b>{customCount}</b> custom images</span><span><b>{defaultCount}</b> defaults active</span></div></div>
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

    <section className="admin-home-copy">
      <div className="admin-home-copy-head"><div><span className="admin-home-media-kicker">WEBSITE COPY</span><h2>Public Construction &amp; Interior content</h2><p>Edit the main customer-facing headings and descriptions without changing frontend code. Package, price and estimator text still comes from the estimator configuration.</p></div><button type="button" onClick={saveContent} disabled={contentSaving}>{contentSaving?'Saving…':'Save website copy'}</button></div>
      <div className="admin-home-copy-grid">
        <article className="wide"><h3>Homepage hero</h3><div className="admin-home-copy-fields"><label>Eyebrow<input value={settings.content.home.heroKicker} onChange={e=>updateCopy('home','heroKicker',e.target.value)}/></label><label>Headline<input value={settings.content.home.heroTitle} onChange={e=>updateCopy('home','heroTitle',e.target.value)}/></label><label>Highlighted words<input value={settings.content.home.heroAccent} onChange={e=>updateCopy('home','heroAccent',e.target.value)}/></label><label className="wide">Intro<textarea rows="3" value={settings.content.home.heroText} onChange={e=>updateCopy('home','heroText',e.target.value)}/></label></div></article>
        <article><h3>Homepage sections</h3><div className="admin-home-copy-fields"><label>Services heading<input value={settings.content.home.servicesHeading} onChange={e=>updateCopy('home','servicesHeading',e.target.value)}/></label><label>Services description<textarea rows="3" value={settings.content.home.servicesText} onChange={e=>updateCopy('home','servicesText',e.target.value)}/></label><label>Showcase heading<input value={settings.content.home.showcaseHeading} onChange={e=>updateCopy('home','showcaseHeading',e.target.value)}/></label><label>Showcase description<textarea rows="3" value={settings.content.home.showcaseText} onChange={e=>updateCopy('home','showcaseText',e.target.value)}/></label><label>Estimator heading<input value={settings.content.home.estimatorHeading} onChange={e=>updateCopy('home','estimatorHeading',e.target.value)}/></label><label>Estimator description<textarea rows="3" value={settings.content.home.estimatorText} onChange={e=>updateCopy('home','estimatorText',e.target.value)}/></label></div></article>
        <article><h3>Trust &amp; consultation</h3><div className="admin-home-copy-fields"><label>Trust heading<input value={settings.content.home.trustHeading} onChange={e=>updateCopy('home','trustHeading',e.target.value)}/></label><label>Trust description<textarea rows="3" value={settings.content.home.trustText} onChange={e=>updateCopy('home','trustText',e.target.value)}/></label><label>Consultation heading<input value={settings.content.home.consultationHeading} onChange={e=>updateCopy('home','consultationHeading',e.target.value)}/></label><label>Consultation description<textarea rows="3" value={settings.content.home.consultationText} onChange={e=>updateCopy('home','consultationText',e.target.value)}/></label></div></article>
        {['construction','interiors'].map(section=><article key={section}><h3>{section==='construction'?'Construction page':'Interior page'}</h3><div className="admin-home-copy-fields"><label>Hero heading<input value={settings.content[section].heroTitle} onChange={e=>updateCopy(section,'heroTitle',e.target.value)}/></label><label>Hero description<textarea rows="3" value={settings.content[section].heroText} onChange={e=>updateCopy(section,'heroText',e.target.value)}/></label><label>Showcase heading<input value={settings.content[section].showcaseHeading} onChange={e=>updateCopy(section,'showcaseHeading',e.target.value)}/></label><label>Showcase description<textarea rows="3" value={settings.content[section].showcaseText} onChange={e=>updateCopy(section,'showcaseText',e.target.value)}/></label></div></article>)}
      </div>
    </section>

    <div className="admin-home-media-footer">
      <span><b>Recommended:</b> Use real project photography where available. WebP or optimized JPG/PNG, up to 7 MB.</span>
      <span>Hero, service and showcase changes become available to the public website after upload completes.</span>
    </div>
  </main>
}
