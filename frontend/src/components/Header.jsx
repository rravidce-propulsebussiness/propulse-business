import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <h2 className="page-title">Dashboard</h2>
      </div>
      <div className="header-right">
        <div className="user-menu">
          <span className="user-name">Admin User</span>
          <div className="user-avatar">AU</div>
        </div>
      </div>
    </header>
  );
}

export default Header;