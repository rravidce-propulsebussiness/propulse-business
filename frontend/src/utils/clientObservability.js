import {API_BASE_URL} from './api'

const recent=new Map()
const DEDUPE_MS=30000

function clean(value,max=3000){
  return String(value||'').replace(/\r/g,' ').slice(0,max)
}
function errorParts(error){
  if(error instanceof Error)return{message:error.message||error.name,stack:error.stack||null}
  if(typeof error==='string')return{message:error,stack:null}
  try{return{message:JSON.stringify(error),stack:null}}catch{return{message:String(error||'Unknown browser error'),stack:null}}
}
function shouldSend(key){
  const now=Date.now()
  const last=recent.get(key)||0
  if(now-last<DEDUPE_MS)return false
  recent.set(key,now)
  if(recent.size>100){
    for(const [item,time] of recent)if(now-time>DEDUPE_MS*4)recent.delete(item)
  }
  return true
}

export function reportClientError(error,{kind='client_error',componentStack=null}={}){
  if(typeof window==='undefined')return
  const parts=errorParts(error)
  const route=window.location.pathname||'/'
  const key=`${kind}|${route}|${parts.message}`
  if(!parts.message||!shouldSend(key))return
  const payload={
    kind:clean(kind,40),
    message:clean(parts.message,2000),
    stack:clean(parts.stack,5000),
    componentStack:clean(componentStack,3000),
    route:clean(route,300)
  }
  fetch(`${API_BASE_URL}/observability/client-errors`,{
    method:'POST',
    credentials:'include',
    keepalive:true,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  }).catch(()=>{})
}

export function installClientObservability(){
  if(typeof window==='undefined'||window.__propulseObservabilityInstalled)return
  window.__propulseObservabilityInstalled=true
  window.addEventListener('error',event=>{
    reportClientError(event.error||event.message,{kind:'window_error'})
  })
  window.addEventListener('unhandledrejection',event=>{
    reportClientError(event.reason,{kind:'unhandled_rejection'})
  })
}
