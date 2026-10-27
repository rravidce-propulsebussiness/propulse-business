-- Public professional files must be manually inspected to ensure no direct
-- phone, email, website, WhatsApp QR, or spoken/burned-in contact information.
-- Fail closed: uploads are private in the public directory until approved.
CREATE TABLE IF NOT EXISTS public_professional_media_approvals (
  business_profile_id INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  asset_url TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by INTEGER REFERENCES users(id),
  PRIMARY KEY (business_profile_id,asset_url),
  CONSTRAINT public_professional_media_approvals_nonempty CHECK (length(asset_url) BETWEEN 1 AND 2048)
);
CREATE INDEX IF NOT EXISTS idx_public_professional_media_approvals_business
  ON public_professional_media_approvals(business_profile_id);
