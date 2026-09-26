import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { clearSession, getUser } from '../../utils/auth'
import './AdminLayout.css'

const navigation=[
  {type:'link',to:'/admin',label:'Overview',icon:'⌂',end:true},
  {type:'group',key:'leads',label:'Leads',icon:'◈',children:[
    {to:'/admin/leads',label:'Manage Leads',end:true},
    {to:'/admin/leads/upload',label:'Upload Leads'},
    {to:'/admin/leads/sheets',label:'Google Sheets'},
    {to:'/admin/lead-reports',label:'Lead Reports'},
    {to:'/admin/industries',label:'Industries & Locations',aliases:['/admin/pincodes']}
  ]},
  {type:'group',key:'pricing',label:'Pricing',icon:'₹',children:[
    {to:'/admin/lead-pricing',label:'Lead Pricing'},
    {to:'/admin/service-pricing',label:'Service Pricing'}
  ]},
  {type:'group',key:'customers',label:'Customers',icon:'◎',children:[
    {to:'/admin/users',label:'Users',aliases:['/admin/businesses']},
    {to:'/admin/company-proofs',label:'Company Proofs'}
  ]},
  {type:'group',key:'payments',label:'Payments & Wallet',icon:'▣',children:[
    {to:'/admin/payments',label:'Payments',aliases:['/admin/wallet-topups']},
    {to:'/admin/payment-receiving',label:'Payment Receiving'}
  ]},
  {type:'group',key:'memberships',label:'Memberships',icon:'★',children:[
    {to:'/admin/memberships',label:'Plans & Configuration',aliases:['/admin/membership-plans']},
    {to:'/admin/coupons',label:'Coupons'}
  ]},
  {type:'group',key:'lead-partners',label:'Lead Partners',icon:'♙',children:[
    {to:'/admin/lead-partners',label:'Lead Partners',section:'Partner management'},
    {to:'/admin/lead-partner-payouts',label:'Partner Payouts'},
    {to:'/admin/investments',label:'Investments',section:'Investor management'},
    {to:'/admin/investor-withdrawals',label:'Investor Withdrawals'}
  ]},
  {type:'group',key:'website',label:'Website & Content',icon:'▧',children:[
    {to:'/admin/homepage-media',label:'Homepage Media'},
    {to:'/admin/upcoming-features',label:'Upcoming Features'},
    {to:'/admin/contact-social',label:'Contact & Social'},
    {to:'/admin/faqs',label:'FAQs'}
  ]}
]

function routeMatches(item,pathname){
  const paths=[item.to,...(item.aliases||[])]
  return paths.some(path=>pathname===path||(!item.end&&pathname.startsWith(path+'/')))
}

function findCurrent(pathname){
  for(const item of navigation){
    if(item.type==='link'&&routeMatches(item,pathname))return {group:null,item}
    if(item.type==='group'){
      const child=item.children.find(entry=>routeMatches(entry,pathname))
      if(child)return {group:item,item:child}
    }
  }
  return {group:null,item:navigation[0]}
}

export default function AdminLayout(){
  const navigate=useNavigate()
  const location=useLocation()
  const user=getUser()
  const current=useMemo(()=>findCurrent(location.pathname),[location.pathname])
  const [openGroup,setOpenGroup]=useState(current.group?.key||null)
  const initials=(user?.name||'Admin').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()

  useEffect(()=>{
    if(current.group)setOpenGroup(current.group.key)
    document.body.classList.remove('admin-nav-open')
  },[current.group,location.pathname])

  async function logout(){
    await clearSession()
    localStorage.removeItem('propulse_session_mode')
    navigate('/login',{replace:true})
  }

  function toggleGroup(key){
    setOpenGroup(value=>value===key?null:key)
  }

  const breadcrumb=current.group
    ? ['Admin',current.group.label,current.item.label]
    : ['Admin',current.item.label]

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span className="admin-sidebar-mark">P</span>
        <span><b>PRO<span>PULSE</span></b><small>ADMIN CONSOLE</small></span>
      </div>

      <div className="admin-nav-label">WORKSPACE</div>
      <nav className="admin-nav" aria-label="Admin navigation">
        {navigation.map(entry=>{
          if(entry.type==='link'){
            const active=routeMatches(entry,location.pathname)
            return <NavLink key={entry.to} to={entry.to} end={entry.end} className={active?'active':''}>
              <i>{entry.icon}</i><span>{entry.label}</span>
            </NavLink>
          }

          const groupActive=current.group?.key===entry.key
          const expanded=openGroup===entry.key
          return <div className={`admin-nav-group${groupActive?' current':''}`} key={entry.key}>
            <button type="button" className={`admin-nav-group-toggle${groupActive?' active':''}`} onClick={()=>toggleGroup(entry.key)} aria-expanded={expanded}>
              <i>{entry.icon}</i><span>{entry.label}</span><b className={expanded?'expanded':''}>›</b>
            </button>
            {expanded&&<div className="admin-nav-submenu">
              {entry.children.map((child,index)=>{
                const previous=entry.children[index-1]
                const showSection=child.section&&child.section!==previous?.section
                return <div className="admin-nav-subitem" key={child.to}>
                  {showSection&&<small className="admin-nav-subsection">{child.section}</small>}
                  <NavLink to={child.to} className={routeMatches(child,location.pathname)?'active':''}>
                    <span className="admin-nav-subdot"/><span>{child.label}</span>
                  </NavLink>
                </div>
              })}
            </div>}
          </div>
        })}
      </nav>

      <div className="admin-sidebar-bottom">
        <div className="admin-sidebar-user">
          <span>{initials||'A'}</span>
          <div><b>{user?.name||'Admin'}</b><small>{user?.email||'Administrator'}</small></div>
        </div>
        <button onClick={logout}>↪ <span>Log out</span></button>
      </div>
    </aside>

    <div className="admin-main">
      <header className="admin-topbar">
        <button className="admin-mobile-menu" aria-label="Open navigation" onClick={()=>document.body.classList.toggle('admin-nav-open')}>☰</button>
        <div className="admin-breadcrumb">
          {breadcrumb.map((part,index)=><span className={index===breadcrumb.length-1?'current':''} key={part}>{index>0&&<b>/</b>}{part}</span>)}
        </div>
        <div className="admin-top-status"><i/> System healthy</div>
      </header>
      <div className="admin-content"><Outlet/></div>
    </div>
  </div>
}
