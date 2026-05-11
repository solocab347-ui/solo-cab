-- Fix critique : les chauffeurs ne pouvaient pas lire la table `clients`
-- (aucune policy SELECT correspondante). Conséquence : l'écran "Mes clients"
-- du chauffeur affichait toujours 0 client en app native (où l'utilisateur
-- n'a que le rôle 'driver', pas 'admin').
--
-- On utilise la fonction sécurisée `get_driver_id(auth.uid())` (déjà utilisée
-- par la policy équivalente sur `profiles`) pour éviter toute récursion RLS.

CREATE POLICY "Drivers can view their own clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    driver_id = public.get_driver_id(auth.uid())
    OR public.get_driver_id(auth.uid()) = ANY (driver_ids)
  );