UPDATE service_pricing
SET
  name='Marketing & Technology',
  tagline='Websites, apps, campaigns and digital growth.',
  description='Build the digital systems and visibility your business needs — from websites and web apps to mobile apps, SEO, social media, performance campaigns and creative production.',
  price_label='Custom quote',
  billing_note='Scope-based pricing',
  features='["Website design & development","Web apps, portals & business software","Mobile app development","SEO, social media & performance marketing","Branding, creatives, photo & video support"]'::jsonb,
  cta_label='Talk to Marketing',
  cta_url='/contact'
WHERE slug='marketing-growth';

UPDATE service_pricing
SET
  name='Lead Marketplace',
  tagline='Buy leads. Reach real opportunities.',
  description='Find relevant project enquiries, review available lead information and purchase eligible access through the Propulse marketplace.',
  price_label='Pay per lead',
  billing_note='Exact price shown before purchase',
  features='["Location-based lead discovery","Protected customer contact data","Configured lead pricing","Purchased-lead management"]'::jsonb,
  cta_label='Explore Leads',
  cta_url='/leads',
  highlighted=TRUE
WHERE slug='lead-marketplace';

UPDATE service_pricing
SET
  name='Business & Tax Compliance',
  tagline='Registration, GST, ITR and ongoing filing support.',
  description='Practical support for business registrations, GST workflows, income-tax return filing and selected ongoing compliance needs, based on your business and the applicable authority.',
  price_label='Custom quote',
  billing_note='Scope and applicable authority dependent',
  features='["Company / business registration support","GST registration & related workflows","ITR preparation & filing support","Selected tax and statutory filing support","Compliance document coordination"]'::jsonb,
  cta_label='Talk to Compliance',
  cta_url='/contact'
WHERE slug='government-compliance';