-- A distinct roadmap for homeowners and construction/interior professionals.
-- The existing seeded roadmap concerns professional business software; preserve it
-- for professionals while keeping the homeowner roadmap independent.
ALTER TABLE public.upcoming_features
  ADD COLUMN IF NOT EXISTS audience VARCHAR(20) NOT NULL DEFAULT 'professional';
UPDATE public.upcoming_features SET audience='professional' WHERE audience IS NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='upcoming_features_audience_check'
      AND conrelid='public.upcoming_features'::regclass
  ) THEN
    ALTER TABLE public.upcoming_features
      ADD CONSTRAINT upcoming_features_audience_check CHECK (audience IN ('homeowner','professional'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_upcoming_features_published_audience
  ON public.upcoming_features(audience,sort_order,id) WHERE is_active=TRUE;
