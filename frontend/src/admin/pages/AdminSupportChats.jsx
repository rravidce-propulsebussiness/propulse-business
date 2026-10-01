import {useEffect,useState} from 'react'
import {authRequest} from '../../utils/auth'
import {playSound} from '../../utils/soundEffects'
import './AdminSupportChats.css'

function timeLabel(value){
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return ''
  return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(date)
}

export default function AdminSupportChats(){
  const [settings,setSettings]=useState(null)
  const [status,setStatus]=useState('open')
  const [search,setSearch]=useState('')
  const [items,setItems]=useState([])
  const [selected,setSelected]=useState(null)
  const [reply,setReply]=useState('')
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')

  async function loadSettings(){
    const value=await authRequest('/admin/support-chat/settings')
    setSettings(value)
  }
  async function loadList(){
    const value=await authRequest('/admin/support-chats?status='+encodeURIComponent(status)+'&search='+encodeURIComponent(search)+'&limit=100')
    setItems(Array.isArray(value)?value:Array.isArray(value?.data)?value.data:[])
  }
  async function loadConversation(id,{sound=false}={}){
    if(!id)return
    const value=await authRequest('/admin/support-chats/'+encodeURIComponent(id))
    if(sound&&selected?.messages?.length&&value?.messages?.length>selected.messages.length)playSound('notification')
    setSelected(value)
  }

  useEffect(()=>{loadSettings().catch(err=>setError(err.message));},[])
  useEffect(()=>{loadList().catch(err=>setError(err.message));},[status])
  useEffect(()=>{
    const timer=setInterval(()=>{
      loadList().catch(()=>{})
      if(selected?.conversation?.id)loadConversation(selected.conversation.id,{sound:true}).catch(()=>{})
    },5000)
    return()=>clearInterval(timer)
  },[selected?.conversation?.id,status,search])

  async function saveSettings(){
    try{
      setSaving(true);setError('');setMessage('')
      const next=await authRequest('/admin/support-chat/settings',{method:'PATCH',body:JSON.stringify(settings)})
      setSettings(next);setMessage('Support chat settings saved.');playSound('success')
    }catch(err){setError(err.message||'Unable to save settings.');playSound('warning')}
    finally{setSaving(false)}
  }
  async function sendReply(event){
    event.preventDefault()
    if(!selected?.conversation?.id||!reply.trim())return
    try{
      setSaving(true);setError('')
      await authRequest('/admin/support-chats/'+encodeURIComponent(selected.conversation.id)+'/reply',{method:'POST',body:JSON.stringify({message:reply})})
      setReply('');await loadConversation(selected.conversation.id);await loadList();playSound('success')
    }catch(err){setError(err.message||'Unable to send reply.');playSound('warning')}
    finally{setSaving(false)}
  }
  async function setConversationStatus(next){
    if(!selected?.conversation?.id)return
    try{
      await authRequest('/admin/support-chats/'+encodeURIComponent(selected.conversation.id)+'/status',{method:'PATCH',body:JSON.stringify({status:next})})
      await loadConversation(selected.conversation.id);await loadList()
    }catch(err){setError(err.message||'Unable to update chat status.')}
  }

  return <div className="admin-support-page">
    <section className="admin-support-hero">
      <div><span>SUPPORT OPERATIONS</span><h1>Support Chats</h1><p>Website conversations are stored in ProPulse. Telegram replies return to the same customer conversation automatically.</p></div>
      <button type="button" onClick={saveSettings} disabled={!settings||saving}>{saving?'Saving…':'Save settings'}</button>
    </section>

    {error&&<div className="admin-support-alert error">{error}</div>}
    {message&&<div className="admin-support-alert success">{message}</div>}

    {settings&&<section className="admin-support-settings">
      <div className="admin-support-setting">
        <div><b>Website support chat</b><small>Show the floating chat widget on customer/public pages.</small></div>
        <label><input type="checkbox" checked={Boolean(settings.enabled)} onChange={e=>setSettings(v=>({...v,enabled:e.target.checked}))}/><i/></label>
      </div>
      <div className="admin-support-setting">
        <div><b>Allow guest chat</b><small>Visitors can contact support without signing in.</small></div>
        <label><input type="checkbox" checked={Boolean(settings.allowGuests)} onChange={e=>setSettings(v=>({...v,allowGuests:e.target.checked}))}/><i/></label>
      </div>
      <div className="admin-support-fields">
        <label>Widget title<input value={settings.widgetTitle||''} maxLength={80} onChange={e=>setSettings(v=>({...v,widgetTitle:e.target.value}))}/></label>
        <label>Poll interval (seconds)<input type="number" min="3" max="30" value={settings.pollSeconds||4} onChange={e=>setSettings(v=>({...v,pollSeconds:Number(e.target.value)}))}/></label>
        <label className="wide">Greeting<textarea value={settings.greeting||''} maxLength={500} onChange={e=>setSettings(v=>({...v,greeting:e.target.value}))}/></label>
        <label className="wide">Offline / welcome note<textarea value={settings.offlineMessage||''} maxLength={500} onChange={e=>setSettings(v=>({...v,offlineMessage:e.target.value}))}/></label>
      </div>
      <div className={'admin-support-telegram '+(settings.telegram?.configured?'ready':'missing')}>
        <div><b>Telegram bridge</b><small>{settings.telegram?.configured?'Bot token, support chat and signed webhook are configured.':'Telegram environment configuration is incomplete.'}</small></div>
        <strong>{settings.telegram?.configured?'READY':'SETUP REQUIRED'}</strong>
        {settings.telegram?.webhookUrl&&<code>{settings.telegram.webhookUrl}</code>}
      </div>
    </section>}

    <section className="admin-support-workspace">
      <aside className="admin-support-list">
        <div className="admin-support-list-tools">
          <div><button className={status==='open'?'active':''} onClick={()=>setStatus('open')}>Open</button><button className={status==='resolved'?'active':''} onClick={()=>setStatus('resolved')}>Resolved</button></div>
          <input placeholder="Search customer or conversation…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')loadList()}}/>
        </div>
        <div className="admin-support-list-scroll">
          {!items.length&&<div className="admin-support-empty">No {status} support chats.</div>}
          {items.map(item=><button type="button" key={item.id} className={'admin-support-item '+(selected?.conversation?.id===item.id?'active':'')} onClick={()=>loadConversation(item.id)}>
            <div><b>{item.customerName||item.customerEmail||'Website visitor'}</b><time>{timeLabel(item.lastMessageAt)}</time></div>
            <small>{item.id}</small><p>{item.latestMessage||'No message'}</p>
          </button>)}
        </div>
      </aside>

      <div className="admin-support-thread">
        {!selected?<div className="admin-support-empty-thread"><b>Select a support chat</b><span>Messages and Telegram replies will appear here.</span></div>:<>
          <header>
            <div><b>{selected.conversation.customerName||selected.conversation.customerEmail||'Website visitor'}</b><small>{selected.conversation.customerEmail||''} {selected.conversation.customerPhone?' · '+selected.conversation.customerPhone:''}</small><code>{selected.conversation.id}</code></div>
            <button type="button" onClick={()=>setConversationStatus(selected.conversation.status==='open'?'resolved':'open')}>{selected.conversation.status==='open'?'Resolve':'Reopen'}</button>
          </header>
          <div className="admin-support-messages">
            {selected.messages.map(item=><div className={'admin-support-message '+item.senderType} key={item.id}>
              <b>{item.senderType==='customer'?(selected.conversation.customerName||'Customer'):(item.senderName||'Support')}</b>
              <p>{item.body}</p><time>{timeLabel(item.createdAt)} · {item.source}</time>
            </div>)}
          </div>
          <form className="admin-support-reply" onSubmit={sendReply}>
            <textarea value={reply} maxLength={4000} placeholder="Reply from Admin (also mirrored into the Telegram conversation)…" onChange={e=>setReply(e.target.value)}/>
            <button type="submit" disabled={saving||!reply.trim()}>Send reply</button>
          </form>
        </>}
      </div>
    </section>
  </div>
}
