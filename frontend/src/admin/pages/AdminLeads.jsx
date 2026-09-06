// Canonical production entry point for the admin lead inventory.
// Keep the implementation in one place so routes/imports never depend on versioned filenames.
import './AdminLeadsV9.no-refresh.css';
import GoogleSheetAutoSync from './GoogleSheetAutoSync';
import AdminLeadsV9 from './AdminLeadsV9';

export default function AdminLeads(){
  return <><GoogleSheetAutoSync/><AdminLeadsV9/></>;
}
