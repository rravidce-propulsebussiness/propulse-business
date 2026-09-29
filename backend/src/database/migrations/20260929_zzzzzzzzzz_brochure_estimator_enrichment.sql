-- Brochure-aligned estimator enrichment.
-- Creates new published versions rather than mutating previously published versions.
-- Construction: expands the Royal package specification catalogue.
-- Interiors: adds brochure customisation quantities and exact Admin-editable per-unit add-on rates.

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
     WHERE definition_id=def_id
       AND config->>'seedKey'='construction-cost-estimator-v3-brochure'
  ) THEN RETURN; END IF;

  SELECT v.id INTO source_version_id
    FROM customer_flow_versions v
   WHERE v.definition_id=def_id AND v.status='published'
   ORDER BY v.version_no DESC LIMIT 1;
  IF source_version_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(MAX(v.version_no),0)+1 INTO next_version
    FROM customer_flow_versions v WHERE v.definition_id=def_id;

  INSERT INTO customer_flow_versions(definition_id,version_no,status,config,effective_from,created_at,updated_at)
  SELECT def_id,next_version,'draft',
         COALESCE(v.config,'{}'::jsonb)
         || jsonb_build_object(
              'seedKey','construction-cost-estimator-v3-brochure',
              'brochureReference','Subramanyam Royal Package'
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

  INSERT INTO estimator_package_details
    (package_id,detail_key,section,label,value,note,display_order,is_active)
  SELECT p.id,x.detail_key,x.section,x.label,x.value,x.note,x.display_order,TRUE
    FROM estimator_packages p
    CROSS JOIN (VALUES
      ('architecture_scope','Architecture','Design package','2D floor plans, structural plans, 3D elevation plans, digital survey, soil test, plumbing & electrical drawings, 3D elevation',NULL,90),
      ('aggregate','Structure','Aggregate','20mm and 40mm from government-approved quarry',NULL,100),
      ('kitchen_wall_tiles','Kitchen','Kitchen wall tiles','Ceramic wall tiles up to 2 feet height','Allowance up to ₹60/sft',110),
      ('kitchen_sink','Kitchen','Kitchen sink','Stainless-steel single sink','Allowance up to ₹6,000',120),
      ('kitchen_platform','Kitchen','Kitchen platform','Granite platform','Allowance up to ₹250/sft',130),
      ('main_door','Doors & windows','Main door','Indian teak double door with teak frame and fittings','Allowance up to ₹60,000',140),
      ('internal_doors','Doors & windows','Internal doors','Flush doors with laminate and teak-wood frame','Allowance up to ₹15,000 including frame, door & fittings',150),
      ('windows','Doors & windows','Windows','UPVC windows with glass shutter and mesh shutters','Allowance up to ₹550/sft including fittings',160),
      ('bathroom_doors','Doors & windows','Bathroom doors','Waterproof flush doors with WPC frame','Allowance up to ₹12,000 including frame, door & fittings',170),
      ('door_hardware','Doors & windows','Door handles & locks','Godrej','Hardware and polish included in stated door/window allowances',180),
      ('bathroom_wall_tiles','Bathroom','Bathroom wall tiles','Ceramic wall tiles up to ceiling level','Allowance up to ₹65/sft',190),
      ('bathroom_pipe','Bathroom','CPVC / PVC pipe','Ashirwad hot-water CPVC',NULL,200),
      ('waterproofing','Bathroom','Waterproofing','All wet areas waterproofed',NULL,210),
      ('stair_flooring','Flooring','Staircase flooring','Granite','Allowance up to ₹130/sft',220),
      ('parking_flooring','Flooring','Parking flooring','Granite','Allowance up to ₹70/sft',230),
      ('interior_paint','Painting','Interior painting','Birla wall putty 2 coats, primer 1 coat, Royal Emulsion 3 coats',NULL,240),
      ('exterior_paint','Painting','Exterior painting','Putty/texture 2 coats, Asian primer 1 coat, Apex Ultima weatherproof paint 2 coats',NULL,250),
      ('electrical_pipes','Electrical','Electrical piping','Polycab pipes in slabs and internal piping',NULL,260),
      ('railings','Railings','Railings','SS 304 railing for steps and glass railing for balconies',NULL,270),
      ('sliding_gate','MS works','MS sliding gate','MS sliding gate','Allowance up to ₹45,000 per unit',280),
      ('overhead_tank','Miscellaneous','Overhead tank','RCC tank up to 4,000 litres',NULL,290),
      ('underground_sump','Miscellaneous','Underground sump','RCC sump; capacity varies by area and floors',NULL,300),
      ('plinth_level','Miscellaneous','Plinth level','2 feet above existing road level',NULL,310),
      ('floor_height','Miscellaneous','Floor height','11 feet finished-floor to finished-floor',NULL,320),
      ('warranty','Warranty','Warranty','1-year construction warranty and 10-year structural warranty','Final contract terms remain subject to approved agreement',330)
    ) AS x(detail_key,section,label,value,note,display_order)
   WHERE p.version_id=target_version_id AND p.package_key='royal'
  ON CONFLICT(package_id,detail_key) DO UPDATE
    SET section=EXCLUDED.section,label=EXCLUDED.label,value=EXCLUDED.value,note=EXCLUDED.note,
        display_order=EXCLUDED.display_order,is_active=TRUE,updated_at=CURRENT_TIMESTAMP;

  UPDATE customer_flow_versions
     SET status='retired',updated_at=CURRENT_TIMESTAMP
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
     WHERE definition_id=def_id
       AND config->>'seedKey'='interior-cost-estimator-v3-brochure'
  ) THEN RETURN; END IF;

  SELECT v.id INTO source_version_id
    FROM customer_flow_versions v
   WHERE v.definition_id=def_id AND v.status='published'
   ORDER BY v.version_no DESC LIMIT 1;
  IF source_version_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(MAX(v.version_no),0)+1 INTO next_version
    FROM customer_flow_versions v WHERE v.definition_id=def_id;

  INSERT INTO customer_flow_versions(definition_id,version_no,status,config,effective_from,created_at,updated_at)
  SELECT def_id,next_version,'draft',
         COALESCE(v.config,'{}'::jsonb)
         || jsonb_build_object(
              'seedKey','interior-cost-estimator-v3-brochure',
              'brochureReference','SG Homes Interior Brochure'
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

  INSERT INTO customer_flow_questions
    (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
  VALUES
    (target_version_id,'customisations','multi_select','Do you want any brochure customisations?','Optional. Select only the extras you want included in this detailed estimate.',FALSE,190,'{"maxItems":13}'::jsonb,'{"questionKey":"estimate_mode","equals":"detailed"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'hdhmr_area','area','HDHMR area','Enter the approximate HDHMR work area in sq ft.',TRUE,200,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"plywood_spec","equals":"hdhmr_action_tesa"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'pu_duco_area','area','PU / Duco shutter area','Enter the approximate shutter area in sq ft.',TRUE,210,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"external_laminate_spec","equals":"pu_duco"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'veneer_pvc_area','area','Veneer / PVC finish area','Enter the approximate finish area in sq ft.',TRUE,220,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"external_laminate_spec","equals":"veneer_pvc"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'profile_glass_area','area','Profile glass area','Enter the approximate profile-glass area in sq ft.',TRUE,230,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"profile_glass"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'aristo_glass_area','area','Aristo glass shutter area','Enter the approximate Aristo glass shutter area in sq ft.',TRUE,240,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"aristo_glass"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'granite_tile_area','area','Granite / full-body tile area','Enter the approximate area in sq ft.',TRUE,250,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"granite_tiles"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'dado_tile_area','area','Dado tile area','Enter the approximate dado-tile area in sq ft.',TRUE,260,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"dado_tiles"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'quartz_area','area','Quartz platform area','Enter the approximate quartz platform area in sq ft.',TRUE,270,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"quartz_platform"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'regular_wallpaper_area','area','Regular wallpaper area','Enter the approximate wallpaper area in sq ft.',TRUE,280,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"regular_wallpaper"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'custom_wallpaper_area','area','Custom wallpaper area','Enter the approximate customised wallpaper area in sq ft.',TRUE,290,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"custom_wallpaper"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'blinds_curtains_area','area','Blinds / curtains area','Enter the approximate blinds or curtains area in sq ft.',TRUE,300,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"blinds_curtains"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'profile_light_meters','number','Profile light length','Enter the approximate profile-light length in metres.',TRUE,310,'{"min":1,"max":5000}'::jsonb,'{"questionKey":"customisations","equals":"profile_lights"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'sensor_count','number','Sensor circuit count','Enter the number of sensor circuits.',TRUE,320,'{"min":1,"max":100}'::jsonb,'{"questionKey":"customisations","equals":"sensor_circuit"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'mdf_cnc_area','area','MDF CNC design area','Enter the approximate MDF CNC area in sq ft.',TRUE,330,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"mdf_cnc"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'wall_panelling_area','area','Wall panelling area','Enter the approximate rafter wall-panelling area in sq ft.',TRUE,340,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"wall_panelling"}'::jsonb,NULL,'marketplace',TRUE),
    (target_version_id,'wall_panelling_pu_area','area','PU / Duco wall-panelling area','Enter the approximate PU / Duco wall-panelling area in sq ft.',TRUE,350,'{"min":1,"max":50000}'::jsonb,'{"questionKey":"customisations","equals":"wall_panelling_pu"}'::jsonb,NULL,'marketplace',TRUE);

  UPDATE customer_flow_questions
     SET display_order=CASE question_key WHEN 'timeline' THEN 900 WHEN 'additional_requirement' THEN 910 ELSE display_order END
   WHERE version_id=target_version_id AND question_key IN ('timeline','additional_requirement');

  INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
  SELECT q.id,x.value,x.label,x.display_order,TRUE
    FROM customer_flow_questions q
    JOIN (VALUES
      ('profile_glass','Profile glass',10),
      ('aristo_glass','Aristo glass shutters',20),
      ('granite_tiles','Granite / full-body tiles',30),
      ('dado_tiles','Dado tiles',40),
      ('quartz_platform','Quartz platform',50),
      ('regular_wallpaper','Regular design wallpaper',60),
      ('custom_wallpaper','Customised wallpaper',70),
      ('blinds_curtains','Roller blinds / customised curtains',80),
      ('profile_lights','Wardrobe internal profile lights',90),
      ('sensor_circuit','Sensor circuit',100),
      ('mdf_cnc','MDF CNC design',110),
      ('wall_panelling','Wall panelling with rafters',120),
      ('wall_panelling_pu','Wall panelling with PU / Duco finish',130)
    ) AS x(value,label,display_order)
      ON q.version_id=target_version_id AND q.question_key='customisations';

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

  INSERT INTO estimator_package_details(package_id,detail_key,section,label,value,note,display_order,is_active)
  SELECT p.id,x.detail_key,'Warranty & payment',x.label,x.value,x.note,x.display_order,TRUE
    FROM estimator_packages p
    JOIN (VALUES
      ('ply_warranty','Ply warranty','10 years',NULL,80),
      ('service_warranty','Service warranty','1 year',NULL,90),
      ('payment_method','Payment method','Stage-wise payment',NULL,100)
    ) AS x(detail_key,label,value,note,display_order) ON TRUE
   WHERE p.version_id=target_version_id AND p.package_key IN ('standard','premium')
  ON CONFLICT(package_id,detail_key) DO UPDATE
    SET section=EXCLUDED.section,label=EXCLUDED.label,value=EXCLUDED.value,note=EXCLUDED.note,
        display_order=EXCLUDED.display_order,is_active=TRUE,updated_at=CURRENT_TIMESTAMP;

  INSERT INTO estimator_adjustments
    (version_id,adjustment_key,label,adjustment_type,unit_question_key,value_min,value_max,city_id,show_when,display_order,metadata,is_active)
  SELECT target_version_id,x.adjustment_key,x.label,'per_unit',x.unit_question_key,x.rate,x.rate,NULL,
         jsonb_build_object('questionKey',x.selector_question,'equals',x.selector_value),
         x.display_order,
         jsonb_build_object('kind','material_option','source','sg-homes-interior-brochure','unit',x.unit_label),
         TRUE
    FROM (VALUES
      ('material_plywood_hdhmr','HDHMR / Action Tesa upgrade','hdhmr_area',50.00::numeric,'plywood_spec','hdhmr_action_tesa',510,'sq ft'),
      ('material_external_pu_duco','PU / Duco shutter finish','pu_duco_area',350.00::numeric,'external_laminate_spec','pu_duco',520,'sq ft'),
      ('material_external_veneer_pvc','Veneer / PVC laminate finish','veneer_pvc_area',100.00::numeric,'external_laminate_spec','veneer_pvc',530,'sq ft'),
      ('material_profile_glass','Profile glass','profile_glass_area',550.00::numeric,'customisations','profile_glass',540,'sq ft'),
      ('material_aristo_glass','Aristo glass shutters','aristo_glass_area',850.00::numeric,'customisations','aristo_glass',550,'sq ft'),
      ('material_granite_tiles','Granite / full-body tiles','granite_tile_area',400.00::numeric,'customisations','granite_tiles',560,'sq ft'),
      ('material_dado_tiles','Dado tiles','dado_tile_area',200.00::numeric,'customisations','dado_tiles',570,'sq ft'),
      ('material_quartz_platform','Quartz platform','quartz_area',800.00::numeric,'customisations','quartz_platform',580,'sq ft'),
      ('material_regular_wallpaper','Regular design wallpaper','regular_wallpaper_area',75.00::numeric,'customisations','regular_wallpaper',590,'sq ft'),
      ('material_custom_wallpaper','Customised wallpaper','custom_wallpaper_area',150.00::numeric,'customisations','custom_wallpaper',600,'sq ft'),
      ('material_blinds_curtains','Roller blinds / customised curtains','blinds_curtains_area',350.00::numeric,'customisations','blinds_curtains',610,'sq ft'),
      ('material_profile_lights','Wardrobe internal profile lights','profile_light_meters',800.00::numeric,'customisations','profile_lights',620,'metre'),
      ('material_sensor_circuit','Sensor circuit','sensor_count',3500.00::numeric,'customisations','sensor_circuit',630,'No.'),
      ('material_mdf_cnc','MDF CNC design','mdf_cnc_area',300.00::numeric,'customisations','mdf_cnc',640,'sq ft'),
      ('material_wall_panelling','Wall panelling with rafters','wall_panelling_area',600.00::numeric,'customisations','wall_panelling',650,'sq ft'),
      ('material_wall_panelling_pu','Wall panelling with PU / Duco finish','wall_panelling_pu_area',800.00::numeric,'customisations','wall_panelling_pu',660,'sq ft')
    ) AS x(adjustment_key,label,unit_question_key,rate,selector_question,selector_value,display_order,unit_label)
  ON CONFLICT(version_id,adjustment_key) DO UPDATE
    SET label=EXCLUDED.label,adjustment_type=EXCLUDED.adjustment_type,unit_question_key=EXCLUDED.unit_question_key,
        value_min=EXCLUDED.value_min,value_max=EXCLUDED.value_max,city_id=NULL,show_when=EXCLUDED.show_when,
        display_order=EXCLUDED.display_order,metadata=EXCLUDED.metadata,is_active=TRUE,updated_at=CURRENT_TIMESTAMP;

  UPDATE customer_flow_versions
     SET status='retired',updated_at=CURRENT_TIMESTAMP
   WHERE definition_id=def_id AND status='published';

  UPDATE customer_flow_versions
     SET status='published',published_at=CURRENT_TIMESTAMP,effective_from=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
   WHERE id=target_version_id;
END $$;
