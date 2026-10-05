-- propulse:no-transaction
-- Remove exact duplicate indexes reported by Supabase's performance advisor.
-- Keep the canonical index names referenced by current migrations/tests.

DROP INDEX CONCURRENTLY IF EXISTS public.idx_leads_created_at;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_payments_created_at;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_wallet_topups_review_queue;
DROP INDEX CONCURRENTLY IF EXISTS public.uq_wallet_refund_payment;
