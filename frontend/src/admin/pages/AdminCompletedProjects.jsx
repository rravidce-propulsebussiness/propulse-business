import { useEffect, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminCompletedProjects.css'

const blank = () => ({
  title:'', projectType:'Construction', locationText:'', completionYear:String(new Date().getFullYear()),
  areaText:'', budgetText:'', description:'', packageName:'',
  coverImageUrl:'', imageUrls:'', videoUrl:'', planUrl:'',
  businessUserId:'', isPublished:false,
})

function fromRow(row) {
  return {
    title:row.title||'', projectType:row.project_type||'Construction',
    locationText:row.location_text||'', completionYear:String(row.completion_year||''),
    areaText:row.area_text||'', budgetText:row.budget_text||'', description:row.description||'',
    packageName:row.package_name||'', coverImageUrl:row.cover_image_url||'',
    imageUrls:(row.image_urls||[]).join('\n'), videoUrl:row.video_url||'',
    planUrl:row.plan_url||'', businessUserId:String(row.business_user_id),
    isPublished:row.is_published===true,
  }
}

export default function AdminCompletedProjects({ businesses=[] }) {
  const [projects,setProjects]=useState([])
  const [pagination,setPagination]=useState({page:1,total:0,hasNextPage:false})
  const [form,setForm]=useState(blank)
  const [editing,setEditing]=useState(null)
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')

  async function load(page=1) {
    const response=await authRequest('/admin/expert-directory/projects?page='+page+'&pageSize=20')
    setProjects(Array.isArray(response?.data)?response.data:[])
    setPagination(response?.pagination||{page:1,total:0,hasNextPage:false})
  }

  useEffect(()=>{
    let active=true
    authRequest('/admin/expert-directory/projects?page=1&pageSize=20')
      .then(response=>{
        if(!active)return
        setProjects(Array.isArray(response?.data)?response.data:[])
        setPagination(response?.pagination||{page:1,total:0,hasNextPage:false})
      })
      .catch(err=>{if(active)setError(err.message||'Unable to load completed projects.')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[])

  const patch=(key,value)=>setForm(current=>({...current,[key]:value}))
  function edit(project) {
    setEditing(project.id)
    setForm(fromRow(project))
    setError('')
    setNotice('')
  }
  function reset() {
    setEditing(null)
    setForm(blank())
    setError('')
  }
  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    const title=form.title.trim()
    if(!title || !form.businessUserId) {
      setError('Select a professional and enter the actual project name.')
      return
    }
    if(form.isPublished && (!form.locationText.trim() || !form.areaText.trim() || !form.budgetText.trim() || !form.coverImageUrl.trim() && !form.imageUrls.trim())) {
      setError('To publish, add the actual location, area, budget and at least one genuine photo.')
      return
    }
    const payload={
      ...form,
      businessUserId:Number(form.businessUserId),
      completionYear:form.completionYear?Number(form.completionYear):null,
      imageUrls:form.imageUrls.split('\n').map(value=>value.trim()).filter(Boolean),
    }
    try {
      setBusy(true)
      const url=editing?'/admin/expert-directory/projects/'+editing:'/admin/expert-directory/projects'
      await authRequest(url,{method:editing?'PATCH':'POST',body:JSON.stringify(payload)})
      await load(1)
      const published=form.isPublished
      reset()
      setNotice(published?'Completed project saved. It appears publicly only if the professional meets directory eligibility settings.':'Project saved privately as a draft.')
    } catch (err) {
      setError(err.message||'Unable to save this project.')
    } finally { setBusy(false) }
  }

  return <section className="expert-admin-panel completed-project-admin" aria-label="Completed project publishing">
    <div className="expert-admin-panel-head">
      <div><span>PROJECT PORTFOLIO</span><h2>Completed Projects</h2><p>Add genuine completed work with a real project name, location, budget and photographs. Drafts stay private.</p></div>
      <a className="completed-project-public-link" href="/projects" target="_blank" rel="noreferrer">View website ↗</a>
    </div>

    <div className="completed-project-layout">
      <form className="completed-project-form" onSubmit={submit}>
        <h3>{editing?'Edit completed project':'Add completed project'}</h3>
        <p>Only publish work you can substantiate. Use the project name, not a private customer’s personal details.</p>
        <label>Professional / company
          <select required value={form.businessUserId} disabled={Boolean(editing)} onChange={e=>patch('businessUserId',e.target.value)}>
            <option value="">Select registered business</option>
            {businesses.map(item=><option key={item.id} value={item.id}>{item.business_name||item.name}{!item.eligible_by_rule?' (not currently public)':''}</option>)}
            {editing && !businesses.some(x=>String(x.id)===form.businessUserId)&&<option value={form.businessUserId}>Existing business</option>}
          </select>
        </label>
        <div className="completed-project-field-grid">
          <label>Actual project name<input required maxLength={180} value={form.title} onChange={e=>patch('title',e.target.value)} placeholder="e.g. Completed 3BHK apartment interiors"/></label>
          <label>Project type<select value={form.projectType} onChange={e=>patch('projectType',e.target.value)}>
            <option>Construction</option><option>Interior Design</option><option>Renovation</option><option>Commercial Construction</option><option>Commercial Interiors</option><option>Real Estate</option>
          </select></label>
          <label>Project location<input maxLength={180} value={form.locationText} onChange={e=>patch('locationText',e.target.value)} placeholder="Locality, city"/></label>
          <label>Completion year<input type="number" min={1950} max={new Date().getFullYear()} value={form.completionYear} onChange={e=>patch('completionYear',e.target.value)}/></label>
          <label>Area<input maxLength={120} value={form.areaText} onChange={e=>patch('areaText',e.target.value)} placeholder="e.g. 2,400 sq ft"/></label>
          <label>Actual budget / reported project cost<input maxLength={120} value={form.budgetText} onChange={e=>patch('budgetText',e.target.value)} placeholder="e.g. ₹28 lakh"/></label>
          <label className="wide">Completed scope / materials<textarea maxLength={3000} rows={3} value={form.description} onChange={e=>patch('description',e.target.value)} placeholder="What was actually delivered?"/></label>
          <label>Related package (optional)<input maxLength={160} value={form.packageName} onChange={e=>patch('packageName',e.target.value)}/></label>
          <label>Cover photo URL (HTTPS)<input value={form.coverImageUrl} onChange={e=>patch('coverImageUrl',e.target.value)} placeholder="https://…"/></label>
          <label className="wide">Real gallery photos · one HTTPS URL per line, maximum 8
            <textarea rows={3} value={form.imageUrls} onChange={e=>patch('imageUrls',e.target.value)} placeholder={'https://…photo-1.jpg\nhttps://…photo-2.jpg'}/>
          </label>
          <label>Completed project video URL (optional)<input value={form.videoUrl} onChange={e=>patch('videoUrl',e.target.value)}/></label>
          <label>Plan / PDF URL (optional)<input value={form.planUrl} onChange={e=>patch('planUrl',e.target.value)}/></label>
        </div>
        <label className="completed-project-publish"><input type="checkbox" checked={form.isPublished} onChange={e=>patch('isPublished',e.target.checked)}/><span>Publish as completed work</span><small>Requires full project facts and a genuine photo. Directory membership and visibility rules still apply.</small></label>
        {error&&<p className="completed-project-error" role="alert">{error}</p>}
        {notice&&<p className="completed-project-notice" role="status">{notice}</p>}
        <div className="completed-project-form-actions">
          <button type="submit" disabled={busy}>{busy?'Saving…':editing?'Save project changes':'Save project'}</button>
          {editing&&<button type="button" className="secondary" onClick={reset}>Cancel editing</button>}
        </div>
      </form>

      <div className="completed-project-list">
        <h3>Project records <span>{pagination.total||0}</span></h3>
        {loading?<p>Loading project records…</p>:
          !projects.length?<div className="completed-project-empty">No genuine completed projects recorded yet. Add the first one using details and photographs supplied by the professional.</div>:
          projects.map(item=><article key={item.id} className="completed-project-item">
            {item.cover_image_url?<img src={item.cover_image_url} alt="" loading="lazy"/>:<span className="completed-project-no-photo">No photo</span>}
            <div>
              <strong>{item.title}</strong>
              <small>{item.business_name} · {item.location_text||'Location not entered'}</small>
              <small>{item.budget_text||'Budget not entered'} · {item.completion_year||'Draft'}</small>
              <span className={item.is_published?'published':'draft'}>{item.is_published?'Published':'Draft'}</span>
            </div>
            <button type="button" onClick={()=>edit(item)} disabled={busy}>Edit</button>
          </article>)}
        <div className="completed-project-list-pages">
          <button type="button" disabled={loading||pagination.page<=1} onClick={()=>load(pagination.page-1)}>Previous</button>
          <span>Page {pagination.page||1}</span>
          <button type="button" disabled={loading||!pagination.hasNextPage} onClick={()=>load(pagination.page+1)}>Next</button>
        </div>
        <p>Professionals may also add real project photographs through <a href="/profile?tab=projects">Profile → Projects</a>. Changes to a professional’s portfolio must be coordinated to avoid overwriting edits.</p>
      </div>
    </div>
  </section>
}
