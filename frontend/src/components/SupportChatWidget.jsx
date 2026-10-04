import {useEffect,useMemo,useRef,useState} from 'react'
import {useLocation} from 'react-router-dom'
import {getUser,publicRequest} from '../utils/auth'
import {playSound} from '../utils/soundEffects'
import './SupportChatWidget.css'

const STORAGE_KEY='propulse_support_chat_v1'

function readStored(){
  try{
    const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')
    if(value?.id&&value?.token)return value
  }catch{}
  return null
}
function writeStored(value){
  try{
    if(value)localStorage.setItem(STORAGE_KEY,JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  }catch{}
}
function timeLabel(value){
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return ''
  return new Intl.DateTimeFormat('en-IN',{hour:'numeric',minute:'2-digit'}).format(date)
}

export default function SupportChatWidget(){
  const location=useLocation()
  const user=getUser()
  const [config,setConfig]=useState(null)
  const [open,setOpen]=useState(false)
  const [conversation,setConversation]=useState(null)
  const [token,setToken]=useState('')
  const [messages,setMessages]=useState([])
  const [form,setForm]=useState({name:'',email:'',phone:'',message:''})
  const [draft,setDraft]=useState('')
  const [loading,setLoading]=useState(true)
  const [sending,setSending]=useState(false)
  const [error,setError]=useState('')
  const lastSupportId=useRef(0)
  const messagesRef=useRef(null)

  const hidden=location.pathname.startsWith('/admin')
  const page=location.pathname+location.search+location.hash

  const headers=useMemo(()=>token?{'X-Support-Chat-Token':token}:{},[token])

  function applyThread(value,{sound=false}={}){
    if(!value?.conversation)return
    const nextMessages=Array.isArray(value.messages)?value.messages:[]
    const newestSupport=Math.max(0,...nextMessages.filter(item=>item.senderType==='support').map(item=>Number(item.id)||0))
    if(sound&&lastSupportId.current&&newestSupport>lastSupportId.current)playSound('notification')
    lastSupportId.current=Math.max(lastSupportId.current,newestSupport)
    setConversation(value.conversation)
    setMessages(nextMessages)
  }

  useEffect(()=>{
    let active=true
    publicRequest('/support-chat/config')
      .then(async next=>{
        if(!active)return
        setConfig(next)
        if(next?.enabled===false)return
        const stored=readStored()
        if(stored){
          setToken(stored.token)
          try{
            const thread=await publicRequest('/support-chat/conversations/'+encodeURIComponent(stored.id),{headers:{'X-Support-Chat-Token':stored.token}})
            if(active)applyThread(thread)
            return
          }catch{
            writeStored(null)
            if(active){setConversation(null);setMessages([]);setToken('')}
          }
        }
        if(user){
          try{
            const current=await publicRequest('/support-chat/current')
            if(active&&current?.conversation)applyThread(current)
          }catch{}
        }
      })
      .catch(()=>{})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[user?.id])

  useEffect(()=>{
    if(!open||!conversation?.id||conversation.status!=='open')return undefined
    let active=true
    const refresh=()=>{
      publicRequest('/support-chat/conversations/'+encodeURIComponent(conversation.id),{headers})
        .then(value=>{if(active)applyThread(value,{sound:true})})
        .catch(()=>{})
    }
    const timer=setInterval(refresh,Math.max(3,Number(config?.pollSeconds||4))*1000)
    return()=>{active=false;clearInterval(timer)}
  },[open,conversation?.id,conversation?.status,headers,config?.pollSeconds])

  useEffect(()=>{
    if(!open)return
    const node=messagesRef.current
    if(node)node.scrollTop=node.scrollHeight
  },[open,messages.length])

  async function startChat(event){
    event.preventDefault()
    const message=String(form.message||'').trim()
    if(!message)return setError('Type your message first.')
    try{
      setSending(true);setError('')
      const result=await publicRequest('/support-chat/conversations',{
        method:'POST',
        body:JSON.stringify({
          name:form.name,email:form.email,phone:form.phone,message,page
        })
      })
      setToken(result.accessToken||'')
      writeStored(result.accessToken?{id:result.conversation?.id,token:result.accessToken}:null)
      applyThread(result)
      setForm(current=>({...current,message:''}))
      playSound('success')
    }catch(err){
      setError(err.message||'Unable to start support chat.')
      playSound('warning')
    }finally{setSending(false)}
  }

  async function sendMessage(event){
    event.preventDefault()
    const message=String(draft||'').trim()
    if(!message||!conversation?.id)return
    try{
      setSending(true);setError('')
      const created=await publicRequest('/support-chat/conversations/'+encodeURIComponent(conversation.id)+'/messages',{
        method:'POST',headers,body:JSON.stringify({message})
      })
      setMessages(items=>[...items,created])
      setDraft('')
    }catch(err){
      setError(err.message||'Unable to send message.')
      if(err.code==='SUPPORT_CHAT_RESOLVED')setConversation(current=>current?{...current,status:'resolved'}:current)
      playSound('warning')
    }finally{setSending(false)}
  }

  async function endChat(){
    if(!conversation?.id)return
    try{
      const updated=await publicRequest('/support-chat/conversations/'+encodeURIComponent(conversation.id)+'/resolve',{method:'POST',headers})
      setConversation(current=>({...current,...updated}))
    }catch(err){setError(err.message||'Unable to end chat.')}
  }

  function newChat(){
    writeStored(null)
    setConversation(null);setMessages([]);setToken('');setDraft('');setError('')
    lastSupportId.current=0
  }

  if(hidden||config?.enabled===false)return null

  return <div className="support-chat" data-sound="off">
    {open&&<section className="support-chat-panel" aria-label="Support chat">
      <header className="support-chat-header">
        <div><span className="support-chat-status"/><div><b>{config?.widgetTitle||'Chat with us'}</b><small>Replies come from the ProPulse support team</small></div></div>
        <button type="button" onClick={()=>setOpen(false)} aria-label="Close support chat">×</button>
      </header>

      {loading?<div className="support-chat-loading">Opening support…</div>:conversation?<>
        <div className="support-chat-messages" ref={messagesRef}>
          <div className="support-chat-message support"><p>{config?.greeting||'Hi! How can we help you today?'}</p></div>
          {messages.map(item=><div className={'support-chat-message '+(item.senderType==='customer'?'customer':'support')} key={item.id}>
            {item.senderType!=='customer'&&<b>{item.senderName||'ProPulse Support'}</b>}
            <p>{item.body}</p><time>{timeLabel(item.createdAt)}</time>
          </div>)}
          {conversation.status==='resolved'&&<div className="support-chat-resolved"><b>Conversation resolved</b><span>You can start a new chat whenever you need help.</span></div>}
        </div>
        {error&&<div className="support-chat-error">{error}</div>}
        {conversation.status==='open'?<form className="support-chat-compose" onSubmit={sendMessage}>
          <textarea value={draft} maxLength={4000} placeholder="Type your message…" onChange={e=>setDraft(e.target.value)}/>
          <div><button type="button" className="support-chat-end" onClick={endChat}>End chat</button><button type="submit" disabled={sending||!draft.trim()}>{sending?'Sending…':'Send'}</button></div>
        </form>:<div className="support-chat-new"><button type="button" onClick={newChat}>Start a new chat</button></div>}
      </>:<form className="support-chat-start" onSubmit={startChat}>
        <div className="support-chat-welcome"><b>{config?.greeting||'Hi! How can we help you today?'}</b><span>{config?.offlineMessage||'Send us a message and our support team will reply here.'}</span></div>
        {!user&&config?.allowGuests!==false&&<div className="support-chat-guest-fields">
          <label>Name<input value={form.name} maxLength={120} required onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label>
          <label>Email<input type="email" value={form.email} maxLength={254} required onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label>
          <label>Phone <small>optional</small><input value={form.phone} maxLength={32} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label>
        </div>}
        {!user&&config?.allowGuests===false&&<div className="support-chat-login-note">Please sign in to contact support.</div>}
        {(user||config?.allowGuests!==false)&&<label>Your message<textarea value={form.message} maxLength={4000} required placeholder="How can we help?" onChange={e=>setForm(v=>({...v,message:e.target.value}))}/></label>}
        {error&&<div className="support-chat-error">{error}</div>}
        {(user||config?.allowGuests!==false)&&<button className="support-chat-start-button" type="submit" disabled={sending}>{sending?'Starting chat…':'Start chat'}</button>}
      </form>}
    </section>}

    <button type="button" className={'support-chat-launcher'+(open?' open':'')} onClick={()=>setOpen(v=>!v)} aria-label={open?'Close support chat':'Open support chat'}>
      <span aria-hidden="true">💬</span><b>{open?'Close':'Support'}</b>
    </button>
  </div>
}
