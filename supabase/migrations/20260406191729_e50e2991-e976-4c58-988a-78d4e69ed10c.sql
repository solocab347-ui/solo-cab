
CREATE OR REPLACE FUNCTION public.increment_driver_fees_balance(p_driver_id UUID, p_amount INTEGER)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE drivers
  SET fees_balance_cents = GREATEST(0, fees_balance_cents + p_amount)
  WHERE id = p_driver_id;
$$;
