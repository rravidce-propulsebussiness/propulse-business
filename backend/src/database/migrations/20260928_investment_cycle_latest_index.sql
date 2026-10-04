-- propulse:no-transaction\n-- Support latest-cycle lookup for paginated Admin investment scopes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investment_cycles_user_latest
  ON investment_cycles(user_id, id DESC);
