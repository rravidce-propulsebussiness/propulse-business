-- Idempotent schema alignment for the current membership model.
-- The live model uses expires_at; older bootstrap schema used ends_at.
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='memberships' AND column_name='ends_at') THEN
    UPDATE memberships SET expires_at = COALESCE(expires_at, ends_at) WHERE expires_at IS NULL;
  END IF;
END $$;
ALTER TABLE memberships ALTER COLUMN expires_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_expires_at ON memberships(expires_at);

-- Keep legacy ends_at in sync while old code/data still references it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='memberships' AND column_name='ends_at') THEN
    EXECUTE 'UPDATE memberships SET ends_at = expires_at WHERE ends_at IS DISTINCT FROM expires_at';
  END IF;
END $$;
