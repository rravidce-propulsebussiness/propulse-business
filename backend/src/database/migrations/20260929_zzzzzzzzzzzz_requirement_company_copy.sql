-- Move the seeded Construction and Interior requirement forms away from marketplace/quote wording.
-- New submissions use a new published version; older submitted flow versions remain historical.

DO $$
DECLARE
  flow_key TEXT;
  def_id INTEGER;
  source_version_id INTEGER;
  target_version_id INTEGER;
  next_version INTEGER;
  marker TEXT;
  customer_subheadline TEXT;
BEGIN
  FOREACH flow_key IN ARRAY ARRAY['build','design']
  LOOP
    marker:=flow_key||'-requirement-v2-company';
    customer_subheadline:=CASE flow_key
      WHEN 'build' THEN 'Share your construction scope, site details and preferences so the project enquiry is ready for consultation and follow-up.'
      ELSE 'Share your home, interior scope and finish preferences so the project enquiry is ready for consultation and follow-up.'
    END;

    SELECT d.id INTO def_id
      FROM customer_flow_definitions d
     WHERE d.key=flow_key AND d.flow_type='requirement'
     LIMIT 1;
    IF def_id IS NULL THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM customer_flow_versions
       WHERE definition_id=def_id AND config->>'seedKey'=marker
    ) THEN CONTINUE; END IF;

    SELECT v.id INTO source_version_id
      FROM customer_flow_versions v
     WHERE v.definition_id=def_id AND v.status='published'
     ORDER BY v.version_no DESC LIMIT 1;
    IF source_version_id IS NULL THEN CONTINUE; END IF;

    SELECT COALESCE(MAX(v.version_no),0)+1 INTO next_version
      FROM customer_flow_versions v WHERE v.definition_id=def_id;

    INSERT INTO customer_flow_versions(definition_id,version_no,status,config,effective_from,created_at,updated_at)
    SELECT def_id,next_version,'draft',
           COALESCE(v.config,'{}'::jsonb)
           || jsonb_build_object(
                'seedKey',marker,
                'subheadline',customer_subheadline,
                'submitLabel','Submit Project Enquiry'
              ),
           CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
      FROM customer_flow_versions v WHERE v.id=source_version_id
    RETURNING id INTO target_version_id;

    INSERT INTO customer_flow_questions
      (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
    SELECT target_version_id,q.question_key,q.question_type,q.label,q.help_text,q.is_required,q.display_order,
           q.validation,q.show_when,q.lead_field,q.visibility,q.is_active
      FROM customer_flow_questions q
     WHERE q.version_id=source_version_id;

    INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
    SELECT nq.id,o.value,o.label,o.display_order,o.is_active
      FROM customer_flow_question_options o
      JOIN customer_flow_questions oq ON oq.id=o.question_id AND oq.version_id=source_version_id
      JOIN customer_flow_questions nq ON nq.version_id=target_version_id AND nq.question_key=oq.question_key;

    UPDATE customer_flow_versions
       SET status='retired',updated_at=CURRENT_TIMESTAMP
     WHERE definition_id=def_id AND status='published';

    UPDATE customer_flow_versions
       SET status='published',published_at=CURRENT_TIMESTAMP,effective_from=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
     WHERE id=target_version_id;
  END LOOP;
END $$;
