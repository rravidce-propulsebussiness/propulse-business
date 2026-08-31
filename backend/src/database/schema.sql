CREATE TABLE IF NOT EXISTS industries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (industry_id, name),
    UNIQUE (industry_id, slug)
);

CREATE TABLE IF NOT EXISTS subservices (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (service_id, name),
    UNIQUE (service_id, slug)
);

CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (state_id, name),
    UNIQUE (state_id, slug)
);

-- India: 28 States + 8 Union Territories (36 total)
INSERT INTO states (name, code)
VALUES
    ('Andhra Pradesh', 'AP'), ('Arunachal Pradesh', 'AR'), ('Assam', 'AS'), ('Bihar', 'BR'),
    ('Chhattisgarh', 'CG'), ('Goa', 'GA'), ('Gujarat', 'GJ'), ('Haryana', 'HR'),
    ('Himachal Pradesh', 'HP'), ('Jharkhand', 'JH'), ('Karnataka', 'KA'), ('Kerala', 'KL'),
    ('Madhya Pradesh', 'MP'), ('Maharashtra', 'MH'), ('Manipur', 'MN'), ('Meghalaya', 'ML'),
    ('Mizoram', 'MZ'), ('Nagaland', 'NL'), ('Odisha', 'OD'), ('Punjab', 'PB'),
    ('Rajasthan', 'RJ'), ('Sikkim', 'SK'), ('Tamil Nadu', 'TN'), ('Telangana', 'TG'),
    ('Tripura', 'TR'), ('Uttar Pradesh', 'UP'), ('Uttarakhand', 'UK'), ('West Bengal', 'WB'),
    ('Andaman and Nicobar Islands', 'AN'), ('Chandigarh', 'CH'),
    ('Dadra and Nagar Haveli and Daman and Diu', 'DNDD'), ('Delhi', 'DL'),
    ('Jammu and Kashmir', 'JK'), ('Ladakh', 'LA'), ('Lakshadweep', 'LD'), ('Puducherry', 'PY')
ON CONFLICT (name) DO UPDATE
SET code = EXCLUDED.code, is_active = TRUE, updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'business',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Keep existing databases aligned with the new business-account default.
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'business';

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS business_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(30) NOT NULL,
    business_name VARCHAR(160) NOT NULL,
    business_details TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS business_profile_services (
    id SERIAL PRIMARY KEY,
    business_profile_id INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    subservice_id INTEGER REFERENCES subservices(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_profile_id, industry_id, service_id, subservice_id)
);

CREATE TABLE IF NOT EXISTS business_profile_locations (
    id SERIAL PRIMARY KEY,
    business_profile_id INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_profile_id, state_id, city_id)
);

CREATE INDEX IF NOT EXISTS idx_business_profile_services_profile ON business_profile_services (business_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_profile_services_industry ON business_profile_services (industry_id);
CREATE INDEX IF NOT EXISTS idx_business_profile_services_service ON business_profile_services (service_id);
CREATE INDEX IF NOT EXISTS idx_business_profile_services_subservice ON business_profile_services (subservice_id);
CREATE INDEX IF NOT EXISTS idx_business_profile_locations_profile ON business_profile_locations (business_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_profile_locations_state_city ON business_profile_locations (state_id, city_id);

-- Business signups must never become administrators. Existing users with a business profile
-- are business accounts; users without a business profile can remain administrator accounts.
UPDATE users
SET role = 'business', updated_at = CURRENT_TIMESTAMP
WHERE role = 'admin'
  AND EXISTS (
      SELECT 1 FROM business_profiles bp WHERE bp.user_id = users.id
  );

-- Migrate an older single-service/single-location profile layout when present.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'business_profiles' AND column_name = 'industry_id'
    ) THEN
        INSERT INTO business_profile_services (business_profile_id, industry_id, service_id, subservice_id)
        SELECT id, industry_id, service_id, subservice_id
        FROM business_profiles
        WHERE industry_id IS NOT NULL AND service_id IS NOT NULL
        ON CONFLICT DO NOTHING;

        INSERT INTO business_profile_locations (business_profile_id, state_id, city_id)
        SELECT id, state_id, city_id
        FROM business_profiles
        WHERE state_id IS NOT NULL AND city_id IS NOT NULL
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Automatically remove legacy columns only after migration if they exist.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_profiles' AND column_name='industry_id') THEN
        ALTER TABLE business_profiles DROP COLUMN industry_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_profiles' AND column_name='service_id') THEN
        ALTER TABLE business_profiles DROP COLUMN service_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_profiles' AND column_name='subservice_id') THEN
        ALTER TABLE business_profiles DROP COLUMN subservice_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_profiles' AND column_name='state_id') THEN
        ALTER TABLE business_profiles DROP COLUMN state_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_profiles' AND column_name='city_id') THEN
        ALTER TABLE business_profiles DROP COLUMN city_id;
    END IF;
END $$;

-- Lead marketplace records. Leads are created/managed by administrators and
-- matched to business owners through their profile services and locations.
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    subservice_id INTEGER REFERENCES subservices(id) ON DELETE RESTRICT,
    state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    customer_name VARCHAR(160) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_email VARCHAR(255),
    requirement TEXT NOT NULL,
    property_type VARCHAR(100),
    budget VARCHAR(100),
    source VARCHAR(80) NOT NULL DEFAULT 'manual',
    status VARCHAR(30) NOT NULL DEFAULT 'available',
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('available', 'paused', 'sold', 'closed', 'invalid'))
);

CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads (industry_id);
CREATE INDEX IF NOT EXISTS idx_leads_service ON leads (service_id);
CREATE INDEX IF NOT EXISTS idx_leads_subservice ON leads (subservice_id);
CREATE INDEX IF NOT EXISTS idx_leads_state_city ON leads (state_id, city_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads (created_by);
