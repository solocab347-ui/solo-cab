-- FIX: Mettre à jour la politique sur driver_vehicles pour inclure pionniers et période de grâce

DROP POLICY IF EXISTS "Public can view vehicles of public profile drivers" ON driver_vehicles;

CREATE POLICY "Public can view vehicles of public profile drivers" ON driver_vehicles
FOR SELECT
TO public
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM drivers d
    WHERE d.id = driver_vehicles.driver_id
    AND d.public_profile_enabled = true
    AND (
      -- Chauffeurs validés
      d.status = 'validated'
      -- OU Pionniers avec essai actif
      OR (d.is_pioneer = true AND d.free_access_end_date > now())
      -- OU Chauffeurs en période de grâce 30 jours
      OR (d.created_at > (now() - interval '30 days') AND d.status IN ('pending', 'validated'))
    )
  )
);