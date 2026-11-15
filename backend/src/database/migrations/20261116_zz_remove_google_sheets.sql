-- Google Sheets lead intake has been retired. Remove its unused storage and
-- forget the retired migration records; imported lead rows are not stored here.
DROP TABLE IF EXISTS google_sheet_import_previews;
DROP TABLE IF EXISTS lead_partner_sheet_connections;
DROP TABLE IF EXISTS admin_google_sheet_connections;
DROP TABLE IF EXISTS google_sheet_sync_settings;

DELETE FROM schema_migrations
WHERE filename IN (
  'migrations/2026-09-17-lead-partner-sheet-connections.sql',
  'migrations/20260927_zzzzz_lead_partner_sheet_sync_health.sql',
  'migrations/20260928_admin_google_sheet_connections.sql',
  'migrations/20260928_google_sheet_preview_mapping.sql',
  'migrations/20260928_google_sheet_sync_settings.sql',
  'migrations/20260928_lead_partner_sheet_default_industry.sql',
  'migrations/20261005_admin_google_sheet_default_industry.sql',
  'migrations/20261005_lead_partner_sheet_fingerprint.sql'
);
