import {useEffect,useState} from 'react'
import {authRequest} from '../../utils/auth'
import './SheetAutomationControls.css'

const INTERVALS=[1,2,5,10,15,30,60,120,360,720,1440]
const defaults={autoSyncEnabled:true,adminSourcesEnabled:true,leadPartnerSourcesEnabled:true,intervalMinutes:5}

const fmt=value=>{
  if(!value)return 'No run yet'
  const date=new Date(value)
  return Number.isNaN(date.getTime())?'—':date.toLocaleString()
}
const nextLabel=(enabled,value)=>{
  if(!enabled)return 'Paused'
  if(!value)return 'Waiting for an active connection'
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return '—'
  if(date.getTime()<=Date.now())return 'Due now'
  return date.toLocaleString()
}

export default function SheetAutomationControls(){
  const[settings,setSettings]=useState(null)
  const[draft,setDraft]=useState(defaults)
  const[loading,setLoading]=useState(true)
  const[saving,setSaving]=useState(false)
  const[running,setRunning]=useState('')
  const[message,setMessage]=useState('')

  const load=async()=>{
    const data=await authRequest('/leads/google-sheet/settings')
    setSettings(data)
    setDraft({
      autoSyncEnabled:data.autoSyncEnabled!==false,
      adminSourcesEnabled:data.adminSourcesEnabled!==false,
      leadPartnerSourcesEnabled:data.leadPartnerSourcesEnabled!==false,
      intervalMinutes:Number(data.intervalMinutes)||5
    })
    return data
  }

  useEffect(()=>{let active=true;(async()=>{try{await load()}catch(e){if(active)setMessage(e.message||'Unable to load automation settings')}finally{if(active)setLoading(false)}})();return()=>{active=false}},[])

  const save=async()=>{
    setSaving(true);setMessage('')
    try{
      const data=await authRequest('/leads/google-sheet/settings',{method:'PUT',body:JSON.stringify(draft)})
      setSettings(data)
      setMessage('Automatic sync settings saved. The worker will use the new schedule without a restart.')
    }catch(e){setMessage(e.message||'Unable to save automation settings')}
    finally{setSaving(false)}
  }

  const runNow=async(jobKey,label)=>{
    setRunning(jobKey);setMessage('')
    try{
      const result=await authRequest(`/admin/jobs/${jobKey}/retry`,{method:'POST',body:JSON.stringify({})})
      setMessage(`${label} finished · ${result?.processedConnections??result?.connections??0} connection(s) processed${result?.failed?' · some connections need attention':''}.`)
      await load()
    }catch(e){setMessage(e.message||`${label} failed`)}
    finally{setRunning('')}
  }

  if(loading&&!settings)return <section className="v9-sheet-automation-control"><div className="v9-sheet-automation-loading">Loading automatic sync controls…</div></section>

  return <section className="v9-sheet-automation-control">
    <header className="v9-sheet-automation-control-head">
      <div><span>AUTOMATION CONTROL</span><h2>Google Sheet sync schedule</h2><p>Admin controls whether background sync runs and how often the worker checks Admin and Lead Partner sheet sources.</p></div>
      <span className={'v9-sheet-master-state '+(draft.autoSyncEnabled?'on':'off')}><i/>{draft.autoSyncEnabled?'AUTO SYNC ON':'AUTO SYNC PAUSED'}</span>
    </header>

    <div className="v9-sheet-automation-grid">
      <label className="v9-sheet-toggle-card">
        <div><strong>Master automatic sync</strong><small>Pause or enable scheduled Google Sheet imports platform-wide.</small></div>
        <input type="checkbox" checked={draft.autoSyncEnabled} onChange={e=>setDraft(v=>({...v,autoSyncEnabled:e.target.checked}))}/>
      </label>
      <label className="v9-sheet-toggle-card">
        <div><strong>Admin sheet sources</strong><small>{settings?.admin?.activeConnections||0} active Admin connection(s).</small></div>
        <input type="checkbox" checked={draft.adminSourcesEnabled} onChange={e=>setDraft(v=>({...v,adminSourcesEnabled:e.target.checked}))}/>
      </label>
      <label className="v9-sheet-toggle-card">
        <div><strong>Lead Partner sources</strong><small>{settings?.leadPartner?.activeConnections||0} active Lead Partner connection(s).</small></div>
        <input type="checkbox" checked={draft.leadPartnerSourcesEnabled} onChange={e=>setDraft(v=>({...v,leadPartnerSourcesEnabled:e.target.checked}))}/>
      </label>
      <label className="v9-sheet-interval-card">
        <div><strong>Automatic sync interval</strong><small>The worker checks every minute and only runs sources that are due.</small></div>
        <select value={draft.intervalMinutes} onChange={e=>setDraft(v=>({...v,intervalMinutes:Number(e.target.value)}))}>
          {INTERVALS.map(value=><option key={value} value={value}>{value<60?`${value} minute${value===1?'':'s'}`:value===60?'1 hour':value<1440?`${value/60} hours`:'24 hours'}</option>)}
        </select>
      </label>
    </div>

    <div className="v9-sheet-run-grid">
      <article>
        <div><span>ADMIN SOURCES</span><strong>Next: {nextLabel(settings?.admin?.enabled,settings?.admin?.nextRunAt)}</strong><small>Last: {fmt(settings?.admin?.latestRun?.completedAt||settings?.admin?.latestRun?.startedAt)} · {settings?.admin?.latestRun?.status||'not run'}</small></div>
        <button type="button" disabled={Boolean(running)} onClick={()=>runNow('admin_google_sheet_sync','Admin sheet sync')}>{running==='admin_google_sheet_sync'?'Syncing…':'Sync Admin Sheets Now'}</button>
      </article>
      <article>
        <div><span>LEAD PARTNER SOURCES</span><strong>Next: {nextLabel(settings?.leadPartner?.enabled,settings?.leadPartner?.nextRunAt)}</strong><small>Last: {fmt(settings?.leadPartner?.latestRun?.completedAt||settings?.leadPartner?.latestRun?.startedAt)} · {settings?.leadPartner?.latestRun?.status||'not run'}</small></div>
        <button type="button" disabled={Boolean(running)} onClick={()=>runNow('lead_partner_google_sheet_sync','Lead Partner sheet sync')}>{running==='lead_partner_google_sheet_sync'?'Syncing…':'Sync Lead Partner Sheets Now'}</button>
      </article>
    </div>

    <footer className="v9-sheet-automation-footer">
      <span>Manual “Sync now” actions remain available even when scheduled auto sync is paused.</span>
      <button type="button" onClick={save} disabled={saving||Boolean(running)}>{saving?'Saving…':'Save Automation Settings'}</button>
    </footer>
    {message&&<div className="v9-sheet-automation-message">{message}</div>}
  </section>
}
