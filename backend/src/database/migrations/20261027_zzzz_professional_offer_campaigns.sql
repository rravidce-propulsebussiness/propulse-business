-- Admin-managed first-party promotion messaging; benefits still come from the
-- existing coupon, wallet, membership or lead entitlement services.
CREATE TABLE IF NOT EXISTS professional_offer_campaigns (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(600) NOT NULL DEFAULT '',
  eyebrow VARCHAR(60) NOT NULL DEFAULT 'PROPULSE OFFERS',
  cta_label VARCHAR(48) NOT NULL DEFAULT 'Explore offer',
  cta_path VARCHAR(350) NOT NULL DEFAULT '/membership',
  image_url VARCHAR(500),
  audience VARCHAR(24) NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all','new_registration','verified','unverified','non_member','grow','scale')),
  registration_window_days INTEGER NOT NULL DEFAULT 0
    CHECK (registration_window_days BETWEEN 0 AND 365),
  display_mode VARCHAR(12) NOT NULL DEFAULT 'both'
    CHECK (display_mode IN ('popup','banner','both')),
  popup_frequency VARCHAR(12) NOT NULL DEFAULT 'once'
    CHECK (popup_frequency IN ('once','daily')),
  starts_at TIMESTAMP,
  expires_at TIMESTAMP,
  priority INTEGER NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 10000),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at),
  CHECK (cta_path ~ '^/[a-zA-Z0-9/?#=&_%.-]*$' AND cta_path !~ '^//')
);

CREATE TABLE IF NOT EXISTS professional_offer_views (
  offer_id INTEGER NOT NULL REFERENCES professional_offer_campaigns(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seen_count INTEGER NOT NULL DEFAULT 1,
  dismissed_at TIMESTAMP,
  last_clicked_at TIMESTAMP,
  click_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (offer_id,user_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_offer_active
  ON professional_offer_campaigns(is_active,priority DESC,starts_at,expires_at);
CREATE INDEX IF NOT EXISTS idx_professional_offer_views_user
  ON professional_offer_views(user_id,offer_id);
