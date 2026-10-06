-- Historical pre-release staging telemetry used build_commit='local'. Once a real
-- production build is healthy, these old backend HTTP/slow-request fingerprints should
-- not remain permanently open in the cross-environment Error Monitor.

UPDATE operational_events
SET resolved_at=CURRENT_TIMESTAMP,
    resolved_by=NULL,
    resolution_note='Auto-resolved legacy staging/local HTTP event after production remained healthy beyond the quiet window.'
WHERE resolved_at IS NULL
  AND source='backend'
  AND event_type IN ('http_5xx','slow_request')
  AND environment='staging'
  AND build_commit='local'
  AND last_seen_at<CURRENT_TIMESTAMP-INTERVAL '24 hours';
