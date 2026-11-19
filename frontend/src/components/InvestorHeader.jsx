import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { authRequest } from '../utils/auth'
import UserHeader from './UserHeader'
import './InvestorHeader.css'

// Investor pages share the same main menu bar as every other professional
// page (UserHeader). Investor sections are a secondary tab row underneath,
// so users never lose the main navigation when they open "Investor".
const INVESTOR_TABS = [
  { label: 'Overview', to: '/investment' },
  { label: 'Linked Leads', to: '/investment/leads' },
  { label: 'Sold Leads', to: '/investment/sold-leads' },
  { label: 'History', to: '/investment/history' },
  { label: 'Payouts', to: '/investment/payouts' },
  { label: 'FAQ', to: '/investment/faq' },
]

export default function InvestorHeader() {
  const location = useLocation()
  const pathname = location.pathname.replace(/\/+$/, '') || '/'
  const [lapsed, setLapsed] = useState(false)
  useEffect(() => {
    let active = true
    authRequest('/investments/access').then(a => { if (active) setLapsed(a?.isPro !== true && a?.canViewInvestments === true) }).catch(() => {})
    return () => { active = false }
  }, [])

  return (
    <>
      <UserHeader />
      <nav className="investor-subnav" aria-label="Investor sections">
        <div className="investor-subnav__inner">
          <span className="investor-subnav__label">Investor</span>
          {INVESTOR_TABS.map(item => {
            const active = pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
      {lapsed && <div className="investor-lapsed-banner" role="status"><span><b>Your membership has expired.</b> You can still view your investments and withdraw earnings. Renew GROW or SCALE to invest more.</span><Link to="/membership">Renew membership</Link></div>}
    </>
  )
}
