import {useCallback,useEffect,useState} from 'react'
import {authRequest} from '../../utils/auth'
import './AdminCompletedProjects.css'

const FILTERS=[['all','All projects'],['video','With video'],['pending','Pending approval'],['published','Published']]

export default function AdminCompletedProjects({businessUserId,filter='all'}){
  const [projects,setProjects]=useState([])
  const [pagination,setPagination]=useState({page:1,total:0,hasNextPage:false})
  const [loading,setLoading]=useState(false)
  const [busy,setBusy]=useState(null)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [notes,setNotes]=useState({})
  const [privacyChecked,setPrivacyChecked]=useState({})
  const [localFilter,setLocalFilter]=useState(filter)
  const [playing,setPlaying]=useState(null)

  const load=useCallback(async(page=1)=>{
    if(!businessUserId){setProjects([]);return}
    setLoading(true)
    try{
      const params=new URLSearchParams({page:String(page),pageSize:'20',businessUserId:String(businessUserId)})
      const result=await authRequest('/admin/expert-directory/projects?'+params)
      setProjects(Array.isArray(result?.data)?result.data:[])
      setPagination(result?.pagination||{page,total:0,hasNextPage:false})
    }catch(e){setError(e.message||'Unable to load project review queue.')}
    finally{setLoading(false)}
  },[businessUserId])

  useEffect(()=>{
    let live=true
    queueMicrotask(()=>{if(live){setError('');setNotice('');setLocalFilter(filter);setPlaying(null);setPrivacyChecked({});load(1)}})
    return()=>{live=false}
  },[businessUserId,filter,load])

  async function review(item,decision){
    const note=String(notes[item.id]||'').trim()
    if(decision==='reject'&&!note){setError('Provide a reason before rejecting this video.');return}
    if(!item.video_url){setError('This project has no video to review.');return}
    if(decision==='approve'&&item.video_redaction_status!=='ready'){
      setError('Automatic video redaction is not ready. Do not approve or publish the original.');return
    }
    if(decision==='approve'&&privacyChecked[item.id]!==true){
      setError('Watch the full video and confirm no direct contact details appear visually or in audio before approving.');
      return;
    }
    try{
      setBusy(item.id);setError('');setNotice('')
      await authRequest('/admin/expert-directory/projects/'+item.id+'/review-video',{
        method:'POST',body:JSON.stringify({decision,note,contactDetailsChecked:decision==='approve'&&privacyChecked[item.id]===true})
      })
      setNotice(decision==='approve'
        ?'Video approved. Eligible credits are issued through the existing reward rules.'
        :'Video rejected. The professional can replace it and submit again.')
      setNotes(current=>({...current,[item.id]:''}))
      setPrivacyChecked(current=>({...current,[item.id]:false}))
      await load(pagination.page||1)
      window.dispatchEvent(new Event('propulse:expert-directory-refresh'))
    }catch(err){setError(err.message||'Video review failed.')}
    finally{setBusy(null)}
  }

  const visible=projects.filter(item=>{
    if(localFilter==='video')return Boolean(item.video_url)
    if(localFilter==='pending')return Boolean(item.video_url)&&(!item.video_privacy_cleared||item.video_reward_status==='pending')
    if(localFilter==='published')return item.is_published
    return true
  })

  return <section className="expert-review-workspace" aria-label="Selected professional project reviews">
    <div className="expert-review-heading">
      <div><h3>Completed Projects <span>({pagination.total||0})</span></h3>
        <p>Projects are submitted by the professional. Admins review videos and rewards here.</p>
      </div>
      <a href="/projects" target="_blank" rel="noopener noreferrer">View public projects ↗</a>
    </div>
    <div className="expert-review-filter" aria-label="Filter project reviews">
      {FILTERS.map(([key,title])=><button key={key} type="button" className={localFilter===key?'selected':''}
        onClick={()=>setLocalFilter(key)} aria-pressed={localFilter===key}>{title}</button>)}
    </div>
    {error&&<div className="expert-review-error" role="alert">{error}</div>}
    {notice&&<div className="expert-review-notice" role="status">{notice}</div>}
    {loading?<div className="expert-review-empty">Loading submitted projects…</div>
      :!businessUserId?<div className="expert-review-empty">Select a professional to review projects.</div>
      :!visible.length?<div className="expert-review-empty">No {localFilter==='pending'?'pending videos':'projects'} match this filter. Professionals can add projects from their own Business Profile.</div>
      :<div className="expert-review-grid">
        {visible.map(item=><article key={item.id} className="expert-review-card">
          <div className="expert-review-media">
            <span className="expert-review-placeholder">{item.video_url?'Project video':'Completed project'}</span>
            {playing===item.id&&item.video_display_url
              ?<video src={item.video_display_url} controls autoPlay playsInline preload="metadata" aria-label={item.title+' video'} />
              :item.cover_image_display_url
                ?<img loading="lazy" src={item.cover_image_display_url} alt={item.title+' project'} onError={event=>{event.currentTarget.hidden=true}} />
                :item.video_display_url
                  ?<video className="expert-review-video-preview" src={item.video_display_url} muted playsInline preload="metadata"
                      aria-hidden="true" onLoadedMetadata={event=>{const video=event.currentTarget;if(Number.isFinite(video.duration)&&video.duration>0.3)video.currentTime=0.2}}
                      onError={event=>{event.currentTarget.hidden=true}} />
                  :null}
            {item.video_display_url&&playing!==item.id&&<button type="button" aria-label={'Play '+item.title+' video'}
              className="expert-review-play" onClick={()=>setPlaying(item.id)}>▶</button>}
            {item.video_url&&<span className="expert-review-video-label">Video submitted</span>}
            {item.video_url&&!item.video_display_url&&<span className="expert-review-unavailable">Video preview unavailable</span>}
          </div>
          <div className="expert-review-card-body">
            <div className="expert-review-card-title">
              <strong title={item.title}>{item.title}</strong>
              <span className={item.video_reward_status==='approved'?'approved':item.video_reward_status==='rejected'?'rejected':'pending'}>
                {item.video_url?(item.video_reward_status||'pending'):'No video'}
              </span>
            </div>
            <small>⌖ {item.location_text||'Location not specified'} {item.completion_year?'· '+item.completion_year:''}</small>
            <small>{item.is_published?'Published project':'Private project'} · {item.project_type||'Project'}</small>
            {item.video_reward_review_note&&<p className="expert-review-previous-note">Review note: {item.video_reward_review_note}</p>}
            {item.video_url&&<div className="expert-review-actions">
              <p className="expert-review-processing" role="status">
                {item.video_redaction_status==='ready'?'Processed copy ready — review this redacted video'
                  :item.video_redaction_status==='failed'?'Automatic redaction failed — original remains private'
                  :item.video_redaction_status==='processing'?'Automatically scanning and concealing contacts…'
                  :'Video uploaded and queued. A separate Docker video-redaction worker must be running; Hostinger shared web hosting does not process videos.'}
              </p>
              {item.video_redaction_status==='failed'&&item.video_redaction_error&&
                <small className="expert-review-processing-error">{item.video_redaction_error}</small>}
              <p className="expert-review-privacy-status" role="status">{item.video_privacy_cleared
                ?'Contact privacy cleared for this video'
                :'Not public: contact privacy review required'}</p>
              <label className="expert-review-privacy-confirm">
                <input type="checkbox" checked={privacyChecked[item.id]===true}
                  onChange={event=>setPrivacyChecked(current=>({...current,[item.id]:event.target.checked}))}/>
                <span>I watched the complete processed video and verified no phone numbers, WhatsApp details, emails, websites, social handles, QR codes or other direct contacts remain. Public copies have audio removed. If unsafe, reject and request a corrected upload.</span>
              </label>
              <label>Review note
                <input type="text" maxLength="1000" placeholder="Reason required to reject"
                  value={notes[item.id]||''} onChange={event=>setNotes(current=>({...current,[item.id]:event.target.value}))}/>
              </label>
              <div>
                <button type="button" className="approve" disabled={busy!==null||item.video_redaction_status!=='ready'||privacyChecked[item.id]!==true||Boolean(item.video_privacy_cleared)}
                  onClick={()=>review(item,'approve')}>{busy===item.id?'Reviewing…':item.video_reward_status==='approved'&&!item.video_privacy_cleared?'✓ Recheck privacy & release':'✓ Approve & release video'}</button>
                <button type="button" className="reject" disabled={busy!==null}
                  onClick={()=>review(item,'reject')}>Reject video</button>
              </div>
            </div>}
          </div>
        </article>)}
      </div>}
    {pagination.totalPages>1&&<div className="expert-review-pages">
      <button type="button" disabled={loading||pagination.page<=1} onClick={()=>load(pagination.page-1)}>Previous</button>
      <span>Page {pagination.page} / {pagination.totalPages}</span>
      <button type="button" disabled={loading||!pagination.hasNextPage} onClick={()=>load(pagination.page+1)}>Next</button>
    </div>}
  </section>
}
