import {useNavigate} from 'react-router-dom';
import {clearSession,getUser} from '../utils/auth';
import LeadPartnerSidebar from '../components/LeadPartnerSidebar';
import MetaLeadsPanel from '../components/MetaLeadsPanel';
export default function LeadPartnerMetaLeads(){
  const navigate=useNavigate();
  const signOut=async()=>{await clearSession();navigate('/login',{replace:true});};
  return <div className="meta-leads-partner-shell">
    <LeadPartnerSidebar user={getUser()} onSignOut={signOut}/>
    <main className="meta-leads-partner-main"><MetaLeadsPanel partner/></main>
  </div>;
}
