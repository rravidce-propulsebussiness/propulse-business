import { useEffect, useState } from 'react';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch(`${API_URL}/admin/dashboard/stats`, { headers: localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {} })
      .then((r) => { if (!r.ok) throw new Error('Unable to load dashboard statistics'); return r.json(); })
      .then((data) => mounted && setStats(data))
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const cards = [
    ['Businesses', stats?.businesses], ['Active Businesses', stats?.activeBusinesses], ['Users', stats?.users], ['Industries', stats?.industries],
    ['Services', stats?.services], ['Subservices', stats?.subservices], ['States', stats?.states], ['Cities', stats?.cities],
  ];

  return <main className="admin-dashboard">
    <section className="admin-hero">
      <div><span className="admin-badge">PROPULSE ADMIN</span><h1>Platform overview</h1><p>Your lead marketplace, at a glance.</p></div>
      <div className="admin-status"><span /> System operational</div>
    </section>
    {error && <div className="admin-dashboard__error"><strong>Dashboard unavailable</strong><span>{error}</span></div>}
    <section className="admin-section-head"><div><span>OVERVIEW</span><h2>Marketplace health</h2></div><small>Live platform data</small></section>
    <section className="admin-dashboard__grid">
      {cards.map(([label, value]) => <article className="admin-card" key={label}><div className="admin-card-top"><span>{label}</span><i>↗</i></div><strong>{loading ? '···' : value ?? '—'}</strong><small>{label === 'Businesses' ? 'Registered on Propulse' : 'Platform data'}</small></article>)}
    </section>
    <section className="admin-bottom"><div className="admin-insight"><span>PLATFORM STRUCTURE</span><h2>One marketplace. Every category.</h2><p>Manage industries, services, subservices and locations from one administration layer.</p></div><div className="admin-flow">{['Industries','Services','Subservices','Locations'].map((x, i) => <div key={x}><b>0{i + 1}</b><span>{x}</span></div>)}</div></section>
  </main>;
}
