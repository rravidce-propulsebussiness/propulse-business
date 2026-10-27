const pool=require('../config/database');

/**
 * All-time company totals. The existing admin inbox intentionally limits its
 * detail rows; counts must NOT be calculated from those truncated lists.
 * A linked lead is counted only when its origin matches the request and owner.
 */
async function listCompanySummary(){
  const {rows}=await pool.query(`
    WITH requests AS (
      SELECT q.id, q.business_user_id, 'quote'::text AS kind, q.status,
             q.marketplace_lead_id, q.created_at
      FROM professional_project_quote_requests q
      UNION ALL
      SELECT r.id, r.business_user_id,
             CASE WHEN r.project_id IS NULL THEN 'profile' ELSE 'callback' END AS kind,
             r.status, r.marketplace_lead_id, r.created_at
      FROM project_callback_requests r
    ),
    checked AS (
      SELECT r.*,
        (l.id IS NOT NULL) AS verified_lead,
        (l.id IS NOT NULL AND l.status='available') AS available_lead
      FROM requests r
      LEFT JOIN leads l ON l.id=r.marketplace_lead_id
        AND l.source=CASE r.kind
          WHEN 'quote' THEN 'professional_project_quote'
          WHEN 'profile' THEN 'professional_profile_callback'
          ELSE 'professional_project_callback' END
        AND l.custom_fields->'_project_origin'->>'type'=r.kind
        AND l.custom_fields->'_project_origin'->>'requestId'=r.id::text
        AND l.custom_fields->'_project_origin'->>'professionalUserId'=r.business_user_id::text
    )
    SELECT r.business_user_id AS company_id,
      COALESCE((
        SELECT NULLIF(BTRIM(bp.business_name),'')
        FROM business_profiles bp WHERE bp.user_id=r.business_user_id
        ORDER BY bp.id DESC LIMIT 1
      ), 'Professional #' || r.business_user_id::text) AS business_name,
      COUNT(*)::int AS total_requests,
      COUNT(*) FILTER (WHERE r.kind='quote')::int AS quote_requests,
      COUNT(*) FILTER (WHERE r.kind='callback')::int AS project_callbacks,
      COUNT(*) FILTER (WHERE r.kind='profile')::int AS profile_callbacks,
      COUNT(*) FILTER (WHERE r.status='new')::int AS new_requests,
      COUNT(*) FILTER (WHERE r.kind='quote' AND r.status='quoted')::int AS quotes_prepared,
      COUNT(DISTINCT r.marketplace_lead_id) FILTER (WHERE r.verified_lead)::int AS linked_marketplace_leads,
      COUNT(DISTINCT r.marketplace_lead_id) FILTER (WHERE r.available_lead)::int AS available_marketplace_leads,
      COUNT(*) FILTER (WHERE NOT r.verified_lead)::int AS not_linked_requests,
      COUNT(*) FILTER (WHERE r.created_at >= NOW()-INTERVAL '30 days')::int AS requests_last_30_days,
      MAX(r.created_at) AS last_request_at
    FROM checked r
    GROUP BY r.business_user_id
    ORDER BY total_requests DESC, last_request_at DESC, business_name ASC
  `);
  return rows;
}

module.exports={listCompanySummary};
