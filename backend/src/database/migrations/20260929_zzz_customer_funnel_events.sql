-- First-party customer funnel events for anonymous journey/drop-off measurement.
-- No contact details or customer answer payloads are stored here.

CREATE TABLE IF NOT EXISTS customer_funnel_events (
  id BIGSERIAL PRIMARY KEY,
  event_id VARCHAR(80) NOT NULL UNIQUE,
  session_id VARCHAR(80) NOT NULL,
  event_type VARCHAR(40) NOT NULL
    CHECK (event_type IN (
      'home_cta_clicked',
      'flow_opened',
      'flow_started',
      'estimate_completed',
      'quote_form_opened',
      'quote_submitted',
      'requirement_contact_opened',
      'requirement_submitted'
    )),
  flow_key VARCHAR(120),
  flow_type VARCHAR(20)
    CHECK (flow_type IS NULL OR flow_type IN ('estimator','requirement')),
  calculation_public_id VARCHAR(64),
  source VARCHAR(80),
  page_path VARCHAR(240),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_funnel_events_created
  ON customer_funnel_events(created_at DESC,id DESC);

CREATE INDEX IF NOT EXISTS idx_customer_funnel_events_flow_created
  ON customer_funnel_events(flow_key,created_at DESC,id DESC)
  WHERE flow_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_funnel_events_type_created
  ON customer_funnel_events(event_type,created_at DESC,id DESC);

CREATE INDEX IF NOT EXISTS idx_customer_funnel_events_session_flow
  ON customer_funnel_events(session_id,flow_key,event_type,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_funnel_events_calculation
  ON customer_funnel_events(calculation_public_id)
  WHERE calculation_public_id IS NOT NULL;
