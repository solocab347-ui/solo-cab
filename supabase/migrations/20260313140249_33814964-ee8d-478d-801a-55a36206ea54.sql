
-- Fix overly permissive RLS on driver_weekly_balances
DROP POLICY IF EXISTS "Service role manages balances" ON public.driver_weekly_balances;

-- Drivers can only read their own balances
CREATE POLICY "Drivers can view own balances"
ON public.driver_weekly_balances
FOR SELECT
TO authenticated
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- Only service role (edge functions) can insert/update/delete
CREATE POLICY "Service role manages balances insert"
ON public.driver_weekly_balances
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role manages balances update"
ON public.driver_weekly_balances
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Fix overly permissive RLS on weekly_settlements
DROP POLICY IF EXISTS "Service role manages settlements" ON public.weekly_settlements;

-- Admin can read settlements
CREATE POLICY "Admin can view settlements"
ON public.weekly_settlements
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only service role can insert/update/delete
CREATE POLICY "Service role manages settlements insert"
ON public.weekly_settlements
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role manages settlements update"
ON public.weekly_settlements
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
