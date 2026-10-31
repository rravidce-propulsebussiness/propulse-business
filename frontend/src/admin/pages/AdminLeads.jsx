// Canonical production entry point for the admin lead inventory.
import AdminLeadsV9 from './AdminLeadsV9';
import AdminDirectEnquiries from './AdminDirectEnquiries';
import { useSearchParams } from 'react-router-dom';

export default function AdminLeads(){
  const [params]=useSearchParams();
  return params.get('view')==='direct' ? <AdminDirectEnquiries/> : <AdminLeadsV9 mode="manage"/>;
}
