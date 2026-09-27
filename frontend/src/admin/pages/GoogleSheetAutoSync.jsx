import {useEffect,useEffectEvent,useRef,useState} from 'react';
import {authRequest} from '../../utils/auth';
import LeadImportDefaults from './LeadImportDefaults';
import {EMPTY_IMPORT_DEFAULTS,importDefaultsSummary,normalizeImportDefaults} from './leadImportDefaultsUtils';

const STORAGE_KEY='propulse.admin.googleSheet.sources';
const legacyKey='propulse.admin.googleSheet.url';
const fingerprintKey=url=>`propulse.admin.googleSheet.fingerprint.v4.${url}`;
const clean=v=>String(v??'').trim();
const sourceRecord=value=>typeof value==='string'?{url:value,defaults:EMPTY_IMPORT_DEFAULTS}:{url:clean(value?.url),defaults:normalizeImportDefaults(value?.defaults)};

export default function GoogleSheetAutoSync(){
 const initial=()=>{try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(saved)&&saved.length)return saved.filter(Boolean).map(sourceRecord).filter(x=>x.url);const old=localStorage.getItem(legacyKey);return old?[sourceRecord(old)]:[]}catch{return[]}};
 const[sources,setSources]=useState(initial),[input,setInput]=useState(''),[linkDefaults,setLinkDefaults]=useState(EMPTY_IMPORT_DEFAULTS),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);const running=useRef(false),timer=useRef(null);
 const save=next=>{setSources(next);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));};
 const syncOne=async(source,force=false)=>{const record=sourceRecord(source),url=record.url;const previousFingerprint=localStorage.getItem(fingerprintKey(url));const result=await authRequest('/leads/google-sheet/sync',{method:'POST',body:JSON.stringify({url,defaults:record.defaults,previousFingerprint,force})});if(result?.skipped)return{skipped:true};if(Number(result?.failed||0)===0&&result?.fingerprint)localStorage.setItem(fingerprintKey(url),result.fingerprint);else localStorage.removeItem(fingerprintKey(url));return{skipped:false,...result}};
 const syncAll=async(force=false)=>{if(running.current||!sources.length)return;running.current=true;setBusy(true);let checked=0,total=0,updated=0,created=0,unchanged=0,failed=0;const failures=[];try{for(const source of sources){try{const result=await syncOne(source,force);if(result.skipped)continue;checked++;total+=result.total||0;updated+=result.updated||0;created+=result.created||0;unchanged+=result.unchanged||0;failed+=result.failed||0;failures.push(...(result.failures||[]))}catch(e){failed++;failures.push(`${sourceRecord(source).url}: ${e.message||'Unable to sync'}`)}}if(checked){setStatus(`${checked} sheet(s) checked · ${created} new · ${updated} updated · ${unchanged} unchanged · ${failed} failed${failures.length?` · ${failures.slice(0,3).join(' | ')}`:''}`)}else setStatus('All connected sheets are up to date');window.dispatchEvent(new Event('propulse:leads-refresh'))}finally{running.current=false;setBusy(false)}};
 const syncAllEvent=useEffectEvent(syncAll);
 useEffect(()=>{if(!sources.length)return undefined;const syncIfVisible=()=>{if(document.visibilityState==='visible')syncAllEvent()};syncIfVisible();timer.current=setInterval(syncIfVisible,300000);document.addEventListener('visibilitychange',syncIfVisible);window.addEventListener('focus',syncIfVisible);return()=>{if(timer.current)clearInterval(timer.current);document.removeEventListener('visibilitychange',syncIfVisible);window.removeEventListener('focus',syncIfVisible)}},[sources.length]);
 const connect=async()=>{const value=input.trim();if(!value){setStatus('Paste a Google Sheets URL first');return}if(sources.some(source=>sourceRecord(source).url===value)){setStatus('This Google Sheet is already connected');return}setBusy(true);setStatus('Connecting and syncing…');try{const defaults=normalizeImportDefaults(linkDefaults);const result=await authRequest('/leads/google-sheet/sync',{method:'POST',body:JSON.stringify({url:value,defaults,force:true})});if(Number(result?.failed||0)===0&&result?.fingerprint)localStorage.setItem(fingerprintKey(value),result.fingerprint);else localStorage.removeItem(fingerprintKey(value));const next=[...sources,{url:value,defaults}];save(next);setInput('');setLinkDefaults(EMPTY_IMPORT_DEFAULTS);setStatus(`Connected · ${result.created||0} new · ${result.updated||0} updated · ${result.unchanged||0} unchanged · ${result.failed||0} failed`);window.dispatchEvent(new Event('propulse:leads-refresh'))}catch(e){setStatus(e.message||'Unable to connect Google Sheet')}finally{setBusy(false)}};
 const disconnect=url=>{localStorage.removeItem(fingerprintKey(url));const next=sources.filter(source=>sourceRecord(source).url!==url);save(next);setStatus(next.length?`Disconnected · ${next.length} sheet(s) still connected`:'All Google Sheets disconnected')};
 return <section className="v9-sheet-console">
  <header className="v9-sheet-console-head">
    <div className="v9-sheet-console-title">
      <span>AUTOMATIC LEAD SOURCES</span>
      <h2>Connected Google Sheets</h2>
      <p>New rows and edits are checked every 5 minutes while this page is active. Sync processing runs on the backend, and you can run a full check at any time.</p>
    </div>
    <span className={'v9-sheet-status-pill '+(sources.length?'connected':'empty')}>
      <i/>
      {sources.length?(sources.length+' Connected'):'No sheets connected'}
    </span>
  </header>

  <div className="v9-sheet-console-body">
    <section className="v9-sheet-connect-card">
      <div className="v9-sheet-section-title">
        <span>01</span>
        <div>
          <strong>Connect a lead source</strong>
          <small>Paste a shareable Google Sheets URL and choose optional defaults for blank row values.</small>
        </div>
      </div>

      <LeadImportDefaults value={linkDefaults} onChange={setLinkDefaults} disabled={busy}/>

      <div className="v9-sheet-connect-row">
        <div className="v9-sheet-url-field">
          <span>Google Sheets URL</span>
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."/>
        </div>
        <button className="v9-btn primary v9-sheet-primary-action" onClick={connect} disabled={busy}>{busy?'Syncing…':'Connect Sheet'}</button>
        {sources.length>0&&<button className="v9-btn secondary v9-sheet-check-action" onClick={()=>syncAll(true)} disabled={busy}>{busy?'Checking…':'Check All Now'}</button>}
      </div>
    </section>

    <section className="v9-sheet-rules">
      <div className="v9-sheet-section-title">
        <span>02</span>
        <div>
          <strong>Import precedence</strong>
          <small>Exact sheet values win first; configured fallbacks only fill what the source leaves blank.</small>
        </div>
      </div>
      <div className="v9-sheet-precedence">
        <div>
          <span className="v9-rule-icon">↔</span>
          <div><strong>Sharing</strong><span>Sheet Access Strategy / Max Buyers → Single Only override → Admin buyer-access configuration</span></div>
        </div>
        <div>
          <span className="v9-rule-icon">₹</span>
          <div><strong>Pricing</strong><span>Sheet exact 1 / 2 / 3 buyer price → Admin exact-tier price</span></div>
        </div>
      </div>
    </section>

    <section className="v9-sheet-sources">
      <div className="v9-sheet-section-title">
        <span>03</span>
        <div>
          <strong>Active sources</strong>
          <small>{sources.length?(sources.length+' sheet'+(sources.length===1?'':'s')+' connected to lead inventory.'):'Connect your first sheet to start automatic lead synchronization.'}</small>
        </div>
      </div>

      {sources.length>0?<div className="v9-sheet-source-list">
        {sources.map((source,i)=>{const record=sourceRecord(source);return <article className="v9-sheet-source-card" key={record.url}>
          <div className="v9-sheet-source-index">{String(i+1).padStart(2,'0')}</div>
          <div className="v9-sheet-source-copy">
            <div className="v9-sheet-source-name"><strong>{'Sheet '+(i+1)}</strong><span>Connected</span></div>
            <div className="v9-sheet-source-url" title={record.url}>{record.url}</div>
            <div className="v9-sheet-source-defaults"><span>Defaults</span><strong>{importDefaultsSummary(record.defaults)}</strong></div>
          </div>
          <button className="v9-btn secondary v9-sheet-disconnect" onClick={()=>disconnect(record.url)} disabled={busy}>Disconnect</button>
        </article>})}
      </div>:<div className="v9-sheet-empty-state">
        <span>↗</span>
        <strong>No Google Sheets connected yet</strong>
        <small>Paste a Google Sheets URL above to create your first automated lead source.</small>
      </div>}
    </section>
  </div>

  {status&&<div className="v9-sheet-sync-status"><span>{busy?'↻':'✓'}</span><p>{status}</p></div>}
 </section>;
}
