
-- 1. TRIGGER: Auto-assigner favorite_driver_id pour les clients exclusifs lors de la création
-- Ce trigger s'exécute après INSERT sur la table clients

CREATE OR REPLACE FUNCTION public.auto_assign_favorite_driver()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le client est exclusif et a un driver_id mais pas de favorite_driver_id
  IF NEW.is_exclusive = true AND NEW.favorite_driver_id IS NULL THEN
    -- Priorité 1: Utiliser driver_id s'il existe
    IF NEW.driver_id IS NOT NULL THEN
      NEW.favorite_driver_id := NEW.driver_id;
    -- Priorité 2: Utiliser le QR code pour trouver le chauffeur
    ELSIF NEW.qr_code_id IS NOT NULL THEN
      SELECT driver_id INTO NEW.favorite_driver_id
      FROM qr_codes
      WHERE id = NEW.qr_code_id;
    -- Priorité 3: Prendre le premier chauffeur de driver_ids s'il existe
    ELSIF NEW.driver_ids IS NOT NULL AND array_length(NEW.driver_ids, 1) > 0 THEN
      NEW.favorite_driver_id := NEW.driver_ids[1];
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS auto_assign_favorite_driver_trigger ON public.clients;

-- Créer le trigger
CREATE TRIGGER auto_assign_favorite_driver_trigger
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_favorite_driver();

-- 2. CORRECTION IMMÉDIATE: Mettre à jour les clients existants qui n'ont pas de favorite_driver_id
UPDATE public.clients
SET favorite_driver_id = COALESCE(
  driver_id,
  (SELECT driver_id FROM qr_codes WHERE id = clients.qr_code_id),
  (CASE WHEN driver_ids IS NOT NULL AND array_length(driver_ids, 1) > 0 THEN driver_ids[1] ELSE NULL END)
)
WHERE is_exclusive = true 
  AND favorite_driver_id IS NULL
  AND (driver_id IS NOT NULL OR qr_code_id IS NOT NULL OR (driver_ids IS NOT NULL AND array_length(driver_ids, 1) > 0));

-- 3. Améliorer le calcul TVA dans la table devis - s'assurer que tva_rate et tva_amount sont toujours calculés
ALTER TABLE public.devis 
  ALTER COLUMN tva_rate SET DEFAULT 10,
  ALTER COLUMN tva_amount SET DEFAULT 0;

-- 4. Ajouter une contrainte NOT NULL sur guest_email pour les guest bookings (via trigger)
CREATE OR REPLACE FUNCTION public.validate_guest_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Pour les réservations invités, l'email est obligatoire
  IF NEW.is_guest_booking = true THEN
    IF NEW.guest_email IS NULL OR NEW.guest_email = '' THEN
      RAISE EXCEPTION 'L''email est obligatoire pour les réservations invités';
    END IF;
    
    -- Validation format email basique
    IF NEW.guest_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Format d''email invalide pour la réservation invité';
    END IF;
    
    IF NEW.guest_name IS NULL OR NEW.guest_name = '' THEN
      RAISE EXCEPTION 'Le nom est obligatoire pour les réservations invités';
    END IF;
    
    IF NEW.guest_phone IS NULL OR NEW.guest_phone = '' THEN
      RAISE EXCEPTION 'Le téléphone est obligatoire pour les réservations invités';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS validate_guest_booking_trigger ON public.courses;

-- Créer le trigger de validation
CREATE TRIGGER validate_guest_booking_trigger
  BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_guest_booking();

-- 5. Fonction pour calculer et mettre à jour la TVA sur les devis existants
CREATE OR REPLACE FUNCTION public.update_devis_tva()
RETURNS void AS $$
BEGIN
  -- Mettre à jour les devis qui n'ont pas de tva_rate défini
  UPDATE public.devis
  SET 
    tva_rate = CASE 
      WHEN time_price > 0 AND (distance_price IS NULL OR distance_price = 0) THEN 20 -- Mise à disposition
      ELSE 10 -- Course classique
    END,
    tva_amount = amount - (amount / (1 + CASE 
      WHEN time_price > 0 AND (distance_price IS NULL OR distance_price = 0) THEN 0.2
      ELSE 0.1
    END))
  WHERE tva_rate IS NULL OR tva_amount IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Exécuter la mise à jour
SELECT public.update_devis_tva();
