-- Meta spend based per-lead pricing for Meta Lead Ads.
ALTER TABLE meta_lead_pages ADD COLUMN IF NOT EXISTS meta_user_token_encrypted TEXT;
ALTER TABLE meta_lead_events ADD COLUMN IF NOT EXISTS ad_id VARCHAR(40), ADD COLUMN IF NOT EXISTS ad_account_id VARCHAR(40), ADD COLUMN IF NOT EXISTS total_spend NUMERIC(14,2), ADD COLUMN IF NOT EXISTS spend_delta NUMERIC(14,2), ADD COLUMN IF NOT EXISTS normal_price NUMERIC(14,2), ADD COLUMN IF NOT EXISTS member_price NUMERIC(14,2), ADD COLUMN IF NOT EXISTS pricing_error TEXT;
CREATE TABLE IF NOT EXISTS meta_ad_pricing_settings (
 id SMALLINT PRIMARY KEY CHECK (id=1), enabled BOOLEAN NOT NULL DEFAULT TRUE,
 non_member_markup_percent NUMERIC(7,2) NOT NULL DEFAULT 28, member_markup_percent NUMERIC(7,2) NOT NULL DEFAULT 28,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO meta_ad_pricing_settings(id,enabled,non_member_markup_percent,member_markup_percent) VALUES(1,TRUE,28,28) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS meta_ad_spend_snapshots (
 ad_id VARCHAR(40) PRIMARY KEY, ad_account_id VARCHAR(40), currency VARCHAR(3) NOT NULL DEFAULT 'INR',
 total_spend NUMERIC(14,2) NOT NULL DEFAULT 0, last_delta NUMERIC(14,2) NOT NULL DEFAULT 0,
 observed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
