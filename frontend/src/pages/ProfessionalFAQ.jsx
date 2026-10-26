import UserHeader from '../components/UserHeader'
import WebsiteFaqSection from '../components/WebsiteFaqSection'
import './UserFAQ.css'
import './ProfessionalFAQ.css'

// Professionals have their own editable FAQ content, navigation and support links.
// Homeowner questions are managed separately and never appear here.
export default function ProfessionalFAQ(){
  return <div className="website-faq-page professional-faq-page">
    <UserHeader/>
    <WebsiteFaqSection variant="page" audience="professional"/>
  </div>
}
