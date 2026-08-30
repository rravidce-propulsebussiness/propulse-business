import './Dashboard.css';

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Welcome to Propulse Business</p>
      </div>
      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <span className="stat-value">—</span>
              <span className="stat-label">Total Revenue</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <span className="stat-value">—</span>
              <span className="stat-label">Active Users</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <span className="stat-value">—</span>
              <span className="stat-label">Products</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-info">
              <span className="stat-value">—</span>
              <span className="stat-label">Conversion Rate</span>
            </div>
          </div>
        </div>
        <div className="dashboard-section">
          <h2>Recent Activity</h2>
          <p className="no-data">No recent activity to display.</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;