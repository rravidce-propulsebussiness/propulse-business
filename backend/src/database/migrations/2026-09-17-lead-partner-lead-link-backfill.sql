-- Existing leads created by Lead Partner users must be linked to their
-- canonical lead_partners row so Admin Leads and Lead Partner Inventory
-- read the same lead ownership relationship.
UPDATE leads l
SET lead_partner_id = lp.id,
    updated_at = CURRENT_TIMESTAMP
FROM users u
JOIN lead_partners lp ON lp.user_id = u.id
WHERE l.created_by = u.id
  AND u.role = 'lead_partner'
  AND l.lead_partner_id IS NULL;
