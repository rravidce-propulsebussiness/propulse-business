import UserHeader from '../components/UserHeader'
import WebsiteFaqSection from '../components/WebsiteFaqSection'
import { getToken, getUser } from '../utils/auth'
import './UserFAQ.css'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'

export default function UserFAQ(){
  const loggedIn=Boolean(getToken()&&getUser())
  return <div className="website-faq-page customer-faq-page">
    {loggedIn?<UserHeader/>:<PublicHeader/>}
    <WebsiteFaqSection variant="page" audience="homeowner"/>
    {!loggedIn&&<PublicFooter/>}
  </div>
}
