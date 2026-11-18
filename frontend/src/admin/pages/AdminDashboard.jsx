import BootLoader from '../../components/BootLoader'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../utils/api'
import './AdminDashboard.css'
import { formatRupees } from '../../utils/formatRupees'

const money = value => formatRupees(value || 0)
const count = value => Number(value || 0).toLocaleString('en-IN')
const EMPTY_OBJECT = Object.freeze({})

function MiniBars({ tone = 'blue' }) {
  return <span className={`admin-mini-bars ${tone}`} aria-hidden="true">
    <i/><i/><i/><i/><i/><i/>
  </span>
}

function OverviewCard({ icon, label, value, tone = 'blue' }) {
  return <article className={`admin-overview-card ${tone}`}>
    <span className="admin-overview-card-icon">{icon}</span>
    <div className="admin-overview-card-copy">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
    <MiniBars tone={tone}/>
  </article>
}

function DataRow({ icon, label, value, tone = 'blue' }) {
  return <div className="admin-dashboard-data-row">
    <span className={`admin-dashboard-row-icon ${tone}`} aria-hidden="true">{icon}</span>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
}

function DashboardPanel({ tone = 'blue', badge, title, to, linkLabel, rows }) {
  return <section className={`admin-dashboard-panel ${tone}`}>
    <header className="admin-dashboard-panel-head">
      <div className="admin-dashboard-panel-title">
        <span className={`admin-business-badge ${tone}`}>{badge}</span>
        <h2>{title}</h2>
      </div>
      {to && <Link to={to}>{linkLabel}<b aria-hidden="true">→</b></Link>}
    </header>
    <div className="admin-dashboard-panel-rows">
      {rows.map(row => <DataRow key={row.label} {...row}/>)}
    </div>
  </section>
}

function CompactAction({ to, label, value }) {
  return <Link className="admin-compact-action" to={to}>
    <span>{label}</span>
    <strong>{count(value)}</strong>
    <b aria-hidden="true">→</b>
  </Link>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revenuePeriod, setRevenuePeriod] = useState('month')

  useEffect(() => {
    let mounted = true
    apiRequest('/admin/dashboard/stats')
      .then(data => mounted && setStats(data))
      .catch(err => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const streams = stats?.streams || EMPTY_OBJECT
  const propulse = streams.propulse || EMPTY_OBJECT
  const leadPartner = streams.leadPartner || EMPTY_OBJECT
  const investor = streams.investor || EMPTY_OBJECT
  const revenue = stats?.revenue || EMPTY_OBJECT
  const actions = stats?.actions || EMPTY_OBJECT
  const customers = stats?.customers || EMPTY_OBJECT
  const show = value => loading ? '—' : value

  const revenuePeriods = useMemo(() => ({
    today: {
      label: 'Today',
      total: revenue.today,
      ownGross: propulse.revenueToday,
      partnerCommission: leadPartner.revenueToday,
      investorCommission: investor.revenueToday
    },
    week: {
      label: 'This Week',
      total: revenue.week,
      ownGross: propulse.revenueWeek,
      partnerCommission: leadPartner.revenueWeek,
      investorCommission: investor.revenueWeek
    },
    month: {
      label: 'This Month',
      total: revenue.month,
      ownGross: propulse.revenueMonth,
      partnerCommission: leadPartner.revenueMonth,
      investorCommission: investor.revenueMonth
    },
    all: {
      label: 'All Time',
      total: revenue.total,
      ownGross: propulse.revenueTotal,
      partnerCommission: leadPartner.revenueTotal,
      investorCommission: investor.revenueTotal
    }
  }), [revenue, propulse, leadPartner, investor])
  const selectedRevenue = revenuePeriods[revenuePeriod] || revenuePeriods.month

  const actionTotal = useMemo(() => [
    actions.pendingPayments,
    actions.pendingWalletTopups,
    actions.pendingCompanyProofs,
    actions.pendingLeadReports,
    actions.pendingPartnerPayouts,
    actions.pendingInvestorWithdrawals
  ].reduce((sum, value) => sum + Number(value || 0), 0), [actions])

  if (loading && !stats) return <main className="admin-dashboard"><BootLoader contained message="Loading overview" /></main>

  return <main className="admin-dashboard">
    <section className="admin-dashboard-hero">
      <h1>Overview</h1>
    </section>

    {error && <div className="admin-dashboard__error"><strong>Dashboard unavailable</strong><span>{error}</span></div>}

    <section className="admin-revenue-command">
      <div className="admin-revenue-command-head">
        <h2><span className="admin-revenue-mark" aria-hidden="true">₹</span>Total earnings</h2>
        <div className="admin-revenue-periods" role="tablist" aria-label="Revenue period">
          {[
            ['today', 'Today'],
            ['week', 'This Week'],
            ['month', 'This Month'],
            ['all', 'All Time']
          ].map(([key, label]) => <button type="button" role="tab" aria-selected={revenuePeriod === key} key={key} className={revenuePeriod === key ? 'active' : ''} onClick={() => setRevenuePeriod(key)}>{label}</button>)}
        </div>
      </div>

      <div className="admin-revenue-command-body">
        <article className="admin-total-earnings">
          <span>{selectedRevenue.label}</span>
          <strong>{show(money(selectedRevenue.total))}</strong>
        </article>
        <article className="admin-revenue-value own">
          <span>Our Gross</span>
          <strong>{show(money(selectedRevenue.ownGross))}</strong>
        </article>
        <article className="admin-revenue-value partner">
          <span>Partner Commission</span>
          <strong>{show(money(selectedRevenue.partnerCommission))}</strong>
        </article>
        <article className="admin-revenue-value investor">
          <span>Investor Commission</span>
          <strong>{show(money(selectedRevenue.investorCommission))}</strong>
        </article>
      </div>
    </section>

    <section className="admin-overview-grid" aria-label="Key metrics">
      <OverviewCard icon="◎" label="Active businesses" value={show(count(customers.activeBusinesses))} tone="blue"/>
      <OverviewCard icon="◈" label="Our leads" value={show(count(propulse.totalLeads))} tone="orange"/>
      <OverviewCard icon="♙" label="Active Lead Partners" value={show(count(leadPartner.activePartners))} tone="green"/>
      <OverviewCard icon="↗" label="Active investments" value={show(count(investor.activeInvestments))} tone="purple"/>
    </section>

    <section className="admin-dashboard-panels" aria-label="Business overview">
      <DashboardPanel
        tone="blue"
        badge="P"
        title="Our leads"
        to="/admin/leads"
        linkLabel="Manage leads"
        rows={[
          { icon: '◇', label: 'Total leads', value: show(count(propulse.totalLeads)), tone: 'blue' },
          { icon: '○', label: 'Available', value: show(count(propulse.availableLeads)), tone: 'orange' },
          { icon: '✓', label: 'Sold leads', value: show(count(propulse.soldLeads)), tone: 'green' },
          { icon: '₹', label: 'Revenue', value: show(money(propulse.revenueTotal)), tone: 'purple' }
        ]}
      />
      <DashboardPanel
        tone="orange"
        badge="LP"
        title="Lead Partners"
        to="/admin/lead-partners"
        linkLabel="View partners"
        rows={[
          { icon: '♙', label: 'Active partners', value: show(count(leadPartner.activePartners)), tone: 'blue' },
          { icon: '◇', label: 'Partner leads', value: show(count(leadPartner.totalLeads)), tone: 'green' },
          { icon: '₹', label: 'Gross sales', value: show(money(leadPartner.grossSales)), tone: 'orange' },
          { icon: '₹', label: 'Partner earnings', value: show(money(leadPartner.partnerEarnings)), tone: 'purple' },
          { icon: '✓', label: 'Propulse commission', value: show(money(leadPartner.revenueTotal)), tone: 'green' }
        ]}
      />
      <DashboardPanel
        tone="purple"
        badge="IN"
        title="Investor activity"
        to="/admin/investments"
        linkLabel="View investments"
        rows={[
          { icon: '↗', label: 'Active investments', value: show(count(investor.activeInvestments)), tone: 'purple' },
          { icon: '◇', label: 'Investor-linked leads', value: show(count(investor.totalLeads)), tone: 'blue' },
          { icon: '₹', label: 'Gross sales', value: show(money(investor.grossSales)), tone: 'orange' },
          { icon: '₹', label: 'Investor allocation', value: show(money(investor.investorAllocated)), tone: 'green' },
          { icon: '✓', label: 'Propulse commission', value: show(money(investor.revenueTotal)), tone: 'purple' }
        ]}
      />
      <section className="admin-dashboard-panel operations">
        <header className="admin-dashboard-panel-head">
          <div className="admin-dashboard-panel-title">
            <span className="admin-business-badge orange">⚙</span>
            <h2>Operations</h2>
          </div>
          <strong className="admin-action-count">{show(count(actionTotal))}</strong>
        </header>
        <div className="admin-compact-actions">
          <CompactAction to="/admin/payments" label="Payments" value={actions.pendingPayments}/>
          <CompactAction to="/admin/company-proofs" label="Company proofs" value={actions.pendingCompanyProofs}/>
          <CompactAction to="/admin/lead-reports" label="Lead reports" value={actions.pendingLeadReports}/>
          <CompactAction to="/admin/lead-partner-payouts" label="Partner payouts" value={actions.pendingPartnerPayouts}/>
        </div>
      </section>
      <DashboardPanel
        tone="green"
        badge="◎"
        title="Customers"
        rows={[
          { icon: '◎', label: 'Businesses', value: show(count(customers.activeBusinesses)), tone: 'blue' },
          { icon: '★', label: 'Memberships', value: show(count(customers.activeMemberships)), tone: 'orange' },
          { icon: '✓', label: 'Pro members', value: show(count(customers.proMembers)), tone: 'green' },
          { icon: '+', label: 'New this month', value: show(count(customers.newUsersMonth)), tone: 'purple' }
        ]}
      />
    </section>
  </main>
}
