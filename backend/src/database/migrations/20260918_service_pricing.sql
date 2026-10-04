CREATE TABLE IF NOT EXISTS service_pricing (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price_label TEXT NOT NULL DEFAULT 'Custom quote',
  billing_note TEXT NOT NULL DEFAULT '',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta_label TEXT NOT NULL DEFAULT 'Get Started',
  cta_url TEXT NOT NULL DEFAULT '/contact',
  highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO service_pricing(category,name,slug,tagline,description,price_label,billing_note,features,cta_label,cta_url,highlighted,sort_order)
VALUES
('Marketing','Marketing Growth','marketing-growth','Build visibility. Create demand.','Marketing support for businesses that need a stronger digital presence, better reach and a clearer path to enquiries.','Custom quote','Scope-based pricing',
 '["Digital marketing strategy","Social media & content","SEO and local visibility","Campaign support"]'::jsonb,'Talk to Sales','/contact',FALSE,10),
('Lead Sales','Lead Marketplace','lead-marketplace','Buy leads. Reach real opportunities.','Find relevant project enquiries, review available lead information and purchase eligible access through the Propulse marketplace.','Pay per lead','Lead pricing is shown in the marketplace',
 '["Location-based lead discovery","Protected customer contact data","Configured lead pricing","Purchased-lead management"]'::jsonb,'Explore Leads','/leads',TRUE,20),
('Government Compliance','Government Compliance Support','government-compliance','Stay organised for required registrations and filings.','Support with compliance documentation, registration workflows and filing coordination. Final requirements depend on the applicable authority and your business.','Custom quote','Scope and authority dependent',
 '["Document preparation support","Registration workflow support","Filing coordination","Compliance status tracking"]'::jsonb,'Talk to Compliance Team','/contact',FALSE,30)
ON CONFLICT(slug) DO NOTHING;