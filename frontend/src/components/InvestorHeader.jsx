import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authRequest, clearSession, getToken, getUser } from '../utils/auth'
import './InvestorHeader.css'

export default function InvestorHeader(){
 const navigate=useNavigate(),location=useLocation(),user=getUser(),[open,setOpen]=useState(false)
 const [businessName,setBusinessName]=useState(user?.business_name||user?.businessName||'Your Business')
 const investorRoute=location.pathname.startsWith('/investment')
 const [isPro,setIsPro]=useState(Boolean(user?.is_pro||user?.isPro||user?.membership_plan==='pro'||user?.membershipPlan==='pro'||investorRoute))
 useEffect(()=>{let active=true;if(!getToken()||user?.role==='admin')return undefined;authRequest('/profile').then(profile=>{if(!active)return;if(profile?.business_name)setBusinessName(profile.business_name);const profilePro=Boolean(profile?.is_pro||profile?.isPro||String(profile?.membership_plan||profile?.membershipPlan||'').toLowerCase()==='pro'||profile?.membership?.plan&&String(profile.membership.plan).toLowerCase()==='pro');setIsPro(profilePro||investorRoute)}).catch(()=>{if(active)setIsPro(investorRoute)});return()=>{active=false}},[user?.role,investorRoute])
 const logout=()=>{clearSession();setOpen(false);navigate('/')}
 const isActive=target=>target==='/'?location.pathname==='/':location.pathname===target
 const nav=isPro?[{label:'Home',to:'/'},{label:'Investment',to:'/investment'},{label:'Linked Leads',to:'/investment/leads'},{label:'History',to:'/investment/history'},{label:'FAQ',to:'/investment/faq'}]:[{label:'Home',to:'/'}]
 const avatar=businessName.trim().charAt(0).toUpperCase()||'B'
 return <header className="investor-header"><Link className="investor-header-brand" to="/" onClick={()=>setOpen(false)}><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link>{isPro&&<div className="investor-header-label">INVESTOR</div>}<nav className={`investor-header-nav${open?' open':''}`}>{nav.map(item=><Link key={item.to} className={isActive(item.to)?'active':''} to={item.to} onClick={()=>setOpen(false)}>{item.label}</Link>)}<button className="investor-mobile-logout" onClick={logout}>Logout</button></nav><div className="investor-header-right">{isPro&&<Link className="investor-invest-button" to="/investment?new=1" onClick={()=>setOpen(false)}>＋ Invest</Link>}<Link className="investor-profile" to="/profile" aria-label="Open business profile"><span className="investor-avatar">{avatar}</span><span className="investor-profile-name">{businessName}</span></Link><button className="investor-logout" onClick={logout}>Logout</button><button className="investor-menu" aria-label="Open investor navigation" onClick={()=>setOpen(value=>!value)}>☰</button></div></header>
}
