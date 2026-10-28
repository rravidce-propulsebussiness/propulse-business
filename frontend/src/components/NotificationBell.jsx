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
    let timer=null;
    let pending=false;
    let failures=0;
    let blockedUntil=0;
    const schedule=(delay)=>{
      window.clearTimeout(timer);
      if(active)timer=window.setTimeout(refresh,delay);
    };
    const refresh=async()=>{
      if(!active||pending)return;
      // Unavailable networks and hidden tabs must not hammer auth/WAF endpoints.
      if(!navigator.onLine||document.visibilityState==='hidden'){
        schedule(60000);
        return;
      }
      if(Date.now()<blockedUntil){
        schedule(Math.max(1000,blockedUntil-Date.now()));
        return;
      }
      pending=true;
      try{
        const result=await authRequest('/notifications/unread-count');
        if(!active)return;
        applyUnread(result?.unread);
        failures=0;
        schedule(60000);
      }catch(error){
        if(!active)return;
        failures+=1;
        // 403 (forbidden / temporary WAF blocks) is not fixed by retrying.
        // 401 is handled by apiRequest; never create a redirect/retry loop.
        if(error?.status===403||error?.status===401){
          blockedUntil=Date.now()+15*60000;
          schedule(15*60000);
        }else{
          schedule(Math.min(10*60000,60000*2**Math.min(failures,4)));
        }
      }finally{pending=false;}
    };
    const onWake=()=>{
      if(!active||!navigator.onLine||document.visibilityState==='hidden')return;
      if(Date.now()>=blockedUntil)schedule(0);
    };
    queueMicrotask(refresh);
    window.addEventListener('propulse-notifications-refresh',onWake);
    window.addEventListener('online',onWake);
    document.addEventListener('visibilitychange',onWake);
    return()=>{
      active=false;window.clearTimeout(timer);
      window.removeEventListener('propulse-notifications-refresh',onWake);
      window.removeEventListener('online',onWake);
      document.removeEventListener('visibilitychange',onWake);
    };
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
