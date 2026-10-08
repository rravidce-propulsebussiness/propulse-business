import { useEffect, useMemo, useRef, useState } from 'react'
import { authRequest } from '../../utils/auth'
import AdminCallbackInbox from './AdminCallbackInbox'
import './AdminExpertDirectory.css'

function listData(value){
  if(Array.isArray(value))return value
  if(Array.isArray(value?.data))return value.data
  return []
}

function dateOnly(value){
  if(!value)return '—'
  const date=new Date(value)
  return Number.isNaN(date.getTime())?'—':date.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
}

export default function AdminExpertDirectory(){
  const [overview,setOverview]=useState(null)
  const [businesses,setBusinesses]=useState([])
  const [pagination,setPagination]=useState({page:1,total:0,totalPages:0})
  const [search,setSearch]=useState('')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const businessRequest=useRef(0)
  const searchReady=useRef(false)

  async function loadOverview(){
    const value=await authRequest('/admin/expert-directory')
    setOverview(value)
  }

  async function loadBusinesses(page=1,term=search){
    const requestId=++businessRequest.current
    const params=new URLSearchParams({page:String(page),pageSize:'50'})
    if(term.trim())params.set('search',term.trim())
    const value=await authRequest('/admin/expert-directory/businesses?'+params)
    if(requestId!==businessRequest.current)return
    setBusinesses(listData(value))
    setPagination(value?.pagination||{page,total:0,totalPages:0})
  }

  useEffect(()=>{
    let active=true
    queueMicrotask(()=>{
      if(!active)return
      Promise.all([loadOverview(),loadBusinesses(1,'')])
        .catch(err=>{if(active)setError(err.message||'Unable to load Expert Directory settings.')})
        .finally(()=>{if(active)setLoading(false)})
    })
    return()=>{active=false}
  },[])

  useEffect(()=>{
    if(!searchReady.current){searchReady.current=true;return undefined}
    const timer=setTimeout(()=>loadBusinesses(1,search).catch(err=>setError(err.message)),250)
    return()=>clearTimeout(timer)
  },[search])

  const settings=overview?.settings||{}
  const stats=overview?.stats||{}
  const planGroups=overview?.availablePlanGroups||['grow','scale']
  const allowed=new Set(settings.allowedPlanGroups||[])

  function patchSetting(key,value){
    setOverview(current=>({...current,settings:{...(current?.settings||{}),[key]:value}}))
    setMessage('')
  }

  function togglePlan(group){
    const next=new Set(settings.allowedPlanGroups||[])
    if(next.has(group))next.delete(group);else next.add(group)
    patchSetting('allowedPlanGroups',[...next])
  }

  async function saveSettings(){
    try{
      setSaving('settings');setError('');setMessage('')
      const value=await authRequest('/admin/expert-directory',{method:'PATCH',body:JSON.stringify(settings)})
      setOverview(current=>({...current,settings:value}))
      setMessage('Expert Directory settings saved.')
      await loadBusinesses(pagination.page||1,search)
    }catch(err){setError(err.message||'Unable to save settings.')}finally{setSaving('')}
  }

  async function updateBusiness(item,patch){
    try{
      setSaving('business-'+item.id);setError('');setMessage('')
      const next={isFeatured:Boolean(item.is_featured),isHidden:Boolean(item.is_hidden),sortOrder:Number(item.sort_order||0),...patch}
      await authRequest(`/admin/expert-directory/businesses/${item.id}`,{method:'PATCH',body:JSON.stringify(next)})
      setBusinesses(current=>current.map(row=>row.id===item.id?{...row,is_featured:next.isFeatured,is_hidden:next.isHidden,sort_order:next.sortOrder}:row))
      setMessage(`${item.business_name||item.name} directory settings updated.`)
      await loadOverview()
    }catch(err){setError(err.message||'Unable to update business listing.')}finally{setSaving('')}
  }

  const eligibleCount=useMemo(()=>businesses.filter(item=>item.eligible_by_rule).length,[businesses])

  if(loading)return <main className="expert-admin"><div className="expert-admin-loading">Loading Expert Directory configuration…</div></main>

  return <main className="expert-admin">
    <section className="expert-admin-hero">
      <div><span>WEBSITE DIRECTORY</span><h1>Expert Directory</h1><p>Control which subscribed businesses appear on the public Find Professionals page and what profile content customers can see.</p></div>
      <a href="/experts" target="_blank" rel="noreferrer">Open public directory ↗</a>
    </section>

    {error&&<div className="expert-admin-alert error">{error}</div>}
    {message&&<div className="expert-admin-alert success">{message}</div>}

    <AdminCallbackInbox/>

    <section className="expert-admin-stats">
      <article><span>Active businesses</span><strong>{stats.active_businesses||0}</strong><small>Business accounts</small></article>
      <article><span>Subscribed</span><strong>{stats.subscribed_businesses||0}</strong><small>Active GROW / SCALE</small></article>
      <article><span>Verified</span><strong>{stats.verified_businesses||0}</strong><small>Proof approved</small></article>
      <article><span>Featured</span><strong>{stats.featured_businesses||0}</strong><small>Priority profiles</small></article>
      <article><span>Hidden</span><strong>{stats.hidden_businesses||0}</strong><small>Admin suppressed</small></article>
    </section>

    <section className="expert-admin-panel">
      <div className="expert-admin-panel-head"><div><span>01</span><h2>Public eligibility</h2><p>By default, Experts should be a benefit of an active paid membership.</p></div><button disabled={saving==='settings'} onClick={saveSettings}>{saving==='settings'?'Saving…':'Save settings'}</button></div>
      <div className="expert-admin-settings-grid">
        <label className="expert-switch"><input type="checkbox" checked={settings.directoryEnabled!==false} onChange={e=>patchSetting('directoryEnabled',e.target.checked)}/><span/><div><b>Directory enabled</b><small>Master switch for /experts.</small></div></label>
        <label className="expert-switch"><input type="checkbox" checked={settings.requireActiveMembership!==false} onChange={e=>patchSetting('requireActiveMembership',e.target.checked)}/><span/><div><b>Require active membership</b><small>Only currently subscribed businesses appear.</small></div></label>
        <label className="expert-switch"><input type="checkbox" checked={settings.requireVerified===true} onChange={e=>patchSetting('requireVerified',e.target.checked)}/><span/><div><b>Verified businesses only</b><small>Optional company-proof requirement.</small></div></label>
        <label className="expert-switch"><input type="checkbox" checked={settings.showProjects!==false} onChange={e=>patchSetting('showProjects',e.target.checked)}/><span/><div><b>Show completed projects</b><small>Portfolio cards inside business profile.</small></div></label>
        <label className="expert-switch"><input type="checkbox" checked={settings.showVideos!==false} onChange={e=>patchSetting('showVideos',e.target.checked)}/><span/><div><b>Show project videos</b><small>Video links provided by businesses.</small></div></label>
        <label className="expert-switch"><input type="checkbox" checked={settings.showPlans!==false} onChange={e=>patchSetting('showPlans',e.target.checked)}/><span/><div><b>Show service plans</b><small>Public packages / starting prices.</small></div></label>
      </div>
      <div className="expert-plan-groups"><div><b>Allowed membership</b><small>Select which paid plans unlock a public business profile.</small></div>{planGroups.map(group=><button key={group} className={allowed.has(group)?'active':''} onClick={()=>togglePlan(group)}>{String(group).toUpperCase()}</button>)}</div>
    </section>

    <section className="expert-admin-panel businesses">
      <div className="expert-admin-panel-head"><div><span>02</span><h2>Business visibility</h2><p>Feature strong profiles or hide a business without changing its membership.</p></div><div className="expert-admin-page-count"><b>{pagination.total||0}</b><small>businesses</small></div></div>
      <div className="expert-business-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search business, owner or email…"/><span>{eligibleCount} eligible on this page</span></div>
      <div className="expert-business-table">
        <div className="expert-business-row head"><span>Business</span><span>Membership</span><span>Profile</span><span>Status</span><span>Controls</span></div>
        {businesses.map(item=><div className="expert-business-row" key={item.id}>
          <div className="business-name"><b>{item.business_name||item.name}</b><small>{item.email}</small></div>
          <div><b className={`expert-plan-pill ${item.plan_group||'none'}`}>{item.plan_group?String(item.plan_group).toUpperCase():'NO PLAN'}</b><small>{item.expires_at?'until '+dateOnly(item.expires_at):'No active subscription'}</small></div>
          <div><b>{item.project_count||0} projects · {item.plan_count||0} plans</b><small>{item.public_headline||'No public headline yet'}</small></div>
          <div className="expert-statuses"><span className={item.is_verified?'ok':'muted'}>{item.is_verified?'Verified':'Not verified'}</span><span className={item.eligible_by_rule?'ok':'warn'}>{item.eligible_by_rule?'Eligible':'Not eligible'}</span>{item.is_hidden&&<span className="danger">Hidden</span>}{item.is_featured&&<span className="featured">Featured</span>}</div>
          <div className="expert-business-actions">
            <button disabled={saving==='business-'+item.id} className={item.is_featured?'active':''} onClick={()=>updateBusiness(item,{isFeatured:!item.is_featured})}>★ Feature</button>
            <button disabled={saving==='business-'+item.id} className={item.is_hidden?'danger active':''} onClick={()=>updateBusiness(item,{isHidden:!item.is_hidden})}>{item.is_hidden?'Show':'Hide'}</button>
            <label>Priority<input type="number" min="-10000" max="10000" value={item.sort_order||0} onChange={e=>setBusinesses(current=>current.map(row=>row.id===item.id?{...row,sort_order:e.target.value}:row))} onBlur={()=>updateBusiness(item,{sortOrder:Number(item.sort_order||0)})}/></label>
          </div>
        </div>)}
        {!businesses.length&&<div className="expert-business-empty">No businesses match this search.</div>}
      </div>
      {pagination.totalPages>1&&<div className="expert-admin-pagination"><button disabled={!pagination.hasPreviousPage} onClick={()=>loadBusinesses(Math.max(1,(pagination.page||1)-1),search)}>← Previous</button><span>Page {pagination.page} of {pagination.totalPages}</span><button disabled={!pagination.hasNextPage} onClick={()=>loadBusinesses((pagination.page||1)+1,search)}>Next →</button></div>}
    </section>
  </main>
}