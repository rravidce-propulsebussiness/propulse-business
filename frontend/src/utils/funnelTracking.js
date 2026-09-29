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
  questionKey=null,
  questionIndex=null,
  questionCount=null,
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
    questionKey:questionKey||undefined,
    questionIndex:questionIndex??undefined,
    questionCount:questionCount??undefined,
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


const oncePending=new Set()

export function trackFunnelEventOnce(eventType,options={}){
  const key=['propulse_funnel_once_v1',eventType,options.flowKey||'',options.questionKey||'',options.calculationId||''].join(':')
  try{
    if(sessionStorage.getItem(key))return Promise.resolve(false)
  }catch{}
  if(oncePending.has(key))return Promise.resolve(false)
  oncePending.add(key)
  const payload={
    eventId:opaque('evt'),
    sessionId:getSessionId(),
    eventType,
    flowKey:options.flowKey||undefined,
    flowType:options.flowType||undefined,
    calculationId:options.calculationId||undefined,
    questionKey:options.questionKey||undefined,
    questionIndex:options.questionIndex??undefined,
    questionCount:options.questionCount??undefined,
    source:options.source||undefined,
    pagePath:window.location.pathname,
    metadata:options.metadata||undefined,
  }
  return publicRequest('/customer-flows/events',{
    method:'POST',
    body:JSON.stringify(payload),
    timeoutMs:5000,
  }).then(()=>{
    try{sessionStorage.setItem(key,'1')}catch{}
    return true
  }).catch(()=>false).finally(()=>oncePending.delete(key))
}

export function funnelSessionId(){
  return getSessionId()
}
