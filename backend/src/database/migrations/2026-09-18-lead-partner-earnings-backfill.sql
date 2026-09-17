-- This migration is intentionally self-contained because migration files are applied
-- lexicographically. The backfill filename sorts before the ledger filename.
-- Create the ledger first, then backfill existing paid/refunded partner purchases.
CREATE TABLE IF NOT EXISTS lead_partner_earnings (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES lead_partners(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  lead_purchase_id INTEGER NOT NULL REFERENCES lead_purchases(id) ON DELETE RESTRICT,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  gross_sale_amount NUMERIC(12,2) NOT NULL CHECK (gross_sale_amount >= 0),
  commission_percent NUMERIC(7,4) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  earning_amount NUMERIC(12,2) NOT NULL CHECK (earning_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','paid','reversed')),
  payout_id INTEGER,
  reversal_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (lead_purchase_id)
);

INSERT INTO lead_partner_earnings
  (partner_id,user_id,lead_id,lead_purchase_id,payment_id,gross_sale_amount,commission_percent,earning_amount,status)
SELECT l.lead_partner_id,
       buyer.user_id,
       p.lead_id,
       p.id,
       p.payment_id,
       p.amount,
       COALESCE(s.commission_percent,5),
       ROUND(p.amount * COALESCE(s.commission_percent,5) / 100.0, 2),
       CASE WHEN p.status='refunded' OR l.status='invalid' THEN 'reversed' ELSE 'available' END
FROM lead_purchases p
JOIN leads l ON l.id=p.lead_id AND l.lead_partner_id IS NOT NULL
JOIN users buyer ON buyer.id=p.user_id
JOIN lead_partners partner ON partner.id=l.lead_partner_id
LEFT JOIN lead_partner_settings s ON s.id=1
WHERE p.status IN ('paid','refunded')
ON CONFLICT (lead_purchase_id) DO NOTHING;
