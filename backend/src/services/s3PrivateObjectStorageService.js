const crypto=require('crypto');

const SERVICE='s3';
const ALGORITHM='AWS4-HMAC-SHA256';
const PREFIX='private-object-s3:';
const TIMEOUT_MS=10000;
const MAX_ERROR_BYTES=64*1024;
let probeCache=null,probeCacheAt=0;

function boolEnv(name,fallback=false){
  const raw=String(process.env[name]||'').trim();
  return raw?/^(1|true|yes|on)$/i.test(raw):fallback;
}
function driver(){return String(process.env.PRIVATE_OBJECT_STORAGE_DRIVER||'local').trim().toLowerCase()}
function isEnabled(){return driver()==='s3'}
function config(overrides={}){
  const endpoint=String(overrides.endpoint||process.env.PRIVATE_OBJECT_STORAGE_ENDPOINT||'').trim();
  const region=String(overrides.region||process.env.PRIVATE_OBJECT_STORAGE_REGION||'us-east-1').trim()||'us-east-1';
  const bucket=String(overrides.bucket||process.env.PRIVATE_OBJECT_STORAGE_BUCKET||'').trim();
  const accessKeyId=String(overrides.accessKeyId||process.env.PRIVATE_OBJECT_STORAGE_ACCESS_KEY_ID||'').trim();
  const secretAccessKey=String(overrides.secretAccessKey||process.env.PRIVATE_OBJECT_STORAGE_SECRET_ACCESS_KEY||'').trim();
  const sessionToken=String(overrides.sessionToken||process.env.PRIVATE_OBJECT_STORAGE_SESSION_TOKEN||'').trim();
  const forcePathStyle=overrides.forcePathStyle===undefined?boolEnv('PRIVATE_OBJECT_STORAGE_FORCE_PATH_STYLE',true):Boolean(overrides.forcePathStyle);
  const signedUrlSeconds=Math.min(300,Math.max(15,Number(overrides.signedUrlSeconds||process.env.PRIVATE_OBJECT_STORAGE_SIGNED_URL_SECONDS||60)||60));
  if(!endpoint||!bucket||!accessKeyId||!secretAccessKey)throw Object.assign(new Error('Private S3 object storage is not fully configured'),{code:'PRIVATE_OBJECT_STORAGE_NOT_CONFIGURED'});
  let endpointUrl;
  try{endpointUrl=new URL(endpoint)}catch{throw Object.assign(new Error('Private object storage endpoint is invalid'),{code:'PRIVATE_OBJECT_STORAGE_INVALID_ENDPOINT'})}
  if(!['http:','https:'].includes(endpointUrl.protocol))throw Object.assign(new Error('Private object storage endpoint must use HTTP or HTTPS'),{code:'PRIVATE_OBJECT_STORAGE_INVALID_ENDPOINT'});
  if(process.env.NODE_ENV==='production'&&endpointUrl.protocol!=='https:')throw Object.assign(new Error('Private object storage endpoint must use HTTPS in production'),{code:'PRIVATE_OBJECT_STORAGE_HTTPS_REQUIRED'});
  return{endpointUrl,region,bucket,accessKeyId,secretAccessKey,sessionToken,forcePathStyle,signedUrlSeconds};
}
function sha(value){return crypto.createHash('sha256').update(value).digest('hex')}
function hmac(key,value,encoding){return crypto.createHmac('sha256',key).update(value).digest(encoding)}
function signingKey(secret,date,region){
  return hmac(hmac(hmac(hmac(Buffer.from('AWS4'+secret),date),region),SERVICE),'aws4_request');
}
function timestamp(value=new Date()){
  const amzDate=new Date(value).toISOString().replace(/[:-]|\.\d{3}/g,'');
  return{amzDate,dateStamp:amzDate.slice(0,8)};
}
function enc(value){return encodeURIComponent(String(value)).replace(/[!'()*]/g,ch=>'%'+ch.charCodeAt(0).toString(16).toUpperCase())}
function safeDecode(value){try{return decodeURIComponent(value)}catch{return value}}
function canonicalPath(pathname){
  return String(pathname||'/').split('/').map((part,index)=>index===0?'':enc(safeDecode(part))).join('/')||'/';
}
function normalizeKey(value){
  const key=String(value||'').replace(/\\/g,'/').replace(/^\/+/,'');
  const parts=key.split('/');
  if(!key||key.length>900||parts.some(part=>!part||part==='.'||part==='..'))throw Object.assign(new Error('Private object key is invalid'),{code:'PRIVATE_OBJECT_STORAGE_INVALID_KEY'});
  return parts.map(part=>part.replace(/[^A-Za-z0-9._-]/g,'-')).join('/');
}
function objectUrl(key,cfg=config()){
  const clean=normalizeKey(key),url=new URL(cfg.endpointUrl.toString()),base=url.pathname.replace(/\/+$/,'');
  if(cfg.forcePathStyle)url.pathname=(base||'')+'/'+enc(cfg.bucket)+'/'+clean.split('/').map(enc).join('/');
  else{url.hostname=cfg.bucket+'.'+url.hostname;url.pathname=(base||'')+'/'+clean.split('/').map(enc).join('/')}
  url.search='';url.hash='';return url;
}
function canonicalQuery(params){
  return Object.entries(params).filter(([,v])=>v!==undefined&&v!==null)
    .map(([k,v])=>[enc(k),enc(v)]).sort((a,b)=>a[0]===b[0]?a[1].localeCompare(b[1]):a[0].localeCompare(b[0]))
    .map(([k,v])=>k+'='+v).join('&');
}
function canonicalHeaders(headers){
  const entries=Object.entries(headers).map(([k,v])=>[k.toLowerCase(),String(v).trim().replace(/\s+/g,' ')]).sort((a,b)=>a[0].localeCompare(b[0]));
  return{canonical:entries.map(([k,v])=>k+':'+v+'\n').join(''),signed:entries.map(([k])=>k).join(';')};
}
function authorizationHeaders(method,url,{body=Buffer.alloc(0),contentType,now=new Date(),cfg=config()}={}){
  const payload=Buffer.isBuffer(body)?body:Buffer.from(body||''),payloadHash=sha(payload),t=timestamp(now);
  const headers={host:url.host,'x-amz-content-sha256':payloadHash,'x-amz-date':t.amzDate};
  if(cfg.sessionToken)headers['x-amz-security-token']=cfg.sessionToken;
  if(contentType)headers['content-type']=contentType;
  const c=canonicalHeaders(headers);
  const request=[method.toUpperCase(),canonicalPath(url.pathname),'',c.canonical,c.signed,payloadHash].join('\n');
  const scope=[t.dateStamp,cfg.region,SERVICE,'aws4_request'].join('/');
  const stringToSign=[ALGORITHM,t.amzDate,scope,sha(request)].join('\n');
  const signature=hmac(signingKey(cfg.secretAccessKey,t.dateStamp,cfg.region),stringToSign,'hex');
  return Object.assign(headers,{Authorization:ALGORITHM+' Credential='+cfg.accessKeyId+'/'+scope+', SignedHeaders='+c.signed+', Signature='+signature});
}
function buildPresignedGetUrl(key,{expiresSeconds,now=new Date(),configOverride}={}){
  const cfg=config(configOverride||{}),url=objectUrl(key,cfg),t=timestamp(now);
  const expires=Math.min(604800,Math.max(1,Number(expiresSeconds||cfg.signedUrlSeconds)||60));
  const scope=[t.dateStamp,cfg.region,SERVICE,'aws4_request'].join('/');
  const params={'X-Amz-Algorithm':ALGORITHM,'X-Amz-Credential':cfg.accessKeyId+'/'+scope,'X-Amz-Date':t.amzDate,'X-Amz-Expires':String(expires),'X-Amz-SignedHeaders':'host'};
  if(cfg.sessionToken)params['X-Amz-Security-Token']=cfg.sessionToken;
  const query=canonicalQuery(params);
  const canonical=['GET',canonicalPath(url.pathname),query,'host:'+url.host+'\n','host','UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign=[ALGORITHM,t.amzDate,scope,sha(canonical)].join('\n');
  const signature=hmac(signingKey(cfg.secretAccessKey,t.dateStamp,cfg.region),stringToSign,'hex');
  return url.origin+url.pathname+'?'+query+'&X-Amz-Signature='+signature;
}
async function readLimited(response,maxBytes){
  const declared=Number(response.headers.get('content-length')||0);
  if(declared>maxBytes)throw Object.assign(new Error('Private object exceeds the allowed size'),{code:'PRIVATE_OBJECT_TOO_LARGE'});
  if(!response.body)return Buffer.alloc(0);
  const reader=response.body.getReader(),chunks=[];let total=0;
  try{
    while(true){
      const part=await reader.read();if(part.done)return Buffer.concat(chunks,total);
      const chunk=Buffer.from(part.value);total+=chunk.length;
      if(total>maxBytes){await reader.cancel().catch(()=>{});throw Object.assign(new Error('Private object exceeds the allowed size'),{code:'PRIVATE_OBJECT_TOO_LARGE'})}
      chunks.push(chunk);
    }
  }finally{reader.releaseLock()}
}
async function signedFetch(method,key,{body=Buffer.alloc(0),contentType}={}){
  const cfg=config(),url=objectUrl(key,cfg),payload=Buffer.isBuffer(body)?body:Buffer.from(body||'');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);timer.unref?.();
  try{
    const response=await fetch(url,{method,headers:authorizationHeaders(method,url,{body:payload,contentType,cfg}),body:['GET','HEAD','DELETE'].includes(method)?undefined:payload,signal:controller.signal});
    if(!response.ok){
      const errorBody=await readLimited(response,MAX_ERROR_BYTES).catch(()=>Buffer.alloc(0));
      const error=new Error('Private object storage request failed (HTTP '+response.status+')');
      error.code='PRIVATE_OBJECT_STORAGE_REQUEST_FAILED';error.providerStatus=response.status;error.providerMessage=errorBody.toString('utf8').slice(0,500);throw error;
    }
    return response;
  }catch(error){if(error?.name==='AbortError')throw Object.assign(new Error('Private object storage request timed out'),{code:'PRIVATE_OBJECT_STORAGE_TIMEOUT'});throw error}
  finally{clearTimeout(timer)}
}
async function putObject(key,data,{contentType='application/octet-stream'}={}){
  const buffer=Buffer.isBuffer(data)?data:Buffer.from(data||'');
  if(!buffer.length)throw Object.assign(new Error('Private object content is empty'),{code:'PRIVATE_OBJECT_EMPTY'});
  await signedFetch('PUT',key,{body:buffer,contentType});return normalizeKey(key);
}
async function deleteObject(key){try{await signedFetch('DELETE',key);return true}catch(error){if(error.providerStatus===404)return false;throw error}}
async function getObjectBuffer(key,{maxBytes=6*1024*1024}={}){
  const url=buildPresignedGetUrl(key),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);timer.unref?.();
  try{
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok)throw Object.assign(new Error('Private object read failed (HTTP '+response.status+')'),{code:'PRIVATE_OBJECT_STORAGE_READ_FAILED',providerStatus:response.status});
    return{buffer:await readLimited(response,Number(maxBytes)||6*1024*1024),contentType:String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()||null};
  }catch(error){if(error?.name==='AbortError')throw Object.assign(new Error('Private object storage read timed out'),{code:'PRIVATE_OBJECT_STORAGE_TIMEOUT'});throw error}
  finally{clearTimeout(timer)}
}
function makeReference(key){return PREFIX+normalizeKey(key)}
function parseReference(value){const raw=String(value||'');return raw.startsWith(PREFIX)?normalizeKey(raw.slice(PREFIX.length)):null}
function isReference(value){try{return Boolean(parseReference(value))}catch{return false}}
async function getSignedGetUrl(referenceOrKey,{expiresSeconds}={}){const safe=Math.min(300,Math.max(15,Number(expiresSeconds||config().signedUrlSeconds)||60));return buildPresignedGetUrl(parseReference(referenceOrKey)||normalizeKey(referenceOrKey),{expiresSeconds:safe})}
async function getMediaGetUrl(referenceOrKey,{expiresSeconds=3600}={}){
  const safe=Math.min(21600,Math.max(60,Number(expiresSeconds)||3600));
  return buildPresignedGetUrl(parseReference(referenceOrKey)||normalizeKey(referenceOrKey),{expiresSeconds:safe});
}
async function probe(){
  if(!isEnabled())return{provider:'local',configured:false,status:'disabled'};
  if(probeCache&&Date.now()-probeCacheAt<60000)return probeCache;
  const key='_health/propulse-'+process.pid+'-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.txt';
  try{
    await putObject(key,Buffer.from('ok'),{contentType:'text/plain'});
    const read=await getObjectBuffer(key,{maxBytes:16});if(read.buffer.toString()!=='ok')throw new Error('Private object storage probe returned unexpected content');
    await deleteObject(key);probeCache={provider:'s3',configured:true,status:'ready',bucket:config().bucket};probeCacheAt=Date.now();return probeCache;
  }catch(error){await deleteObject(key).catch(()=>{});throw error}
}

module.exports={PREFIX,driver,isEnabled,config,normalizeKey,makeReference,parseReference,isReference,putObject,deleteObject,getObjectBuffer,getSignedGetUrl,getMediaGetUrl,buildPresignedGetUrl,authorizationHeaders,probe,enc};
