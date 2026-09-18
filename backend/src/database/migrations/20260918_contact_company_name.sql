UPDATE contact_audience_settings
SET company_name='Propulse Business Technologies Private Limited', updated_at=CURRENT_TIMESTAMP
WHERE audience IN ('website','common') AND (company_name='' OR company_name IN ('ProPulse Business','Propulse Business'));