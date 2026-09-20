-- Lead Partner accounts are only valid for business users.
-- Existing non-business partner records are made unavailable, and the
-- service layer prevents future activation for non-business accounts.
UPDATE lead_partners lp
SET status='rejected',
    updated_at=CURRENT_TIMESTAMP
FROM users u
WHERE u.id=lp.user_id
  AND u.role <> 'business'
  AND lp.status <> 'rejected';
