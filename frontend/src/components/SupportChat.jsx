import {useEffect,useRef,useState} from 'react'
import {authRequest,getToken} from '../utils/auth'
import './SupportChat.css'

export default function SupportChat(){
  const [open,setOpen]=useState(false),[messages,setMessages]=useState([]),[text,setText]=useState(''),[loading,setLoading]=useState(false)
  const endRef=useRef(null)
  useEffect(()=>{if(!getToken())return;authRequest('/chat/conversation').then(x=>setMessages(x.messages||[])).catch(()=>{})},[])
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages,open])
  if(!getToken())return null
  async function send(){
    const value=text.trim();if(!value||loading)return
    setLoading(true);setText('')
    try{const x=await authRequest('/chat/conversation/messages',{method:'POST',body:JSON.stringify({message:value})});setMessages(m=>[...m,x.message,...(x.reply?[x.reply]:[])])}catch(e){setText(value)}finally{setLoading(false)}
  }
  return <div className="support-chat">
    {open&&<section className="support-chat-panel" aria-label="Propulse Support">
      <header><div><strong>Propulse Support</strong><span>Ask a general question or talk to support</span></div><button onClick={()=>setOpen(false)} aria-label="Close">×</button></header>
      <div className="support-chat-messages">{messages.length===0&&<div className="support-chat-empty">Hi! How can we help you today?</div>}
        {messages.map(m=><div key={m.id} className={`support-chat-bubble ${m.sender_type==='user'||m.sender_type==='lead_partner'?'mine':'theirs'}`}><div>{m.message}</div>{m.is_automated&&<small>Automatic answer</small>}</div>)}<div ref={endRef}/></div>
      <div className="support-chat-compose"><textarea value={text} maxLength={4000} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Type your question…" rows="2"/><button onClick={send} disabled={loading||!text.trim()}>{loading?'…':'Send'}</button></div>
    </section>}
    <button className="support-chat-launcher" onClick={()=>setOpen(v=>!v)} aria-label="Open support chat">{open?'×':'💬'}</button>
  </div>
}
