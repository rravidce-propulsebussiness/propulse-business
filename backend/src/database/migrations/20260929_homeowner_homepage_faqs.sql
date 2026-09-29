-- Homeowner-focused FAQ content for the public customer-acquisition homepage.
-- Kept separate from business-user, investor and lead-partner FAQ audiences.

INSERT INTO faq_entries (audience,category,question,answer,sort_order,is_active)
SELECT v.audience,v.category,v.question,v.answer,v.sort_order,TRUE
FROM (VALUES
 ('homeowner','consultation','Is the initial consultation free?','Yes. You can start by sharing your requirement and requesting an initial consultation without paying ProPulse for that first step. Any later project quotation, professional fee or service cost should be reviewed separately before you proceed.',10),
 ('homeowner','privacy','Who can see my phone number and contact details?','ProPulse uses the contact details you submit to process your requirement and may share them with relevant businesses so they can respond. Your requirement flow explains the contact consent before submission.',20),
 ('homeowner','consultation','What happens after I submit a consultation request?','Your consultation is saved first so your enquiry is not lost. You can then add more project details. The completed requirement gives relevant businesses better context about your location, scope, budget and timeline.',30),
 ('homeowner','construction','Does ProPulse itself construct my home?','ProPulse is the platform that captures and structures your requirement. Construction work is carried out by the business or professional you choose, based on the quotation, scope and agreement you accept with them.',40),
 ('homeowner','interiors','Can I use ProPulse only for interior design?','Yes. You can start directly with the Interior Design journey and share your property type, rooms, scope, approximate area, finish preference, budget and expected timeline.',50),
 ('homeowner','property','Can I use ProPulse to buy, rent, sell or invest in property?','Yes. The Real Estate requirement flow lets you describe whether you want to buy, rent, sell or invest, along with your preferred location, property type, budget and other requirements.',60),
 ('homeowner','general','Are the prices or estimates shown on ProPulse final quotations?','No. Cost estimators and planning ranges are indicative. Final pricing can change after site review, measurements, materials, specifications, location factors and the quotation provided by the selected business.',70),
 ('homeowner','general','How should I compare businesses or quotations?','Compare the scope of work, materials or specifications, exclusions, timeline, payment terms, warranty or support commitments and the final written quotation. Do not rely only on the lowest price.',80)
) AS v(audience,category,question,answer,sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM faq_entries f
  WHERE f.audience=v.audience AND f.question=v.question
);
