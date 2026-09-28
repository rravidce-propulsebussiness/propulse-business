-- propulse:no-transaction\n-- Support investor assigned/sold lead aggregation by lead without scanning purchases by user first.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_purchases_lead_status_user
  ON lead_purchases(lead_id,status,user_id);
