
-- Supprimer l'ancienne policy trop restrictive
DROP POLICY IF EXISTS "Drivers can view their exclusive clients (dual association)" ON public.clients;

-- Créer une nouvelle policy qui permet aux chauffeurs de voir TOUS leurs clients (exclusifs ET libres)
CREATE POLICY "Drivers can view all their clients (dual association)" 
ON public.clients 
FOR SELECT 
USING (
  (driver_id = get_driver_id(auth.uid())) 
  OR 
  (get_driver_id(auth.uid()) = ANY (driver_ids))
);
