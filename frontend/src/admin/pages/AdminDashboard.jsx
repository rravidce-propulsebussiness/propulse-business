import { useEffect, useState } from 'react';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/admin/dashboard/stats`, { headers });
        if (!response.ok) throw new Error(`Unable to load dashboard statistics (${response.status})`);
        const data = await response.json();
        if (mounted) setStats(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Unable to load dashboard statistics');
      }
    }
    loadStats();
    return () => { mounted = false; };
  }, []);

  const cards = [
    ['Businesses', stats?.businesses ?? '—'],
    ['Active Businesses', stats?.activeBusinesses ?? '—'],
    ['Users', stats?.users ?? '—'],
    ['Industries', stats?.industries ?? '—'],
    ['Services', stats?.services ?? '—'],
    ['Subservices', stats?.subservices ?? '—'],
    ['States', stats?.states ?? '—'],
    ['Cities', stats?.cities ?? '—'],
  ];

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <p className="admin-dashboard__eyebrow">PROPULSE ADMIN</p>
          <h1>Dashboard</h1>
          <p>Overview of your marketplace and business network.</p>
        </div>
      </header>
      {error && <div className="admin-dashboard__error" role="alert">{error}</div>}
      <section className="admin-dashboard__grid" aria-label="Platform statistics">
        {cards.map(([label, value]) => (
          <article className="admin-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
