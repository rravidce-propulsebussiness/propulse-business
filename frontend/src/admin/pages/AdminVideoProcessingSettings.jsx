import {useEffect,useState} from 'react'
import {authRequest} from '../../utils/auth'
import './AdminVideoProcessingSettings.css'

const RESOLUTIONS=[[720,'720p'],[1080,'1080p'],[1440,'1440p']]
const QUALITIES=[['high','High'],['balanced','Balanced'],['small','Small']]

// Controls how the video worker prepares the public playback copy of professionals'
// project videos. Originals always stay private and untouched in storage.
export default function AdminVideoProcessingSettings(){
  const [settings,setSettings]=useState(null)
  const [saved,setSaved]=useState(null)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')

  useEffect(()=>{
    let active=true
    authRequest('/admin/video-processing')
      .then(data=>{if(active){setSettings(data);setSaved(data)}})
      .catch(err=>{if(active)setError(err.message||'Could not load video settings.')})
    return()=>{active=false}
  },[])

  const dirty=Boolean(settings&&saved)&&(settings.compressEnabled!==saved.compressEnabled
    ||settings.maxResolution!==saved.maxResolution||settings.quality!==saved.quality)

  async function save(){
    setSaving(true);setError('');setNotice('')
    try{
      const next=await authRequest('/admin/video-processing',{method:'PUT',body:JSON.stringify({
        compressEnabled:settings.compressEnabled,maxResolution:settings.maxResolution,quality:settings.quality})})
      setSettings(next);setSaved(next)
      setNotice(next.compressEnabled?'Compression is on for newly processed videos.':'Original quality is on for newly processed videos.')
    }catch(err){setError(err.message||'Could not save video settings.')}
    finally{setSaving(false)}
  }

  return <section className="video-quality-settings" aria-labelledby="video-quality-title">
    <div className="video-quality-heading">
      <h2 id="video-quality-title">Project video quality</h2>
    </div>
    {error&&<div className="video-quality-alert error" role="alert">{error}</div>}
    {notice&&<div className="video-quality-alert success" role="status">{notice}</div>}
    {!settings?(!error&&<p className="video-quality-loading">Loading video settings…</p>):<>
      <label className="video-quality-switch">
        <input type="checkbox" checked={settings.compressEnabled}
          onChange={event=>setSettings(current=>({...current,compressEnabled:event.target.checked}))}/>
        <span><strong>Compress videos</strong></span>
      </label>
      <fieldset className="video-quality-options" disabled={!settings.compressEnabled}>
        <legend>Maximum resolution</legend>
        <div>{RESOLUTIONS.map(([value,label])=><button key={value} type="button" aria-pressed={settings.maxResolution===value}
          className={settings.maxResolution===value?'selected':''} onClick={()=>setSettings(current=>({...current,maxResolution:value}))}>
          <b>{label}</b></button>)}</div>
      </fieldset>
      <fieldset className="video-quality-options" disabled={!settings.compressEnabled}>
        <legend>Quality</legend>
        <div>{QUALITIES.map(([value,label])=><button key={value} type="button" aria-pressed={settings.quality===value}
          className={settings.quality===value?'selected':''} onClick={()=>setSettings(current=>({...current,quality:value}))}>
          <b>{label}</b></button>)}</div>
      </fieldset>
      <div className="video-quality-footer">
        <button type="button" className="expert-v2-main-action" disabled={!dirty||saving} onClick={save}>{saving?'Saving…':'Save video settings'}</button>
      </div>
    </>}
  </section>
}
