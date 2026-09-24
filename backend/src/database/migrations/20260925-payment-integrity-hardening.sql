BEGIN;

-- Financial integrity hardening:
-- 1) one payment reference/UTR can identify only one payment;
-- 2) one payment can have at most one wallet refund;
-- 3) one payment can reserve at most one coupon redemption;
-- 4) one manual payment can create at most one lead purchase/investment/membership;
-- 5) investment.payment_id is one-to-one when populated.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM payments
    WHERE NULLIF(BTRIM(manual_reference), '') IS NOT NULL
    GROUP BY LOWER(BTRIM(manual_reference))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate manual payment references exist; resolve them before applying payment integrity hardening';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM wallet_transactions
    WHERE type = 'refund' AND payment_id IS NOT NULL
    GROUP BY payment_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate wallet refunds exist; resolve them before applying payment integrity hardening';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM coupon_redemptions
    WHERE payment_id IS NOT NULL
    GROUP BY payment_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple coupon redemptions exist for one payment; resolve them before applying payment integrity hardening';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM lead_purchases
    WHERE payment_id IS NOT NULL
    GROUP BY payment_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple lead purchases exist for one payment; resolve them before applying payment integrity hardening';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM investments
    WHERE payment_id IS NOT NULL
    GROUP BY payment_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple investments exist for one payment; resolve them before applying payment integrity hardening';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM memberships
    WHERE payment_id IS NOT NULL
    GROUP BY payment_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple memberships exist for one payment; resolve them before applying payment integrity hardening';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_manual_reference_normalized
  ON payments (LOWER(BTRIM(manual_reference)))
  WHERE NULLIF(BTRIM(manual_reference), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_refund_payment
  ON wallet_transactions (payment_id)
  WHERE type = 'refund' AND payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_redemption_payment
  ON coupon_redemptions (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_purchase_payment
  ON lead_purchases (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_investment_payment
  ON investments (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_payment
  ON memberships (payment_id)
  WHERE payment_id IS NOT NULL;

COMMIT;
