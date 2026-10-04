BEGIN;

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS public_headline VARCHAR(180),
  ADD COLUMN IF NOT EXISTS public_summary TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER,
  ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='business_profiles_years_experience_check'
  ) THEN
    ALTER TABLE business_profiles
      ADD CONSTRAINT business_profiles_years_experience_check
      CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 100));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS business_profile_projects (
  id SERIAL PRIMARY KEY,
  business_profile_id INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  project_type VARCHAR(120),
  description TEXT,
  location_text VARCHAR(180),
  completion_year INTEGER,
  area_text VARCHAR(120),
  budget_text VARCHAR(120),
  cover_image_url TEXT,
  video_url TEXT,
  plan_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (completion_year IS NULL OR (completion_year >= 1950 AND completion_year <= 2200)),
  CHECK (sort_order >= 0 AND sort_order <= 10000)
);
CREATE INDEX IF NOT EXISTS idx_business_profile_projects_profile
  ON business_profile_projects(business_profile_id,is_published,sort_order,id);

CREATE TABLE IF NOT EXISTS business_profile_service_plans (
  id SERIAL PRIMARY KEY,
  business_profile_id INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  price_from NUMERIC(12,2),
  duration_label VARCHAR(120),
  inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (price_from IS NULL OR price_from >= 0),
  CHECK (jsonb_typeof(inclusions)='array'),
  CHECK (sort_order >= 0 AND sort_order <= 10000)
);
CREATE INDEX IF NOT EXISTS idx_business_profile_service_plans_profile
  ON business_profile_service_plans(business_profile_id,is_published,sort_order,id);

CREATE TABLE IF NOT EXISTS expert_directory_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1),
  directory_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  require_active_membership BOOLEAN NOT NULL DEFAULT TRUE,
  require_verified BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_plan_groups JSONB NOT NULL DEFAULT '["grow","scale"]'::jsonb,
  show_projects BOOLEAN NOT NULL DEFAULT TRUE,
  show_videos BOOLEAN NOT NULL DEFAULT TRUE,
  show_plans BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (jsonb_typeof(allowed_plan_groups)='array')
);
INSERT INTO expert_directory_settings(id) VALUES(1)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS business_expert_directory_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (sort_order >= -10000 AND sort_order <= 10000)
);
CREATE INDEX IF NOT EXISTS idx_business_expert_directory_featured
  ON business_expert_directory_settings(is_hidden,is_featured,sort_order,user_id);

COMMIT;
