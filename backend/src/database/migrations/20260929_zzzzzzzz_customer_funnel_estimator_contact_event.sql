-- Add the estimator contact-step event introduced by the customer-only estimator flow.
-- Keep the database constraint in sync with customerFunnelEventService.EVENT_TYPES.

ALTER TABLE customer_funnel_events
  DROP CONSTRAINT IF EXISTS customer_funnel_events_event_type_check;

ALTER TABLE customer_funnel_events
  ADD CONSTRAINT customer_funnel_events_event_type_check
  CHECK (event_type IN (
    'home_cta_clicked',
    'flow_opened',
    'flow_started',
    'flow_question_viewed',
    'flow_question_completed',
    'estimator_contact_opened',
    'estimate_completed',
    'quote_form_opened',
    'quote_submitted',
    'requirement_contact_opened',
    'requirement_submitted'
  ));
