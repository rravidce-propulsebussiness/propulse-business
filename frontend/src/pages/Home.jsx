import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <section className="home-welcome"><div><span className="home-eyebrow">PROPULSE BUSINESS</span><h1>Find better leads.<br /><em>Grow your business.</em></h1><p>Get relevant opportunities matched to the services and locations you serve.</p></div><Link to="/dashboard" className="home-primary">View my leads <span>→</span></Link></section>
      <section className="home-stats"><div className="home-stat"><span>NEW LEADS</span><strong>—</strong><small>Waiting for you</small></div><div className="home-stat"><span>MATCHED SERVICES</span><strong>—</strong><small>Based on your profile</small></div><div className="home-stat"><span>SERVICE AREAS</span><strong>—</strong><small>Locations you serve</small></div></section>
      <section className="home-grid"><article className="home-panel home-panel-main"><div className="panel-heading"><div><span className="panel-kicker">LEAD MARKETPLACE</span><h2>Opportunities for you</h2></div><span className="live-badge"><i /> LIVE</span></div><div className="empty-leads"><div className="empty-icon">↗</div><h3>Your matched leads will appear here</h3><p>Propulse matches customer requirements with the services and locations in your business profile.</p><Link to="/industries">Explore lead categories <span>→</span></Link></div></article><aside className="home-panel home-panel-side"><span className="panel-kicker">HOW IT WORKS</span><div className="home-step"><b>01</b><div><strong>Choose services</strong><span>Select what your business provides.</span></div></div><div className="home-step"><b>02</b><div><strong>Add locations</strong><span>Tell us where you serve customers.</span></div></div><div className="home-step"><b>03</b><div><strong>Get matched</strong><span>Relevant opportunities come to you.</span></div></div></aside></section>
    </div>
  );
}

export default Home;
