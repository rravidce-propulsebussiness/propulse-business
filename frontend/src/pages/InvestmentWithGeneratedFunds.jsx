import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Investment from './Investment'
import InvestmentCycleDashboard from './InvestmentCycleDashboard'

export default function InvestmentWithGeneratedFunds() {
  const location = useLocation()
  const [showInvestment, setShowInvestment] = useState(() => new URLSearchParams(window.location.search).get('new') === '1')

  useEffect(() => {
    const shouldOpen = new URLSearchParams(location.search).get('new') === '1'
    setShowInvestment(shouldOpen)
    if (!shouldOpen) return undefined

    const timer = window.setTimeout(() => {
      document.querySelector('.legacy-investment-active .investment-hero-action button')?.click()
      window.history.replaceState({}, '', window.location.pathname)
    }, 80)

    return () => window.clearTimeout(timer)
  }, [location.search])

  const openInvestment = () => {
    setShowInvestment(true)
    window.history.replaceState({}, '', `${window.location.pathname}?new=1`)
  }

  const requestExit = () => {
    document.querySelector('.legacy-investment-active .investment-pending-card button')?.click()
  }

  return (
    <>
      <InvestmentCycleDashboard onAddInvestment={openInvestment} onRequestExit={requestExit} />
      {showInvestment && (
        <div className="legacy-investment legacy-investment-active">
          <Investment />
        </div>
      )}
    </>
  )
}
