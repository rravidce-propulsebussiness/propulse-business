import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authRequest, clearSession, getToken, getUser } from '../utils/auth'
import './InvestorHeader.css'

export default function InvestorHeader() {
  const navigate=useNavigate(); const location=useLocation(); const user=getUser()
  const [open,setOpen]=useState(false); const [businessName,setBusinessName]=useState(user?.business_name||user?.businessName||'Your Business')
  const [isPro,setIsPro]=useState(false); const [leadPartnerStatus,setLeadPartnerStatus]=useState(null)
  useEffect(()=>{let active=true;if(!getToken()||user?.role==='admin')return undefined
    Promise.all([
      authRequest('/profile').catch(()=>null),
      user?.role==='business'?authRequest('/lead-partner/me').catch(()=>null):Promise.resolve(null),
      authRequest('/investments/access').catch(()=>null)
    ]).then(([profile,partner,access])=>{if(!active)return
      if(profile?.business_name)setBusinessName(profile.business_name)
      setLeadPartnerStatus(partner?.status||null); setIsPro(Boolean(access?.isPro))
    }); return()=>{active=false}
  },[user?.role])
  const logout=()=>{clearSession();setOpen(false);navigate('/')}
  const isActive=target=>target==='/investment'?location.pathname.startsWith('/investment'):location.pathname===target
  const leadPartnerActive=user?.role==='business'&&leadPartnerStatus==='active'
  const nav=[
    {label:'Home',to:'/'},
    {label:'Investment',to:'/investment'},
    {label:'Linked Leads',to:'/investment/leads'},
    {label:'History',to:'/investment/history'},
    {label:'Lead Partner',to:'/lead-partner'}
  ]
  const avatar=businessName.trim().charAt(0).toUpperCase()||'B'
  return <header className="investor-header">
    <Link className="investor-header-brand" to="/" onClick={()=>setOpen(false)}><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link>
    {isPro&&<div className="investor-header-label">INVESTOR</div>}{leadPartnerActive&&<div className="investor-header-label">LEAD PARTNER</div>}
    <nav className={`investor-header-nav${open?' open':''}`}>{nav.map(item=><Link key={item.to} className={isActive(item.to)?'active':''} to={item.to} onClick={()=>setOpen(false)}>{item.label}</Link>)}<button className="investor-mobile-logout" onClick={logout}>Logout</button></nav>
    <div className="investor-header-right"><Link className="investor-profile" to="/profile" aria-label="Open business profile"><span className="investor-avatar">{avatar}</span><span className="investor-profile-name">{businessName}</span></Link>{isPro&&<Link className="investor-invest-button" to="/investment?new=1" onClick={()=>setOpen(false)}>＋ Invest</Link>}<button className="investor-logout" onClick={logout}>Logout</button><button className="investor-menu" aria-label="Open navigation" onClick={()=>setOpen(value=>!value)}>☰</button></div>
  </header>
}
