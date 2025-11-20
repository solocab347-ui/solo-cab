-- Correction 1: Ajouter contrainte UNIQUE sur qr_codes.driver_id
-- Un driver ne peut avoir qu'un seul QR code
ALTER TABLE public.qr_codes
DROP CONSTRAINT IF EXISTS qr_codes_driver_id_unique;

ALTER TABLE public.qr_codes
ADD CONSTRAINT qr_codes_driver_id_unique UNIQUE (driver_id);

COMMENT ON CONSTRAINT qr_codes_driver_id_unique ON public.qr_codes 
IS 'Un chauffeur ne peut avoir qu''un seul QR code actif';

-- Correction 2: Ajouter contrainte UNIQUE sur factures.devis_id
-- Un devis ne peut générer qu'une seule facture
ALTER TABLE public.factures
DROP CONSTRAINT IF EXISTS factures_devis_id_unique;

ALTER TABLE public.factures
ADD CONSTRAINT factures_devis_id_unique UNIQUE (devis_id);

COMMENT ON CONSTRAINT factures_devis_id_unique ON public.factures 
IS 'Un devis ne peut générer qu''une seule facture';

-- Correction 3: Ajouter trigger pour génération automatique des devis après création de course
CREATE OR REPLACE FUNCTION public.auto_generate_devis_after_course()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver_id UUID;
BEGIN
  -- Récupérer le driver_id depuis la course nouvellement créée
  _driver_id := NEW.driver_id;
  
  -- Si pas de driver_id assigné, sortir
  IF _driver_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Appeler la edge function pour créer le devis automatiquement
  -- Note: Ceci sera fait via un webhook/edge function call depuis le frontend
  -- car les triggers ne peuvent pas faire d'appels HTTP directs
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_generate_devis_after_course() 
IS 'Trigger function appelée après création d''une course pour générer automatiquement un devis';

-- Note: Le trigger lui-même sera géré au niveau application
-- car PostgreSQL ne peut pas appeler directement des edge functions
-- La génération automatique doit être faite dans CreateCourse.tsx après insertion