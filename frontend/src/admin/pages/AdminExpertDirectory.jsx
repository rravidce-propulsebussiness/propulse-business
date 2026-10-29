import {useLocation,useNavigate} from 'react-router-dom'
import BootLoader from '../../components/BootLoader'
import {useEffect,useMemo,useRef,useState} from 'react'
import {authRequest} from '../../utils/auth'
import AdminCompletedProjects from './AdminCompletedProjects'
import './AdminExpertDirectory.css'

function dataList(value){return Array.isArray(value?.data)?value.data:Array.isArray(value)?value:[]}
function formatDate(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-IN',{month:'short',year:'numeric'})}
function initials(value){return String(value||'P').split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]).join('').toUpperCase()}
function Badge({type,children}){return <span className={'expert-v2-badge '+type}>{children}</span>}
const SECTIONS=[['all','All Professionals'],['featured','Featured Professionals'],['pending','Video Approvals'],['verified','Verification'],['badges','Manage Badges'],['settings','Directory Settings']]

export default function AdminExpertDirectory(){
  const pageLocation=useLocation()
  const navigate=useNavigate()
  const [overview,setOverview]=useState(null)
  const [businesses,setBusinesses]=useState([])
  const [pagination,setPagination]=useState({page:1,total:0,totalPages:0})
  const [search,setSearch]=useState('')
  const [location,setLocation]=useState('')
  const [service,setService]=useState('')
  const [status,setStatus]=useState('')
  const [videoStatus,setVideoStatus]=useState('')
  const [badgeFilter,setBadgeFilter]=useState('')
  const [sort,setSort]=useState('featured')
  const [section,setSection]=useState('all')
  const [selectedId,setSelectedId]=useState(null)
  const [profileTab,setProfileTab]=useState('projects')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const businessRequest=useRef(0)
  const searchInitialized=useRef(false)

  async function loadOverview(){
    const value=await authRequest('/admin/expert-directory')
    setOverview(value)
  }
  async function loadBusinesses(page=1,term=search){
    const requestId=++businessRequest.current
    const params=new URLSearchParams({page:String(page),pageSize:'50'})
    if(term.trim())params.set('search',term.trim())
    const response=await authRequest('/admin/expert-directory/businesses?'+params)
    if(businessRequest.current!==requestId)return
    const rows=dataList(response)
    setBusinesses(rows)
    setPagination(response?.pagination||{page,total:0,totalPages:0})
    setSelectedId(previous=>rows.some(item=>item.id===previous)?previous:(rows.find(item=>item.is_official)||rows[0])?.id||null)
  }

  useEffect(()=>{
    let live=true
    queueMicrotask(()=>{
      if(!live)return
      Promise.all([loadOverview(),loadBusinesses(1,'')])
        .catch(e=>{if(live)setError(e.message||'Unable to load Expert Directory.')})
        .finally(()=>{if(live)setLoading(false)})
    })
    const refresh=()=>{loadOverview().catch(()=>{});loadBusinesses(pagination.page||1,search).catch(()=>{})}
    window.addEventListener('propulse:expert-directory-refresh',refresh)
    return()=>{live=false;businessRequest.current++;window.removeEventListener('propulse:expert-directory-refresh',refresh)}
  },[])

  useEffect(()=>{
    const allowed=new Set(SECTIONS.map(item=>item[0]))
    const next=new URLSearchParams(pageLocation.search).get('view')||'all'
    const view=allowed.has(next)?next:'all'
    setSection(view)
    if(view==='verified')setProfileTab('verification')
    else if(view==='badges')setProfileTab('badges')
    else setProfileTab('projects')
  },[pageLocation.search])

  useEffect(()=>{
    if(!searchInitialized.current){searchInitialized.current=true;return undefined}
    const id=setTimeout(()=>loadBusinesses(1,search).catch(e=>setError(e.message||'Search failed')),300)
    return()=>clearTimeout(id)
  },[search])

  const settings=overview?.settings||{}
  const stats=overview?.stats||{}
  const planGroups=overview?.availablePlanGroups||['grow','scale']
  const locations=useMemo(()=>[...new Set(businesses.flatMap(item=>String(item.city_names||'').split(',').map(x=>x.trim()).filter(Boolean)))].sort(),[businesses])
  const serviceLabels=useMemo(()=>[...new Set(businesses.map(item=>String(item.public_headline||'').trim()).filter(Boolean))].sort(),[businesses])
  const visible=useMemo(()=>{
    let rows=businesses.filter(item=>{
      if(location&&!String(item.city_names||'').toLowerCase().includes(location.toLowerCase()))return false
      if(service&&item.public_headline!==service)return false
      if(badgeFilter==='official'&&!item.is_official)return false
      if(badgeFilter==='verified'&&!item.is_verified)return false
      if(badgeFilter==='featured'&&!item.is_featured)return false
      if(status==='verified'&&!item.is_verified)return false
      if(status==='unverified'&&item.is_verified)return false
      if(status==='visible'&&!item.eligible_by_rule)return false
      if(status==='hidden'&&!item.is_hidden)return false
      if(status==='official'&&!item.is_official)return false
      if(videoStatus==='with'&&!Number(item.video_count))return false
      if(videoStatus==='pending'&&!Number(item.pending_video_count))return false
      if(section==='featured'&&!item.is_featured)return false
      if(section==='pending'&&!Number(item.pending_video_count))return false
      if(section==='verified'&&item.is_verified)return false
      if(section==='badges'&&!item.is_official&&!item.is_verified&&!item.is_featured)return false
      return true
    })
    if(sort==='projects')rows=rows.sort((a,b)=>Number(b.project_count)-Number(a.project_count))
    else if(sort==='latest')rows=rows.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))
    else if(sort==='name')rows=rows.sort((a,b)=>String(a.business_name||a.name).localeCompare(String(b.business_name||b.name)))
    else rows=rows.sort((a,b)=>Number(b.is_featured)-Number(a.is_featured)||Number(b.is_official)-Number(a.is_official))
    return rows
  },[businesses,location,service,badgeFilter,status,videoStatus,section,sort])
  const selected=visible.find(item=>item.id===selectedId)||visible[0]||null

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
      setMessage('Directory settings saved.')
      await loadBusinesses(pagination.page||1,search)
    }catch(e){setError(e.message||'Could not save directory settings.')}
    finally{setSaving('')}
  }
  async function updateBusiness(item,patch){
    try{
      setSaving('business-'+item.id);setError('');setMessage('')
      const next={isFeatured:Boolean(item.is_featured),isHidden:Boolean(item.is_hidden),sortOrder:Number(item.sort_order||0),...patch}
      await authRequest('/admin/expert-directory/businesses/'+item.id,{method:'PATCH',body:JSON.stringify(next)})
      setBusinesses(previous=>previous.map(row=>row.id===item.id?{...row,is_featured:next.isFeatured,is_hidden:next.isHidden,sort_order:next.sortOrder,eligible_by_rule:next.isHidden?false:row.eligible_by_rule}:row))
      setMessage('Updated '+(item.business_name||item.name)+' directory visibility.')
      await loadOverview()
    }catch(e){setError(e.message||'Unable to update professional.')}
    finally{setSaving('')}
  }
  function switchSection(value){
    navigate('/admin/expert-directory'+(value==='all'?'':'?view='+encodeURIComponent(value)))
    setSection(value)
    setError('')
    if(value==='pending')setProfileTab('projects')
    else if(value==='verified')setProfileTab('verification')
    else if(value==='badges')setProfileTab('badges')
    else setProfileTab('projects')
  }

  if(loading)return <main className="expert-v2"><BootLoader contained message="Loading Expert Directory" /></main>
  return <main className="expert-v2">
    <div className="expert-v2-heading">
      <div><span className="expert-v2-eyebrow">PROFESSIONAL DIRECTORY / MANAGEMENT</span>
        <h1>Expert Directory</h1>
        <p>Manage professionals, verify profiles, review project videos and control public visibility.</p>
      </div>
      <a href="/experts" target="_blank" rel="noopener noreferrer" className="expert-v2-main-action">View Public Directory <span aria-hidden="true">↗</span></a>
    </div>

    {error&&<div className="expert-v2-alert error" role="alert">{error}</div>}
    {message&&<div className="expert-v2-alert success" role="status">{message}</div>}
    <div className="expert-v2-metrics">
      <article><span className="expert-v2-metric-icon orange">♧</span><div><small>Total Professionals</small><strong>{stats.active_businesses||0}</strong><span>Active business accounts</span></div></article>
      <article><span className="expert-v2-metric-icon green">✓</span><div><small>Verified Professionals</small><strong>{stats.verified_businesses||0}</strong><span>Proof approved</span></div></article>
      <article><span className="expert-v2-metric-icon coral">▣</span><div><small>Projects with Video</small><strong>{stats.video_projects||0}</strong><span>Published project videos</span></div></article>
      <article><span className="expert-v2-metric-icon gold">☆</span><div><small>Featured Professionals</small><strong>{stats.featured_businesses||0}</strong><span>Prioritized profiles</span></div></article>
    </div>

    {section!=='settings'&&<div className="expert-v2-workspace">
      <section className="expert-v2-list-panel" aria-label="Search and filter professionals">
        <div className="expert-v2-section-heading"><h2>Search &amp; Filter Professionals</h2><span>{pagination.total||0} accounts</span></div>
        <div className="expert-v2-search"><span>⌕</span><input aria-label="Search professionals" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search by name, company, location..."/></div>
        <div className="expert-v2-filters">
          <label><span>Location</span><select value={location} onChange={e=>setLocation(e.target.value)}><option value="">All Locations</option>{locations.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label><span>Services</span><select value={service} onChange={e=>setService(e.target.value)}><option value="">All Services</option>{serviceLabels.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All Status</option><option value="verified">Verified</option><option value="unverified">Unverified</option><option value="visible">Public eligible</option><option value="hidden">Hidden</option><option value="official">Official ProPulse</option></select></label>
          <label><span>Badges</span><select value={badgeFilter} onChange={e=>setBadgeFilter(e.target.value)}><option value="">All Badges</option><option value="official">Official ProPulse</option><option value="verified">Verified</option><option value="featured">Featured</option></select></label>
          <label><span>Video Status</span><select value={videoStatus} onChange={e=>setVideoStatus(e.target.value)}><option value="">All Videos</option><option value="with">With Video</option><option value="pending">Pending Review</option></select></label>
          <label><span>Sort by</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured first</option><option value="projects">Most projects</option><option value="latest">Recently joined</option><option value="name">Company name</option></select></label>
        </div>
        <div className="expert-v2-list-label">Showing {visible.length} on this page <small>of {pagination.total||0} professionals</small></div>
        <div className="expert-v2-list">
          {visible.map(item=><button type="button" className={'expert-v2-person'+(selected?.id===item.id?' selected':'')} key={item.id}
            onClick={()=>{setSelectedId(item.id);setProfileTab('projects')}} aria-pressed={selected?.id===item.id}>
            <span className="expert-v2-avatar">{item.is_official?<img src="/brand/propulse-logo.png" alt=""/>:initials(item.business_name||item.name)}</span>
            <span className="expert-v2-person-copy">
              <strong>{item.business_name||item.name}</strong>
              <small>⌖ {item.city_names||'Locations not set'}</small>
              <small>▣ {item.project_count||0} projects · ▶ {item.video_count||0} videos</small>
            </span>
            <span className="expert-v2-person-side">
              {item.is_official?<Badge type="official">♛ Official ProPulse</Badge>:item.is_verified?<Badge type="verified">✓ Verified</Badge>:null}
              <Badge type={item.is_hidden||!item.is_active?'muted':'active'}>{item.is_hidden?'Hidden':item.is_active?'Active':'Inactive'}</Badge>
            </span><span className="expert-v2-arrow">›</span>
          </button>)}
          {visible.length===0&&<p className="expert-v2-empty">No professionals match these filters. Try another search or reset filters.</p>}
        </div>
        {pagination.totalPages>1&&<div className="expert-v2-pagination">
          <button type="button" disabled={!pagination.hasPreviousPage} onClick={()=>loadBusinesses(Math.max(1,pagination.page-1),search)}>← Previous</button>
          <span>Page {pagination.page} / {pagination.totalPages}</span>
          <button type="button" disabled={!pagination.hasNextPage} onClick={()=>loadBusinesses(pagination.page+1,search)}>Next →</button>
        </div>}
      </section>

      <section className="expert-v2-detail-panel" aria-label="Selected professional profile">
        {!selected?<div className="expert-v2-empty">Select a professional to view its project portfolio and directory controls.</div>:<>
          <div className="expert-v2-profile-header">
            <span className="expert-v2-profile-avatar">{selected.is_official?<img src="/brand/propulse-logo.png" alt=""/>:initials(selected.business_name||selected.name)}</span>
            <div className="expert-v2-profile-title">
              <h2>{selected.business_name||selected.name}</h2>
              <div className="expert-v2-badge-line">{selected.is_official&&<Badge type="official">♛ Official ProPulse</Badge>}
                {selected.is_verified&&<Badge type="verified">✓ Verified</Badge>}
                {selected.is_featured&&<Badge type="featured">☆ Featured</Badge>}</div>
              <p>{selected.public_headline||'Construction • Interior • Real Estate'}</p>
              <small>⌖ {selected.city_names||'Location not specified'}</small>
            </div>
            <Badge type={selected.is_hidden?'muted':selected.is_active?'active':'muted'}>{selected.is_hidden?'Hidden':selected.is_active?'● Active':'Inactive'}</Badge>
          </div>
          <div className="expert-v2-profile-metrics">
            <div><strong>{selected.project_count||0}</strong><small>Projects</small></div>
            <div><strong>{selected.video_count||0}</strong><small>Videos</small></div>
            <div><strong>{selected.pending_video_count||0}</strong><small>Pending review</small></div>
            <div><strong>{selected.plan_group?String(selected.plan_group).toUpperCase():'—'}</strong><small>Membership</small></div>
            <div><strong>{formatDate(selected.created_at)}</strong><small>Joined</small></div>
          </div>
          <div className="expert-v2-detail-tabs" role="tablist" aria-label="Professional details">
            {[['profile','Profile Details'],['projects','Projects & Media'],['verification','Verification'],['badges','Badges & Status'],['activity','Activity']].map(([key,title])=>
              <button key={key} role="tab" type="button" aria-selected={profileTab===key} className={profileTab===key?'active':''} onClick={()=>setProfileTab(key)}>{title}</button>)}
          </div>
          <div className="expert-v2-profile-content">
            {profileTab==='projects'&&<AdminCompletedProjects key={selected.id} businessUserId={selected.id} filter={section==='pending'?'pending':'all'}/>}
            {profileTab==='profile'&&<div className="expert-v2-info">
              <h3>Public Profile Details</h3><p>{selected.public_summary||'The professional has not added a profile summary yet.'}</p>
              <dl><div><dt>Business</dt><dd>{selected.business_name||'Not set'}</dd></div>
                <div><dt>Contact owner</dt><dd>{selected.name}</dd></div>
                <div><dt>Location</dt><dd>{selected.city_names||'Not set'}</dd></div>
                <div><dt>Membership</dt><dd>{selected.plan_name||'No active paid membership'}</dd></div>
              </dl>
              {selected.business_profile_id&&<a target="_blank" rel="noopener noreferrer" className="expert-v2-outline-action" href={'/experts/'+selected.business_profile_id}>View Public Profile ↗</a>}
            </div>}
            {profileTab==='verification'&&<div className="expert-v2-info">
              <h3>Company Verification</h3>
              <p>{selected.is_verified?'Company documents are verified.':'The company has not completed document verification.'}</p>
              <Badge type={selected.is_verified?'verified':'muted'}>{selected.is_verified?'✓ Verified':'Unverified'}</Badge>
              <a href="/admin/company-proofs" className="expert-v2-outline-action">Review verification documents ↗</a>
            </div>}
            {profileTab==='badges'&&<div className="expert-v2-info">
              <h3>Badges &amp; Directory Visibility</h3>
              <div className="expert-v2-badge-line">{selected.is_official&&<Badge type="official">♛ Official ProPulse</Badge>}
                {selected.is_verified&&<Badge type="verified">✓ Verified</Badge>}
                {selected.is_featured&&<Badge type="featured">☆ Featured</Badge>}</div>
              <p>Official ProPulse identifies the platform-owned professional. It is separate from document verification.</p>
              <div className="expert-v2-actions">
                <button type="button" disabled={saving==='business-'+selected.id} onClick={()=>updateBusiness(selected,{isFeatured:!selected.is_featured})}>{selected.is_featured?'Remove Featured':'☆ Feature professional'}</button>
                <button type="button" disabled={saving==='business-'+selected.id} onClick={()=>updateBusiness(selected,{isHidden:!selected.is_hidden})}>{selected.is_hidden?'Show profile':'Hide public profile'}</button>
              </div>
              <label className="expert-v2-priority">Directory priority <input type="number" min="-10000" max="10000" defaultValue={selected.sort_order||0} key={selected.id+'-priority'}
                onBlur={event=>{const next=Number(event.target.value||0);if(next!==Number(selected.sort_order||0))updateBusiness(selected,{sortOrder:next})}}/></label>
            </div>}
            {profileTab==='activity'&&<div className="expert-v2-info">
              <h3>Account &amp; Activity</h3><p>This is a summary of the account record. Detailed moderation audit history is managed in the audit workspace.</p>
              <dl><div><dt>Account joined</dt><dd>{formatDate(selected.created_at)}</dd></div>
              <div><dt>Published projects</dt><dd>{selected.project_count||0}</dd></div>
              <div><dt>Submitted videos</dt><dd>{selected.video_count||0}</dd></div></dl>
              <a href="/admin/audit-timeline" className="expert-v2-outline-action">Open Audit Timeline ↗</a>
            </div>}
          </div>
          <div className="expert-v2-profile-footer">
            {selected.business_profile_id&&<a href={'/experts/'+selected.business_profile_id} target="_blank" rel="noopener noreferrer">View Public Profile ↗</a>}
            <span>Only professionals can add or edit projects. Admins review video submissions.</span>
          </div>
        </>}
      </section>
    </div>}

    {section==='settings'&&<section className="expert-v2-directory-settings">
      <div className="expert-v2-settings-heading"><div><h2>Directory Settings</h2><p>Control public listing eligibility, project visibility and subscription rules.</p></div>
        <button type="button" onClick={()=>switchSection('all')} aria-label="Close directory settings">×</button></div>
      <div className="expert-v2-switches">
        {[['directoryEnabled','Enable public directory','Make /experts available'],['requireActiveMembership','Require active membership','Only subscribed professionals appear'],['requireVerified','Verified companies only','Require approved company documents'],['showProjects','Show completed projects','Display project portfolio'],['showVideos','Show project videos','Display videos on public pages'],['showPlans','Show service plans','Display published packages']].map(([key,title,description])=>
          <label key={key}><input type="checkbox" checked={key==='requireVerified'?settings[key]===true:settings[key]!==false} onChange={e=>patchSetting(key,e.target.checked)}/>
            <span><strong>{title}</strong><small>{description}</small></span></label>)}
      </div>
      <div className="expert-v2-settings-footer"><div><b>Membership groups</b><div>{planGroups.map(group=><button type="button" key={group} className={(settings.allowedPlanGroups||[]).includes(group)?'active':''} onClick={()=>togglePlan(group)}>{String(group).toUpperCase()}</button>)}</div></div>
        <button type="button" className="expert-v2-main-action" disabled={saving==='settings'} onClick={saveSettings}>{saving==='settings'?'Saving…':'Save Settings'}</button></div>
    </section>}
  </main>
}
