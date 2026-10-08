import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UserHeader from '../components/UserHeader'
import { authRequest } from '../utils/auth'
import './ProfessionalWorkspace.css'

const draftKey=()=>Math.random().toString(36).slice(2)+Date.now().toString(36)
const emptyBrochure=()=>({_draftKey:draftKey(),title:'',description:'',fileUrl:'',displayUrl:'',isPublished:true})
function normalize(item){
  return {id:item.id,title:item.title||'',description:item.description||'',fileUrl:item.stored_url||'',displayUrl:item.file_url||'',isPublished:item.is_published!==false}
}
const editorKey=item=>item.id?'brochure-'+item.id:'draft-'+item._draftKey

export default function ProfessionalBrochures({embedded=false}){
  const [docs,setDocs]=useState([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [uploading,setUploading]=useState(-1)
  const [expanded,setExpanded]=useState(null)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')

  useEffect(()=>{
    let live=true
    authRequest('/profile/brochures').then(r=>{if(live)setDocs((r.data||[]).map(normalize))})
      .catch(e=>{if(live)setError(e.message||'Unable to load your brochures')})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[])

  function change(index,key,value){
    setDocs(current=>current.map((doc,i)=>i===index?{...doc,[key]:value}:doc))
    setSuccess('')
  }
  function addBrochure(){
    const doc=emptyBrochure()
    setDocs(current=>[...current,doc])
    setExpanded(editorKey(doc))
    setSuccess('')
  }
  async function upload(index,file){
    if(!file)return
    if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024){
      setError('Upload a PDF, JPG, PNG or WebP brochure, 15 MB or smaller.')
      return
    }
    setUploading(index);setError('');setSuccess('')
    try{
      const response=await authRequest('/profile/projects/plan',{
        method:'POST',headers:{'Content-Type':file.type},body:file,timeoutMs:90000,
      })
      setDocs(current=>current.map((doc,i)=>i===index?{...doc,fileUrl:response.url,displayUrl:response.displayUrl||response.url}:doc))
    }catch(e){setError(e.message||'Unable to upload brochure')}
    finally{setUploading(-1)}
  }
  async function save(event){
    event.preventDefault()
    if(busy||uploading!==-1)return
    if(docs.some(doc=>!doc.title.trim()||!doc.fileUrl)){
      setError('Every company brochure must have a title and uploaded file before saving.')
      return
    }
    setBusy(true);setError('');setSuccess('')
    try{
      const response=await authRequest('/profile/brochures',{
        method:'PUT',
        body:JSON.stringify({brochures:docs.map(doc=>({
          title:doc.title,description:doc.description,fileUrl:doc.fileUrl,isPublished:doc.isPublished,
        }))}),
      })
      setDocs((response.data||[]).map(normalize))
      setExpanded(null)
      setSuccess('Company brochures saved. Published files will appear on your public professional page.')
    }catch(e){setError(e.message||'Unable to save brochures')}
    finally{setBusy(false)}
  }

  const content=<>
    <div className="pw-heading profile-company-heading">
      <div>
        {!embedded&&<Link to="/profile?tab=brochures">← Business Profile</Link>}
        <span>PROFESSIONAL PORTFOLIO</span>
        <h1>Company Brochures</h1>
        <p>Publish your company profile, material catalogues and service guides. Project and package specifications remain attached to their own records.</p>
      </div>
      <button type="button" className="profile-entry-add" onClick={addBrochure} disabled={docs.length>=8||busy||loading}>+ Add Brochure</button>
    </div>
    {error&&<p className="pw-error" role="alert">{error}</p>}
    {success&&<p className="pw-success" role="status">{success}</p>}
    {loading?<div className="pw-card">Loading company brochures…</div>:
    <form className="pw-brochure-list" onSubmit={save}>
      {docs.map((doc,index)=>{
        const isExpanded=expanded===editorKey(doc)
        return <article className={'pw-card pw-brochure profile-entry-card'+(isExpanded?' is-expanded':'')} key={editorKey(doc)}>
          <div className="pw-brochure-head profile-entry-head">
            <div className="profile-entry-overview">
              <div className="profile-entry-thumbnail profile-entry-plan-icon" aria-hidden="true">▤</div>
              <div className="profile-entry-summary">
                <span>COMPANY DOCUMENT {String(index+1).padStart(2,'0')}</span>
                <h3>{doc.title||'New company brochure'}</h3>
                <p>{doc.fileUrl?'File attached':'Upload a PDF or image'}{doc.description?' · '+doc.description:''}</p>
              </div>
            </div>
            <div className="profile-entry-actions">
              <span className={'profile-entry-status '+(doc.isPublished?'published':'draft')}>{doc.isPublished?'Public':'Private draft'}</span>
              <button type="button" className="profile-entry-edit" aria-expanded={isExpanded} aria-controls={'company-brochure-editor-'+index} onClick={()=>setExpanded(isExpanded?null:editorKey(doc))}>{isExpanded?'Close editor':'Edit brochure'} <span aria-hidden="true">{isExpanded?'−':'＋'}</span></button>
            </div>
          </div>
          {isExpanded&&<div className="profile-entry-body pw-brochure-fields" id={'company-brochure-editor-'+index}>
            <div className="profile-entry-controls">
              <label className="pw-publish"><input type="checkbox" checked={doc.isPublished} onChange={e=>change(index,'isPublished',e.target.checked)}/> Publish publicly</label>
              <button type="button" className="row-remove" onClick={()=>{setDocs(current=>current.filter((_,i)=>i!==index));setExpanded(null);setSuccess('')}}>Remove brochure</button>
            </div>
            <label>Document title<input required maxLength={160} value={doc.title} onChange={e=>change(index,'title',e.target.value)} placeholder="Company profile / premium materials brochure"/></label>
            <label>Description (optional)<textarea rows={2} maxLength={500} value={doc.description} onChange={e=>change(index,'description',e.target.value)} placeholder="What customers can learn about your company"/></label>
            <div className="pw-brochure-bottom">
              <label className="pw-file-label">{uploading===index?'Uploading…':doc.fileUrl?'Replace PDF / image':'Upload PDF / image'}
                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" disabled={uploading!==-1||busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';upload(index,file)}}/>
              </label>
              {doc.displayUrl&&<a href={doc.displayUrl} target="_blank" rel="noopener noreferrer">Preview document ↗</a>}
              {doc.fileUrl&&<span className="profile-entry-uploaded">File uploaded</span>}
            </div>
          </div>}
        </article>
      })}
      {docs.length===0&&<div className="pw-card pw-empty profile-entry-empty">
        <strong>No company brochures yet</strong>
        <p>Add your company catalogue or services brochure to help customers understand your business.</p>
        <button type="button" className="profile-entry-add" onClick={addBrochure}>+ Add First Brochure</button>
      </div>}
      <div className="profile-save pw-profile-save"><span>Maximum 8 brochures · PDF/JPG/PNG/WebP · 15 MB each</span><button type="submit" disabled={busy||uploading!==-1}>{busy?'Saving…':'Save Brochures'} <span aria-hidden="true">→</span></button></div>
    </form>}
  </>
  return embedded
    ? <section className="profile-panel profile-company-brochures">{content}</section>
    : <div className="pw-shell"><UserHeader/><main className="pw-main profile-company-standalone">{content}</main></div>
}
