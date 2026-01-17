-- Mettre à jour la fonction RPC pour utiliser driver_vehicles au lieu des colonnes de drivers
DROP FUNCTION IF EXISTS public.get_public_driver_profile_by_id(UUID);

CREATE OR REPLACE FUNCTION public.get_public_driver_profile_by_id(driver_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  company_name TEXT,
  vehicle_model TEXT,
  vehicle_brand TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  service_description TEXT,
  base_rate NUMERIC,
  per_km_rate NUMERIC,
  working_sectors TEXT[],
  vehicle_equipment TEXT[],
  services_offered TEXT[],
  vehicle_photos TEXT[],
  gallery_photos TEXT[],
  show_phone BOOLEAN,
  show_email BOOLEAN,
  show_rating_public BOOLEAN,
  display_driver_name BOOLEAN,
  display_company_name BOOLEAN,
  is_pioneer BOOLEAN,
  status TEXT,
  free_access_type TEXT,
  free_access_end_date TIMESTAMPTZ,
  contact_phone TEXT,
  contact_email TEXT,
  profile_full_name TEXT,
  profile_email TEXT,
  profile_phone TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ,
  rating NUMERIC,
  total_rides INTEGER,
  sharing_number INTEGER,
  show_phone_for_sharing BOOLEAN,
  show_rating_for_sharing BOOLEAN,
  show_rides_for_sharing BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.company_name,
    -- Utiliser le véhicule favori de driver_vehicles, sinon fallback sur drivers
    COALESCE(fv.model, d.vehicle_model) AS vehicle_model,
    COALESCE(fv.brand, d.vehicle_brand) AS vehicle_brand,
    COALESCE(fv.year, d.vehicle_year) AS vehicle_year,
    COALESCE(fv.color, d.vehicle_color) AS vehicle_color,
    d.service_description,
    d.base_rate,
    d.per_km_rate,
    d.working_sectors,
    -- Utiliser l'équipement du véhicule favori, sinon fallback sur drivers
    COALESCE(fv.equipment, d.vehicle_equipment) AS vehicle_equipment,
    d.services_offered,
    -- Utiliser les photos du véhicule favori, sinon fallback sur drivers
    COALESCE(fv.photos, d.vehicle_photos) AS vehicle_photos,
    d.gallery_photos,
    d.show_phone,
    d.show_email,
    d.show_rating_public,
    d.display_driver_name,
    d.display_company_name,
    d.is_pioneer,
    d.status::TEXT,
    d.free_access_type,
    d.free_access_end_date,
    d.contact_phone,
    d.contact_email,
    p.full_name AS profile_full_name,
    p.email AS profile_email,
    p.phone AS profile_phone,
    p.profile_photo_url AS profile_photo_url,
    d.created_at,
    COALESCE(d.rating, 5.0) AS rating,
    COALESCE(d.total_rides, 0) AS total_rides,
    d.sharing_number,
    COALESCE(d.show_phone_for_sharing, false) AS show_phone_for_sharing,
    COALESCE(d.show_rating_for_sharing, true) AS show_rating_for_sharing,
    COALESCE(d.show_rides_for_sharing, true) AS show_rides_for_sharing
  FROM drivers d
  LEFT JOIN profiles p ON p.id = d.user_id
  LEFT JOIN driver_vehicles fv ON fv.driver_id = d.id AND fv.is_favorite = true AND fv.is_active = true
  WHERE d.id = driver_id_param
    AND d.public_profile_enabled = true
    AND (
      -- Validated driver (full access)
      d.status = 'validated'
      -- OR Pioneer with active trial (any status)
      OR (
        d.is_pioneer = true 
        AND d.free_access_type = 'trial' 
        AND d.free_access_end_date > NOW()
      )
      -- OR Any new driver within 30 days of registration (grace period)
      OR (
        d.created_at > NOW() - INTERVAL '30 days'
        AND d.status IN ('pending', 'validated')
      )
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_public_driver_profile_by_id(UUID) TO anon, authenticated;

-- Créer un trigger pour synchroniser le véhicule favori vers la table drivers
CREATE OR REPLACE FUNCTION sync_favorite_vehicle_to_driver()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le véhicule devient favori, synchroniser vers drivers
  IF NEW.is_favorite = true AND NEW.is_active = true THEN
    UPDATE drivers
    SET 
      vehicle_brand = NEW.brand,
      vehicle_model = NEW.model,
      vehicle_year = NEW.year,
      vehicle_color = NEW.color,
      vehicle_equipment = NEW.equipment,
      vehicle_photos = NEW.photos
    WHERE id = NEW.driver_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS trigger_sync_favorite_vehicle ON driver_vehicles;

-- Créer le trigger
CREATE TRIGGER trigger_sync_favorite_vehicle
AFTER INSERT OR UPDATE OF is_favorite, brand, model, year, color, equipment, photos, is_active
ON driver_vehicles
FOR EACH ROW
EXECUTE FUNCTION sync_favorite_vehicle_to_driver();

-- Synchroniser immédiatement les véhicules favoris existants vers drivers
UPDATE drivers d
SET 
  vehicle_brand = fv.brand,
  vehicle_model = fv.model,
  vehicle_year = fv.year,
  vehicle_color = fv.color,
  vehicle_equipment = fv.equipment,
  vehicle_photos = fv.photos
FROM driver_vehicles fv
WHERE fv.driver_id = d.id 
  AND fv.is_favorite = true 
  AND fv.is_active = true;