-- ============================================================
-- SOLIDIFICATION DES INSCRIPTIONS - SYSTÈME CONSTANT ET SÉCURISÉ
-- ============================================================

-- Fonction sécurisée pour créer un nouveau chauffeur
-- Garantit l'atomicité et la cohérence des données
CREATE OR REPLACE FUNCTION public.create_driver_account(
  _user_id UUID,
  _license_number TEXT,
  _vehicle_model TEXT,
  _max_passengers INTEGER DEFAULT 4
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _driver_id UUID;
BEGIN
  -- Vérifier que l'utilisateur n'est pas déjà chauffeur
  IF EXISTS (SELECT 1 FROM public.drivers WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already has a driver account';
  END IF;

  -- Créer le compte chauffeur avec compteurs initialisés
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
    tva_included
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
    false   -- TVA non comprise par défaut
  )
  RETURNING id INTO _driver_id;

  -- Ajouter le rôle driver
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'driver')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _driver_id;
END;
$$;

-- Fonction sécurisée pour créer un client via QR code
-- Garantit l'association correcte au chauffeur
CREATE OR REPLACE FUNCTION public.create_client_via_qr(
  _user_id UUID,
  _qr_code_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _driver_id UUID;
  _client_id UUID;
BEGIN
  -- Vérifier que l'utilisateur n'est pas déjà client
  IF EXISTS (SELECT 1 FROM public.clients WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already has a client account';
  END IF;

  -- Récupérer le driver_id depuis le QR code valide
  SELECT driver_id INTO _driver_id
  FROM public.qr_codes
  WHERE id = _qr_code_id 
    AND is_active = true;

  -- Vérifier que le QR code existe et est actif
  IF _driver_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive QR code';
  END IF;

  -- Créer le client exclusif avec DUAL ASSOCIATION
  INSERT INTO public.clients (
    user_id,
    driver_id,           -- Association legacy
    driver_ids,          -- Association nouvelle (array)
    qr_code_id,
    is_exclusive,
    total_rides,
    total_spent
  ) VALUES (
    _user_id,
    _driver_id,          -- Driver unique pour clients exclusifs
    ARRAY[_driver_id],   -- Array contenant le driver
    _qr_code_id,
    true,                -- Client exclusif via QR
    0,
    0.0
  )
  RETURNING id INTO _client_id;

  -- Ajouter le rôle client
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Incrémenter le compteur de scans du QR code
  UPDATE public.qr_codes
  SET scans_count = COALESCE(scans_count, 0) + 1
  WHERE id = _qr_code_id;

  RETURN _client_id;
END;
$$;

-- Fonction pour vérifier l'isolation des données par chauffeur
-- Compte les clients d'un chauffeur (exclusifs ET libres via dual association)
CREATE OR REPLACE FUNCTION public.get_driver_clients_count(_driver_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.clients
  WHERE driver_id = _driver_id 
     OR _driver_id = ANY(driver_ids);
$$;

-- Fonction pour vérifier l'isolation des courses d'un chauffeur
CREATE OR REPLACE FUNCTION public.get_driver_courses_count(_driver_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.courses
  WHERE driver_id = _driver_id 
     OR _driver_id = ANY(driver_ids);
$$;

-- Fonction pour vérifier qu'un client est bien associé à un chauffeur spécifique
CREATE OR REPLACE FUNCTION public.verify_client_driver_association(
  _client_id UUID,
  _driver_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients
    WHERE id = _client_id
      AND (driver_id = _driver_id OR _driver_id = ANY(driver_ids))
  );
$$;

-- Vue pour l'isolation des données par chauffeur
-- Permet de vérifier facilement l'isolation
CREATE OR REPLACE VIEW public.driver_data_isolation AS
SELECT 
  d.id as driver_id,
  p.full_name as driver_name,
  (SELECT COUNT(*) FROM public.clients c 
   WHERE c.driver_id = d.id OR d.id = ANY(c.driver_ids)) as total_clients,
  (SELECT COUNT(*) FROM public.courses co 
   WHERE co.driver_id = d.id OR d.id = ANY(co.driver_ids)) as total_courses,
  (SELECT COUNT(*) FROM public.devis dv 
   WHERE dv.driver_id = d.id) as total_devis,
  (SELECT COUNT(*) FROM public.factures f 
   WHERE f.driver_id = d.id) as total_factures
FROM public.drivers d
JOIN public.profiles p ON p.id = d.user_id;

COMMENT ON VIEW public.driver_data_isolation IS 
'Vue pour vérifier l''isolation complète des données par chauffeur';

-- Grant permissions sur les nouvelles fonctions
GRANT EXECUTE ON FUNCTION public.create_driver_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_client_via_qr TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_clients_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_courses_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_client_driver_association TO authenticated;