import GoogleSheetAutoSync from './GoogleSheetAutoSync';
import './AdminLeadsV9.css';

export default function AdminLeadSheets(){
  return <main className="v9-leads v9-sheet-workspace">
    <section className="v9-sheet-hero">
      <div className="v9-sheet-hero-copy">
        <span>LEAD OPERATIONS / AUTOMATION</span>
        <h1>Google Sheets</h1>
        <p>Connect live lead sources, set safe defaults and keep inventory synchronized automatically without manual CSV uploads.</p>
      </div>
      <div className="v9-sheet-automation-badge">
        <span className="v9-sheet-pulse"><i/></span>
        <div><strong>Automatic sync</strong><small>Checks every 5 minutes while active</small></div>
      </div>
    </section>
    <GoogleSheetAutoSync/>
  </main>;
}
