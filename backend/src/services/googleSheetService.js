const MAX_SHEET_BYTES=5*1024*1024;
const SHEET_HOSTS=new Set(['docs.google.com']);
const MAX_REDIRECTS=3;

function parseGoogleSheetUrl(value){
  let url;
  try{url=new URL(String(value||'').trim())}catch{throw new Error('Enter a valid Google Sheets URL')}
  if(url.protocol!=='https:'||!SHEET_HOSTS.has(url.hostname))throw new Error('Only Google Sheets URLs are supported');
  const match=url.pathname.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if(!match)throw new Error('Google Sheets URL is not in a supported format');
  const spreadsheetId=match[1];
  let gid=url.searchParams.get('gid')||'';
  if(!gid&&url.hash){const hash=url.hash.match(/(?:^#|&)gid=(\d+)/);if(hash)gid=hash[1]}
  if(gid&&!/^\d+$/.test(gid))throw new Error('Google Sheet tab id (gid) must be numeric');
  return{spreadsheetId,gid:gid||'0'};
}

function validateGoogleSheetTarget(value){
  let url;
  try{url=new URL(String(value||''))}catch{throw new Error('Google Sheet redirect target is invalid')}
  if(url.protocol!=='https:'||!SHEET_HOSTS.has(url.hostname)||url.username||url.password)throw new Error('Google Sheet redirect target is not allowed');
  const match=url.pathname.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if(!match)throw new Error('Google Sheet redirect target is not allowed');
  return url;
}

async function fetchWithSafeRedirects(target,options={}){
  let current=validateGoogleSheetTarget(target);
  for(let redirects=0;redirects<=MAX_REDIRECTS;redirects+=1){
    const response=await fetch(current,{...options,redirect:'manual'});
    if(response.status<300||response.status>=400)return response;
    const location=response.headers.get('location');
    if(!location)throw new Error('Google Sheet redirect did not provide a destination');
    if(redirects===MAX_REDIRECTS)throw new Error('Google Sheet followed too many redirects');
    current=validateGoogleSheetTarget(new URL(location,current).toString());
  }
  throw new Error('Google Sheet redirect validation failed');
}

async function readCsvResponse(response){
  if(response.status===401||response.status===403)throw new Error('Google Sheet access is restricted. Set General access to Anyone with the link → Viewer, then try again');
  if(response.status>=300&&response.status<400)throw new Error('Google Sheet is not publicly accessible. Set General access to Anyone with the link → Viewer, then try again');
  if(!response.ok)throw new Error(`Google Sheet could not be read (HTTP ${response.status})`);
  const contentType=String(response.headers.get('content-type')||'').toLowerCase();
  if(contentType&&!contentType.includes('text/csv')&&!contentType.includes('text/plain'))throw new Error('Google Sheet did not return CSV data. Set General access to Anyone with the link → Viewer');
  const contentLength=Number(response.headers.get('content-length')||0);
  if(contentLength>MAX_SHEET_BYTES)throw new Error('Google Sheet is too large. Maximum supported size is 5 MB');
  const text=await response.text();
  if(Buffer.byteLength(text,'utf8')>MAX_SHEET_BYTES)throw new Error('Google Sheet is too large. Maximum supported size is 5 MB');
  if(!text.trim())throw new Error('Google Sheet is empty');
  return text;
}

async function fetchGoogleSheetCsv(sheetUrl){
  const {spreadsheetId,gid}=parseGoogleSheetUrl(sheetUrl);
  const urls=[
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`,
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`
  ];
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  let lastError=null;
  try{
    for(const target of urls){
      try{
        const response=await fetchWithSafeRedirects(target,{signal:controller.signal,headers:{Accept:'text/csv,text/plain;q=0.9'}});
        const csv=await readCsvResponse(response);
        return{csv,spreadsheetId,gid};
      }catch(error){
        lastError=error;
        if(/access is restricted|not publicly accessible/i.test(error.message))break;
      }
    }
    throw lastError||new Error('Failed to read Google Sheet');
  }catch(error){
    if(error.name==='AbortError')throw new Error('Google Sheet request timed out');
    throw error;
  }finally{clearTimeout(timeout)}
}

module.exports={parseGoogleSheetUrl,fetchGoogleSheetCsv,validateGoogleSheetTarget,fetchWithSafeRedirects};
