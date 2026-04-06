CREATE OR REPLACE FUNCTION public.trg_update_risk_on_course_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.client_id IS NOT NULL AND NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM update_client_risk_score(NEW.client_id);
  END IF;
  RETURN NEW;
END;
$function$;