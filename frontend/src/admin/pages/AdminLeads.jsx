import AdminLeadsV9 from './AdminLeadsV9';
import './AdminLeads.css';

export default function AdminLeads(){
  return <div className="admin-leads-shell">
    <div className="sample-lead-toolbar">
      <a className="sample-lead-download" href="/lead-upload-sample.csv" download="propulse-lead-upload-sample.csv">↓ Sample Lead Sheet</a>
    </div>
    <AdminLeadsV9 />
  </div>;
}
