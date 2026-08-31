BEGIN;

-- Booster is a standalone website/growth product. It never has quarterly/yearly variants or leads.
UPDATE membership_plans
SET is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_type = 'booster'
  AND billing_months <> 1;

-- Normalize an existing one-month Booster record when the canonical name is free.
UPDATE membership_plans p
SET name = 'Booster',
    plan_group = 'Booster',
    billing_period = 'Booster',
    billing_months = 1,
    duration_days = 30,
    lead_entitlements = '[]'::jsonb,
    lead_rollover_enabled = FALSE,
    lead_expiry_days = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE p.plan_type = 'booster'
  AND p.billing_months = 1
  AND p.name <> 'Booster'
  AND NOT EXISTS (
    SELECT 1
    FROM membership_plans existing
    WHERE existing.name = 'Booster'
      AND existing.id <> p.id
  );

-- Any remaining duplicate one-month Booster variants stay inactive; the canonical Booster remains active.
WITH canonical AS (
  SELECT MIN(id) AS id
  FROM membership_plans
  WHERE plan_type = 'booster'
    AND name = 'Booster'
)
UPDATE membership_plans p
SET is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE p.plan_type = 'booster'
  AND p.name = 'Booster'
  AND p.id <> (SELECT id FROM canonical);

UPDATE membership_plans
SET lead_entitlements = '[]'::jsonb,
    lead_rollover_enabled = FALSE,
    lead_expiry_days = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_type = 'booster'
  AND name = 'Booster';

COMMIT;
