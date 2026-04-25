-- =====================================================================
-- A1. RPC get_guest_invoice_data : payload complet pour generateUnifiedInvoicePDF
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_guest_invoice_data(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _token_uuid uuid;
  _result jsonb;
BEGIN
  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  SELECT jsonb_build_object(
    'course', jsonb_build_object(
      'id', c.id,
      'pickup_address', c.pickup_address,
      'destination_address', c.destination_address,
      'scheduled_date', c.scheduled_date,
      'passengers_count', c.passengers_count,
      'distance_km', c.distance_km,
      'duration_minutes', c.duration_minutes,
      'guest_name', c.guest_name,
      'guest_email', c.guest_email,
      'guest_phone', c.guest_phone
    ),
    'facture', CASE WHEN f.id IS NOT NULL THEN jsonb_build_object(
      'id', f.id,
      'invoice_number', f.invoice_number,
      'invoice_number_generated', f.invoice_number_generated,
      'amount', f.amount,
      'payment_method', f.payment_method,
      'payment_status', f.payment_status,
      'created_at', f.created_at,
      'tva_rate', f.tva_rate,
      'tva_amount', f.tva_amount,
      'airport_fee', f.airport_fee,
      'distance_km', f.distance_km,
      'promo_code', f.promo_code,
      'discount_amount', f.discount_amount,
      'solocab_fee_amount', f.solocab_fee_amount,
      'stripe_fee_amount', f.stripe_fee_amount,
      'total_fees_amount', f.total_fees_amount,
      'net_amount_to_driver', f.net_amount_to_driver
    ) ELSE NULL END,
    'devis', CASE WHEN dv.id IS NOT NULL THEN jsonb_build_object(
      'id', dv.id,
      'amount', dv.amount,
      'base_price', dv.base_price,
      'airport_fee', dv.airport_fee,
      'tva_rate', dv.tva_rate,
      'tva_amount', dv.tva_amount,
      'quote_number', dv.quote_number,
      'distance_price', dv.distance_price
    ) ELSE NULL END,
    'driver', jsonb_build_object(
      'company_name', d.company_name,
      'company_address', d.company_address,
      'siret', d.siret,
      'siren', d.siren,
      'tva_number', d.tva_number,
      'profiles', jsonb_build_object(
        'full_name', p.full_name,
        'email', p.email,
        'phone', p.phone
      )
    )
  )
  INTO _result
  FROM courses c
  LEFT JOIN drivers d ON d.id = c.driver_id
  LEFT JOIN profiles p ON p.id = d.user_id
  LEFT JOIN factures f ON f.course_id = c.id
  LEFT JOIN devis dv ON dv.course_id = c.id
  WHERE c.guest_tracking_token = _token_uuid
    AND c.is_guest_booking = true
  ORDER BY f.created_at DESC NULLS LAST, dv.created_at DESC NULLS LAST
  LIMIT 1;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_invoice_data(text) TO anon, authenticated;

-- =====================================================================
-- B1. Réconciliation des chauffeurs zombies (GPS périmé)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reconcile_stale_drivers()
RETURNS TABLE(reconciled_driver_id uuid, last_update timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stale AS (
    UPDATE public.drivers d
    SET driver_status = 'offline',
        is_available_now = false,
        updated_at = now()
    WHERE d.driver_status IN ('online', 'online_available')
      AND d.is_available_now = true
      AND (d.last_location_update IS NULL OR d.last_location_update < now() - interval '15 minutes')
      AND NOT EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.driver_id = d.id
          AND c.status IN ('accepted', 'driver_approaching', 'driver_arrived', 'in_progress')
      )
    RETURNING d.id, d.last_location_update
  )
  SELECT id, last_location_update FROM stale;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_stale_drivers() TO authenticated, service_role;

-- =====================================================================
-- B7. Diagnostic : un chauffeur peut-il être trouvé ?
-- =====================================================================
CREATE OR REPLACE FUNCTION public.check_driver_gps_visibility(_driver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _driver record;
  _age_seconds int;
  _is_visible_immediate boolean;
  _is_visible_reservation boolean;
BEGIN
  SELECT id, driver_status, is_available_now, last_location_update,
         current_latitude, current_longitude, public_profile_enabled
  INTO _driver
  FROM drivers
  WHERE id = _driver_id;

  IF _driver IS NULL THEN
    RETURN jsonb_build_object('error', 'driver_not_found');
  END IF;

  _age_seconds := COALESCE(EXTRACT(EPOCH FROM (now() - _driver.last_location_update))::int, 999999);

  _is_visible_immediate := _driver.public_profile_enabled = true
    AND _driver.is_available_now = true
    AND _driver.driver_status IN ('online', 'online_available')
    AND _driver.current_latitude IS NOT NULL
    AND _driver.current_longitude IS NOT NULL
    AND _age_seconds < 120;

  _is_visible_reservation := _driver.public_profile_enabled = true
    AND _driver.driver_status IN ('online', 'online_available')
    AND _driver.current_latitude IS NOT NULL
    AND _driver.current_longitude IS NOT NULL
    AND _age_seconds < 600;

  RETURN jsonb_build_object(
    'driver_id', _driver.id,
    'driver_status', _driver.driver_status,
    'is_available_now', _driver.is_available_now,
    'public_profile_enabled', _driver.public_profile_enabled,
    'has_gps_position', _driver.current_latitude IS NOT NULL,
    'gps_age_seconds', _age_seconds,
    'last_location_update', _driver.last_location_update,
    'visible_for_immediate', _is_visible_immediate,
    'visible_for_reservation', _is_visible_reservation,
    'recommendation', CASE
      WHEN NOT _driver.public_profile_enabled THEN 'Active ton profil public'
      WHEN _driver.driver_status = 'offline' THEN 'Passe en ligne'
      WHEN NOT _driver.is_available_now THEN 'Active ta disponibilité'
      WHEN _driver.current_latitude IS NULL THEN 'Aucune position GPS enregistrée — autorise la localisation'
      WHEN _age_seconds > 600 THEN 'Ta position est trop ancienne — relance l''app et vérifie les autorisations arrière-plan'
      WHEN _age_seconds > 120 THEN 'Ta position commence à dater — visible uniquement pour les réservations à l''avance'
      ELSE 'Tu es trouvable normalement'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_driver_gps_visibility(uuid) TO authenticated;