import MetaLeadAdsPanel from '../../components/MetaLeadAdsPanel';
import LeadClassificationRulesPanel from '../../components/LeadClassificationRulesPanel';
import './AdminLeadsV9.css';

export default function AdminLeadMeta(){
  return <main className="v9-leads v9-sheet-workspace">
    <section className="v9-sheet-hero">
      <div className="v9-sheet-hero-copy">
        <span>LEAD OPERATIONS / SOURCES</span>
        <h1>Meta Lead Ads</h1>
        <p>Connect lead forms and send captured leads into your ProPulse inventory.</p>
      </div>
    </section>
    <LeadClassificationRulesPanel/>
    <MetaLeadAdsPanel scope="admin"/>
  </main>;
}
