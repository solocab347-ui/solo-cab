-- Drop legacy trigger that references removed table fleet_driver_partnerships
DROP TRIGGER IF EXISTS record_partnership_commission_trigger ON public.courses;

-- Replace the function with a safe no-op so any other callers don't crash
CREATE OR REPLACE FUNCTION public.record_partnership_course_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Legacy fleet_driver_partnerships model removed. No-op kept for compatibility.
  RETURN NEW;
END;
$function$;