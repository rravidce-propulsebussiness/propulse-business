import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { clearSession, getUser, getToken, authRequest } from '../utils/auth'
import './UserHeader.css'

export default function UserHeader() {
  const navigate = useNavigate(); const location = useLocation(); const user = getUser(); const token = getToken(); const loggedIn = Boolean(token && user)
  const [open,setOpen]=useState(false); const [businessName,setBusinessName]=useState(user?.business_name||user?.businessName||'')
  useEffect(()=>{if(!loggedIn||user?.role==='admin')return;let active=true;authRequest('/profile').then(p=>{if(active&&p?.business_name)setBusinessName(p.business_name)}).catch(()=>{});return()=>{active=false}},[loggedIn,user?.role])
  function logout(){clearSession();setOpen(false);navigate('/')}
  const active=p=>location.pathname===p?' active':''

  if(!loggedIn) return <header className="user-header public-leads-header">
    <Link className="user-header-brand" to="/" onClick={()=>setOpen(false)}><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link>
    <nav className={`user-header-nav${open?' open':''}`}>
      <Link to="/">Home</Link>
      <Link to="/industries">Industries</Link>
      <Link className="leads-active" to="/leads" onClick={()=>setOpen(false)}>Explore Leads</Link>
      <Link className="public-nav-auth" to="/login" onClick={()=>setOpen(false)}>Login</Link>
      <Link className="public-nav-auth" to="/signup" onClick={()=>setOpen(false)}>Sign up</Link>
    </nav>
    <div className="user-header-right public-leads-actions">
      <Link className="public-login-button" to="/login">Login</Link>
      <Link className="public-signup-button" to="/signup">Sign up</Link>
      <button className="user-menu-toggle" aria-label="Open navigation" onClick={()=>setOpen(v=>!v)}>☰</button>
    </div>
  </header>

  if(user?.role==='admin') return null
  const displayName=businessName||'Your Business'; const avatarLetter=displayName.trim().charAt(0).toUpperCase()||'B'
  return <header className="user-header"><Link className="user-header-brand" to="/" onClick={()=>setOpen(false)}><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link><nav className={`user-header-nav${open?' open':''}`}><Link className={active('/dashboard')} to="/dashboard" onClick={()=>setOpen(false)}>Dashboard</Link><Link className={active('/leads')} to="/leads" onClick={()=>setOpen(false)}>Buy Leads</Link><Link className={active('/my-leads')} to="/my-leads" onClick={()=>setOpen(false)}>My Leads</Link><Link className={active('/wallet')} to="/wallet" onClick={()=>setOpen(false)}>Wallet</Link><Link className={active('/membership')} to="/membership" onClick={()=>setOpen(false)}>Membership</Link><Link className={active('/investment')} to="/investment" onClick={()=>setOpen(false)}>Investment</Link><button className="user-header-mobile-logout" onClick={logout}>Logout</button></nav><div className="user-header-right"><Link className="user-profile-pill" to="/profile" aria-label="Open business profile"><span className="user-avatar">{avatarLetter}</span><span className="user-profile-name">{displayName}</span></Link><button className="user-logout" onClick={logout}>Logout</button><button className="user-menu-toggle" aria-label="Open navigation" onClick={()=>setOpen(v=>!v)}>☰</button></div></header>
}
