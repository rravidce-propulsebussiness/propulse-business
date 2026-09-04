import { useEffect, useState } from 'react';
import { clearSession, getUser } from '../../utils/auth';
import { apiRequest } from '../../utils/api';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    apiRequest('/admin/dashboard/stats')
      .then((data) => mounted && setStats(data))
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, []);

  const admin = getUser();
  const adminName = admin?.name || 'Admin User';
  const adminEmail = admin?.email || 'Administrator';
  const initials = adminName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'AU';

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem('propulse_session_mode');
    window.location.href = '/login';
  };

  const cards = [
    ['Active users', stats?.activeUsers],
    ['Businesses', stats?.businesses],
    ['Active businesses', stats?.activeBusinesses],
    ['Industries', stats?.industries],
    ['Services', stats?.services],
    ['Subservices', stats?.subservices],
    ['States / UTs', stats?.states],
    ['Cities', stats?.cities],
  ];

  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <a className="admin-brand" href="/admin" aria-label="Propulse Admin home">
          <span className="admin-brand-mark">P</span>
          <span><b>PRO<span>PULSE</span></b><small>BUSINESS TECHNOLOGIES</small></span>
        </a>

        <div className="admin-header-right">
          <div className="admin-account">
            <span className="admin-avatar">{initials}</span>
            <span className="admin-account-copy">
              <b>{adminName}</b>
              <small>{adminEmail}</small>
            </span>
          </div>
          <button className="admin-logout" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <section className="admin-intro">
        <div>
          <span className="admin-eyebrow">ADMIN CONSOLE</span>
          <h1>Platform overview</h1>
          <p>Monitor Propulse Business from one simple workspace.</p>
        </div>
        <div className="admin-live"><i /> Live system</div>
      </section>

      {error && (
        <div className="admin-dashboard__error">
          <strong>Dashboard unavailable</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="admin-section-head">
        <div>
          <span>ANALYTICS</span>
          <h2>Platform at a glance</h2>
        </div>
        <small>Current database totals</small>
      </section>

      <section className="admin-dashboard__grid">
        {cards.map(([label, value]) => (
          <article className="admin-card" key={label}>
            <span>{label}</span>
            <strong>{loading ? '—' : value ?? '0'}</strong>
          </article>
        ))}
      </section>

      <section className="admin-overview-panel">
        <div>
          <span className="admin-eyebrow">PROPULSE BUSINESS</span>
          <h2>Manage the platform from one place.</h2>
          <p>Maintain your master data and keep lead matching accurate as the marketplace grows.</p>
        </div>
        <div className="admin-data-list">
          <div><b>01</b><span>Industries</span><small>Categories & structure</small></div>
          <div><b>02</b><span>Services</span><small>Business offerings</small></div>
          <div><b>03</b><span>Locations</span><small>States, UTs & cities</small></div>
        </div>
      </section>
    </main>
  );
}
