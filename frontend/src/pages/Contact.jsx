import { Navigate, useSearchParams } from 'react-router-dom'
import PortalContact from './PortalContact'
import './Contact.css'

const empty={company_name:'',email:'',phone:'',whatsapp:'',address:'',business_hours:'',support_email:'',careers_email:'',maps_url:'',website_url:'',social_handles:[]}

export default function Contact(){
  const [searchParams]=useSearchParams()
  const portalAudience=searchParams.get('audience')
  if(portalAudience==='lead_partners'||portalAudience==='users') return <PortalContact audience={portalAudience}/>
  return <Navigate to="/#contact" replace/>
}

