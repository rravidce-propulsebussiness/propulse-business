const pool = require('../config/database');
const base = require('./leadPurchaseCouponService');

async function getPurchases(userId) {
  const leads = await base.getPurchases(userId);
  if (!leads.length) return leads;
  const crmRows = (await pool.query(`
    SELECT crm.lead_id,crm.status AS crm_status,COALESCE(crm.remarks,'') AS crm_remarks,
           crm.last_followed_up_at,crm.next_followup_at,COALESCE(crm.followup_count,0)::int AS followup_count,
           crm.contacted_by_user_id,COALESCE(u.name,'') AS contacted_by_name
    FROM lead_crm crm
    LEFT JOIN users u ON u.id=crm.contacted_by_user_id
    WHERE crm.user_id=$1 AND crm.lead_id=ANY($2::int[])
  `, [userId, leads.map(x => Number(x.lead_id))])).rows;
  const byLead = new Map(crmRows.map(x => [Number(x.lead_id), x]));
  return leads.map(lead => ({ ...lead, ...(byLead.get(Number(lead.lead_id)) || { crm_status:'new', crm_remarks:'', last_followed_up_at:null, next_followup_at:null, followup_count:0, contacted_by_user_id:null, contacted_by_name:'' }) }));
}

async function getExportPurchases(userId, { from, to } = {}) {
  const params = [userId];
  const filters = [];
  if (from) { params.push(from); filters.push(`COALESCE(p.created_at,c.claimed_at) >= $${params.length}`); }
  if (to) { params.push(to); filters.push(`COALESCE(p.created_at,c.claimed_at) < $${params.length}`); }
  const where = filters.length ? ` AND ${filters.join(' AND ')}` : '';
  return (await pool.query(`
    SELECT l.id AS lead_id,l.customer_name,l.customer_phone,l.customer_email,l.requirement,l.property_type,l.budget,l.source,l.notes,l.custom_fields,
           i.name AS industry_name,s.name AS service_name,ss.name AS subservice_name,st.name AS state_name,cit.name AS city_name,
           COALESCE(p.created_at,c.claimed_at) AS access_date,
           CASE WHEN c.id IS NOT NULL AND p.id IS NULL THEN 'Membership' ELSE INITCAP(COALESCE(p.pricing_tier,'normal')) END AS access_type,
           COALESCE(p.shares,1)::int AS shares,crm.status AS crm_status,COALESCE(crm.remarks,'') AS crm_remarks,
           crm.last_followed_up_at,crm.next_followup_at,COALESCE(crm.followup_count,0)::int AS followup_count,
           COALESCE(cu.name,'') AS contacted_by_name
    FROM leads l
    LEFT JOIN lead_purchases p ON p.lead_id=l.id AND p.user_id=$1 AND p.status='paid'
    LEFT JOIN lead_entitlement_claims c ON c.lead_id=l.id AND c.user_id=$1
    LEFT JOIN lead_crm crm ON crm.lead_id=l.id AND crm.user_id=$1
    LEFT JOIN users cu ON cu.id=crm.contacted_by_user_id
    LEFT JOIN industries i ON i.id=l.industry_id
    LEFT JOIN services s ON s.id=l.service_id
    LEFT JOIN subservices ss ON ss.id=l.subservice_id
    LEFT JOIN states st ON st.id=l.state_id
    LEFT JOIN cities cit ON cit.id=l.city_id
    WHERE (p.id IS NOT NULL OR c.id IS NOT NULL)${where}
    ORDER BY COALESCE(p.created_at,c.claimed_at) DESC
  `, params)).rows;
}

module.exports = { ...base, getPurchases, getExportPurchases };
