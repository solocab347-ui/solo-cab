-- ============================================================================
-- CORRECTION FONCTION search_public_drivers - Retirer tarifs sensibles
-- ============================================================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.search_public_drivers(text, text);

-- Recréer sans les tarifs (base_rate, per_km_rate)
CREATE OR REPLACE FUNCTION public.search_public_drivers(
  _search_term text DEFAULT NULL,
  _sector text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  vehicle_model text,
  bio text,
  rating numeric,
  total_rides integer,
  working_sectors text[],
  service_description text,
  profile_photo_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id,
    p.full_name,
    d.vehicle_model,
    d.bio,
    d.rating,
    d.total_rides,
    d.working_sectors,
    d.service_description,
    p.profile_photo_url
  FROM public.drivers d
  JOIN public.profiles p ON d.user_id = p.id
  WHERE 
    d.public_profile_enabled = true 
    AND d.status = 'validated'
    AND (
      _search_term IS NULL 
      OR p.full_name ILIKE '%' || _search_term || '%'
      OR d.vehicle_model ILIKE '%' || _search_term || '%'
      OR d.bio ILIKE '%' || _search_term || '%'
    )
    AND (
      _sector IS NULL 
      OR _sector = ANY(d.working_sectors)
    )
  ORDER BY d.rating DESC, d.total_rides DESC;
$$;

COMMENT ON FUNCTION search_public_drivers IS 
'Fonction publique sécurisée de recherche de chauffeurs. Exclut les données sensibles (tarifs).';