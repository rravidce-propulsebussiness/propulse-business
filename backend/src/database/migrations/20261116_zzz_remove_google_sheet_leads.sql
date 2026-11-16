-- Remove only lead rows whose canonical source identifies the retired Google Sheets intake.
-- Marketplace, Meta, and other CSV/manual leads remain untouched.
DELETE FROM leads
WHERE COALESCE(source, '') ~* '(google[[:space:]_-]*sheets?|google[[:space:]_-]*spreadsheet|spreadsheet)';
