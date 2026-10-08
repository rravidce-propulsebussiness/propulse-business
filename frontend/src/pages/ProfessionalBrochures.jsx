import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UserHeader from '../components/UserHeader'
import { authRequest } from '../utils/auth'
import './ProfessionalWorkspace.css'

function normalize(item){
  return {id:item.id,title:item.title||'',description:item.description||'',fileUrl:item.stored_url||'',displayUrl:item.file_url||'',isPublished:item.is_published!==false}
}
export default function ProfessionalBrochures(){
  const [docs,setDocs]=useState([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [uploading,setUploading]=useState(-1)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  useEffect(()=>{
    let live=true
    authRequest('/profile/brochures').then(r=>{if(live)setDocs((r.data||[]).map(normalize))})
      .catch(e=>{if(live)setError(e.message||'Unable to load your brochures')})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[])
  function change(index,key,value){setDocs(current=>current.map((doc,i)=>i===index?{...doc,[key]:value}:doc));setSuccess('')}
  async function upload(index,file){
    if(!file)return
    if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024){
      setError('Upload a PDF, JPG, PNG or WebP brochure, 15 MB or smaller.')
      return
    }
    setUploading(index);setError('');setSuccess('')
    try{
      const response=await authRequest('/profile/projects/plan',{method:'POST',headers:{'Content-Type':file.type},body:file,timeoutMs:90000})
      change(index,'fileUrl',response.url)
      setDocs(current=>current.map((doc,i)=>i===index?{...doc,fileUrl:response.url,displayUrl:response.displayUrl||response.url}:doc))
    }catch(e){setError(e.message||'Unable to upload brochure')}
    finally{setUploading(-1)}
  }
  async function save(event){
    event.preventDefault()
    if(busy)return
    setBusy(true);setError('');setSuccess('')
    try{
      const response=await authRequest('/profile/brochures',{method:'PUT',body:JSON.stringify({brochures:docs.map(doc=>({title:doc.title,description:doc.description,fileUrl:doc.fileUrl,isPublished:doc.isPublished}))})})
      setDocs((response.data||[]).map(normalize))
      setSuccess('Brochures saved. Published files will appear on your public professional page.')
    }catch(e){setError(e.message||'Unable to save brochures')}
    finally{setBusy(false)}
  }
  return <div className="pw-shell"><UserHeader/><main className="pw-main">
    <div className="pw-heading"><div><Link to="/professionals">← Professionals</Link><span>BUSINESS DOCUMENTS</span><h1>Company Brochures</h1><p>Upload your company catalogue, service guide, specifications or portfolio brochure for customers to review.</p></div><Link to="/profile">Edit Business Profile →</Link></div>
    {error&&<p className="pw-error" role="alert">{error}</p>}{success&&<p className="pw-success" role="status">{success}</p>}
    {loading?<div className="pw-card">Loading brochures…</div>:<form className="pw-brochure-list" onSubmit={save}>
      {docs.map((doc,index)=><div className="pw-card pw-brochure" key={doc.id||index}>
        <div className="pw-brochure-head"><strong>Brochure {index+1}</strong><button type="button" onClick={()=>{setDocs(current=>current.filter((_,i)=>i!==index));setSuccess('')}}>Remove</button></div>
        <label>Document title<input required maxLength={160} value={doc.title} onChange={e=>change(index,'title',e.target.value)} placeholder="Company profile / premium materials brochure"/></label>
        <label>Description (optional)<textarea rows={2} maxLength={500} value={doc.description} onChange={e=>change(index,'description',e.target.value)} placeholder="What customers can find in this brochure"/></label>
        <div className="pw-brochure-bottom"><label className="pw-file-label">{uploading===index?'Uploading…':doc.fileUrl?'Replace PDF / image':'Upload PDF / image'}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" disabled={uploading!==-1||busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';upload(index,file)}}/></label>{doc.displayUrl&&<a href={doc.displayUrl} target="_blank" rel="noreferrer">Preview file ↗</a>}<label className="pw-publish"><input type="checkbox" checked={doc.isPublished} onChange={e=>change(index,'isPublished',e.target.checked)}/> Publish publicly</label></div>
      </div>)}
      {docs.length===0&&<div className="pw-card pw-empty">No brochures yet. Add your first company brochure below.</div>}
      <div className="pw-actions"><button type="button" disabled={docs.length>=8||busy} className="pw-outline" onClick={()=>setDocs(current=>[...current,{title:'',description:'',fileUrl:'',displayUrl:'',isPublished:true}])}>+ Add Brochure</button><button type="submit" disabled={busy||uploading!==-1}>{busy?'Saving…':'Save Brochures'}</button></div>
      <p className="pw-fine">Maximum 8 brochures. Supported: PDF, JPG, PNG, WebP up to 15 MB each. Documents are stored in your existing secure project media storage.</p>
    </form>}
  </main></div>
}
