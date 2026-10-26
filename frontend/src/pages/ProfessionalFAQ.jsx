import UserHeader from '../components/UserHeader'
import WebsiteFaqSection from '../components/WebsiteFaqSection'
import './UserFAQ.css'
import './ProfessionalFAQ.css'

// The professional FAQ uses existing 'website' FAQ records maintained
// in Admin → FAQs. It never renders the homeowner header or help links.
export default function ProfessionalFAQ(){
  return <div className="website-faq-page professional-faq-page">
    <UserHeader/>
    <WebsiteFaqSection variant="page" audience="website"/>
  </div>
}
