-- Prevent the same manual payment reference / UTR from being submitted more than once.
-- Existing duplicates are intentionally not auto-deleted; the unique index only applies to
-- non-empty references after normalizing whitespace and case.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_topups_manual_reference
  ON wallet_topups (LOWER(BTRIM(reference)))
  WHERE payment_method = 'manual' AND reference IS NOT NULL AND BTRIM(reference) <> '';

CREATE INDEX IF NOT EXISTS idx_wallet_topups_review_queue
  ON wallet_topups(status, created_at DESC, id DESC);
