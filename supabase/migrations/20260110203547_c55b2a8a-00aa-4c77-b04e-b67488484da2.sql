
-- Créer une fonction RPC pour récupérer les chauffeurs avec accès complet
-- Cette fonction remplace le filtre status = 'validated' par la logique de période de grâce
CREATE OR REPLACE FUNCTION public.get_drivers_with_full_access(
  visibility_field text DEFAULT NULL,
  limit_count integer DEFAULT 100
)
RETURNS SETOF drivers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT d.*
  FROM drivers d
  WHERE 
    -- Condition de visibilité si spécifiée
    (visibility_field IS NULL OR
     (visibility_field = 'visible_to_companies' AND d.visible_to_companies = true) OR
     (visibility_field = 'visible_to_fleet_managers' AND d.visible_to_fleet_managers = true) OR
     (visibility_field = 'visible_to_drivers' AND d.visible_to_drivers = true) OR
     (visibility_field = 'public_profile_enabled' AND d.public_profile_enabled = true))
    -- Exclure chauffeurs de flotte pour recherche publique
    AND (d.is_fleet_driver IS NOT TRUE)
    AND (d.fleet_manager_id IS NULL)
    -- Condition d'accès complet (validé OU pionnier actif OU période de grâce 30 jours)
    AND (
      d.status = 'validated'
      OR (d.is_pioneer = true AND d.free_access_end_date > NOW())
      OR (d.created_at > NOW() - INTERVAL '30 days' AND d.status IN ('pending', 'validated'))
    )
  ORDER BY d.rating DESC NULLS LAST
  LIMIT limit_count;
END;
$$;

-- Créer une vue pour les chauffeurs visibles aux entreprises avec accès complet
CREATE OR REPLACE VIEW public.drivers_visible_to_companies AS
SELECT d.*
FROM drivers d
WHERE d.visible_to_companies = true
  AND (d.is_fleet_driver IS NOT TRUE)
  AND (d.fleet_manager_id IS NULL)
  AND (
    d.status = 'validated'
    OR (d.is_pioneer = true AND d.free_access_end_date > NOW())
    OR (d.created_at > NOW() - INTERVAL '30 days' AND d.status IN ('pending', 'validated'))
  );

-- Créer une vue pour les chauffeurs visibles aux gestionnaires de flotte avec accès complet
CREATE OR REPLACE VIEW public.drivers_visible_to_fleet_managers AS
SELECT d.*
FROM drivers d
WHERE (d.visible_to_fleet_managers = true OR d.visible_to_drivers = true OR d.public_profile_enabled = true)
  AND (d.is_fleet_driver IS NOT TRUE)
  AND (d.fleet_manager_id IS NULL)
  AND (
    d.status = 'validated'
    OR (d.is_pioneer = true AND d.free_access_end_date > NOW())
    OR (d.created_at > NOW() - INTERVAL '30 days' AND d.status IN ('pending', 'validated'))
  );

-- Mettre à jour les chauffeurs existants en période de grâce pour qu'ils soient visibles par défaut
UPDATE drivers 
SET 
  visible_to_companies = COALESCE(visible_to_companies, true),
  visible_to_fleet_managers = COALESCE(visible_to_fleet_managers, true),
  visible_to_drivers = COALESCE(visible_to_drivers, true),
  public_profile_enabled = COALESCE(public_profile_enabled, true)
WHERE created_at > NOW() - INTERVAL '30 days'
  AND status = 'pending';
