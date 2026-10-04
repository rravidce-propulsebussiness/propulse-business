import { Link } from 'react-router-dom'
import UserHeader from '../components/UserHeader'
import WebsiteFaqSection from '../components/WebsiteFaqSection'
import { getToken, getUser } from '../utils/auth'
import './UserFAQ.css'

function PublicFaqHeader(){
  return <><header className="customer-faq-header">
    <Link className="customer-faq-brand" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
    <nav className="customer-faq-nav" aria-label="Customer FAQ navigation">
      <Link to="/">Home</Link>
      <Link to="/packages">Packages</Link>
      <Link to="/projects">Projects</Link>
      <Link to="/guides">Guides</Link>
      <Link className="active" to="/faq">FAQ</Link>
      <Link to="/contact">Contact</Link>
    </nav>
    <div className="customer-faq-actions"><Link to="/quote">Get Free Quote</Link><Link to="/professionals">For Professionals</Link></div>
  </header><div className="customer-faq-header-spacer" aria-hidden="true"/></>
}

export default function UserFAQ(){
  const loggedIn=Boolean(getToken()&&getUser())
  return <div className="website-faq-page customer-faq-page">
    {loggedIn?<UserHeader/>:<PublicFaqHeader/>}
    <WebsiteFaqSection variant="page" audience="homeowner"/>
  </div>
}
