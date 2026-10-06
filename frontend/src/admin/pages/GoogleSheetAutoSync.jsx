import {useEffect,useState} from 'react';
import {authRequest} from '../../utils/auth';
import LeadImportDefaults from './LeadImportDefaults';
import {EMPTY_IMPORT_DEFAULTS,importDefaultsSummary,normalizeImportDefaults} from './leadImportDefaultsUtils';
import SheetImportPreview from '../../components/SheetImportPreview';

const STORAGE_KEY='propulse.admin.googleSheet.sources';
const legacyKey='propulse.admin.googleSheet.url';
const clean=v=>String(v??'').trim();
const fmtActivity=value=>{
 const date=value?new Date(value):null;
 return date&&!Number.isNaN(date.getTime())?date.toLocaleString():'Not yet';
};
const listData=v=>Array.isArray(v)?v:(Array.isArray(v?.data)?v.data:[]);
const sourceRecord=value=>({id:Number(value?.id)||null,url:clean(value?.source_url||value?.url),defaults:normalizeImportDefaults(value?.defaults),defaultIndustryId:value?.default_industry_id==null?'':String(value.default_industry_id),defaultIndustryName:clean(value?.default_industry_name),columnMappings:value?.column_mappings&&typeof value.column_mappings==='object'?value.column_mappings:{},lastPreviewSummary:value?.last_preview_summary||null,lastCheckedAt:value?.last_checked_at||null,lastSyncedAt:value?.last_synced_at||null,lastSyncCreated:Number(value?.last_sync_created)||0,lastSyncUpdated:Number(value?.last_sync_updated)||0,lastSyncUnchanged:Number(value?.last_sync_unchanged)||0,lastSyncFailed:Number(value?.last_sync_failed)||0,syncFailureCount:Number(value?.sync_failure_count)||0,lastSyncError:clean(value?.last_sync_error)});

function legacySources(){
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  const rows=Array.isArray(saved)?saved.filter(Boolean).map(value=>typeof value==='string'?{url:value,defaults:EMPTY_IMPORT_DEFAULTS}:{url:clean(value?.url),defaults:normalizeImportDefaults(value?.defaults)}).filter(x=>x.url):[];
  const old=clean(localStorage.getItem(legacyKey));
  if(old&&!rows.some(x=>x.url===old))rows.push({url:old,defaults:EMPTY_IMPORT_DEFAULTS});
  return rows;
 }catch{return[]}
}
function clearLegacySources(){try{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(legacyKey)}catch{}}

export default function GoogleSheetAutoSync(){
 const[sources,setSources]=useState([]),[industries,setIndustries]=useState([]),[input,setInput]=useState(''),[linkDefaults,setLinkDefaults]=useState(EMPTY_IMPORT_DEFAULTS),[linkDefaultIndustryId,setLinkDefaultIndustryId]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[removingId,setRemovingId]=useState(null),[savingDefaultId,setSavingDefaultId]=useState(null),[preview,setPreview]=useState(null),[columnMappings,setColumnMappings]=useState({}),[previewStale,setPreviewStale]=useState(false);
 const loadConnections=async({migrateLegacy=false}={})=>{const current=listData(await authRequest('/leads/google-sheet/connections')).map(sourceRecord).filter(x=>x.id&&x.url);if(migrateLegacy){const known=new Set(current.map(x=>x.url));const legacy=legacySources().filter(x=>!known.has(x.url));if(legacy.length){setStatus(`Migrating ${legacy.length} browser-only sheet connection(s)…`);for(const item of legacy){try{const analyzed=await authRequest('/leads/google-sheet/preview',{method:'POST',body:JSON.stringify({url:item.url,defaults:item.defaults,columnMappings:{}})});await authRequest('/leads/google-sheet/connections',{method:'POST',body:JSON.stringify({url:item.url,defaults:item.defaults,columnMappings:analyzed.columnMappings||{},previewToken:analyzed.previewToken})})}catch(e){setStatus(`Could not migrate ${item.url}: ${e.message||'sync failed'}`)}}clearLegacySources();const migrated=listData(await authRequest('/leads/google-sheet/connections')).map(sourceRecord).filter(x=>x.id&&x.url);setSources(migrated);return migrated}}setSources(current);return current};
 useEffect(()=>{let active=true;(async()=>{try{const[result,industryRows]=await Promise.all([loadConnections({migrateLegacy:true}),authRequest('/industries').catch(()=>[])]);if(!active)return;setIndustries(listData(industryRows));if(result.length)setStatus('Automatic backend sync follows the Admin-controlled schedule above.')}catch(e){if(active)setStatus(e.message||'Unable to load Google Sheet connections')}})();return()=>{active=false}},[]);
 const syncOne=async(source,force=true)=>{const record=sourceRecord(source);if(!record.id)throw new Error('Google Sheet connection is missing an ID');const result=await authRequest(`/leads/google-sheet/connections/${record.id}/sync`,{method:'POST',body:JSON.stringify({force})});return result?.sync||result};
 const syncAll=async()=>{if(busy||!sources.length)return;setBusy(true);let checked=0,updated=0,created=0,unchanged=0,failed=0;const failures=[];try{for(const source of sources){try{const result=await syncOne(source,true);checked++;updated+=result?.updated||0;created+=result?.created||0;unchanged+=result?.unchanged||0;failed+=result?.failed||0;failures.push(...(result?.failures||[]))}catch(e){failed++;failures.push(`${source.url}: ${e.message||'Unable to sync'}`)}}await loadConnections();setStatus(`${checked} sheet(s) checked · ${created} new · ${updated} updated · ${unchanged} unchanged · ${failed} failed${failures.length?` · ${failures.slice(0,3).join(' | ')}`:''}`);window.dispatchEvent(new Event('propulse:leads-refresh'))}finally{setBusy(false)}};
 const analyze=async()=>{const value=input.trim();if(!value){setStatus('Paste a Google Sheets URL first');return}setBusy(true);setStatus('Analyzing sheet without importing leads…');try{const defaults=normalizeImportDefaults(linkDefaults);const result=await authRequest('/leads/google-sheet/preview',{method:'POST',body:JSON.stringify({url:value,defaults,columnMappings,defaultIndustryId:linkDefaultIndustryId||null})});setPreview(result);setColumnMappings(result?.columnMappings||{});setPreviewStale(false);const summary=result?.summary||{};setStatus(`Preview ready · ${summary.valid||0} valid · ${summary.warning||0} warnings · ${summary.invalid||0} invalid`)}catch(e){setPreview(null);setStatus(e.message||'Unable to analyze Google Sheet')}finally{setBusy(false)}};
 const connect=async()=>{const value=input.trim();if(!value){setStatus('Paste a Google Sheets URL first');return}if(sources.some(source=>source.url===value)){setStatus('This Google Sheet is already connected');return}if(!preview||previewStale){setStatus('Analyze the current URL, defaults and column mapping before activation');return}if(Number(preview?.summary?.invalid||0)>0){setStatus('Fix invalid rows or mappings, then analyze again before activation');return}setBusy(true);setStatus('Activating automatic sync…');try{const defaults=normalizeImportDefaults(linkDefaults);const result=await authRequest('/leads/google-sheet/connections',{method:'POST',body:JSON.stringify({url:value,defaults,columnMappings,previewToken:preview.previewToken,defaultIndustryId:linkDefaultIndustryId||null})});await loadConnections();setInput('');setLinkDefaults(EMPTY_IMPORT_DEFAULTS);setLinkDefaultIndustryId('');setColumnMappings({});setPreview(null);setPreviewStale(false);const sync=result?.sync||{};setStatus(`Connected · ${sync.created||0} new${sync.quarantined?` · ${sync.quarantined} quarantined`:''} · ${sync.updated||0} updated · ${sync.unchanged||0} unchanged · ${sync.failed||0} failed`);window.dispatchEvent(new Event('propulse:leads-refresh'))}catch(e){setStatus(e.message||'Unable to connect Google Sheet')}finally{setBusy(false)}};
 const updateDefaultIndustry=async(source,value)=>{const record=sourceRecord(source);if(!record.id||busy||savingDefaultId)return;setSavingDefaultId(record.id);setStatus('Saving Default Industry and re-syncing…');try{const result=await authRequest(`/leads/google-sheet/connections/${record.id}/default-industry`,{method:'PUT',body:JSON.stringify({defaultIndustryId:value||null})});await loadConnections();const sync=result?.sync||result;setStatus(`Default Industry saved · ${sync.created||0} new · ${sync.updated||0} updated · ${sync.failed||0} failed`);window.dispatchEvent(new Event('propulse:leads-refresh'))}catch(e){setStatus(e.message||'Unable to update Default Industry')}finally{setSavingDefaultId(null)}};
 const removeConnection=async source=>{const record=sourceRecord(source);if(!record.id||busy||removingId)return;const confirmed=window.confirm('Delete this Google Sheet connection?\n\nAutomatic sync will stop for this sheet. Leads already imported from it will stay in lead inventory.');if(!confirmed)return;setBusy(true);setRemovingId(record.id);setStatus('Removing Google Sheet connection…');try{await authRequest(`/leads/google-sheet/connections/${record.id}`,{method:'DELETE'});setSources(current=>current.filter(item=>item.id!==record.id));setStatus('Google Sheet connection deleted. Existing imported leads were kept.')}catch(e){setStatus(e.message||'Unable to delete Google Sheet connection')}finally{setRemovingId(null);setBusy(false)}};
 return <section className="v9-sheet-console">
  <header className="v9-sheet-console-head">
    <div className="v9-sheet-console-title">
      <span>AUTOMATIC LEAD SOURCES</span>
      <h2>Connected Google Sheets</h2>
      <p>Connected sheets are stored in the database and checked by the backend on the Admin-controlled schedule, even when this page is closed.</p>
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

      <LeadImportDefaults value={linkDefaults} onChange={value=>{setLinkDefaults(value);if(preview)setPreviewStale(true)}} disabled={busy}/>

      <label className="v9-sheet-url-field">
        <span>Default Industry for blank classification</span>
        <select value={linkDefaultIndustryId} onChange={e=>{setLinkDefaultIndustryId(e.target.value);if(preview)setPreviewStale(true)}} disabled={busy}>
          <option value="">None — require Industry / Service / Subservice in sheet</option>
          {industries.map(industry=><option key={industry.id} value={industry.id}>{industry.name}</option>)}
        </select>
      </label>

      <div className="v9-sheet-connect-row">
        <div className="v9-sheet-url-field">
          <span>Google Sheets URL</span>
          <input value={input} onChange={e=>{setInput(e.target.value);if(preview)setPreviewStale(true)}} placeholder="https://docs.google.com/spreadsheets/d/..."/>
        </div>
        <button className="v9-btn primary v9-sheet-primary-action" onClick={analyze} disabled={busy}>{busy?'Analyzing…':preview?'Re-analyze':'Analyze Sheet'}</button>
        {preview&&<button className="v9-btn secondary v9-sheet-check-action" onClick={connect} disabled={busy||previewStale||Number(preview?.summary?.invalid||0)>0}>{busy?'Activating…':'Activate Sync'}</button>}
        {sources.length>0&&<button className="v9-btn secondary v9-sheet-check-action" onClick={syncAll} disabled={busy}>{busy?'Checking…':'Check All Now'}</button>}
      </div>
      <SheetImportPreview preview={preview} mappings={columnMappings} stale={previewStale} disabled={busy} onMappingsChange={next=>{setColumnMappings(next);setPreviewStale(true)}}/>
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
        {sources.map((source,i)=>{const record=sourceRecord(source);return <article className="v9-sheet-source-card" key={record.id}>
          <div className="v9-sheet-source-index">{String(i+1).padStart(2,'0')}</div>
          <div className="v9-sheet-source-copy">
            <div className="v9-sheet-source-name"><strong>{'Sheet '+(i+1)}</strong><span>Connected</span></div>
            <div className="v9-sheet-source-url" title={record.url}>{record.url}</div>
            <div className="v9-sheet-source-defaults"><span>Defaults</span><strong>{importDefaultsSummary(record.defaults)}</strong></div><div className="v9-sheet-source-defaults"><span>Mappings</span><strong>{Object.values(record.columnMappings||{}).filter(Boolean).length} columns</strong></div>
            <div className="v9-sheet-source-health">
              <div><span>Last checked</span><strong>{fmtActivity(record.lastCheckedAt)}</strong></div>
              <div><span>Last changed</span><strong>{fmtActivity(record.lastSyncedAt)}</strong></div>
              <div><span>Last result</span><strong>{record.lastSyncCreated} new · {record.lastSyncUpdated} updated · {record.lastSyncUnchanged} unchanged · {record.lastSyncFailed} failed</strong></div>
            </div>
            {(record.syncFailureCount>0||record.lastSyncError)&&<div className="v9-sheet-source-warning">Sync needs attention{record.lastSyncError?': '+record.lastSyncError:''}</div>}

            <label className="v9-sheet-source-defaults"><span>Default Industry</span><select value={record.defaultIndustryId} disabled={busy||savingDefaultId===record.id} onChange={e=>updateDefaultIndustry(record,e.target.value)}><option value="">None — require sheet classification</option>{industries.map(industry=><option key={industry.id} value={industry.id}>{industry.name}</option>)}</select></label>
          </div>
          <button type="button" className="v9-btn v9-sheet-delete" onClick={()=>removeConnection(record)} disabled={busy} aria-label={`Delete Google Sheet connection ${i+1}`} title="Delete connection and stop future sync">⌫ <span>{removingId===record.id?'Deleting…':'Delete connection'}</span></button>
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
