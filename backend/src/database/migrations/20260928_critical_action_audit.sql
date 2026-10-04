CREATE TABLE IF NOT EXISTS critical_action_audit (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(32) NOT NULL CHECK (category IN ('account','payment','membership','lead','pricing','payout','security','system')),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(120),
  source VARCHAR(80) NOT NULL DEFAULT 'application',
  request_id VARCHAR(160),
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_critical_action_audit_created
  ON critical_action_audit(created_at DESC,id DESC);

CREATE INDEX IF NOT EXISTS idx_critical_action_audit_actor
  ON critical_action_audit(actor_user_id,created_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_critical_action_audit_category
  ON critical_action_audit(category,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_critical_action_audit_entity
  ON critical_action_audit(entity_type,entity_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_critical_action_audit_action
  ON critical_action_audit(action,created_at DESC);

INSERT INTO critical_action_audit(
  actor_user_id,category,action,entity_type,entity_id,source,before_data,after_data,reason,metadata,created_at
)
SELECT a.admin_id,'account',
  CASE a.action
    WHEN 'activate_account' THEN 'user.activate'
    WHEN 'deactivate_account' THEN 'user.deactivate'
    WHEN 'change_role' THEN 'user.change_role'
    WHEN 'update_profile' THEN 'user.update_profile'
    ELSE 'user.' || a.action
  END,
  'user',a.user_id::text,'legacy_admin_user_audit',NULL,NULL,a.reason,
  jsonb_build_object('legacyAuditId',a.id,'legacySnapshotCopied',FALSE),a.created_at
FROM admin_user_audit a
WHERE NOT EXISTS(
  SELECT 1 FROM critical_action_audit x
  WHERE x.source='legacy_admin_user_audit' AND x.metadata->>'legacyAuditId'=a.id::text
);

INSERT INTO critical_action_audit(
  actor_user_id,category,action,entity_type,entity_id,source,before_data,after_data,reason,metadata,created_at
)
SELECT h.admin_id,'membership','membership.update','membership',h.membership_id::text,'legacy_membership_admin_history',
  jsonb_build_object('status',h.old_status,'expiresAt',h.old_expires_at,'userId',h.user_id),
  jsonb_build_object('status',h.new_status,'expiresAt',h.new_expires_at,'userId',h.user_id),
  h.notes,jsonb_build_object('legacyHistoryId',h.id,'membershipAction',h.action),h.created_at
FROM membership_admin_history h
WHERE NOT EXISTS(
  SELECT 1 FROM critical_action_audit x
  WHERE x.source='legacy_membership_admin_history' AND x.metadata->>'legacyHistoryId'=h.id::text
);
