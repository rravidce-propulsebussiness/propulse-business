-- One automatic registration reward per first-party browser/device token.
-- IP is hashed and used as a review signal because shared IP != one device.
CREATE TABLE IF NOT EXISTS signup_reward_identities (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 device_hash CHAR(64) NOT NULL,
 ip_hash CHAR(64),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_signup_reward_identities_ip ON signup_reward_identities(ip_hash);
CREATE TABLE IF NOT EXISTS signup_reward_device_claims (
 device_hash CHAR(64) PRIMARY KEY,
 user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS signup_reward_ip_claims (
 ip_hash CHAR(64) PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS signup_reward_policy (
 id INTEGER PRIMARY KEY CHECK (id=1),
 activated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO signup_reward_policy(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS signup_reward_review_flags (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reason TEXT NOT NULL CHECK(reason IN ('missing_device','device_reused','shared_ip')),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,reason)
);
