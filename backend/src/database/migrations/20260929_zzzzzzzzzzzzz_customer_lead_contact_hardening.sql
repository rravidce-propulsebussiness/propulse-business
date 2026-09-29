-- Customer-generated leads are only sellable after the customer name and mobile
-- have been captured. Historical estimator records may predate this rule, so move
-- any still-sellable incomplete records to quarantine before enforcing it.

UPDATE leads
   SET status='quarantined',
       quality_gate_status='quarantined',
       quality_gate_reasons=jsonb_build_array(
         jsonb_build_object(
           'code','customer_contact_incomplete',
           'message','Customer-generated lead is missing the required customer name or mobile number'
         )
       ),
       quality_gate_checked_at=CURRENT_TIMESTAMP,
       quality_gate_context='customer_contact_migration',
       updated_at=CURRENT_TIMESTAMP
 WHERE source IN ('public_requirement','public_estimator')
   AND status IN ('available','paused')
   AND (
     NULLIF(TRIM(COALESCE(customer_name,'')),'') IS NULL
     OR NULLIF(TRIM(COALESCE(customer_phone,'')),'') IS NULL
   );

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_customer_contact_sellable_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_customer_contact_sellable_check
  CHECK (
    source NOT IN ('public_requirement','public_estimator')
    OR status NOT IN ('available','paused')
    OR (
      NULLIF(TRIM(COALESCE(customer_name,'')),'') IS NOT NULL
      AND NULLIF(TRIM(COALESCE(customer_phone,'')),'') IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE leads
  VALIDATE CONSTRAINT leads_customer_contact_sellable_check;
