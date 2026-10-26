-- Keep ProPulse Business help completely separate from homeowner FAQs.
-- Preserve previously authored business FAQs and the ability to edit them in Admin.
UPDATE faq_entries SET audience='professional',updated_at=CURRENT_TIMESTAMP
WHERE audience='website';

-- New business-focused questions. These are additive and can be edited/unpublished in Admin.
INSERT INTO faq_entries (audience,category,question,answer,sort_order,is_active)
SELECT 'professional',v.category,v.question,v.answer,v.sort_order,TRUE
FROM (VALUES
 ('general','Who is the ProPulse professional portal for?','The professional portal is for construction companies, interior designers, contractors, engineers and other supported service businesses to manage their business profile and find relevant customer opportunities.',100),
 ('account','How do I update my professional business profile?','Open Profile to update your company information, services, service locations, project portfolio, packages and available business contact details. Save each changed section before leaving it.',110),
 ('account','Can I choose which locations and services my business supports?','Yes. Update your services and service areas in your business profile. Keep them accurate so the marketplace and public directory can present your business for relevant customer requirements.',120),
 ('general','Will homeowners see my professional business profile?','Information marked for public display can appear in the Find Professionals directory. Keep your projects, completed work, services and packages up to date for homeowners reviewing providers.',130),
 ('leads','Where can I find new customer requests?','Open Home or Requests in the professional workspace. Available enquiries can be reviewed by service, location and the details provided by each customer.',140),
 ('leads','Why are some customer contact details hidden?','Contact details can be masked until the marketplace grants access according to the purchase and entitlement rules for the lead. The applicable price and access conditions are shown before purchase.',150),
 ('leads','What should I do if a purchased lead is invalid?','Use the available lead reporting process to submit the issue for review. Any refund or reversal depends on the configured validation rules and the outcome of the review.',160),
 ('payments','How is the price of a customer lead decided?','The applicable lead price is set by ProPulse marketplace pricing rules, which may take service, location and sharing capacity into account. Review the displayed price before purchase.',170),
 ('payments','How do I see my purchases and wallet transactions?','Use the professional wallet and purchased-leads views to review supported transactions and access. A successful payment does not change the details or availability of unrelated leads.',180),
 ('general','Can I edit my construction and interior packages?','Yes. The business profile allows you to edit the available package tiers, specifications and pricing details to represent your actual offerings.',190),
 ('account','How do professional memberships work?','Available memberships and their benefits appear in the Membership section. Check current pricing, renewal terms and eligibility before purchasing or changing a plan.',200),
 ('general','How can I contact professional support?','Use Contact from the professional portal or open the Professional Support link in this FAQ. Customer project enquiries have a separate contact experience.',210)
) AS v(category,question,answer,sort_order)
WHERE NOT EXISTS (
 SELECT 1 FROM faq_entries existing
 WHERE existing.audience='professional' AND existing.question=v.question
);
