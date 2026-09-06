BEGIN;

-- Keep existing data safe: only one active Pro / Booster / Investor record per user.
WITH ranked AS (
  SELECT m.id,
         ROW_NUMBER() OVER (
           PARTITION BY m.user_id, LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))
           ORDER BY m.expires_at DESC, m.id DESC
         ) AS rn
  FROM memberships m
  JOIN membership_plans mp ON mp.id=m.membership_plan_id
  WHERE m.status='active'
    AND m.expires_at>CURRENT_TIMESTAMP
    AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_')) IN ('pro','booster','investor')
)
UPDATE memberships m
SET status='cancelled',updated_at=CURRENT_TIMESTAMP
FROM ranked r
WHERE m.id=r.id AND r.rn>1;

-- The application converts an existing active tier membership when a new period is approved.
-- This trigger prevents an accidental second active record from being introduced by any other path.
CREATE OR REPLACE FUNCTION enforce_membership_tier_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  tier TEXT;
BEGIN
  SELECT LOWER(REPLACE(COALESCE(plan_type,''),'-','_'))
  INTO tier
  FROM membership_plans
  WHERE id=NEW.membership_plan_id;

  IF NEW.status='active'
     AND NEW.expires_at>CURRENT_TIMESTAMP
     AND tier IN ('pro','booster','investor')
     AND EXISTS (
       SELECT 1
       FROM memberships m
       JOIN membership_plans mp ON mp.id=m.membership_plan_id
       WHERE m.user_id=NEW.user_id
         AND m.id<>COALESCE(NEW.id,0)
         AND m.status='active'
         AND m.expires_at>CURRENT_TIMESTAMP
         AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))=tier
     )
  THEN
    RAISE EXCEPTION 'Only one active % membership is allowed per user', tier
      USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_membership_tier_integrity ON memberships;
CREATE TRIGGER trg_membership_tier_integrity
BEFORE INSERT OR UPDATE OF user_id,membership_plan_id,status,expires_at
ON memberships
FOR EACH ROW
EXECUTE FUNCTION enforce_membership_tier_integrity();

COMMIT;
