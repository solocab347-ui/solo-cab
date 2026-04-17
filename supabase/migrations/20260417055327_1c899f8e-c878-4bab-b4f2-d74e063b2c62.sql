
-- Fix 1: Remove profiles from Realtime publication to stop broadcasting PII (email, phone)
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;

-- Fix 2: Restrict fleet_promotions SELECT to owners + admins only
DROP POLICY IF EXISTS "Authenticated users can view active fleet promotions" ON public.fleet_promotions;

-- Fix 3: Set immutable search_path on user-defined functions
ALTER FUNCTION public.detect_city_from_address(text) SET search_path = public;
ALTER FUNCTION public.detect_paris_address(text) SET search_path = public;
