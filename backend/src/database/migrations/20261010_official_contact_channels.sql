-- Replace the original placeholder contact channels without overwriting
-- custom phone numbers or email addresses configured by administrators.
-- Keep audience-specific business names, locations and social links unchanged.
UPDATE contact_settings SET
  email=CASE WHEN email IN ('info@propulse.com','support@propulse.com','careers@propulse.com') THEN 'info@propulsetechnologies.online' ELSE email END,
  support_email=CASE WHEN support_email IN ('info@propulse.com','support@propulse.com','careers@propulse.com') THEN 'info@propulsetechnologies.online' ELSE support_email END,
  careers_email=CASE WHEN careers_email IN ('info@propulse.com','support@propulse.com','careers@propulse.com') THEN 'info@propulsetechnologies.online' ELSE careers_email END,
  phone=CASE WHEN phone IN ('+91 98765 43210','98765 43210','9876543210','+919876543210') THEN '+91 9000360812' ELSE phone END,
  whatsapp=CASE WHEN whatsapp IN ('+91 98765 43210','98765 43210','9876543210','+919876543210') THEN '+91 9000360812' ELSE whatsapp END,
  updated_at=CURRENT_TIMESTAMP
WHERE id=1;

UPDATE contact_audience_settings SET
  email=CASE WHEN email IN ('info@propulse.com','support@propulse.com','careers@propulse.com') THEN 'info@propulsetechnologies.online' ELSE email END,
  support_email=CASE WHEN support_email IN ('info@propulse.com','support@propulse.com','careers@propulse.com') THEN 'info@propulsetechnologies.online' ELSE support_email END,
  careers_email=CASE WHEN careers_email IN ('info@propulse.com','support@propulse.com','careers@propulse.com') THEN 'info@propulsetechnologies.online' ELSE careers_email END,
  phone=CASE WHEN phone IN ('+91 98765 43210','98765 43210','9876543210','+919876543210') THEN '+91 9000360812' ELSE phone END,
  whatsapp=CASE WHEN whatsapp IN ('+91 98765 43210','98765 43210','9876543210','+919876543210') THEN '+91 9000360812' ELSE whatsapp END,
  updated_at=CURRENT_TIMESTAMP
WHERE audience IN ('website','users','professionals','lead_partners','common');
