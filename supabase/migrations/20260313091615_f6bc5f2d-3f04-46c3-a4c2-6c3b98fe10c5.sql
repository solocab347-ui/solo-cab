
-- Fix: set search_path on calculate_sharing_commission
CREATE OR REPLACE FUNCTION public.calculate_sharing_commission(course_amount_cents INTEGER)
RETURNS TABLE(commission_percentage NUMERIC, commission_cents INTEGER, receiver_cents INTEGER, solocab_fee_cents INTEGER)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
BEGIN
  IF course_amount_cents < 3000 THEN
    commission_percentage := 15;
  ELSE
    commission_percentage := 20;
  END IF;
  
  commission_cents := ROUND(course_amount_cents * commission_percentage / 100);
  solocab_fee_cents := 10;
  receiver_cents := course_amount_cents - commission_cents - solocab_fee_cents;
  
  RETURN NEXT;
END;
$$;
