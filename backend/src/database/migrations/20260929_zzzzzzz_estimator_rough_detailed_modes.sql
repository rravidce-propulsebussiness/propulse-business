-- Adds Rough / Detailed estimator modes without mutating historical published versions.
-- Detailed material choices are normal flow questions, so Admin can edit labels/options and
-- can add pricing adjustments through the existing versioned estimator configuration.

DO $$
DECLARE
  def_id INTEGER;
  source_version_id INTEGER;
  target_version_id INTEGER;
  next_version INTEGER;
BEGIN
  SELECT d.id INTO def_id
    FROM customer_flow_definitions d
   WHERE d.key='construction-cost-estimator' AND d.flow_type='estimator'
   LIMIT 1;
  IF def_id IS NULL THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM customer_flow_versions
     WHERE v.definition_id=def_id
       AND config->>'seedKey'='construction-cost-estimator-v2-modes'
  ) THEN RETURN; END IF;

  SELECT v.id INTO source_version_id
    FROM customer_flow_versions v
   WHERE v.definition_id=def_id AND v.status='published'
   ORDER BY v.version_no DESC LIMIT 1;
  IF source_version_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(MAX(version_no),0)+1 INTO next_version
    FROM customer_flow_versions WHERE definition_id=def_id;

  INSERT INTO customer_flow_versions(definition_id,version_no,status,config,effective_from,created_at,updated_at)
  SELECT def_id,next_version,'draft',
         COALESCE(config,'{}'::jsonb)
         || jsonb_build_object(
              'seedKey','construction-cost-estimator-v2-modes',
              'estimateModes',jsonb_build_array('rough','detailed'),
              'modeHeadline','Choose a rough or detailed construction estimate'
            ),
         CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
    FROM customer_flow_versions WHERE id=source_version_id
  RETURNING id INTO target_version_id;

  INSERT INTO customer_flow_questions
    (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
  SELECT target_version_id,question_key,question_type,label,help_text,is_required,display_order+10,
         validation,show_when,lead_field,visibility,is_active
    FROM customer_flow_questions
   WHERE version_id=source_version_id;

  INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
  SELECT nq.id,o.value,
         CASE WHEN nq.question_key='quality' AND o.value='luxury' THEN 'Royal' ELSE o.label END,
         o.display_order,o.is_active
    FROM customer_flow_question_options o
    JOIN customer_flow_questions oq ON oq.id=o.question_id AND oq.version_id=source_version_id
    JOIN customer_flow_questions nq ON nq.version_id=target_version_id AND nq.question_key=oq.question_key;

  INSERT INTO customer_flow_questions
    (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
  VALUES
    (target_version_id,'estimate_mode','single_select','Which estimate do you need?','Choose Rough for a quick planning range or Detailed to review material specifications before calculating.',TRUE,5,'{}'::jsonb,'{}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'steel_spec','single_select','Steel specification','Choose the steel specification for the detailed estimate. Choose package specification if you want to retain the selected package standard.',TRUE,95,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'cement_spec','single_select','Cement specification','Choose the cement specification for the detailed estimate.',TRUE,96,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'sand_spec','single_select','Sand specification','Choose the sand specification for the detailed estimate.',TRUE,97,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'brick_spec','single_select','Brick specification','Choose the brick class for the detailed estimate.',TRUE,98,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'wire_spec','single_select','Electrical wire specification','Choose the wire specification for the detailed estimate.',TRUE,99,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'switch_spec','single_select','Switches & sockets','Choose the switch specification for the detailed estimate.',TRUE,100,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'flooring_spec','single_select','Room flooring allowance','Choose the room-flooring allowance for the detailed estimate.',TRUE,101,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE);

  INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
  SELECT q.id,x.value,x.label,x.display_order,TRUE
    FROM customer_flow_questions q
    JOIN (VALUES
      ('estimate_mode','rough','Rough estimate',10),
      ('estimate_mode','detailed','Detailed estimate',20),

      ('steel_spec','package_default','As per selected package',10),
      ('steel_spec','shree_550','SHREE 550 TMT or equivalent',20),
      ('steel_spec','vizag_jairaj','Vizag TMT / Jairaj',30),
      ('steel_spec','tata_550','TATA 550 TMT',40),
      ('steel_spec','other','Other / discuss with team',50),

      ('cement_spec','package_default','As per selected package',10),
      ('cement_spec','nagarjuna_priya','Nagarjuna 53 + Priya 43 or equivalent',20),
      ('cement_spec','ultratech_bangur','UltraTech 53 + Bangur 43 or equivalent',30),
      ('cement_spec','ultratech_53','UltraTech 53 grade for complete construction',40),
      ('cement_spec','other','Other / discuss with team',50),

      ('sand_spec','package_default','As per selected package',10),
      ('sand_spec','robo_river','Robo sand + river sand for plastering',20),
      ('sand_spec','river','River sand',30),
      ('sand_spec','other','Other / discuss with team',40),

      ('brick_spec','package_default','As per selected package',10),
      ('brick_spec','karimnagar','Karimnagar brick',20),
      ('brick_spec','karimnagar_class_ii','Karimnagar Class II brick',30),
      ('brick_spec','karimnagar_class_i','Karimnagar Class I brick',40),
      ('brick_spec','other','Other / discuss with team',50),

      ('wire_spec','package_default','As per selected package',10),
      ('wire_spec','finolex','Finolex or related branded fireproof wire',20),
      ('wire_spec','polycab_frls','Polycab FRLS fireproof wire',30),
      ('wire_spec','other','Other / discuss with team',40),

      ('switch_spec','package_default','As per selected package',10),
      ('switch_spec','maru_basic','MARU Basic',20),
      ('switch_spec','gold_medal_air','Gold Medal Air',30),
      ('switch_spec','other','Other / discuss with team',40),

      ('flooring_spec','package_default','As per selected package',10),
      ('flooring_spec','tiles_45','Tiles allowance up to ₹45/sft',20),
      ('flooring_spec','tiles_70','Tiles allowance up to ₹70/sft',30),
      ('flooring_spec','tiles_85','Tiles allowance up to ₹85/sft',40),
      ('flooring_spec','other','Other / discuss with team',50)
    ) AS x(question_key,value,label,display_order)
      ON q.version_id=target_version_id AND q.question_key=x.question_key;

  INSERT INTO estimator_rate_items(version_id,rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order,metadata,is_active)
  SELECT target_version_id,rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order,metadata,is_active
    FROM estimator_rate_items WHERE version_id=source_version_id;

  INSERT INTO estimator_adjustments(version_id,adjustment_key,label,adjustment_type,value_min,value_max,city_id,show_when,display_order,metadata,is_active)
  SELECT target_version_id,adjustment_key,label,adjustment_type,value_min,value_max,city_id,show_when,display_order,metadata,is_active
    FROM estimator_adjustments WHERE version_id=source_version_id;

  INSERT INTO estimator_packages(version_id,package_key,label,badge,selector_question_key,selector_value,summary,price_note,display_order,metadata,is_active)
  SELECT target_version_id,package_key,label,badge,selector_question_key,selector_value,summary,price_note,display_order,metadata,is_active
    FROM estimator_packages WHERE version_id=source_version_id;

  INSERT INTO estimator_package_details(package_id,detail_key,section,label,value,note,display_order,is_active)
  SELECT np.id,d.detail_key,d.section,d.label,d.value,d.note,d.display_order,d.is_active
    FROM estimator_package_details d
    JOIN estimator_packages op ON op.id=d.package_id AND op.version_id=source_version_id
    JOIN estimator_packages np ON np.version_id=target_version_id AND np.package_key=op.package_key;

  UPDATE customer_flow_versions SET status='retired',updated_at=CURRENT_TIMESTAMP
   WHERE definition_id=def_id AND status='published';
  UPDATE customer_flow_versions
     SET status='published',published_at=CURRENT_TIMESTAMP,effective_from=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
   WHERE id=target_version_id;
END $$;

DO $$
DECLARE
  def_id INTEGER;
  source_version_id INTEGER;
  target_version_id INTEGER;
  next_version INTEGER;
BEGIN
  SELECT d.id INTO def_id
    FROM customer_flow_definitions d
   WHERE d.key='interior-cost-estimator' AND d.flow_type='estimator'
   LIMIT 1;
  IF def_id IS NULL THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM customer_flow_versions
     WHERE v.definition_id=def_id
       AND config->>'seedKey'='interior-cost-estimator-v2-modes'
  ) THEN RETURN; END IF;

  SELECT v.id INTO source_version_id
    FROM customer_flow_versions v
   WHERE v.definition_id=def_id AND v.status='published'
   ORDER BY v.version_no DESC LIMIT 1;
  IF source_version_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(MAX(version_no),0)+1 INTO next_version
    FROM customer_flow_versions WHERE definition_id=def_id;

  INSERT INTO customer_flow_versions(definition_id,version_no,status,config,effective_from,created_at,updated_at)
  SELECT def_id,next_version,'draft',
         COALESCE(config,'{}'::jsonb)
         || jsonb_build_object(
              'seedKey','interior-cost-estimator-v2-modes',
              'estimateModes',jsonb_build_array('rough','detailed'),
              'modeHeadline','Choose a rough or detailed interior estimate'
            ),
         CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
    FROM customer_flow_versions WHERE id=source_version_id
  RETURNING id INTO target_version_id;

  INSERT INTO customer_flow_questions
    (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
  SELECT target_version_id,question_key,question_type,label,help_text,is_required,display_order+10,
         validation,show_when,lead_field,visibility,is_active
    FROM customer_flow_questions
   WHERE version_id=source_version_id;

  INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
  SELECT nq.id,o.value,o.label,o.display_order,o.is_active
    FROM customer_flow_question_options o
    JOIN customer_flow_questions oq ON oq.id=o.question_id AND oq.version_id=source_version_id
    JOIN customer_flow_questions nq ON nq.version_id=target_version_id AND nq.question_key=oq.question_key;

  INSERT INTO customer_flow_questions
    (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
  VALUES
    (target_version_id,'estimate_mode','single_select','Which estimate do you need?','Choose Rough for a quick planning range or Detailed to select wood, laminate, hardware and finish specifications.',TRUE,5,'{}'::jsonb,'{}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'plywood_spec','single_select','Plywood / board specification','Choose the board specification for the detailed estimate.',TRUE,135,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'internal_laminate_spec','single_select','Internal laminate','Choose the internal finish specification.',TRUE,136,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'external_laminate_spec','single_select','External laminate / shutter finish','Choose the external finish specification.',TRUE,137,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'hardware_spec','single_select','Hardware specification','Choose the hinge and channel specification.',TRUE,138,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'modular_finish_spec','single_select','Modular finish','Choose the modular finish for the detailed estimate.',TRUE,139,'{}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE);

  INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
  SELECT q.id,x.value,x.label,x.display_order,TRUE
    FROM customer_flow_questions q
    JOIN (VALUES
      ('estimate_mode','rough','Rough estimate',10),
      ('estimate_mode','detailed','Detailed estimate',20),

      ('plywood_spec','package_default','As per selected package',10),
      ('plywood_spec','gurjan_bwp','Gurjan BWP',20),
      ('plywood_spec','greenply_century_710','Greenply / Century Ply 710',30),
      ('plywood_spec','hdhmr_action_tesa','HDHMR / Action Tesa',40),
      ('plywood_spec','other','Other / discuss with team',50),

      ('internal_laminate_spec','package_default','As per selected package',10),
      ('internal_laminate_spec','liner_072','0.72mm liner',20),
      ('internal_laminate_spec','fabric_08','0.8 fabric',30),
      ('internal_laminate_spec','other','Other / discuss with team',40),

      ('external_laminate_spec','package_default','As per selected package',10),
      ('external_laminate_spec','virgo_advance_1mm','1mm Virgo / Advance',20),
      ('external_laminate_spec','merino_century_1mm','1mm Merino / Century Lam',30),
      ('external_laminate_spec','pu_duco','PU / Duco finish',40),
      ('external_laminate_spec','veneer_pvc','Veneer / PVC laminate',50),
      ('external_laminate_spec','other','Other / discuss with team',60),

      ('hardware_spec','package_default','As per selected package',10),
      ('hardware_spec','ebco_soft_close','EBCO soft-close hinges & channels',20),
      ('hardware_spec','hettich_hafele','Hettich / Hafele soft-close hinges & channels',30),
      ('hardware_spec','other','Other / discuss with team',40),

      ('modular_finish_spec','package_default','As per selected package',10),
      ('modular_finish_spec','semi_modular','Semi modular finish',20),
      ('modular_finish_spec','full_modular','Full modular finish',30),
      ('modular_finish_spec','pu_duco','PU / Duco finish',40),
      ('modular_finish_spec','other','Other / discuss with team',50)
    ) AS x(question_key,value,label,display_order)
      ON q.version_id=target_version_id AND q.question_key=x.question_key;

  INSERT INTO estimator_rate_items(version_id,rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order,metadata,is_active)
  SELECT target_version_id,rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order,metadata,is_active
    FROM estimator_rate_items WHERE version_id=source_version_id;

  INSERT INTO estimator_adjustments(version_id,adjustment_key,label,adjustment_type,value_min,value_max,city_id,show_when,display_order,metadata,is_active)
  SELECT target_version_id,adjustment_key,label,adjustment_type,value_min,value_max,city_id,show_when,display_order,metadata,is_active
    FROM estimator_adjustments WHERE version_id=source_version_id;

  INSERT INTO estimator_packages(version_id,package_key,label,badge,selector_question_key,selector_value,summary,price_note,display_order,metadata,is_active)
  SELECT target_version_id,package_key,label,badge,selector_question_key,selector_value,summary,price_note,display_order,metadata,is_active
    FROM estimator_packages WHERE version_id=source_version_id;

  INSERT INTO estimator_package_details(package_id,detail_key,section,label,value,note,display_order,is_active)
  SELECT np.id,d.detail_key,d.section,d.label,d.value,d.note,d.display_order,d.is_active
    FROM estimator_package_details d
    JOIN estimator_packages op ON op.id=d.package_id AND op.version_id=source_version_id
    JOIN estimator_packages np ON np.version_id=target_version_id AND np.package_key=op.package_key;

  UPDATE customer_flow_versions SET status='retired',updated_at=CURRENT_TIMESTAMP
   WHERE definition_id=def_id AND status='published';
  UPDATE customer_flow_versions
     SET status='published',published_at=CURRENT_TIMESTAMP,effective_from=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
   WHERE id=target_version_id;
END $$;
