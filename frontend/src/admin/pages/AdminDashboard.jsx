import { useEffect, useState } from 'react'
import { apiRequest } from '../../utils/api'
import './AdminDashboard.css'

export default function AdminDashboard(){
  const [stats,setStats]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    let mounted=true
    apiRequest('/admin/dashboard/stats')
      .then(data=>mounted&&setStats(data))
      .catch(err=>mounted&&setError(err.message))
      .finally(()=>mounted&&setLoading(false))
    return()=>{mounted=false}
  },[])

  const cards=[
    ['Active users',stats?.activeUsers],
    ['Businesses',stats?.businesses],
    ['Active businesses',stats?.activeBusinesses],
    ['Industries',stats?.industries],
    ['Services',stats?.services],
    ['Subservices',stats?.subservices],
    ['States / UTs',stats?.states],
    ['Cities',stats?.cities],
  ]

  return <main className="admin-dashboard">
    <section className="admin-dashboard-summary">
      <div>
        <span className="admin-dashboard-kicker">ANALYTICS</span>
        <h1>Platform at a glance</h1>
      </div>
      <div className="admin-dashboard-live"><i/> Current database totals</div>
    </section>

    {error&&<div className="admin-dashboard__error"><strong>Dashboard unavailable</strong><span>{error}</span></div>}

    <section className="admin-dashboard__grid" aria-label="Platform totals">
      {cards.map(([label,value],index)=><article className="admin-card" key={label}>
        <div className="admin-card-top">
          <span>{label}</span>
          <small>{String(index+1).padStart(2,'0')}</small>
        </div>
        <strong>{loading?'—':value??'0'}</strong>
      </article>)}
    </section>
  </main>
}
