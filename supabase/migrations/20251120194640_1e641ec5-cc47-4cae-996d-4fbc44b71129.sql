
-- Permettre aux drivers de voir les profiles de leurs clients
CREATE POLICY "Drivers can view their clients profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT user_id 
    FROM public.clients 
    WHERE driver_id = get_driver_id(auth.uid())
       OR get_driver_id(auth.uid()) = ANY(driver_ids)
  )
);
