BEGIN;

-- Prevent concurrent checkout requests from creating multiple pending
-- investment payments for the same user and industry.
CREATE UNIQUE INDEX IF NOT EXISTS uq_investments_pending_user_industry
  ON investments(user_id, industry_id)
  WHERE status = 'pending';

COMMIT;
