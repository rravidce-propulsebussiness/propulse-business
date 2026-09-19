-- Investment access is a Pro membership capability for business users, not a separate users.role.
-- Normalize any accounts created by the earlier investor-role experiment back to business accounts.
UPDATE users
SET role='business',
    auth_version=auth_version+1,
    updated_at=CURRENT_TIMESTAMP
WHERE role='investor';
