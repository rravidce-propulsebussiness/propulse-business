import { useEffect,useMemo,useState } from 'react'
import { apiRequest } from '../../utils/api'
import { HYDERABAD_SEO_ROUTES } from '../../seo/hyderabadSeo'
import { REGIONAL_SEO_ROUTES } from '../../seo/regionalSeo'
import { INTERIOR_SEO_ROUTES } from '../../seo/interiorSeo'
import './AdminLandingPages.css'

const pages=[...HYDERABAD_SEO_ROUTES,...REGIONAL_SEO_ROUTES,...INTERIOR_SEO_ROUTES]
const empty={seo_title:'',meta_description:'',hero_title:'',hero_summary:''}
const fields=[
  ['seo_title','SEO title','Search result title'],
  ['meta_description','Meta description','Search preview summary'],
  ['hero_title','Hero heading','Main page heading'],
  ['hero_summary','Hero summary','Introductory page copy'],
]
const keyFor=path=>path

export default function AdminLandingPages(){
 const [query,setQuery]=useState('')
 const [selectedPath,setSelectedPath]=useState(pages[0]?.path||'')
 const [saved,setSaved]=useState({})
 const [form,setForm]=useState(empty)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const matches=useMemo(()=>pages.filter(page=>[page.path,page.title,page.heading,page.description].join(' ').toLowerCase().includes(query.toLowerCase())),[query])
 const page=pages.find(item=>item.path===selectedPath)
 const override=saved[keyFor(selectedPath)]||{}

 useEffect(()=>{let active=true;apiRequest('/admin/landing-pages').then(rows=>{if(active){const map={};(rows||[]).forEach(row=>{map[row.page_path]=row});setSaved(map)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[])
 useEffect(()=>{const current=pages.find(item=>item.path===selectedPath);const row=saved[keyFor(selectedPath)]||{};setForm({seo_title:row.seo_title??current?.title??'',meta_description:row.meta_description??current?.description??'',hero_title:row.hero_title??current?.heading??current?.title??'',hero_summary:row.hero_summary??current?.summary??current?.description??''});setMessage('');setError('')},[selectedPath,saved])
 async function save(event){event.preventDefault();if(!page)return;try{setBusy(true);setError('');setMessage('');const row=await apiRequest('/admin/landing-pages',{method:'PUT',body:JSON.stringify({pagePath:selectedPath,...form})});setSaved(current=>({...current,[selectedPath]:row}));setMessage('Landing page changes saved and are live.')}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function reset(){if(!page)return;try{setBusy(true);setError('');setMessage('');await apiRequest('/admin/landing-pages?path='+encodeURIComponent(selectedPath),{method:'DELETE'});setSaved(current=>{const next={...current};delete next[selectedPath];return next});setMessage('Default page content restored.')}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <main className="landing-admin">
  <header className="landing-hero"><div><span>WEBSITE &amp; CONTENT</span><h1>Landing Pages</h1><p>Manage the search and hero copy for public service and location pages.</p></div><div className="landing-count"><strong>{pages.length}</strong><span>editable pages</span></div></header>
  {error&&<div className="landing-notice error">{error}</div>}{message&&<div className="landing-notice success">{message}</div>}
  <div className="landing-workspace">
   <aside className="landing-browser"><div className="landing-browser-head"><div><span>PAGE LIBRARY</span><h2>Public landing pages</h2></div><b>{matches.length}</b></div><input className="landing-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search page title, service or location…"/>
    <div className="landing-list">{matches.map(item=><button type="button" key={item.path} className={item.path===selectedPath?'selected':''} onClick={()=>setSelectedPath(item.path)}><strong>{item.heading||item.title||item.path}</strong><small>{item.path}</small><span>{item.title}</span></button>)}</div>
   </aside>
   <section className="landing-editor"><div className="landing-editor-head"><div><span>PAGE CONTENT</span><h2>{page?.heading||page?.title||'Select a page'}</h2><a href={selectedPath} target="_blank" rel="noreferrer">Open live page ↗</a></div>{override.updated_at&&<small>Edited {new Date(override.updated_at).toLocaleDateString()}</small>}</div>
    {page&&<form onSubmit={save}><div className="landing-fields">{fields.map(([name,label,help])=><label key={name}><span>{label}</span><small>{help}</small>{name.includes('description')||name.includes('summary')?<textarea maxLength={name==='meta_description'?500:600} rows={name==='hero_summary'?4:3} value={form[name]} onChange={e=>setForm(current=>({...current,[name]:e.target.value}))}/>:<input maxLength={name==='seo_title'?160:240} value={form[name]} onChange={e=>setForm(current=>({...current,[name]:e.target.value}))}/>}<em>{form[name]?.length||0} characters</em></label>)}</div>
     <div className="landing-preview"><span>SEARCH PREVIEW</span><strong>{form.seo_title||page.title}</strong><code>propulsetechnologies.online{selectedPath}</code><p>{form.meta_description||page.description}</p></div>
     <footer><button type="button" className="reset" disabled={busy||!override.updated_at} onClick={reset}>Restore defaults</button><button className="save" disabled={busy}>{busy?'Saving…':'Save page changes'}</button></footer>
    </form>}
   </section>
  </div>
 </main>
}
