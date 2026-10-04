import {useEffect,useMemo,useState} from 'react'
import {authRequest} from '../../utils/auth'
import {playSound,refreshSoundSettings} from '../../utils/soundEffects'
import './AdminSoundEffects.css'

const rows=[
  ['clickEnabled','Button & link click','Soft tap for interactive controls.'],
  ['successEnabled','Success','Save, approval and completion confirmations.'],
  ['warningEnabled','Warning / error','Gentle warning tone for failed actions.'],
  ['uploadEnabled','Upload complete','Project video / plan upload confirmations.'],
  ['notificationEnabled','Notifications','Plays when unread notification count increases.'],
]

export default function AdminSoundEffects(){
  const [form,setForm]=useState({
    masterEnabled:true,clickEnabled:true,successEnabled:true,warningEnabled:true,
    uploadEnabled:true,notificationEnabled:true,defaultVolume:0.2,
  })
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  useEffect(()=>{
    let active=true
    authRequest('/admin/sound-effects')
      .then(value=>{if(active)setForm(current=>({...current,...value}))})
      .catch(err=>{if(active)setError(err.message||'Unable to load sound settings.')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[])

  const volumePercent=useMemo(()=>Math.round(Number(form.defaultVolume||0)*100),[form.defaultVolume])

  function update(key,value){
    setForm(current=>({...current,[key]:value}))
    setMessage('')
  }

  async function save(){
    try{
      setSaving(true);setError('');setMessage('')
      const next=await authRequest('/admin/sound-effects',{method:'PATCH',body:JSON.stringify(form)})
      setForm(current=>({...current,...next}))
      await refreshSoundSettings()
      playSound('success')
      setMessage('Sound settings saved.')
    }catch(err){
      playSound('warning')
      setError(err.message||'Unable to save sound settings.')
    }finally{setSaving(false)}
  }

  if(loading)return <div className="admin-sound-page"><div className="admin-sound-loading">Loading sound settings…</div></div>

  return <div className="admin-sound-page">
    <section className="admin-sound-hero">
      <div>
        <span>WEBSITE EXPERIENCE</span>
        <h1>Sound Effects</h1>
        <p>Keep website sounds subtle and optional. Users can still mute them or reduce personal volume on their device.</p>
      </div>
      <button type="button" disabled={saving} onClick={save}>{saving?'Saving…':'Save settings'}</button>
    </section>

    {message&&<div className="admin-sound-alert success">{message}</div>}
    {error&&<div className="admin-sound-alert error">{error}</div>}

    <section className="admin-sound-card">
      <div className="admin-sound-master">
        <div><b>Master sound effects</b><small>Turns all website-generated sound effects on or off.</small></div>
        <label className="admin-sound-toggle">
          <input type="checkbox" checked={Boolean(form.masterEnabled)} onChange={e=>update('masterEnabled',e.target.checked)}/>
          <i/>
        </label>
      </div>
    </section>

    <section className="admin-sound-card">
      <div className="admin-sound-card-head">
        <div><b>Sound categories</b><small>Choose exactly which interactions are allowed to make sound.</small></div>
      </div>
      <div className="admin-sound-list">
        {rows.map(([key,title,description])=><div className="admin-sound-row" key={key}>
          <div><b>{title}</b><small>{description}</small></div>
          <div className="admin-sound-row-actions">
            <button type="button" className="admin-sound-preview" disabled={!form.masterEnabled||!form[key]} onClick={()=>playSound(key.replace('Enabled',''))}>Preview</button>
            <label className="admin-sound-toggle">
              <input type="checkbox" checked={Boolean(form[key])} disabled={!form.masterEnabled} onChange={e=>update(key,e.target.checked)}/>
              <i/>
            </label>
          </div>
        </div>)}
      </div>
    </section>

    <section className="admin-sound-card">
      <div className="admin-sound-card-head">
        <div><b>Default volume</b><small>This is the maximum website volume before a user's personal volume preference is applied.</small></div>
        <strong>{volumePercent}%</strong>
      </div>
      <input className="admin-sound-volume" type="range" min="0" max="50" step="5" value={volumePercent} disabled={!form.masterEnabled} onChange={e=>update('defaultVolume',Number(e.target.value)/100)}/>
      <div className="admin-sound-scale"><span>Silent</span><span>Recommended 15–25%</span><span>50% max</span></div>
    </section>

    <section className="admin-sound-note">
      <b>Browser behavior</b>
      <p>Chrome, Safari and mobile browsers require a user interaction before audio can play. ProPulse unlocks its sound engine on the first click, tap or keyboard action and never auto-plays background music.</p>
    </section>
  </div>
}
