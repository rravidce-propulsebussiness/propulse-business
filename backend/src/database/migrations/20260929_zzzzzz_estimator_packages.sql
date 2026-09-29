-- Versioned estimator package catalogue.
-- Package presentation is Admin-editable and copied with estimator drafts so published estimates remain reproducible.

CREATE TABLE IF NOT EXISTS estimator_packages (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES customer_flow_versions(id) ON DELETE CASCADE,
  package_key VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  badge VARCHAR(80),
  selector_question_key VARCHAR(80) NOT NULL,
  selector_value VARCHAR(160) NOT NULL,
  summary VARCHAR(800),
  price_note VARCHAR(240),
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version_id,package_key),
  CHECK (package_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  CHECK (selector_question_key ~ '^[a-z][a-z0-9_]{1,79}$')
);

CREATE INDEX IF NOT EXISTS idx_estimator_packages_version_order
  ON estimator_packages(version_id,is_active,display_order,id);

CREATE TABLE IF NOT EXISTS estimator_package_details (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES estimator_packages(id) ON DELETE CASCADE,
  detail_key VARCHAR(80) NOT NULL,
  section VARCHAR(160) NOT NULL DEFAULT 'Specifications',
  label VARCHAR(180) NOT NULL,
  value VARCHAR(800) NOT NULL,
  note VARCHAR(800),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(package_id,detail_key),
  CHECK (detail_key ~ '^[a-z][a-z0-9_]{1,79}$')
);

CREATE INDEX IF NOT EXISTS idx_estimator_package_details_order
  ON estimator_package_details(package_id,is_active,display_order,id);

-- Construction package catalogue. The current v1 estimator uses quality values
-- standard / premium / luxury; "Royal" intentionally maps to the existing luxury
-- selector value so the calculation contract is not rewritten in place.
WITH versions AS (
  SELECT v.id version_id
  FROM customer_flow_versions v
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='construction-cost-estimator' AND v.status='published'
)
INSERT INTO estimator_packages
  (version_id,package_key,label,badge,selector_question_key,selector_value,summary,price_note,display_order,metadata,is_active)
SELECT version_id,x.package_key,x.label,x.badge,'quality',x.selector_value,x.summary,NULL,x.display_order,
       '{"seed":"brochure-construction-packages-v1"}'::jsonb,TRUE
FROM versions
CROSS JOIN (VALUES
  ('standard','Standard','VALUE','standard','Practical construction specification for budget-conscious residential projects.',10),
  ('premium','Premium','POPULAR','premium','Upgraded brands, finishes and allowances for a more premium build.',20),
  ('royal','Royal','SIGNATURE','luxury','Higher-specification construction package based on the Royal brochure specification.',30)
) AS x(package_key,label,badge,selector_value,summary,display_order)
ON CONFLICT(version_id,package_key) DO NOTHING;

WITH detail_rows(package_key,detail_key,section,label,value,display_order) AS (
  VALUES
    ('standard','steel','Structure','Steel','SHREE 550 TMT or equivalent',10),
    ('standard','cement','Structure','Cement','53 grade Nagarjuna for slabs/pillars; 43 grade Priya or equivalent for brick/internal works',20),
    ('standard','sand','Structure','Sand','Robo sand for construction; river sand for plastering',30),
    ('standard','bricks','Structure','Bricks','Karimnagar brick',40),
    ('standard','wire','Electrical','Wire','Fireproof Finolex or related brand',50),
    ('standard','switches','Electrical','Switches & sockets','MARU Basic',60),
    ('standard','flooring','Finishes','Room flooring','Tiles allowance up to ₹45/sft',70),
    ('standard','bathroom','Finishes','Bathroom fittings','CERA fittings allowance up to ₹25,000 per bathroom',80),

    ('premium','steel','Structure','Steel','Vizag TMT or Jairaj',10),
    ('premium','cement','Structure','Cement','53 grade UltraTech for slabs/pillars; 43 grade Bangur or equivalent for brick/internal works',20),
    ('premium','sand','Structure','Sand','River sand for complete construction except terrace flooring and tile work',30),
    ('premium','bricks','Structure','Bricks','Karimnagar Class II bricks',40),
    ('premium','windows','Doors & windows','Windows','UPVC windows allowance up to ₹450/sft',50),
    ('premium','flooring','Finishes','Room flooring','Tiles allowance up to ₹70/sft',60),
    ('premium','bathroom','Finishes','Bathroom fittings','Jaguar branded fittings allowance up to ₹35,000 per bathroom',70),

    ('royal','steel','Structure','Steel','TATA 550 TMT',10),
    ('royal','cement','Structure','Cement','53 grade UltraTech for complete construction',20),
    ('royal','sand','Structure','Sand','River sand for complete construction',30),
    ('royal','bricks','Structure','Bricks','Karimnagar Class I bricks',40),
    ('royal','wire','Electrical','Wire','Polycab FRLS fireproof wire',50),
    ('royal','switches','Electrical','Switches & sockets','Gold Medal Air model',60),
    ('royal','flooring','Finishes','Room flooring','Tiles allowance up to ₹85/sft',70),
    ('royal','bathroom','Finishes','Bathroom fittings','Allowance up to ₹50,000 per bathroom',80)
)
INSERT INTO estimator_package_details
  (package_id,detail_key,section,label,value,display_order,is_active)
SELECT p.id,d.detail_key,d.section,d.label,d.value,d.display_order,TRUE
FROM detail_rows d
JOIN estimator_packages p ON p.package_key=d.package_key
JOIN customer_flow_versions v ON v.id=p.version_id
JOIN customer_flow_definitions f ON f.id=v.definition_id AND f.key='construction-cost-estimator'
WHERE v.status='published'
ON CONFLICT(package_id,detail_key) DO NOTHING;

-- Interior wood-work package catalogue from the attached brochure.
WITH versions AS (
  SELECT v.id version_id
  FROM customer_flow_versions v
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='interior-cost-estimator' AND v.status='published'
)
INSERT INTO estimator_packages
  (version_id,package_key,label,badge,selector_question_key,selector_value,summary,price_note,display_order,metadata,is_active)
SELECT version_id,x.package_key,x.label,x.badge,'finish_quality',x.selector_value,x.summary,x.price_note,x.display_order,
       '{"seed":"brochure-interior-packages-v1"}'::jsonb,TRUE
FROM versions
CROSS JOIN (VALUES
  ('standard','Standard','VALUE','standard','Semi-modular wood-work specification with branded soft-close hardware.',NULL,10),
  ('premium','Premium','POPULAR','premium','Full-modular wood-work specification with upgraded ply, laminate and hardware.',NULL,20)
) AS x(package_key,label,badge,selector_value,summary,price_note,display_order)
ON CONFLICT(version_id,package_key) DO NOTHING;

WITH detail_rows(package_key,detail_key,section,label,value,display_order) AS (
  VALUES
    ('standard','wood','Materials','Wood / ply','Gurjan BWP',10),
    ('standard','internal_laminate','Materials','Internal laminate','0.72mm liner',20),
    ('standard','external_laminate','Materials','External laminate','1mm Virgo / Advance',30),
    ('standard','hardware','Hardware','Hinges & channels','EBCO soft close',40),
    ('standard','baskets','Hardware','Baskets','Extra cost @ ₹4,000/No.',50),
    ('standard','finish','Finish','Finish','Semi modular finish',60),
    ('standard','handles','Finish','Handles','Price limit up to ₹120/No.',70),

    ('premium','wood','Materials','Wood / ply','Greenply / Century Ply 710',10),
    ('premium','internal_laminate','Materials','Internal laminate','0.8 fabric',20),
    ('premium','external_laminate','Materials','External laminate','1mm Merino / Century Lam',30),
    ('premium','hardware','Hardware','Hinges & channels','Hettich / Hafele soft close',40),
    ('premium','baskets','Hardware','Baskets','Extra cost @ ₹6,000/No.',50),
    ('premium','finish','Finish','Finish','Full modular finish',60),
    ('premium','handles','Finish','Handles','Price limit up to ₹250/No.',70)
)
INSERT INTO estimator_package_details
  (package_id,detail_key,section,label,value,display_order,is_active)
SELECT p.id,d.detail_key,d.section,d.label,d.value,d.display_order,TRUE
FROM detail_rows d
JOIN estimator_packages p ON p.package_key=d.package_key
JOIN customer_flow_versions v ON v.id=p.version_id
JOIN customer_flow_definitions f ON f.id=v.definition_id AND f.key='interior-cost-estimator'
WHERE v.status='published'
ON CONFLICT(package_id,detail_key) DO NOTHING;
