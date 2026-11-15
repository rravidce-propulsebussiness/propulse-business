-- 20261005_supabase_function_search_path_hardening pinned search_path on these two
-- trigger functions, but later intake migrations recreated them with CREATE OR REPLACE,
-- which drops the setting. Pin it again (Supabase advisor: function_search_path_mutable).
-- Bodies, privileges and trigger wiring are unchanged.
ALTER FUNCTION public.prevent_duplicate_lead_insert() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_duplicate_lead_change() SET search_path = public, pg_temp;
