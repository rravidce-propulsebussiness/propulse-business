-- Simplify the customer acquisition experience to two clear actions:
-- 1) one Project Estimate (no Rough/Detailed decision), and
-- 2) a short Free Consultation form.
-- Historical published versions stay immutable.

DO $$
DECLARE
  flow_key TEXT;
  def_id INTEGER;
  source_version_id INTEGER;
  target_version_id INTEGER;
  next_version INTEGER;
  keys TEXT[];
  seed_key TEXT;
  headline TEXT;
  subheadline TEXT;
BEGIN
  FOREACH flow_key IN ARRAY ARRAY['build','design']
  LOOP
    seed_key:=flow_key||'-free-consultation-v3';
    keys:=CASE flow_key
      WHEN 'build' THEN ARRAY['project_type','project_location','plot_area','budget','timeline','additional_requirement']
      ELSE ARRAY['project_location','property_type','bhk','interior_scope','timeline','additional_requirement']
    END;
    headline:=CASE flow_key
      WHEN 'build' THEN 'Get a free construction consultation'
      ELSE 'Get a free interior consultation'
    END;
    subheadline:=CASE flow_key
      WHEN 'build' THEN 'Share a few basic project details. Our construction team can continue the discussion with your plot, location and timeline already in hand.'
      ELSE 'Share a few basics about your home and interior scope. Our design team can continue the discussion without making you fill a long form.'
    END;

    SELECT d.id INTO def_id
      FROM customer_flow_definitions d
     WHERE d.key=flow_key AND d.flow_type='requirement'
     LIMIT 1;
    IF def_id IS NULL THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM customer_flow_versions
       WHERE definition_id=def_id AND config->>'seedKey'=seed_key
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
                'seedKey',seed_key,
                'experience','free_consultation',
                'headline',headline,
                'subheadline',subheadline,
                'submitLabel','Get Free Consultation',
                'contactTitle','Where should we reach you?',
                'contactText','Name and mobile number are required so our project team can call you back about this enquiry.',
                'consultationTitle','Thank you — your consultation request is ready.',
                'consultationText','Your project basics are saved with your contact details. Our team can continue from the same information when we call you back.',
                'consultationButtonLabel','Contact Project Team'
              ),
           CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
      FROM customer_flow_versions v WHERE v.id=source_version_id
    RETURNING id INTO target_version_id;

    INSERT INTO customer_flow_questions
      (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
    SELECT target_version_id,q.question_key,q.question_type,q.label,q.help_text,q.is_required,q.display_order,
           COALESCE(q.validation,'{}'::jsonb),q.show_when,q.lead_field,q.visibility,q.is_active
      FROM customer_flow_questions q
     WHERE q.version_id=source_version_id
       AND q.question_key=ANY(keys)
     ORDER BY q.display_order,q.id;

    INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
    SELECT nq.id,o.value,o.label,o.display_order,o.is_active
      FROM customer_flow_question_options o
      JOIN customer_flow_questions oq ON oq.id=o.question_id AND oq.version_id=source_version_id
      JOIN customer_flow_questions nq ON nq.version_id=target_version_id AND nq.question_key=oq.question_key;

    UPDATE customer_flow_questions
       SET validation=COALESCE(validation,'{}'::jsonb)
          || jsonb_build_object(
               'uiControl',CASE
                 WHEN question_type IN ('single_select','timeline') THEN 'dropdown'
                 WHEN question_type='multi_select' THEN 'checkboxes'
                 ELSE 'auto'
               END,
               'section',CASE
                 WHEN question_key='project_location' THEN 'Project location'
                 WHEN question_key IN ('budget','timeline') THEN 'Budget & timeline'
                 WHEN question_key='additional_requirement' THEN 'Anything else?'
                 ELSE 'Project basics'
               END,
               'fullWidth',question_key IN ('additional_requirement','interior_scope')
             )
     WHERE version_id=target_version_id;

    UPDATE customer_flow_questions
       SET is_required=FALSE
     WHERE version_id=target_version_id
       AND question_key IN ('plot_area','budget','bhk','additional_requirement');

    UPDATE customer_flow_versions SET status='retired',updated_at=CURRENT_TIMESTAMP
     WHERE definition_id=def_id AND status='published';
    UPDATE customer_flow_versions
       SET status='published',published_at=CURRENT_TIMESTAMP,effective_from=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
     WHERE id=target_version_id;
  END LOOP;
END $$;


DO $$
DECLARE
  flow_key TEXT;
  def_id INTEGER;
  source_version_id INTEGER;
  target_version_id INTEGER;
  next_version INTEGER;
  seed_key TEXT;
  headline TEXT;
  subheadline TEXT;
  result_title TEXT;
BEGIN
  FOREACH flow_key IN ARRAY ARRAY['construction-cost-estimator','interior-cost-estimator']
  LOOP
    seed_key:=CASE flow_key
      WHEN 'construction-cost-estimator' THEN 'construction-cost-estimator-v4-single-estimate'
      ELSE 'interior-cost-estimator-v4-single-estimate'
    END;
    headline:=CASE flow_key
      WHEN 'construction-cost-estimator' THEN 'Get your construction cost estimate'
      ELSE 'Get your interior cost estimate'
    END;
    subheadline:=CASE flow_key
      WHEN 'construction-cost-estimator' THEN 'Enter the main project details and choose a package. Material customisation is optional, so you can get a useful estimate without completing a long questionnaire.'
      ELSE 'Enter your home details, scope and package. Optional material customisation is available if you want to refine the estimate further.'
    END;
    result_title:=CASE flow_key
      WHEN 'construction-cost-estimator' THEN 'Your construction cost estimate'
      ELSE 'Your interior cost estimate'
    END;

    SELECT d.id INTO def_id
      FROM customer_flow_definitions d
     WHERE d.key=flow_key AND d.flow_type='estimator'
     LIMIT 1;
    IF def_id IS NULL THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM customer_flow_versions
       WHERE definition_id=def_id AND config->>'seedKey'=seed_key
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
                'seedKey',seed_key,
                'estimateExperience','single',
                'estimateLabel','Project Estimate',
                'headline',headline,
                'subheadline',subheadline,
                'submitLabel','Get My Estimate',
                'resultTitle',result_title,
                'contactTitle','Save your estimate',
                'contactText','Enter your name and mobile number so this estimate stays attached to your project enquiry.',
                'consultationTitle','Want expert help with this estimate?',
                'consultationText','Your estimate, package and project selections are already saved. Get a free consultation and our project team can continue from the same information.',
                'consultationButtonLabel','Get Free Consultation'
              ),
           CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
      FROM customer_flow_versions v WHERE v.id=source_version_id
    RETURNING id INTO target_version_id;

    INSERT INTO customer_flow_questions
      (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
    SELECT target_version_id,q.question_key,q.question_type,q.label,q.help_text,q.is_required,q.display_order,
           COALESCE(q.validation,'{}'::jsonb),q.show_when,q.lead_field,q.visibility,q.is_active
      FROM customer_flow_questions q
     WHERE q.version_id=source_version_id;

    INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
    SELECT nq.id,o.value,o.label,o.display_order,o.is_active
      FROM customer_flow_question_options o
      JOIN customer_flow_questions oq ON oq.id=o.question_id AND oq.version_id=source_version_id
      JOIN customer_flow_questions nq ON nq.version_id=target_version_id AND nq.question_key=oq.question_key;

    INSERT INTO estimator_rate_items
      (version_id,rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order,metadata,is_active)
    SELECT target_version_id,r.rate_key,r.label,r.calculation_type,r.unit_question_key,r.amount_min,r.amount_max,
           r.show_when,r.display_order,r.metadata,r.is_active
      FROM estimator_rate_items r WHERE r.version_id=source_version_id;

    INSERT INTO estimator_adjustments
      (version_id,adjustment_key,label,adjustment_type,unit_question_key,value_min,value_max,city_id,show_when,display_order,metadata,is_active)
    SELECT target_version_id,a.adjustment_key,a.label,a.adjustment_type,a.unit_question_key,a.value_min,a.value_max,
           a.city_id,a.show_when,a.display_order,a.metadata,a.is_active
      FROM estimator_adjustments a WHERE a.version_id=source_version_id;

    INSERT INTO estimator_packages
      (version_id,package_key,label,badge,selector_question_key,selector_value,summary,price_note,display_order,metadata,is_active)
    SELECT target_version_id,p.package_key,p.label,p.badge,p.selector_question_key,p.selector_value,p.summary,p.price_note,
           p.display_order,p.metadata,p.is_active
      FROM estimator_packages p WHERE p.version_id=source_version_id;

    INSERT INTO estimator_package_details(package_id,detail_key,section,label,value,note,display_order,is_active)
    SELECT np.id,d.detail_key,d.section,d.label,d.value,d.note,d.display_order,d.is_active
      FROM estimator_package_details d
      JOIN estimator_packages op ON op.id=d.package_id AND op.version_id=source_version_id
      JOIN estimator_packages np ON np.version_id=target_version_id AND np.package_key=op.package_key;

    UPDATE customer_flow_questions
       SET validation=COALESCE(validation,'{}'::jsonb)
          || '{"systemHidden":true,"systemDefault":"detailed"}'::jsonb,
           visibility='internal'
     WHERE version_id=target_version_id AND question_key='estimate_mode';

    UPDATE customer_flow_questions
       SET is_required=FALSE,
           validation=COALESCE(validation,'{}'::jsonb)
             || jsonb_build_object(
                  'advancedSection',TRUE,
                  'section','Optional specifications',
                  'uiControl',CASE
                    WHEN question_type IN ('single_select','timeline') THEN 'dropdown'
                    WHEN question_type='multi_select' THEN 'checkboxes'
                    ELSE COALESCE(validation->>'uiControl','auto')
                  END
                )
     WHERE version_id=target_version_id
       AND (
         (show_when->>'questionKey'='estimate_mode' AND (
           show_when->>'equals'='detailed'
           OR COALESCE(show_when->'in','[]'::jsonb) ? 'detailed'
         ))
         OR question_key IN ('customisations')
       );

    UPDATE customer_flow_questions q
       SET validation=COALESCE(q.validation,'{}'::jsonb) || '{"systemDefault":"package_default"}'::jsonb
     WHERE q.version_id=target_version_id
       AND q.validation->>'advancedSection'='true'
       AND EXISTS (
         SELECT 1 FROM customer_flow_question_options o
          WHERE o.question_id=q.id AND o.value='package_default' AND o.is_active=TRUE
       );

    UPDATE customer_flow_versions SET status='retired',updated_at=CURRENT_TIMESTAMP
     WHERE definition_id=def_id AND status='published';
    UPDATE customer_flow_versions
       SET status='published',published_at=CURRENT_TIMESTAMP,effective_from=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
     WHERE id=target_version_id;
  END LOOP;
END $$;
