const MAX_SHEET_BYTES=5*1024*1024;
const SHEET_HOSTS=new Set(['docs.google.com']);

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

async function fetchGoogleSheetCsv(sheetUrl){
  const {spreadsheetId,gid}=parseGoogleSheetUrl(sheetUrl);
  const exportUrl=new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`);
  exportUrl.searchParams.set('format','csv');
  exportUrl.searchParams.set('gid',gid);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(exportUrl,{redirect:'manual',signal:controller.signal,headers:{Accept:'text/csv'}});
    if(response.status>=300&&response.status<400)throw new Error('Google Sheet is not publicly accessible. Share it so the sheet can be viewed, then try again');
    if(!response.ok)throw new Error(`Google Sheet could not be read (HTTP ${response.status})`);
    const contentType=String(response.headers.get('content-type')||'').toLowerCase();
    if(contentType&&!contentType.includes('text/csv')&&!contentType.includes('text/plain'))throw new Error('Google Sheet did not return CSV data. Make sure the sheet is accessible');
    const contentLength=Number(response.headers.get('content-length')||0);
    if(contentLength>MAX_SHEET_BYTES)throw new Error('Google Sheet is too large. Maximum supported size is 5 MB');
    const text=await response.text();
    if(Buffer.byteLength(text,'utf8')>MAX_SHEET_BYTES)throw new Error('Google Sheet is too large. Maximum supported size is 5 MB');
    if(!text.trim())throw new Error('Google Sheet is empty');
    return{csv:text,spreadsheetId,gid};
  }catch(error){
    if(error.name==='AbortError')throw new Error('Google Sheet request timed out');
    throw error;
  }finally{clearTimeout(timeout)}
}

module.exports={parseGoogleSheetUrl,fetchGoogleSheetCsv};
