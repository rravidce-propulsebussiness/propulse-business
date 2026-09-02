// Admin Leads API module.
// Keep HTTP/auth concerns out of the Admin Leads page.
import { authRequest } from '../utils/auth';

export const adminLeadsRequest = (path, options = {}) => authRequest(path, options);

export const listAdminLeads = (query = '') =>
  adminLeadsRequest(`/admin/leads${query ? `?${query}` : ''}`);

export const createAdminLead = (payload) =>
  adminLeadsRequest('/admin/leads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateAdminLead = (id, payload) =>
  adminLeadsRequest(`/admin/leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteAdminLead = (id) =>
  adminLeadsRequest(`/admin/leads/${id}`, {
    method: 'DELETE',
  });

export const getAdminLeadCategories = () =>
  adminLeadsRequest('/categories');
