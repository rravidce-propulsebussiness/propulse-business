-- Clean any legacy duplicate pricing rules before enforcing the scope invariant.
-- One rule is allowed for each Industry + City + Lead Type combination.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(industry_id,0), COALESCE(city_id,0), lead_type
           ORDER BY is_active DESC, updated_at DESC, id DESC
         ) AS rn
  FROM lead_pricing_rules
)
DELETE FROM lead_pricing_rules r
USING ranked d
WHERE r.id=d.id AND d.rn>1;

DROP INDEX IF EXISTS uq_lead_pricing_rules_market_type;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_pricing_rules_market_type
  ON lead_pricing_rules (COALESCE(industry_id,0), COALESCE(city_id,0), lead_type);

-- Normalize legacy tier arrays too: duplicate share counts are collapsed to the
-- last occurrence so the UI and API always expose one row per share tier.
UPDATE lead_pricing_rules r
SET pricing=jsonb_build_object(
  'shares', COALESCE((
    SELECT jsonb_agg(x.item ORDER BY x.shares)
    FROM (
      SELECT DISTINCT ON ((item->>'shares')::int)
        (item || jsonb_build_object('shares',(item->>'shares')::int,
          'normal',(item->>'normal')::numeric,
          'pro',(item->>'pro')::numeric)) AS item,
        (item->>'shares')::int AS shares
      FROM jsonb_array_elements(COALESCE(r.pricing->'shares','[]'::jsonb)) item
      WHERE (item->>'shares') ~ '^[0-9]+$'
        AND (item->>'normal') ~ '^[0-9]+(\\.[0-9]+)?$'
        AND (item->>'pro') ~ '^[0-9]+(\\.[0-9]+)?$'
        AND (item->>'shares')::int > 0
      ORDER BY (item->>'shares')::int, item
    ) x
  ), '[]'::jsonb)
),
updated_at=CURRENT_TIMESTAMP;
