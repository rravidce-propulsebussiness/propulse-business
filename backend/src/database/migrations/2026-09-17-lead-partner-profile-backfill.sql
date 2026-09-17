-- Every account whose users.role is lead_partner must have the partner
-- profile required by partner-only inventory and dashboard operations.
-- Existing applications are preserved; this only backfills missing rows.
INSERT INTO lead_partners (user_id, status)
SELECT u.id, 'active'
FROM users u
WHERE u.role = 'lead_partner'
  AND NOT EXISTS (
    SELECT 1
    FROM lead_partners lp
    WHERE lp.user_id = u.id
  );
