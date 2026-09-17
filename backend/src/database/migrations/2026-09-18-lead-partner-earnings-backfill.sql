INSERT INTO lead_partner_earnings
  (partner_id,user_id,lead_id,lead_purchase_id,payment_id,gross_sale_amount,commission_percent,earning_amount,status)
SELECT l.lead_partner_id,
       lp.user_id,
       p.lead_id,
       p.id,
       p.payment_id,
       p.amount,
       COALESCE(s.commission_percent,5),
       ROUND(p.amount * COALESCE(s.commission_percent,5) / 100.0, 2),
       CASE WHEN p.status='refunded' OR l.status='invalid' THEN 'reversed' ELSE 'available' END
FROM lead_purchases p
JOIN leads l ON l.id=p.lead_id AND l.lead_partner_id IS NOT NULL
JOIN lead_partners partner ON partner.id=l.lead_partner_id
LEFT JOIN lead_partner_settings s ON s.id=1
WHERE p.status IN ('paid','refunded')
ON CONFLICT (lead_purchase_id) DO NOTHING;
