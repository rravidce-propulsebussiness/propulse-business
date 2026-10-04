ALTER TABLE service_pricing DROP CONSTRAINT IF EXISTS service_pricing_category_check;

INSERT INTO service_pricing(category,name,slug,tagline,description,price_label,billing_note,features,cta_label,cta_url,highlighted,sort_order,is_active)
VALUES
('Grow','Website Development','grow-website-development','A professional website for your business.','Website design and development as an optional Propulse growth service.','Custom quote','Project scope dependent','["Website design & development","Mobile-responsive pages","Business enquiry integration"]'::jsonb,'Explore Services','/contact',FALSE,110,TRUE),
('Grow','SEO Services','grow-seo-services','Improve search visibility and discoverability.','SEO services as an optional Propulse growth service.','Custom quote','Monthly / scope-based','["SEO strategy","On-page optimisation","Local visibility support"]'::jsonb,'Explore Services','/contact',FALSE,120,TRUE),
('Grow','Website Maintenance','grow-website-maintenance','Keep your website secure and up to date.','Ongoing website maintenance as an optional Propulse growth service.','Custom quote','Monthly / scope-based','["Content updates","Maintenance support","Performance checks"]'::jsonb,'Explore Services','/contact',FALSE,130,TRUE),
('Scale','Business Profile Promotion','scale-profile-promotion','Put your business in front of more relevant opportunities.','Business profile promotion as part of Propulse Scale services.','Custom quote','Campaign / scope-based','["Business profile promotion","Visibility support","Campaign coordination"]'::jsonb,'Learn More','/investment',FALSE,210,TRUE),
('Scale','Lead Generation','scale-lead-generation','Create broader reach and more business opportunities.','Lead generation services as part of Propulse Scale.','Custom quote','Campaign / scope-based','["Lead generation","Audience targeting","Opportunity tracking"]'::jsonb,'Learn More','/investment',FALSE,220,TRUE),
('Scale','Eligible Earnings Program','scale-eligible-earnings','Access eligible earning programs subject to their terms.','Access to eligible Propulse earning or investment programs is governed by the applicable program terms.','Program terms apply','Eligibility and program terms apply','["Eligible program access","Program-specific terms","Separate program administration"]'::jsonb,'Learn More','/investment',FALSE,230,TRUE)
ON CONFLICT(slug) DO UPDATE SET
  category=EXCLUDED.category,
  name=EXCLUDED.name,
  tagline=EXCLUDED.tagline,
  description=EXCLUDED.description,
  price_label=EXCLUDED.price_label,
  billing_note=EXCLUDED.billing_note,
  features=EXCLUDED.features,
  cta_label=EXCLUDED.cta_label,
  cta_url=EXCLUDED.cta_url,
  sort_order=EXCLUDED.sort_order,
  is_active=EXCLUDED.is_active,
  updated_at=CURRENT_TIMESTAMP;