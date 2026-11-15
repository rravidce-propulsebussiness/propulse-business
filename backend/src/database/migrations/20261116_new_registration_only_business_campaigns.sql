-- Automatic lead-entitlement campaigns target newly registered businesses only.
-- Existing grants remain valid; this only narrows future eligibility.
UPDATE lead_entitlement_business_campaigns
SET registration_scope='new_registration',updated_at=CURRENT_TIMESTAMP
WHERE registration_scope IS DISTINCT FROM 'new_registration';
