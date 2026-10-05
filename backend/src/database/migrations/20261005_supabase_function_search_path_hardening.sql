-- Harden PostgreSQL function name resolution against mutable caller search_path.
-- This does not change function bodies, privileges, or trigger wiring.

ALTER FUNCTION public.sync_lead_buyer_capacity() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_duplicate_lead_insert() SET search_path = public, pg_temp;
ALTER FUNCTION public.propulse_sync_directory_pincode_to_city() SET search_path = public, pg_temp;
ALTER FUNCTION public.propulse_sync_city_directory_pincodes(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.propulse_sync_city_directory_pincodes_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_membership_tier_integrity() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_duplicate_lead_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_reinvestment_as_investor_payout() SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_linked_lead_investment_revenue(bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.allocate_linked_lead_purchase_revenue() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_linked_lead_revenue_owner() SET search_path = public, pg_temp;
ALTER FUNCTION public.allocate_linked_lead_investor_revenue() SET search_path = public, pg_temp;
ALTER FUNCTION public.allocate_linked_lead_revenue_on_assignment() SET search_path = public, pg_temp;
ALTER FUNCTION public.repair_linked_lead_revenue_for_purchase(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.assign_lead_to_investor_cycle() SET search_path = public, pg_temp;
ALTER FUNCTION public.maybe_close_investment_cycle() SET search_path = public, pg_temp;
ALTER FUNCTION public.lead_effective_buyer_capacity(text, integer, integer, integer, timestamp without time zone, integer) SET search_path = public, pg_temp;
