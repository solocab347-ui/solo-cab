
-- Migration pour des numéros de partage aléatoires mais cohérents
-- Format: 6 chiffres aléatoires (100000-999999) pour éviter la prédictibilité

-- 1. Mettre à jour la fonction de génération
CREATE OR REPLACE FUNCTION public.generate_sharing_number()
RETURNS TRIGGER AS $$
DECLARE
  new_number INTEGER;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  -- Si le numéro est déjà défini, ne pas le changer
  IF NEW.sharing_number IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Générer un numéro aléatoire unique à 6 chiffres
  LOOP
    -- Générer un nombre entre 100000 et 999999
    new_number := 100000 + floor(random() * 900000)::INTEGER;
    
    -- Vérifier l'unicité
    IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE sharing_number = new_number) THEN
      NEW.sharing_number := new_number;
      EXIT;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      -- En dernier recours, utiliser timestamp + random
      new_number := (EXTRACT(EPOCH FROM NOW())::BIGINT % 900000 + 100000)::INTEGER + floor(random() * 1000)::INTEGER;
      NEW.sharing_number := new_number;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Mettre à jour la fonction de formatage pour 6 chiffres
CREATE OR REPLACE FUNCTION public.format_sharing_number(num INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF num IS NULL THEN
    RETURN NULL;
  END IF;
  -- Format: SOL-XXXXXX (6 chiffres)
  RETURN 'SOL-' || LPAD(num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- 3. Mettre à jour les chauffeurs existants avec des numéros aléatoires
-- (On ne touche qu'aux numéros séquentiels < 1000 pour les convertir)
DO $$
DECLARE
  driver_record RECORD;
  new_number INTEGER;
  attempts INTEGER;
BEGIN
  FOR driver_record IN 
    SELECT id, sharing_number 
    FROM public.drivers 
    WHERE sharing_number IS NOT NULL AND sharing_number < 1000
    ORDER BY created_at
  LOOP
    attempts := 0;
    LOOP
      new_number := 100000 + floor(random() * 900000)::INTEGER;
      
      IF NOT EXISTS (
        SELECT 1 FROM public.drivers 
        WHERE sharing_number = new_number AND id != driver_record.id
      ) THEN
        UPDATE public.drivers 
        SET sharing_number = new_number 
        WHERE id = driver_record.id;
        EXIT;
      END IF;
      
      attempts := attempts + 1;
      IF attempts >= 100 THEN
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 4. Recréer la vue drivers_available_for_sharing avec les bonnes colonnes
DROP VIEW IF EXISTS public.drivers_available_for_sharing;

CREATE OR REPLACE VIEW public.drivers_available_for_sharing AS
SELECT 
  d.id,
  d.user_id,
  d.sharing_number,
  d.working_sectors,
  d.rating,
  d.total_rides,
  d.company_name,
  d.show_phone_for_sharing,
  d.partnerships_suspended,
  p.full_name,
  p.profile_photo_url,
  p.phone
FROM public.drivers d
JOIN public.profiles p ON d.user_id = p.id
WHERE d.status = 'validated'
  AND d.is_fleet_driver = false
  AND (d.partnerships_suspended = false OR d.partnerships_suspended IS NULL)
  AND d.sharing_number IS NOT NULL;

-- 5. Mettre à jour la fonction de recherche
DROP FUNCTION IF EXISTS public.find_driver_by_sharing_number(_number TEXT);

CREATE OR REPLACE FUNCTION public.find_driver_by_sharing_number(_number TEXT)
RETURNS TABLE (
  id UUID,
  sharing_number INTEGER,
  formatted_sharing_number TEXT,
  full_name TEXT,
  company_name TEXT,
  profile_photo_url TEXT,
  rating NUMERIC,
  total_rides INTEGER,
  phone TEXT
) AS $$
DECLARE
  num_only INTEGER;
BEGIN
  -- Extraire le numéro (supporte SOL-XXXXXX ou juste XXXXXX)
  num_only := REGEXP_REPLACE(_number, '[^0-9]', '', 'g')::INTEGER;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.sharing_number,
    public.format_sharing_number(d.sharing_number) as formatted_sharing_number,
    p.full_name,
    d.company_name,
    p.profile_photo_url,
    d.rating,
    d.total_rides,
    CASE WHEN d.show_phone_for_sharing THEN p.phone ELSE NULL END as phone
  FROM public.drivers d
  JOIN public.profiles p ON d.user_id = p.id
  WHERE d.sharing_number = num_only
    AND d.status = 'validated'
    AND d.is_fleet_driver = false
    AND (d.partnerships_suspended = false OR d.partnerships_suspended IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
