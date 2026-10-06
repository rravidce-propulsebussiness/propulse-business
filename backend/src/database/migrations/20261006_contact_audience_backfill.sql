-- Backfill contact audiences that were never materialized from the legacy single-row
-- contact settings table. Preserve any audience that Admin already configured.
INSERT INTO contact_audience_settings (
  audience,company_name,email,phone,whatsapp,address,business_hours,
  support_email,careers_email,maps_url,website_url,social_handles
)
SELECT
  target.audience,
  legacy.company_name,legacy.email,legacy.phone,legacy.whatsapp,legacy.address,legacy.business_hours,
  legacy.support_email,legacy.careers_email,legacy.maps_url,legacy.website_url,legacy.social_handles
FROM contact_settings legacy
CROSS JOIN (VALUES ('website'),('users'),('lead_partners'),('common')) AS target(audience)
WHERE legacy.id=1
ON CONFLICT (audience) DO NOTHING;

-- Fresh databases without a legacy row should still avoid blank contact surfaces once the
-- Professional audience exists. Reuse the same company contact details but point each
-- audience at its own safe application surface.
INSERT INTO contact_audience_settings (
  audience,company_name,email,phone,whatsapp,address,business_hours,
  support_email,careers_email,maps_url,website_url,social_handles
)
SELECT
  target.audience,
  p.company_name,p.email,p.phone,p.whatsapp,p.address,p.business_hours,
  p.support_email,p.careers_email,p.maps_url,
  CASE target.audience
    WHEN 'website' THEN '/'
    WHEN 'users' THEN '/contact'
    WHEN 'lead_partners' THEN '/lead-partner/contact'
    ELSE '/'
  END,
  p.social_handles
FROM contact_audience_settings p
CROSS JOIN (VALUES ('website'),('users'),('lead_partners'),('common')) AS target(audience)
WHERE p.audience='professionals'
ON CONFLICT (audience) DO NOTHING;
