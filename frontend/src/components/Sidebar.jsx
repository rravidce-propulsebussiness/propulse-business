import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/profile', label: 'Business Profile', icon: '◉' },
    { path: '/industries', label: 'Industries', icon: '🏢' },
    { path: '/', label: 'Home', icon: '🏠' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">Propulse Business</h1>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
