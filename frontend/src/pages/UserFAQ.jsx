import WebsiteFaqSection from '../components/WebsiteFaqSection'
import './UserFAQ.css'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'

export default function UserFAQ(){
  return <div className="website-faq-page customer-faq-page">
    <PublicHeader/>
    <WebsiteFaqSection variant="page" audience="homeowner"/>
    <PublicFooter/>
  </div>
}
