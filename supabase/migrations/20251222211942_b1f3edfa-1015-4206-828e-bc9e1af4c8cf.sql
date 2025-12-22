-- Ajouter les colonnes pour le système de partage
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS sharing_number INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS sharing_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sharing_available_since TIMESTAMP WITH TIME ZONE;

-- Créer une séquence pour les numéros de partage
CREATE SEQUENCE IF NOT EXISTS driver_sharing_number_seq START WITH 1;

-- Fonction pour générer automatiquement le numéro de partage séquentiel
CREATE OR REPLACE FUNCTION generate_sharing_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sharing_number IS NULL THEN
    NEW.sharing_number := nextval('driver_sharing_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour attribuer automatiquement un numéro lors de la création
DROP TRIGGER IF EXISTS trigger_generate_sharing_number ON public.drivers;
CREATE TRIGGER trigger_generate_sharing_number
  BEFORE INSERT ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION generate_sharing_number();

-- Mettre à jour les chauffeurs existants sans numéro
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.drivers
  WHERE sharing_number IS NULL
)
UPDATE public.drivers d
SET sharing_number = n.rn
FROM numbered n
WHERE d.id = n.id;

-- Mettre à jour la séquence pour continuer après le dernier numéro
SELECT setval('driver_sharing_number_seq', COALESCE((SELECT MAX(sharing_number) FROM public.drivers), 0) + 1);

-- Fonction pour formater le numéro de partage (SOL-0001)
CREATE OR REPLACE FUNCTION format_sharing_number(num INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'SOL-' || LPAD(num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Vue pour les chauffeurs disponibles au partage (seulement indépendants)
CREATE OR REPLACE VIEW public.drivers_available_for_sharing AS
SELECT 
  d.id,
  d.user_id,
  d.sharing_number,
  format_sharing_number(d.sharing_number) as formatted_sharing_number,
  d.working_sectors,
  d.rating,
  d.total_rides,
  d.company_name,
  d.vehicle_brand,
  d.vehicle_model,
  d.sharing_available_since,
  p.full_name,
  p.profile_photo_url,
  p.phone,
  p.email
FROM public.drivers d
JOIN public.profiles p ON d.user_id = p.id
WHERE d.sharing_available = true
  AND d.status = 'validated'
  AND d.is_fleet_driver = false
  AND d.fleet_manager_id IS NULL
  AND d.partnerships_suspended = false;

-- RLS pour la vue (lecture seule pour les chauffeurs)
DROP POLICY IF EXISTS "Drivers can view available sharing partners" ON public.drivers;

-- Fonction RPC pour rechercher des chauffeurs disponibles
CREATE OR REPLACE FUNCTION search_available_partners(
  _driver_id UUID,
  _department TEXT DEFAULT NULL,
  _city TEXT DEFAULT NULL,
  _min_rating NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  sharing_number INTEGER,
  formatted_sharing_number TEXT,
  working_sectors TEXT[],
  rating NUMERIC,
  total_rides INTEGER,
  company_name TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  full_name TEXT,
  profile_photo_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.sharing_number,
    format_sharing_number(d.sharing_number) as formatted_sharing_number,
    d.working_sectors,
    d.rating,
    d.total_rides,
    d.company_name,
    d.vehicle_brand,
    d.vehicle_model,
    p.full_name,
    p.profile_photo_url
  FROM public.drivers d
  JOIN public.profiles p ON d.user_id = p.id
  WHERE d.sharing_available = true
    AND d.status = 'validated'
    AND d.is_fleet_driver = false
    AND d.fleet_manager_id IS NULL
    AND d.partnerships_suspended = false
    AND d.id != _driver_id
    AND (
      _department IS NULL 
      OR EXISTS (
        SELECT 1 FROM unnest(d.working_sectors) AS sector 
        WHERE sector ILIKE '%' || _department || '%'
      )
    )
    AND (
      _city IS NULL 
      OR EXISTS (
        SELECT 1 FROM unnest(d.working_sectors) AS sector 
        WHERE sector ILIKE '%' || _city || '%'
      )
    )
    AND (_min_rating IS NULL OR d.rating >= _min_rating)
  ORDER BY d.rating DESC NULLS LAST, d.total_rides DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour rechercher par numéro de partage
CREATE OR REPLACE FUNCTION find_driver_by_sharing_number(_number TEXT)
RETURNS TABLE (
  id UUID,
  sharing_number INTEGER,
  formatted_sharing_number TEXT,
  full_name TEXT,
  company_name TEXT,
  profile_photo_url TEXT,
  rating NUMERIC,
  total_rides INTEGER,
  is_available BOOLEAN
) AS $$
DECLARE
  num_only INTEGER;
BEGIN
  -- Extraire le numéro de la chaîne (SOL-0001 -> 1)
  num_only := NULLIF(regexp_replace(_number, '[^0-9]', '', 'g'), '')::INTEGER;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.sharing_number,
    format_sharing_number(d.sharing_number) as formatted_sharing_number,
    p.full_name,
    d.company_name,
    p.profile_photo_url,
    d.rating,
    d.total_rides,
    d.sharing_available as is_available
  FROM public.drivers d
  JOIN public.profiles p ON d.user_id = p.id
  WHERE d.sharing_number = num_only
    AND d.status = 'validated'
    AND d.is_fleet_driver = false
    AND d.fleet_manager_id IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;