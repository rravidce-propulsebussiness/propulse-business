import { Navigate, useSearchParams } from 'react-router-dom'
import PortalContact from './PortalContact'
import './Contact.css'

export default function Contact(){
  const [searchParams]=useSearchParams()
  const portalAudience=searchParams.get('audience')
  if(portalAudience==='lead_partners'||portalAudience==='users') return <PortalContact audience={portalAudience}/>
  return <Navigate to="/#contact" replace/>
}

