-- PARTIE 2: VITRINE PUBLIQUE - Ajouter champs pour profils publics

-- 1. Ajouter champs pour profils publics des chauffeurs
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS working_sectors TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS service_description TEXT,
ADD COLUMN IF NOT EXISTS base_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS per_km_rate DECIMAL(10, 2);

-- 2. Créer index pour recherche géographique
CREATE INDEX IF NOT EXISTS idx_drivers_public_profile ON public.drivers(public_profile_enabled) WHERE public_profile_enabled = true;
CREATE INDEX IF NOT EXISTS idx_drivers_working_sectors ON public.drivers USING GIN(working_sectors);

-- 3. RLS Policy : Tout le monde peut voir les profils publics des chauffeurs
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.drivers FOR SELECT
  USING (public_profile_enabled = true);

-- 4. Policy : Les clients libres peuvent voir tous les chauffeurs publics
CREATE POLICY "Free clients can view all public drivers"
  ON public.drivers FOR SELECT
  USING (
    public_profile_enabled = true AND
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE user_id = auth.uid() AND is_exclusive = false
    )
  );

-- 5. Ajouter commentaires pour documentation
COMMENT ON COLUMN public.drivers.public_profile_enabled IS 'Si true, le chauffeur apparaît sur la vitrine publique';
COMMENT ON COLUMN public.drivers.working_sectors IS 'Secteurs géographiques où le chauffeur opère (villes, départements)';
COMMENT ON COLUMN public.clients.is_exclusive IS 'Si true: client exclusif (1 chauffeur via QR). Si false: client libre (multiple chauffeurs via vitrine)';

-- 6. Fonction pour rechercher chauffeurs publics par secteur
CREATE OR REPLACE FUNCTION public.search_public_drivers(
  _search_term TEXT DEFAULT NULL,
  _sector TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  vehicle_model TEXT,
  bio TEXT,
  rating DECIMAL,
  total_rides INTEGER,
  working_sectors TEXT[],
  service_description TEXT,
  base_rate DECIMAL,
  per_km_rate DECIMAL,
  profile_photo_url TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
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
    d.base_rate,
    d.per_km_rate,
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
  ORDER BY d.rating DESC, d.total_rides DESC
$$;