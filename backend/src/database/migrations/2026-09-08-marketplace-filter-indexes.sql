-- Keep marketplace profile eligibility and purchase-exclusion lookups index-backed.
CREATE INDEX IF NOT EXISTS idx_business_profiles_user ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profile_services_match ON business_profile_services(business_profile_id,industry_id,service_id,subservice_id) WHERE is_active=TRUE;
CREATE INDEX IF NOT EXISTS idx_business_profile_locations_match ON business_profile_locations(business_profile_id,state_id,city_id) WHERE is_active=TRUE;
CREATE INDEX IF NOT EXISTS idx_lead_purchases_user_lead_status ON lead_purchases(user_id,lead_id,status);
