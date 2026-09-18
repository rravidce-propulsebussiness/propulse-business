UPDATE service_pricing
SET
  name='Marketing & Technology',
  tagline='Websites, apps, marketing & creative.',
  description='Build the digital systems and visibility your business needs — from websites and web apps to mobile apps, SEO, social media, performance marketing, branding, photography and video.',
  price_label='Custom quote',
  billing_note='Scope-based pricing',
  features='["Website design & development","Web apps, portals & business software","Mobile app development","SEO, social media & performance marketing","Branding & creative production","Photography, videography, reels & ad creatives"]'::jsonb,
  cta_label='Talk to Marketing',
  cta_url='/contact',
  image_url='https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85',
  sort_order=10
WHERE slug='marketing-growth';

UPDATE service_pricing
SET
  name='Lead Marketplace',
  tagline='Buy leads. Reach real opportunities.',
  description='Discover relevant customer enquiries by service and location, review the opportunity and buy eligible access through the Propulse lead marketplace.',
  price_label='Pay per lead',
  billing_note='Exact price shown before purchase',
  features='["Location-based lead discovery","Protected customer contact data","Configured lead pricing","Purchased-lead management"]'::jsonb,
  cta_label='Explore Leads',
  cta_url='/leads',
  highlighted=TRUE,
  image_url='https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=85',
  sort_order=20
WHERE slug='lead-marketplace';

UPDATE service_pricing
SET
  name='Business & Tax Compliance',
  tagline='Registration, GST, ITR & filing support.',
  description='Support for company registration, GST workflows, ITR preparation and filing, documentation and selected statutory compliance workflows, based on the applicable authority and your business.',
  price_label='Custom quote',
  billing_note='Scope and applicable authority dependent',
  features='["Company / business registration support","GST registration & workflow support","ITR preparation & filing support","Selected tax & statutory filing support","Compliance document coordination"]'::jsonb,
  cta_label='Talk to Compliance',
  cta_url='/contact',
  highlighted=FALSE,
  image_url='https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=85',
  sort_order=30
WHERE slug='government-compliance';