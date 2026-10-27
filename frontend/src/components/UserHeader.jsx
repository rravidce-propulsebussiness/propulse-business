import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { clearSession, getUser, getToken, authRequest } from '../utils/auth'
import './UserHeader.css'
import NotificationBell from './NotificationBell'

export default function UserHeader({ variant } = {}) {
  const navigate = useNavigate(); const location = useLocation(); const user = getUser(); const token = getToken(); const loggedIn = Boolean(token && user)
  const [open,setOpen]=useState(false); const [businessName,setBusinessName]=useState(user?.business_name||user?.businessName||''); const [isPro,setIsPro]=useState(false)
  useEffect(()=>{if(!loggedIn||user?.role==='admin')return;let active=true;authRequest('/auth/me').then(account=>{if(!active)return;const name=account?.profile?.business_name||account?.business_name;if(name)setBusinessName(name);setIsPro(user?.role!=='lead_partner'&&Boolean(account?.is_pro_member))}).catch(()=>{if(active)setIsPro(false)});return()=>{active=false}},[loggedIn,user?.role])
  useEffect(()=>{setOpen(false)},[location.pathname,location.search])
  useEffect(()=>{
    const onKeyDown=event=>{if(event.key==='Escape')setOpen(false)}
    const onResize=()=>{if(window.innerWidth>1150)setOpen(false)}
    window.addEventListener('keydown',onKeyDown)
    window.addEventListener('resize',onResize)
    return()=>{window.removeEventListener('keydown',onKeyDown);window.removeEventListener('resize',onResize)}
  },[])
  async function logout(){await clearSession();setOpen(false);navigate('/')}
  const active=p=>{
    const [pathname,query]=p.split('?')
    if(location.pathname!==pathname) return ''
    if(!query) return pathname==='/professional-requests' || !location.search ? ' active' : ''
    const params=new URLSearchParams(query)
    const current=new URLSearchParams(location.search)
    return [...params.entries()].every(([k,v])=>current.get(k)===v)?' active':''
  }

  if(!loggedIn) return <><header className="user-header public-leads-header">
    <Link className="user-header-brand" to="/professionals" onClick={()=>setOpen(false)}><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link>
    <nav id="user-header-site-nav" aria-label="Professional navigation" className={`user-header-nav${open?' open':''}`}>
      <Link to="/professionals">Home</Link>
      <Link to="/professional-upcoming-features" onClick={()=>setOpen(false)}>Upcoming Features</Link>
      <Link to="/professional-faq" onClick={()=>setOpen(false)}>FAQ</Link>
      <Link to="/professional-contact" onClick={()=>setOpen(false)}>Contact</Link>
      {!['/professionals','/professional-faq','/professional-upcoming-features','/professional-contact'].includes(location.pathname) && <Link className="leads-active" to="/professionals" onClick={()=>setOpen(false)}>Explore Leads</Link>}
      <Link className="public-nav-auth" to="/login" onClick={()=>setOpen(false)}>Login</Link>
      <Link className="public-nav-auth" to="/signup" onClick={()=>setOpen(false)}>Sign up</Link>
    </nav>
    <div className="user-header-right public-leads-actions">
      <Link className="public-login-button" to="/login">Login</Link>
      <Link className="public-signup-button" to="/signup">Sign up</Link>
      <button type="button" className="user-menu-toggle" aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open} aria-controls="user-header-site-nav" onClick={()=>setOpen(v=>!v)}>☰</button>
    </div>
  </header><div className="user-header-spacer" aria-hidden="true"/></>

  if(user?.role==='admin') return null
  const displayName=businessName||'Your Business'; const avatarLetter=displayName.trim().charAt(0).toUpperCase()||'B'
  return <><header className={"user-header"+(variant==='profile'?' profile-site-header':'')}><Link className="user-header-brand" to="/professionals" onClick={()=>setOpen(false)}><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link>
    <nav id="user-header-site-nav" aria-label="Professional navigation" className={"user-header-nav" + (open ? " open" : "")}>
      <Link className={active("/professionals")} to="/professionals" onClick={()=>setOpen(false)}>Home</Link>
      <Link className={active("/purchased-leads")} to="/purchased-leads" onClick={()=>setOpen(false)}>Purchased Leads</Link>
      {user?.role==='business' && <Link className={active("/professional-requests")} to="/professional-requests" onClick={()=>setOpen(false)}>Requests</Link>}
      <Link className={active("/wallet")} to="/wallet" onClick={()=>setOpen(false)}>Wallet</Link>
      <Link className={active("/membership")} to="/membership" onClick={()=>setOpen(false)}>Membership</Link>
      {user?.role==='business'&&<Link className="user-mobile-offers-link" to="/professionals?offers=1" onClick={()=>setOpen(false)}>Offers</Link>}
      {isPro && <Link className={active("/investment")} to="/investment" onClick={()=>setOpen(false)}>Investor</Link>}
      {!location.pathname.startsWith("/investment") && <Link className={active("/professional-contact")} to="/professional-contact" onClick={()=>setOpen(false)}>Contact</Link>}
      <Link className={active("/professional-upcoming-features")} to="/professional-upcoming-features" onClick={()=>setOpen(false)}>Upcoming Features</Link>
      <Link className={active("/professional-faq")} to="/professional-faq" onClick={()=>setOpen(false)}>FAQ</Link>
      <button type="button" className="user-header-mobile-logout" onClick={logout}>Logout</button>
    </nav>
    <div className="user-header-right">{user?.role==='business'&&<Link className="user-offers-shortcut" to="/professionals?offers=1" aria-label="View professional offers">✦ Offers</Link>}<NotificationBell/><Link className="user-profile-pill" to="/profile" aria-label="Open business profile"><span className="user-avatar">{avatarLetter}</span><span className="user-profile-name">{displayName}</span></Link><button type="button" className="user-logout" onClick={logout}>Logout</button><button type="button" className="user-menu-toggle" aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open} aria-controls="user-header-site-nav" onClick={()=>setOpen(v=>!v)}>☰</button></div>
  </header><div className="user-header-spacer" aria-hidden="true"/></>
}
