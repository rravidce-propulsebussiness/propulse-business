import {useCallback,useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {authRequest,getUser} from '../utils/auth';
import {playSound} from '../utils/soundEffects';
import './NotificationBell.css';

const when=value=>{
  if(!value)return '';
  const diff=Math.max(0,Date.now()-new Date(value).getTime());
  const min=Math.floor(diff/60000);
  if(min<1)return 'Now';
  if(min<60)return min+'m';
  const hr=Math.floor(min/60);
  if(hr<24)return hr+'h';
  return Math.floor(hr/24)+'d';
};
const allRoute=role=>role==='admin'?'/admin/notifications':role==='lead_partner'?'/lead-partner/notifications':'/notifications';

export default function NotificationBell({className=''}) {
  const navigate=useNavigate();
  const role=getUser()?.role;
  const [open,setOpen]=useState(false);
  const [unread,setUnread]=useState(0);
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(false);
  const ref=useRef(null);
  const unreadRef=useRef(0);
  const countReadyRef=useRef(false);

  const applyUnread=useCallback(value=>{
    const next=Number(value||0);
    if(countReadyRef.current&&next>unreadRef.current)playSound('notification');
    unreadRef.current=next;
    countReadyRef.current=true;
    setUnread(next);
  },[]);

  useEffect(()=>{
    let active=true;
    const refresh=()=>authRequest('/notifications/unread-count').then(r=>{if(active)applyUnread(r?.unread)}).catch(()=>{});
    queueMicrotask(refresh);
    const timer=setInterval(refresh,60000);
    window.addEventListener('propulse-notifications-refresh',refresh);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('propulse-notifications-refresh',refresh)}
  },[applyUnread]);

  useEffect(()=>{
    if(!open)return undefined;
    let active=true;
    queueMicrotask(async()=>{
      if(!active)return
      setLoading(true);
      try{
        const result=await authRequest('/notifications?limit=8');
        if(active){
          setItems(result?.items||[]);
          applyUnread(result?.unread);
        }
      }catch{}finally{if(active)setLoading(false)}
    });
    const close=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
    document.addEventListener('mousedown',close);
    return()=>{active=false;document.removeEventListener('mousedown',close)}
  },[open,applyUnread]);

  const openItem=async item=>{
    if(!item.read_at){
      await authRequest('/notifications/'+item.id+'/read',{method:'PATCH'}).catch(()=>{});
      setUnread(v=>{const next=Math.max(0,v-1);unreadRef.current=next;return next});
    }
    setOpen(false);
    navigate(item.action_url||allRoute(role));
  };

  return <div className={'notification-bell '+className} ref={ref}>
    <button type="button" className="notification-bell-button" aria-label="Notifications" onClick={()=>setOpen(v=>!v)}>
      <span>♢</span>{unread>0&&<b>{unread>99?'99+':unread}</b>}
    </button>
    {open&&<div className="notification-popover">
      <div className="notification-popover-head"><div><b>Notifications</b><span>{unread} unread</span></div><button onClick={()=>{setOpen(false);navigate(allRoute(role))}}>View all</button></div>
      <div className="notification-popover-list">
        {loading?<div className="notification-popover-empty">Loading…</div>:!items.length?<div className="notification-popover-empty">You're all caught up.</div>:items.map(item=><button type="button" key={item.id} className={'notification-preview '+(item.read_at?'read':'unread')+' '+item.severity} onClick={()=>openItem(item)}>
          <i/><div><strong>{item.title}</strong><span>{item.message}</span><small>{when(item.created_at)} · {item.category}</small></div>
        </button>)}
      </div>
    </div>}
  </div>;
}
