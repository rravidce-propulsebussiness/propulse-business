import MetaLeadAdsPanel from '../../components/MetaLeadAdsPanel';
import LeadClassificationRulesPanel from '../../components/LeadClassificationRulesPanel';
import './AdminLeadsV9.css';

export default function AdminLeadMeta(){
  return <main className="v9-leads">
    <LeadClassificationRulesPanel/>
    <MetaLeadAdsPanel scope="admin"/>
  </main>;
}
