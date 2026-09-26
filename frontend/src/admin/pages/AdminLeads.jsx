// Canonical production entry point for the admin lead inventory.
import './AdminLeadsV9.no-refresh.css';
import '../leadImportBulkEnhancer.js';
import AdminLeadBulkClear from './AdminLeadBulkClear';
import AdminLeadsV9 from './AdminLeadsV9';

export default function AdminLeads(){
  return <><AdminLeadsV9 mode="manage"/><AdminLeadBulkClear/></>;
}
