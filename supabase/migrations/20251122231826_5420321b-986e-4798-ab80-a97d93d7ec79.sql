-- Garantir que display_driver_name a une valeur par défaut de TRUE pour tous les chauffeurs
-- Cela assure que le nom du chauffeur s'affiche toujours par défaut

-- Mettre à jour les enregistrements existants où display_driver_name est NULL
UPDATE public.drivers
SET display_driver_name = true
WHERE display_driver_name IS NULL;

-- Ajouter une valeur par défaut pour les nouveaux chauffeurs
ALTER TABLE public.drivers
ALTER COLUMN display_driver_name SET DEFAULT true;

-- Mettre à jour la fonction create_driver_account pour inclure display_driver_name
CREATE OR REPLACE FUNCTION public.create_driver_account(
  _user_id uuid,
  _license_number text,
  _vehicle_model text,
  _max_passengers integer DEFAULT 4
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _driver_id UUID;
BEGIN
  -- Vérifier que l'utilisateur n'est pas déjà chauffeur
  IF EXISTS (SELECT 1 FROM public.drivers WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already has a driver account';
  END IF;

  -- Créer le compte chauffeur avec compteurs initialisés et display_driver_name à true
  INSERT INTO public.drivers (
    user_id,
    license_number,
    vehicle_model,
    max_passengers,
    status,
    quote_counter,
    invoice_counter,
    course_counter,
    subscription_paid,
    public_profile_enabled,
    tva_included,
    display_driver_name,
    display_company_name
  ) VALUES (
    _user_id,
    _license_number,
    _vehicle_model,
    _max_passengers,
    'pending',
    0,  -- Commence à 0
    0,
    0,
    false,  -- Paiement requis
    false,  -- Profil public désactivé par défaut
    false,  -- TVA non comprise par défaut
    true,   -- Nom du chauffeur affiché par défaut
    false   -- Nom de l'entreprise non affiché par défaut
  )
  RETURNING id INTO _driver_id;

  -- Ajouter le rôle driver
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'driver')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _driver_id;
END;
$function$;