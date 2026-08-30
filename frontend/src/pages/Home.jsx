import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <div className="hero-section">
        <h1>Propulse Business</h1>
        <p className="hero-subtitle">Your business management platform</p>
        <Link to="/dashboard" className="cta-button">
          Go to Dashboard
        </Link>
      </div>
      <div className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analytics</h3>
            <p>Comprehensive business analytics and reporting</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>User Management</h3>
            <p>Manage users, roles, and permissions</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Inventory</h3>
            <p>Track products and inventory levels</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Billing</h3>
            <p>Handle subscriptions and payments</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;