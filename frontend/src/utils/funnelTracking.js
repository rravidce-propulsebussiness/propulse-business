import { publicRequest } from './auth'

const SESSION_KEY='propulse_funnel_session_v1'
let memorySession=''

function opaque(prefix='evt'){
  if(globalThis.crypto?.randomUUID)return (prefix+'_'+globalThis.crypto.randomUUID()).replaceAll('-','_')
  return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,18)
}

function getSessionId(){
  if(memorySession)return memorySession
  try{
    const existing=sessionStorage.getItem(SESSION_KEY)
    if(existing){memorySession=existing;return existing}
    const created=opaque('ses')
    sessionStorage.setItem(SESSION_KEY,created)
    memorySession=created
    return created
  }catch{
    memorySession=opaque('ses')
    return memorySession
  }
}

export function trackFunnelEvent(eventType,{
  flowKey=null,
  flowType=null,
  calculationId=null,
  source=null,
  metadata=null,
}={}){
  const payload={
    eventId:opaque('evt'),
    sessionId:getSessionId(),
    eventType,
    flowKey:flowKey||undefined,
    flowType:flowType||undefined,
    calculationId:calculationId||undefined,
    source:source||undefined,
    pagePath:window.location.pathname,
    metadata:metadata||undefined,
  }
  publicRequest('/customer-flows/events',{
    method:'POST',
    body:JSON.stringify(payload),
    timeoutMs:5000,
  }).catch(()=>{})
}

export function funnelSessionId(){
  return getSessionId()
}
