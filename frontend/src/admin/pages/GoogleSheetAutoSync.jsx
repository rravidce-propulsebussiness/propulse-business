import {useEffect,useRef,useState} from 'react';
import {authRequest} from '../../utils/auth';

const STORAGE_KEY='propulse.admin.googleSheet.url';
const FINGERPRINT_KEY='propulse.admin.googleSheet.fingerprint';

function canonicalizeCsv(csv){
  const aliases={post_code:'Pincode',postal_code:'Pincode',pin_code:'Pincode',full_name:'Customer Name',phone_number:'Customer Phone',email:'Customer Email',share_more_details_and_requirement:'Requirement',plot_location:'Location',lead_status:'Lead Status',created_time:'Created At'};
  const newline=csv.includes('\r\n')?'\r\n':'\n';
  const end=csv.indexOf(newline);
  const header=end<0?csv:csv.slice(0,end);
  const body=end<0?'':csv.slice(end);
  const cells=[];let cell='',quoted=false;
  for(let i=0;i<header.length;i++){const c=header[i];if(c==='"'){if(quoted&&header[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){cells.push(cell);cell=''}else cell+=c}cells.push(cell);
  const normalized=cells.map(raw=>{const quotedValue=/^"[\s\S]*"$/.test(raw);const value=quotedValue?raw.slice(1,-1).replace(/""/g,'"'):raw;const key=value.trim().toLowerCase().replace(/\s+/g,'_');const next=aliases[key]||value;return quotedValue?`"${next.replace(/"/g,'""')}"`:next});
  return normalized.join(',')+body;
}

async function fingerprint(text){
  if(window.crypto?.subtle){const data=new TextEncoder().encode(text);const hash=await window.crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('')}
  let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return String(h>>>0);
}

export default function GoogleSheetAutoSync(){
  const[url,setUrl]=useState(()=>localStorage.getItem(STORAGE_KEY)||''),[connected,setConnected]=useState(()=>Boolean(localStorage.getItem(STORAGE_KEY))),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);const running=useRef(false),timer=useRef(null);
  const triggerExistingImporter=async csv=>{const input=document.querySelector('input[type="file"][accept=".csv"]');if(!input)throw new Error('Lead CSV importer is not available on this page');const file=new File([csv],`google-sheet-${Date.now()}.csv`,{type:'text/csv'}),transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));const deadline=Date.now()+20000;while(Date.now()<deadline){await new Promise(r=>setTimeout(r,400));const button=[...document.querySelectorAll('button')].find(b=>b.textContent?.trim()==='Import Leads'&&!b.disabled);if(button){button.click();return true}}throw new Error('Lead import preview did not finish in time')};
  const sync=async(force=false)=>{if(running.current||!url.trim())return;running.current=true;setBusy(true);try{let result;try{const {csv}=await readSheetInBrowser(url);result={csv}}catch(browserError){result=await authRequest('/leads/google-sheet/preview',{method:'POST',body:JSON.stringify({url:url.trim()})})}const csv=canonicalizeCsv(result.csv||'');const next=await fingerprint(csv),previous=localStorage.getItem(FINGERPRINT_KEY);if(!force&&previous===next){setStatus('Connected · no new sheet changes');return}setStatus(previous?'New sheet data detected · importing…':'Sheet connected · checking existing leads…');await triggerExistingImporter(csv);localStorage.setItem(FINGERPRINT_KEY,next);setStatus('Connected · sheet checked automatically');window.dispatchEvent(new Event('propulse:leads-refresh'))}catch(error){setStatus(error.message||'Unable to sync Google Sheet')}finally{running.current=false;setBusy(false)}};
  useEffect(()=>{if(!connected||!url.trim())return undefined;sync();timer.current=setInterval(()=>sync(),30000);return()=>{if(timer.current)clearInterval(timer.current)}},[connected,url]);
  const connect=async()=>{if(!url.trim()){setStatus('Paste a Google Sheets URL first');return}localStorage.setItem(STORAGE_KEY,url.trim());localStorage.removeItem(FINGERPRINT_KEY);setConnected(true);await sync(true)};
  const disconnect=()=>{if(timer.current)clearInterval(timer.current);localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(FINGERPRINT_KEY);setConnected(false);setStatus('Google Sheet disconnected')};
  return <section style={{marginBottom:18,border:'1px solid #e6eaf0',borderRadius:18,padding:18,background:'#fff',boxShadow:'0 8px 28px rgba(15,23,42,.06)'}}><div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><div style={{fontSize:11,fontWeight:800,letterSpacing:'.12em',color:'#64748b'}}>AUTOMATIC LEAD SOURCE</div><h3 style={{margin:'5px 0 3px',fontSize:18}}>Google Sheet</h3><div style={{fontSize:13,color:'#64748b'}}>New rows are detected every 30 seconds and sent through the existing lead importer.</div></div><span style={{fontSize:12,fontWeight:700,padding:'7px 10px',borderRadius:999,background:connected?'#ecfdf5':'#f1f5f9',color:connected?'#047857':'#64748b'}}>{connected?'● Connected':'○ Not connected'}</span></div><div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." disabled={connected} style={{flex:'1 1 420px',minWidth:240,padding:'11px 13px',border:'1px solid #dbe1e8',borderRadius:10,outline:'none'}}/>{!connected?<button className="v9-btn primary" onClick={connect} disabled={busy}>{busy?'Connecting…':'Connect Sheet'}</button>:<button className="v9-btn secondary" onClick={disconnect}>Disconnect</button>}{connected&&<button className="v9-btn secondary" onClick={()=>sync(true)} disabled={busy}>{busy?'Checking…':'Check Now'}</button>}</div>{status&&<div style={{marginTop:10,fontSize:12,color:'#475569'}}>{status}</div>}</section>;
}

async function readSheetInBrowser(value){
  const url=new URL(String(value||'').trim());
  if(url.protocol!=='https:'||url.hostname!=='docs.google.com')throw new Error('Enter a valid Google Sheets URL');
  const match=url.pathname.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);if(!match)throw new Error('Google Sheets URL is not in a supported format');
  const gid=url.searchParams.get('gid')||(url.hash.match(/(?:^#|&)gid=(\d+)/)||[])[1]||'0';
  const targets=[`https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`,`https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${encodeURIComponent(gid)}`];let last='';
  for(const target of targets){try{const response=await fetch(target,{headers:{Accept:'text/csv,text/plain;q=0.9'}});if(!response.ok){last=`Google Sheet could not be read (HTTP ${response.status})`;continue}const text=await response.text();if(!text.trim()){last='Google Sheet is empty';continue}if(/<html|<title>/i.test(text.slice(0,500)))throw new Error('Google Sheet access is restricted. Set General access to Anyone with the link → Viewer');return{csv:text}}catch(error){last=error.message||last}}
  throw new Error(last||'Unable to read Google Sheet');
}
