-- CORRECTION CRITIQUE: Simplifier et fiabiliser la policy RLS pour la création de courses par les chauffeurs
-- La policy actuelle a une sous-requête complexe qui peut échouer

-- 1. Supprimer l'ancienne policy problématique
DROP POLICY IF EXISTS "Drivers can create courses for their clients" ON public.courses;

-- 2. Créer une nouvelle policy simplifiée et robuste
CREATE POLICY "Drivers can create courses for their clients" 
ON public.courses 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Le driver_id doit appartenir à l'utilisateur connecté
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  AND
  -- Le client doit être associé au driver (via driver_id OU driver_ids)
  EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.id = client_id 
    AND (
      c.driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
      OR
      (SELECT id FROM drivers WHERE user_id = auth.uid()) = ANY(c.driver_ids)
    )
  )
);

-- 3. Ajouter aussi un commentaire pour documentation
COMMENT ON POLICY "Drivers can create courses for their clients" ON public.courses IS 
'Permet aux chauffeurs de créer des courses pour leurs clients associés (dual association driver_id et driver_ids)';