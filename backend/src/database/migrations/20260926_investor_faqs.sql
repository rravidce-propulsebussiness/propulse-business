INSERT INTO faq_entries (audience,category,question,answer,sort_order,is_active)
SELECT v.audience,v.category,v.question,v.answer,v.sort_order,TRUE
FROM (VALUES
 ('investor','general','What is an investment cycle?','Each investment cycle is a separate accounting period. New funds added while a cycle is open stay in that cycle. When the cycle closes, the next real investment starts a fresh cycle.',10),
 ('investor','general','How does Auto-Invest work?','With Auto-Invest ON, eligible investor earnings can be consumed by future advertising. The available-for-ads amount is based on the current cycle ledger.',20),
 ('investor','general','When can I withdraw earnings?','Only realized investor earnings are withdrawable. Your invested principal is never treated as withdrawable. Pending withdrawal requests reserve the requested amount until they are paid or rejected.',30),
 ('investor','general','What happens when a lead is shared?','A lead can be sold as one or more shares up to its buyer capacity. History shows unique leads, single-share sales, shared sales, total shares, gross sale value and your investor earnings separately.',40),
 ('investor','general','Are previous cycles mixed with the current cycle?','No. Current-cycle balances and activity are kept separate from closed-cycle history so investment, ad spend, revenue and withdrawals are not combined.',50),
 ('investor','general','What happens during final exit?','Final exit stops new lead assignment for the cycle. Existing leads can finish resolving, after which the cycle can close.',60)
) AS v(audience,category,question,answer,sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM faq_entries f
  WHERE f.audience=v.audience AND f.question=v.question
);
