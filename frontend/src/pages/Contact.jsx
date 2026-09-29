import { useSearchParams } from 'react-router-dom'
import PortalContact from './PortalContact'
import PublicContact from './PublicContact'
import './Contact.css'

export default function Contact(){
  const [searchParams]=useSearchParams()
  const portalAudience=searchParams.get('audience')
  if(portalAudience==='lead_partners'||portalAudience==='users') return <PortalContact audience={portalAudience}/>
  return <PublicContact/>
}
