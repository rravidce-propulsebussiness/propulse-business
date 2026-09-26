import GoogleSheetAutoSync from './GoogleSheetAutoSync';
import './AdminLeadsV9.css';

export default function AdminLeadSheets(){
  return <main className="v9-leads">
    <header className="v9-head">
      <div>
        <span>LEAD SOURCES</span>
        <h1>Google Sheets</h1>
        <p>Connect, sync and manage automatic Google Sheet lead sources separately from manual CSV imports.</p>
      </div>
    </header>
    <GoogleSheetAutoSync/>
  </main>;
}
