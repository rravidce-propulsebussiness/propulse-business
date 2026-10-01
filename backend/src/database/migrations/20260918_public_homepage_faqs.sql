INSERT INTO faq_entries (audience,category,question,answer,sort_order,is_active)
SELECT v.audience,v.category,v.question,v.answer,v.sort_order,TRUE
FROM (VALUES
 ('website','general','What is Propulse Business Technologies Private Limited?','Propulse Business Technologies Private Limited is an IT technology company helping businesses build, digitize, market, generate opportunities and scale through practical digital solutions and business technology support.',10),
 ('website','general','What services does Propulse provide?','Propulse brings together websites and web applications, mobile apps, business software, automation, digital marketing, lead sales and business support services in one technology-focused ecosystem.',20),
 ('website','leads','How does the Propulse lead marketplace work?','Businesses can explore available leads, review the information provided for each opportunity and purchase eligible access to customer contact details through the marketplace.',30),
 ('website','leads','Can I find leads by location and service?','Yes. Lead discovery can use available business, service and location information so businesses can look for opportunities relevant to their target market.',40),
 ('website','general','Can Propulse build a website or mobile app for my business?','Yes. Website, web application, mobile application, business portal and software development are part of the technology services offered by Propulse.',50),
 ('website','general','Does Propulse provide digital marketing and creative services?','Yes. Services can include SEO, social media, performance marketing, branding and creative production such as photography, videography, reels and advertising creatives.',60),
 ('website','payments','How is lead pricing determined?','Lead pricing is configured by Propulse and the applicable price is shown in the marketplace before an eligible purchase is completed.',70),
 ('website','general','Can Propulse help with company registration, GST and ITR?','Propulse can provide business and tax compliance support such as company registration workflows, GST-related workflows, ITR preparation and filing support, and document coordination, subject to the applicable requirements and authority.',80)
) AS v(audience,category,question,answer,sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM faq_entries f
  WHERE f.audience=v.audience AND f.question=v.question
);