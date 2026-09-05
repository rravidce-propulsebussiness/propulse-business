-- Repair duplicate index definitions from earlier migrations.
-- Keep exactly one city+pincode uniqueness rule and one manual-payment-reference rule.
DROP INDEX IF EXISTS uq_city_pincodes_city_pincode;
CREATE UNIQUE INDEX uq_city_pincodes_city_pincode
  ON city_pincodes(city_id, pincode);

DROP INDEX IF EXISTS uq_wallet_topups_manual_reference;
CREATE UNIQUE INDEX uq_wallet_topups_manual_reference
  ON wallet_topups (LOWER(BTRIM(reference)))
  WHERE payment_method = 'manual'
    AND reference IS NOT NULL
    AND BTRIM(reference) <> '';
