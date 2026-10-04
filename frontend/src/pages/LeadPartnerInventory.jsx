import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import LeadPartnerSidebar from '../components/LeadPartnerSidebar';
import { useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import { downloadCsv } from '../utils/csv';
import './LeadPartnerHome.css';
import './LeadPartnerInventory.css';
import SheetImportPreview from '../components/SheetImportPreview';

const statusLabel = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
const formatDate = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';
const detailLabel = key => String(key || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').replace(/\b\w/g, x => x.toUpperCase());

function downloadCsvSample() {
  const headers = ['Lead ID','Industry','Service','Subservice','Pincode','Customer Name','Customer Phone','Customer Email','Requirement','Property Type','Budget','Source','Notes','Lead Type','Access Strategy','Buyer Capacity','Release to 2 Hours','Release to 3 Hours','Pro Early Access','Exclusive Delay Days','Pro 1 Buyer','WhatsApp Number','STATUS','Remarks','CONTACTED BY','NEXT FOLLOWUP','How soon do you want to buy?','Job title'];
  const rows = [
    ['LP-001','REPLACE WITH ACTIVE INDUSTRY','','','500001','Config Example','9876500000','config@example.com','Blank access and price fields use configured Basic defaults','Residential','2500000','Website','Configuration fallback','basic','','','','','FALSE','','','9876500000','FOLLOW UP','Call tomorrow','Ravi','Tomorrow','Right away','Owner'],
    ['LP-002','REPLACE WITH ACTIVE INDUSTRY','','','500001','Override Example','9876500001','override@example.com','Exact sheet access and Pro base price override configuration','Residential','3000000','Website','Sheet override','premium','auto_release','3','48','96','TRUE','1','1500','9876500001','NEW','','','','','Owner']
  ];
  const esc = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers,...rows].map(values => values.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'propulse-lead-partner-upload-sample.csv'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

export default function LeadPartnerInventory() {
  const navigate = useNavigate(); const user = getUser(); const fileRef = useRef(null);
  const [data,setData]=useState({data:[],stats:{}}); const [loading,setLoading]=useState(true); const [importing,setImporting]=useState(false); const [sheetBusy,setSheetBusy]=useState(false); const [syncingId,setSyncingId]=useState(null); const [sheetUrl,setSheetUrl]=useState(''); const [sheetDefaultIndustryId,setSheetDefaultIndustryId]=useState(''); const [sheetPreview,setSheetPreview]=useState(null); const [sheetMappings,setSheetMappings]=useState({}); const [sheetPreviewStale,setSheetPreviewStale]=useState(false); const [savingDefaultId,setSavingDefaultId]=useState(null); const [search,setSearch]=useState(''); const [status,setStatus]=useState('all'); const [industryId,setIndustryId]=useState('all'); const [cityId,setCityId]=useState('all'); const [connections,setConnections]=useState([]); const [message,setMessage]=useState(null); const [expanded,setExpanded]=useState({}); const [workspace,setWorkspace]=useState('leads'); const [view,setView]=useState('grid');
  const load=useCallback(async()=>{try{setLoading(true);const params=new URLSearchParams({status,search,industryId,cityId});setData(await authRequest(`/lead-partner/inventory?${params}`));}catch(e){setMessage({type:'error',text:e.message});}finally{setLoading(false);}},[status,search,industryId,cityId]);
  const loadConnections=useCallback(async()=>{try{const result=await authRequest('/lead-partner/inventory/sheets');setConnections(result?.connections||[]);}catch(e){setMessage({type:'error',text:e.message});}},[]);
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[load]); useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)loadConnections()});return()=>{active=false}},[loadConnections]);
  async function analyzeGoogleSheet(){
    if(!sheetUrl.trim())return setMessage({type:'error',text:'Enter a Google Sheets URL.'});
    try{
      setSheetBusy(true);setMessage(null);
      const result=await authRequest('/lead-partner/inventory/sheets/preview',{method:'POST',body:JSON.stringify({url:sheetUrl.trim(),defaultIndustryId:sheetDefaultIndustryId||null,columnMappings:sheetMappings})});
      setSheetPreview(result);setSheetMappings(result?.columnMappings||{});setSheetPreviewStale(false);
      const summary=result?.summary||{};
      setMessage({type:Number(summary.invalid||0)>0?'error':'success',text:`Preview ready. ${summary.valid||0} valid, ${summary.warning||0} warnings, ${summary.invalid||0} invalid.`});
    }catch(e){setSheetPreview(null);setMessage({type:'error',text:e.message});}
    finally{setSheetBusy(false);}
  }
  async function connectGoogleSheet(e){
    e.preventDefault();
    if(!sheetUrl.trim())return setMessage({type:'error',text:'Enter a Google Sheets URL.'});
    if(!sheetPreview||sheetPreviewStale)return setMessage({type:'error',text:'Analyze the current URL, Default Industry and column mapping before activation.'});
    if(Number(sheetPreview?.summary?.invalid||0)>0)return setMessage({type:'error',text:'Fix invalid rows or mappings, then analyze again before activation.'});
    try{
      setSheetBusy(true);setMessage(null);
      const r=await authRequest('/lead-partner/inventory/sheets',{method:'POST',body:JSON.stringify({url:sheetUrl.trim(),defaultIndustryId:sheetDefaultIndustryId||null,columnMappings:sheetMappings,previewToken:sheetPreview.previewToken})});
      setSheetUrl('');setSheetDefaultIndustryId('');setSheetPreview(null);setSheetMappings({});setSheetPreviewStale(false);
      setMessage({type:r.failed?'error':'success',text:`Sheet connected. Imported ${r.created} leads${r.quarantined?` · ${r.quarantined} quarantined`:''}. ${r.duplicate} duplicates, ${r.failed} failed.${r.failures?.length?` First failure: ${r.failures[0]}`:''}`});
      await Promise.all([load(),loadConnections()]);
    }catch(e){setMessage({type:'error',text:e.message});}
    finally{setSheetBusy(false);}
  }
  async function syncSheet(id){try{setSyncingId(id);setMessage(null);const r=await authRequest(`/lead-partner/inventory/sheets/${id}/sync`,{method:'POST'});setMessage({type:r.failed?'error':'success',text:`Sync complete. Imported ${r.created} leads${r.quarantined?` · ${r.quarantined} quarantined`:''}. ${r.duplicate} duplicates, ${r.failed} failed.${r.failures?.length?` First failure: ${r.failures[0]}`:''}`});await Promise.all([load(),loadConnections()]);}catch(e){setMessage({type:'error',text:e.message});}finally{setSyncingId(null);}}
  async function updateSheetDefaultIndustry(id,value){
    try{
      setSavingDefaultId(id);setMessage(null);
      const r=await authRequest(`/lead-partner/inventory/sheets/${id}/default-industry`,{method:'PUT',body:JSON.stringify({defaultIndustryId:value||null})});
      setMessage({type:r.failed?'error':'success',text:`Default Industry saved and sheet re-synced. Imported ${r.created||0} leads${r.quarantined?` · ${r.quarantined} quarantined`:''}. ${r.duplicate||0} duplicates, ${r.failed||0} failed.${r.failures?.length?` First failure: ${r.failures[0]}`:''}`});
      await Promise.all([load(),loadConnections()]);
    }catch(e){setMessage({type:'error',text:e.message});}
    finally{setSavingDefaultId(null);}
  }
  async function disconnectSheet(id){if(!window.confirm('Disconnect this Google Sheet? Existing imported leads will remain in your inventory.'))return;try{setSheetBusy(true);await authRequest(`/lead-partner/inventory/sheets/${id}`,{method:'DELETE'});setMessage({type:'success',text:'Google Sheet disconnected. Existing leads were not deleted.'});await loadConnections();}catch(e){setMessage({type:'error',text:e.message});}finally{setSheetBusy(false);}}
  async function importCsv(file){if(!file)return;if(!/\.csv$/i.test(file.name))return setMessage({type:'error',text:'Please export the sheet as CSV before uploading.'});try{setImporting(true);setMessage(null);const csv=await file.text();const r=await authRequest('/lead-partner/inventory/import/csv',{method:'POST',body:JSON.stringify({csv})});setMessage({type:r.failed?'error':'success',text:`Imported ${r.created} leads${r.quarantined?` · ${r.quarantined} quarantined`:''}. ${r.duplicate} duplicates, ${r.failed} failed.${r.failures?.length?` First failure: ${r.failures[0]}`:''}`});await load();}catch(e){setMessage({type:'error',text:e.message});}finally{setImporting(false);if(fileRef.current)fileRef.current.value='';}}
  const rows=data.data||[];

  function signOut(){clearSession();navigate('/login',{replace:true});}
  const activeConnections=connections.filter(x=>x.status==='active'); const money=v=>Number(v||0)>0?`₹${Number(v).toLocaleString('en-IN',{maximumFractionDigits:2})}`:'—'; const getPrice=lead=>lead.partner_base_pricing?.shares?.[0]?.price??lead.pricing?.shares?.[0]?.price??lead.price; const getBuyerCount=lead=>lead.buyer_count??lead.buyers_count??0; const buyerAccess=lead=>lead.access_strategy==='permanent_single'?'Single Buyer':lead.access_strategy==='auto_release'?`Auto · ${lead.effective_buyer_capacity||1} buyers`:`Shared · ${lead.effective_buyer_capacity||lead.buyer_capacity||3} buyers`; function exportCsv(){const h=['ID','Name','Phone','Service','Location','Price','Buyers','Buyer Access','Status','Added On'];downloadCsv('propulse-lead-inventory.csv',[h,...rows.map(l=>[l.id,l.customer_name||'',l.customer_phone||'',l.service_name||l.industry_name||'',l.city_name||'',getPrice(l)||'',getBuyerCount(l),buyerAccess(l),l.status||'',l.created_at||''])]);}
  return <div className="partner-shell">
    <LeadPartnerSidebar user={user} onSignOut={signOut} />
    <main className="partner-main">
      <header className="partner-topbar">
        <div className="partner-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Lead Inventory</strong></div>
      </header>

      <div className="partner-content">
        <section className="inventory-hero premium-page-hero">
          <div className="inventory-hero-copy">
            <span>LEAD PARTNER / INVENTORY</span>
            <h1>Lead inventory</h1>
            <p>Upload lead files, connect live Google Sheets and manage imported leads from separate workspaces.</p>
            <div className="inventory-hero-meta">
              <span><b>{rows.length}</b> leads in view</span>
              <span><b>{activeConnections.length}</b> active sheets</span>
              <span><b>{data.stats?.available??rows.filter(x=>(x.outcome_status||x.status)==='available').length}</b> available</span><span><b>{data.stats?.quarantined??rows.filter(x=>x.status==='quarantined').length}</b> quarantined</span>
            </div>
          </div>
          <div className="lp-workspace-status">
            <span>ACTIVE WORKSPACE</span>
            <strong>{workspace==='leads'?'My Leads':workspace==='upload'?'Upload Leads':'Google Sheets'}</strong>
            <small>{workspace==='leads'?'Search, filter and review inventory':workspace==='upload'?'Import CSV lead files safely':'Connect, sync and diagnose live sheets'}</small>
          </div>
        </section>

        <nav className="lp-inventory-workspaces" aria-label="Lead inventory workspaces">
          <button type="button" className={workspace==='leads'?'active':''} onClick={()=>setWorkspace('leads')}>
            <span className="lp-workspace-icon">▦</span>
            <div><strong>My Leads</strong><small>{rows.length} leads currently in view</small></div>
            <b>{data.stats?.total??rows.length}</b>
          </button>
          <button type="button" className={workspace==='upload'?'active':''} onClick={()=>setWorkspace('upload')}>
            <span className="lp-workspace-icon">↥</span>
            <div><strong>Upload Leads</strong><small>CSV import with duplicate checks</small></div>
            <b>CSV</b>
          </button>
          <button type="button" className={workspace==='sheets'?'active':''} onClick={()=>setWorkspace('sheets')}>
            <span className="lp-workspace-icon">▣</span>
            <div><strong>Google Sheets</strong><small>Automatic sync schedule managed by Admin</small></div>
            <b>{activeConnections.length}</b>
          </button>
        </nav>

        {message&&<div className={`partner-alert ${message.type}`}><strong>{message.type==='success'?'Operation complete':'Needs attention'}</strong><span>{message.text}</span></div>}
        <input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={e=>importCsv(e.target.files?.[0])}/>

        {workspace==='upload'&&<section className="lp-inventory-workspace lp-upload-card">
          <header className="lp-workspace-head">
            <div><span>UPLOAD LEADS</span><h2>Import lead file</h2><p>Keep file uploads separate from live sheet automation. Existing duplicate and PIN validation rules remain active.</p></div>
            <span className="lp-workspace-badge">CSV WORKSPACE</span>
          </header>
          <div className="lp-upload-grid">
            <article className="lp-upload-primary">
              <span className="lp-big-icon">↥</span>
              <small>STEP 01</small>
              <h3>Choose your CSV file</h3>
              <p>Upload exported lead data. The importer keeps source fields, checks duplicates, validates PIN codes and uses your configured pricing/access defaults when cells are blank.</p>
              <div className="lp-chip-row"><span>Duplicate checks</span><span>PIN validation</span><span>Pricing fallback</span></div>
              <button type="button" onClick={()=>fileRef.current?.click()} disabled={importing}>{importing?'Importing…':'Choose CSV File'}</button>
            </article>
            <article className="lp-upload-secondary">
              <span className="lp-big-icon">⇩</span>
              <small>STEP 02</small>
              <h3>Use the sample format</h3>
              <p>Download the supported columns before preparing a new source file. You can leave configured pricing and buyer-access fields blank when defaults should apply.</p>
              <div className="lp-chip-row"><span>Dynamic fields</span><span>Lead type</span><span>Buyer strategy</span></div>
              <button type="button" className="secondary" onClick={downloadCsvSample}>Download Sample CSV</button>
            </article>
          </div>
          <div className="lp-workspace-note"><b>Import rule</b><span>CSV values win when supplied. Blank supported fields fall back to your configured Lead Partner pricing and buyer-access rules.</span></div>
        </section>}

        {workspace==='leads'&&<section className="inventory-panel"><div className="inventory-toolbar"><div className="inventory-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone, service, location or lead ID..."/></div><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All Status</option><option value="available">Available</option><option value="quarantined">Quarantined</option><option value="paused">Paused</option><option value="sold">Sold</option><option value="refunded">Refunded</option><option value="fake">Verified Fake</option><option value="expired">Expired Access</option><option value="closed">Closed</option><option value="invalid">Invalid</option></select>
<select value={industryId} onChange={e=>setIndustryId(e.target.value)}><option value="all">All Industries</option>{(data.filters?.industries||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
<select value={cityId} onChange={e=>setCityId(e.target.value)}><option value="all">All Cities</option>{(data.filters?.cities||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
<select><option>Date Range</option></select></div><div className="inventory-toolbar-bottom"><div><button onClick={exportCsv}>⇩ Export</button><button type="button" className={view==='list'?'selected':''} aria-label="List view" onClick={()=>setView('list')}>☷</button><button type="button" className={view==='grid'?'selected':''} aria-label="Grid view" onClick={()=>setView('grid')}>▦</button></div></div>
          <div className="partner-table-wrap">{loading?<div className="partner-empty">Loading inventory…</div>:!data.data?.length?<div className="partner-empty">No partner leads found.</div>:view==='grid'?<div className="inventory-grid-view">{data.data.map(lead=><article key={lead.id} className={`inventory-grid-card ${lead.status==='quarantined'?'quarantined':''}`}><div className="inventory-grid-top"><span>#{lead.id}</span><span className={`partner-status ${lead.outcome_status||lead.status}`}>{statusLabel(lead.outcome_status||lead.status)}</span></div><h3>{lead.customer_name||'—'}</h3><p>{lead.industry_name||'Industry'} · {lead.service_name||'Service'}</p><div className="inventory-grid-meta"><span><small>Location</small><b>{lead.city_name||'—'}</b></span><span><small>Buyers</small><b>{lead.buyer_count??getBuyerCount(lead)}/{lead.effective_buyer_capacity||lead.buyer_capacity||3}</b></span><span><small>Price</small><b>{money(getPrice(lead))}</b></span></div>{lead.status==='quarantined'&&<div className="inventory-quality-hold"><span>QUALITY HOLD · {lead.quality_gate_score===null||lead.quality_gate_score===undefined?'—':Number(lead.quality_gate_score).toFixed(1)+'/100'}</span><small>{Array.isArray(lead.quality_gate_reasons)&&lead.quality_gate_reasons.length?lead.quality_gate_reasons.map(x=>x.message||x.code).join(' · '):'Awaiting Admin quality review.'}</small></div>}<button type="button" onClick={()=>setExpanded(x=>({...x,[lead.id]:!x[lead.id]}))}>{expanded[lead.id]?'Hide details':'View details'}</button>{expanded[lead.id]&&<div className="inventory-grid-details">{Object.entries(lead.custom_fields||{}).filter(([k,v])=>String(v??'').trim()&&k!=='buyerCapacity').map(([k,v])=><div key={k}><small>{detailLabel(k)}</small><span>{String(v)}</span></div>)}</div>}</article>)}</div>:<table className="partner-table"><thead><tr><th>ID</th><th>NAME</th><th>PHONE</th><th>SERVICE</th><th>LOCATION</th><th>PRICE</th><th>BUYERS</th><th>STATUS</th><th>ADDED ON</th><th>ACTIONS</th></tr></thead><tbody>{data.data.map(lead=>{const details=Object.entries(lead.custom_fields||{}).filter(([k,v])=>String(v??'').trim()&&k!=='buyerCapacity');const open=!!expanded[lead.id];return <Fragment key={lead.id}>
            <tr><td><button type="button" onClick={()=>setExpanded(x=>({...x,[lead.id]:!open}))} style={{border:'1px solid #dbe4f0',borderRadius:8,background:'#fff',cursor:'pointer',width:30,height:30}}>{open?'−':'+'}</button></td><td>#{lead.id}</td><td><b>{lead.customer_name||'—'}</b></td><td>{lead.customer_phone||'—'}</td><td>{lead.service_name||lead.industry_name||'—'}</td><td><span>⌖ {lead.city_name||'—'}</span><small>{lead.state_name||'—'}</small></td><td>{money(getPrice(lead))}</td><td>{lead.buyer_count??getBuyerCount(lead)}/{lead.effective_buyer_capacity||lead.buyer_capacity||3}</td><td><span className={`partner-status ${lead.outcome_status||lead.status}`}>{statusLabel(lead.outcome_status||lead.status)}</span></td><td>{new Date(lead.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td><td><button className="inventory-more" onClick={()=>setExpanded(x=>({...x,[lead.id]:!open}))}>⋮</button></td></tr>
            {open&&<tr><td colSpan="11"><div style={{padding:'18px',background:'#f8fafc',border:'1px solid #e5ebf3',borderRadius:12}}><div style={{fontWeight:800,marginBottom:12,color:'#173b70'}}>Complete lead details</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
<div><b>Lead ID</b><div>#{lead.id}</div></div><div><b>Name</b><div>{lead.customer_name||'—'}</div></div><div><b>Phone</b><div>{lead.customer_phone||'—'}</div></div><div><b>Email</b><div>{lead.customer_email||'—'}</div></div>
<div><b>Industry</b><div>{lead.industry_name||'—'}</div></div><div><b>Service</b><div>{lead.service_name||'—'}</div></div><div><b>Subservice</b><div>{lead.subservice_name||'—'}</div></div><div><b>State</b><div>{lead.state_name||'—'}</div></div><div><b>City</b><div>{lead.city_name||'—'}</div></div><div><b>Pincode</b><div>{lead.pincode||'—'}</div></div>{lead.status==='quarantined'&&<><div><b>Quality score</b><div>{lead.quality_gate_score===null||lead.quality_gate_score===undefined?'—':Number(lead.quality_gate_score).toFixed(1)+'/100'}</div></div><div><b>Quality hold</b><div>{Array.isArray(lead.quality_gate_reasons)&&lead.quality_gate_reasons.length?lead.quality_gate_reasons.map(x=>x.message||x.code).join(' · '):'Awaiting Admin review'}</div></div></>}
<div><b>Requirement</b><div>{lead.requirement||'—'}</div></div><div><b>Budget</b><div>{lead.budget||'—'}</div></div><div><b>Property type</b><div>{lead.property_type||'—'}</div></div><div><b>Source</b><div>{lead.source||'—'}</div></div><div><b>Lead type</b><div>{lead.lead_type||'—'}</div></div><div><b>Pro Early Access</b><div>{lead.is_exclusive?'Yes':'No'}</div></div><div><b>Current buyer access</b><div>{lead.effective_buyer_capacity||lead.buyer_capacity||3}</div></div><div><b>Status</b><div>{statusLabel(lead.outcome_status||lead.status)}</div></div><div><b>Added on</b><div>{formatDate(lead.created_at)}</div></div>
{details.map(([k,v])=><div key={k}><b>{detailLabel(k)}</b><div>{String(v)}</div></div>)}</div></div></td></tr>}
          </Fragment>})}</tbody></table>}</div>
        </section>}

        {workspace==='sheets'&&<section className="lp-inventory-workspace lp-sheets-workspace">
          <header className="lp-workspace-head">
            <div><span>GOOGLE SHEETS</span><h2>Automatic lead sources</h2><p>Connect live sources here. Sheet connections, defaults and sync failures stay separate from your lead inventory.</p></div>
            <span className="lp-workspace-badge live"><i/> MANAGED SYNC</span>
          </header>

          <div className="lp-sheet-connect-card">
            <div className="lp-sheet-connect-copy">
              <span className="lp-big-icon">▣</span>
              <div><small>NEW CONNECTION</small><h3>Connect Google Sheet</h3><p>Paste a shareable Google Sheets URL. An optional Default Industry is used only when a row has no Industry, Service or Subservice.</p></div>
            </div>
            <div className="lp-sheet-connect-form">
              <label><span>Google Sheets URL</span><input value={sheetUrl} onChange={e=>{setSheetUrl(e.target.value);if(sheetPreview)setSheetPreviewStale(true)}} placeholder="https://docs.google.com/spreadsheets/d/..."/></label>
              <label><span>Default Industry for blank rows</span><select value={sheetDefaultIndustryId} onChange={e=>{setSheetDefaultIndustryId(e.target.value);if(sheetPreview)setSheetPreviewStale(true)}}><option value="">None — require sheet classification</option>{(data.filters?.industries||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
              <div className="lp-sheet-preview-actions"><button type="button" onClick={analyzeGoogleSheet} disabled={sheetBusy}>{sheetBusy?'Analyzing…':sheetPreview?'Re-analyze':'Analyze Sheet'}</button>{sheetPreview&&<button type="button" className="secondary" onClick={connectGoogleSheet} disabled={sheetBusy||sheetPreviewStale||Number(sheetPreview?.summary?.invalid||0)>0}>{sheetBusy?'Activating…':'Activate Sync'}</button>}</div>
            </div>
          </div>
          <SheetImportPreview preview={sheetPreview} mappings={sheetMappings} stale={sheetPreviewStale} disabled={sheetBusy} onMappingsChange={next=>{setSheetMappings(next);setSheetPreviewStale(true)}}/>

          <section className="partner-panel partner-sheets-panel"><div className="partner-panel-head"><div><h2>Google Sheets connections</h2><p>{activeConnections.length} active connection{activeConnections.length===1?'':'s'}. Syncing imports only new/non-duplicate leads.</p></div></div>{!connections.length?<div className="partner-empty partner-sheet-empty">No Google Sheets connected yet.</div>:<div className="partner-sheet-list">{connections.map(c=>{const failures=Array.isArray(c.last_sync_failures)?c.last_sync_failures:[];const busy=syncingId===c.id;return <article className={`partner-sheet-row ${c.status==='disabled'?'disabled':''}`} key={c.id}><div className="partner-sheet-info"><div className="partner-sheet-title"><strong>Google Sheet</strong><span className={`partner-connection-status ${c.status}`}>{statusLabel(c.status)}</span></div><a href={c.source_url} target="_blank" rel="noreferrer">{c.source_url}</a><small>Spreadsheet: {c.spreadsheet_id} · Tab: {c.gid}</small><small>Approved mappings: {Object.values(c.column_mappings||{}).filter(Boolean).length} · Preview: {c.last_previewed_at?formatDate(c.last_previewed_at):'Legacy connection'}</small><label className="partner-sheet-default"><span>Default Industry for blank rows</span><select value={c.default_industry_id??''} disabled={savingDefaultId===c.id||busy||sheetBusy} onChange={e=>updateSheetDefaultIndustry(c.id,e.target.value)}><option value="">None — require sheet classification</option>{(data.filters?.industries||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><small>Last sync: {formatDate(c.last_synced_at)} · Created {c.last_sync_created??0} · Duplicates {c.last_sync_duplicate??0} · Failed {c.last_sync_failed??0}</small>{Array.isArray(c.last_sync_failure_summary)&&c.last_sync_failure_summary.length>0&&<div className="partner-sheet-failure-summary">{c.last_sync_failure_summary.map(x=><span key={x.category}>{x.category}: {x.count}</span>)}</div>}{failures.length>0&&<details className="partner-sheet-failures"><summary>View {failures.length} import failures</summary><ul>{failures.slice(0,30).map((x,i)=><li key={i}>{typeof x==='string'?x:x.message||JSON.stringify(x)}</li>)}</ul></details>}</div><div className="partner-sheet-actions">{c.status==='active'&&<button className="partner-action-btn primary" disabled={busy||sheetBusy} onClick={()=>syncSheet(c.id)}>{busy?'Syncing…':'Sync now'}</button>}{c.status==='active'&&<button className="partner-action-btn danger" disabled={busy||sheetBusy} onClick={()=>disconnectSheet(c.id)}>Disconnect</button>}</div></article>})}</div>}</section>
        </section>}
      </div>
    </main>
  </div>;
}
