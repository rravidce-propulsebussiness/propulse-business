CREATE TABLE IF NOT EXISTS faq_entries (
  id SERIAL PRIMARY KEY,
  audience VARCHAR(40) NOT NULL DEFAULT 'lead_partner',
  category VARCHAR(40) NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_faq_entries_audience_active
  ON faq_entries(audience, is_active, sort_order, id);

INSERT INTO faq_entries (audience, category, question, answer, sort_order)
SELECT 'lead_partner', category, question, answer, sort_order
FROM (
  VALUES
  ('general','What is ProPulse Business?','ProPulse Business is a lead marketplace that connects businesses with customer opportunities. As a Lead Partner, you can upload leads, manage pricing, track sales and monitor earnings.',10),
  ('general','Who can become a Lead Partner?','Businesses that can supply genuine customer leads and operate within supported service categories can use the Lead Partner portal, subject to ProPulse account approval and applicable platform rules.',20),
  ('general','How do I access the Lead Partner portal?','Sign in with an account assigned the Lead Partner role. The portal includes Overview, Lead Inventory, Pricing & Revenue, Earnings & Withdrawals, Reports and Account.',30),
  ('general','Where can I get help?','Use the FAQ and Reports sections first. For account or payout issues, contact your ProPulse administrator with the relevant lead or withdrawal reference.',40),
  ('leads','How do I upload leads?','Open Lead Inventory and use Import Leads, Connect Google Sheet, or Add Lead. Imported fields are preserved so your lead information remains available in the inventory.',10),
  ('leads','How are leads verified?','Leads are reviewed using the platform’s configured validation and review workflows. Reported leads can be reviewed by Admin and may be marked genuine or invalid.',20),
  ('leads','What makes a lead invalid?','A lead may be considered invalid when the review process confirms issues such as fake or unusable customer information, subject to the applicable review rules.',30),
  ('leads','Can a lead be reported after it is sold?','Yes. A purchased lead can be reported through the available reporting workflow. The report remains visible in Lead Partner Reports and can be reviewed by Admin.',40),
  ('leads','What happens when a lead is verified fake?','The lead can be marked invalid and the related buyer refund and Lead Partner earnings-reversal workflow can be applied. The transaction history shows the corresponding financial movement.',50),
  ('leads','Can the same lead be sold to multiple buyers?','Lead sharing depends on the configured buyer capacity for that lead. The inventory and marketplace show the current purchased share count against the allowed capacity.',60),
  ('leads','Where can I see my uploaded leads?','Open Lead Inventory to search, filter and view your uploaded leads, imported custom fields, pricing and current lead status.',70),
  ('leads','What happens when a buyer gets access to a lead?','The lead sale and access are recorded by the existing purchase and entitlement workflow. Lead status and purchase counts remain visible in the relevant portal views.',80),
  ('payments','How is lead pricing determined?','Pricing is based on the configured pricing rules for the applicable lead type, industry and location. Lead Partner pricing can be managed from Pricing & Revenue within the permitted controls.',10),
  ('payments','How do I know a lead was sold?','The lead status and purchase information are reflected in the inventory and Overview dashboard. The financial sections also reflect the resulting earnings.',20),
  ('payments','How are my earnings calculated?','Eligible lead sales generate earnings according to the configured Lead Partner pricing and commission rules. Invalidated leads can create an earnings reversal through the existing recovery workflow.',30),
  ('payments','Where can I see my earnings?','Overview shows the financial summary, while Earnings & Withdrawals and Account > Transaction History provide detailed payout and ledger information.',40),
  ('withdrawals','How do I withdraw my earnings?','Save an active bank account or UPI destination in Account, then open Earnings & Withdrawals and submit a withdrawal request for the available eligible balance.',10),
  ('withdrawals','Is Admin verification required for my payout account?','No. A saved bank account or UPI payout destination is active immediately and can be used for eligible withdrawal requests.',20),
  ('withdrawals','Why can my balance become negative in transaction history?','Transaction History shows the signed movement of the transactions it contains. An earnings reversal or refund after a lead was invalidated can produce a negative transaction net balance even when the current withdrawable ledger balance is zero.',30),
  ('withdrawals','What happens to a pending withdrawal?','A submitted withdrawal is reserved from the available balance until it is processed or rejected. The status and processing reference are shown in Earnings & Withdrawals.',40),
  ('reports','What is the Reports page for?','Reports gives you a central view of leads reported against your Lead Partner inventory, including the report reason, review status and lead outcome.',10),
  ('reports','What do Verified Fake and Verified Genuine mean?','Verified Fake means Admin review confirmed the report’s invalid-lead outcome. Verified Genuine means the report was reviewed and the lead was not confirmed as fake.',20),
  ('reports','Will an invalidated lead appear in my financial history?','Yes. When the existing earnings-reversal workflow applies, the transaction history can show the original earning and a separate refund or reversal deduction for clarity.',30),
  ('account','How do I change my payout destination?','Open Account > Payout Account, select Bank Account or UPI Account, enter the new details and save. Saving a new destination replaces the active payout destination.',10),
  ('account','Where can I view my transaction history?','Open Account > Transaction History to review earnings, withdrawals, additions, deductions and the running signed transaction balance.',20),
  ('account','What information is stored for my account?','The Account Settings view shows the authenticated ProPulse account information available to the Lead Partner, such as name, email and account role.',30)
) AS seed(category, question, answer, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM faq_entries existing
  WHERE existing.audience='lead_partner' AND existing.question=seed.question
);