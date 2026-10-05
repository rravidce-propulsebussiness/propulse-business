-- propulse:no-transaction
-- Targeted indexes selected from live Supabase advisor + pg_stat_user_tables data.
-- Avoid blanket indexing every foreign key; these two are justified by current traffic/size.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_city_created_id
  ON leads(city_id, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_background_job_runs_triggered_by
  ON background_job_runs(triggered_by);
