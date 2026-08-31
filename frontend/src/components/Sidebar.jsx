import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  const navItems = [
    { path: '/', label: 'Home', icon: '⌂' },
    { path: '/dashboard', label: 'My Leads', icon: '▣' },
    { path: '/industries', label: 'Lead Categories', icon: '◈' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">Propulse</h1>
        <span className="logo-subtitle">BUSINESS</span>
      </div>
      <nav className="sidebar-nav">
        <ul>{navItems.map((item) => <li key={item.path}><NavLink to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span></NavLink></li>)}</ul>
      </nav>
    </aside>
  );
}
export default Sidebar;
