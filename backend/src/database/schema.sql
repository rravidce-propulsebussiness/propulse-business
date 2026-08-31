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
    UNIQUE (industry_id, name), UNIQUE (industry_id, slug)
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
    UNIQUE (service_id, name), UNIQUE (service_id, slug)
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
    UNIQUE (state_id, name), UNIQUE (state_id, slug)
);

INSERT INTO states (name, code) VALUES
('Andhra Pradesh','AP'),('Arunachal Pradesh','AR'),('Assam','AS'),('Bihar','BR'),('Chhattisgarh','CG'),('Goa','GA'),('Gujarat','GJ'),('Haryana','HR'),('Himachal Pradesh','HP'),('Jharkhand','JH'),('Karnataka','KA'),('Kerala','KL'),('Madhya Pradesh','MP'),('Maharashtra','MH'),('Manipur','MN'),('Meghalaya','ML'),('Mizoram','MZ'),('Nagaland','NL'),('Odisha','OD'),('Punjab','PB'),('Rajasthan','RJ'),('Sikkim','SK'),('Tamil Nadu','TN'),('Telangana','TG'),('Tripura','TR'),('Uttar Pradesh','UP'),('Uttarakhand','UK'),('West Bengal','WB'),('Andaman and Nicobar Islands','AN'),('Chandigarh','CH'),('Dadra and Nagar Haveli and Daman and Diu','DNDD'),('Delhi','DL'),('Jammu and Kashmir','JK'),('Ladakh','LA'),('Lakshadweep','LD'),('Puducherry','PY')
ON CONFLICT (name) DO UPDATE SET code=EXCLUDED.code,is_active=TRUE,updated_at=CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, role VARCHAR(30) NOT NULL DEFAULT 'business', is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'business';
CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS business_profiles (
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(30) NOT NULL, business_name VARCHAR(160) NOT NULL, business_details TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id)
);
CREATE TABLE IF NOT EXISTS business_profile_services (
    id SERIAL PRIMARY KEY, business_profile_id INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE RESTRICT, service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    subservice_id INTEGER REFERENCES subservices(id) ON DELETE RESTRICT, is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_profile_id,industry_id,service_id,subservice_id)
);
CREATE TABLE IF NOT EXISTS business_profile_locations (
    id SERIAL PRIMARY KEY, business_profile_id INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT, city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(business_profile_id,state_id,city_id)
);
CREATE INDEX IF NOT EXISTS idx_business_profile_services_profile ON business_profile_services(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_profile_locations_profile ON business_profile_locations(business_profile_id);

UPDATE users SET role='business',updated_at=CURRENT_TIMESTAMP WHERE role='admin' AND EXISTS(SELECT 1 FROM business_profiles bp WHERE bp.user_id=users.id);

CREATE TABLE IF NOT EXISTS membership_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    duration_days INTEGER NOT NULL DEFAULT 365 CHECK (duration_days > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    membership_plan_id INTEGER REFERENCES membership_plans(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('gateway','manual')),
    gateway VARCHAR(50), gateway_order_id VARCHAR(160), gateway_payment_id VARCHAR(160),
    manual_reference VARCHAR(160), proof_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected','failed','refunded')),
    notes TEXT, reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_plan_id INTEGER NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    starts_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY, industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT, subservice_id INTEGER REFERENCES subservices(id) ON DELETE RESTRICT,
    state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT, city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    customer_name VARCHAR(160) NOT NULL, customer_phone VARCHAR(30) NOT NULL, customer_email VARCHAR(255), requirement TEXT NOT NULL,
    property_type VARCHAR(100), budget VARCHAR(100), source VARCHAR(80) NOT NULL DEFAULT 'manual',
    status VARCHAR(30) NOT NULL DEFAULT 'available', notes TEXT, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(status IN ('available','paused','sold','closed','invalid'))
);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry_id);
CREATE INDEX IF NOT EXISTS idx_leads_service ON leads(service_id);
CREATE INDEX IF NOT EXISTS idx_leads_subservice ON leads(subservice_id);
CREATE INDEX IF NOT EXISTS idx_leads_state_city ON leads(state_id,city_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
