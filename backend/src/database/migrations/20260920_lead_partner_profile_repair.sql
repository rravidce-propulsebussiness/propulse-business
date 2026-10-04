-- Keep Lead Partner accounts consistent with their role.
-- Older databases may have created/changed a lead_partner user after the
-- original profile backfill migration ran.
INSERT INTO lead_partners (user_id, status)
SELECT u.id, 'active'
FROM users u
WHERE u.role = 'lead_partner'
  AND NOT EXISTS (
    SELECT 1 FROM lead_partners lp WHERE lp.user_id = u.id
  );
