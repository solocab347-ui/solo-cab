
-- ============================================================
-- ÉTAPE 1 : SUPPRESSIONS — ANCIEN MODÈLE
-- ============================================================
DROP FUNCTION IF EXISTS public.generate_partner_invoices() CASCADE;
DROP FUNCTION IF EXISTS public.generate_partner_order_document(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_partnership_balance(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_partnership_disputes() CASCADE;
DROP FUNCTION IF EXISTS public.record_partnership_course_commission(uuid, numeric, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.notify_partnership_request() CASCADE;
DROP FUNCTION IF EXISTS public.notify_partnership_response() CASCADE;
DROP FUNCTION IF EXISTS public.generate_partner_reference_number(uuid) CASCADE;

DROP FUNCTION IF EXISTS public.find_nearest_available_fleet_partner(double precision, double precision, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.find_nearest_available_fleet_partner(double precision, double precision) CASCADE;
DROP FUNCTION IF EXISTS public.mark_fleet_partner_commission_paid(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.record_fleet_partner_commission(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.sync_fleet_partner_course_status() CASCADE;
DROP FUNCTION IF EXISTS public.is_fleet_course_shared_locked(uuid) CASCADE;

DROP VIEW IF EXISTS public.driver_partnership_balances CASCADE;
DROP VIEW IF EXISTS public.driver_partner_courses_view CASCADE;
DROP VIEW IF EXISTS public.available_partner_courses CASCADE;

DROP TABLE IF EXISTS public.partnership_disputes CASCADE;
DROP TABLE IF EXISTS public.partnership_course_commissions CASCADE;
DROP TABLE IF EXISTS public.partnership_settlements CASCADE;
DROP TABLE IF EXISTS public.partnership_balances CASCADE;
DROP TABLE IF EXISTS public.partner_payments CASCADE;
DROP TABLE IF EXISTS public.partner_invoices CASCADE;
DROP TABLE IF EXISTS public.partner_order_documents CASCADE;
DROP TABLE IF EXISTS public.driver_partnerships CASCADE;

DROP TABLE IF EXISTS public.fleet_partnership_payments CASCADE;
DROP TABLE IF EXISTS public.fleet_partner_courses CASCADE;
DROP TABLE IF EXISTS public.fleet_driver_partnerships CASCADE;

DROP FUNCTION IF EXISTS public.claim_pooled_course(uuid, uuid) CASCADE;

-- ============================================================
-- ÉTAPE 2 : RENFORCER LE NOUVEAU MODÈLE
-- ============================================================
ALTER TABLE public.partner_course_pool
  DROP CONSTRAINT IF EXISTS partner_course_pool_commission_range;
ALTER TABLE public.partner_course_pool
  ADD CONSTRAINT partner_course_pool_commission_range
  CHECK (commission_percentage >= 20 AND commission_percentage <= 25);

ALTER TABLE public.shared_courses
  DROP CONSTRAINT IF EXISTS shared_courses_commission_range;
ALTER TABLE public.shared_courses
  ADD CONSTRAINT shared_courses_commission_range
  CHECK (commission_percentage IS NULL OR (commission_percentage >= 20 AND commission_percentage <= 25));

ALTER TABLE public.partner_course_pool
  ADD COLUMN IF NOT EXISTS rebroadcast_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_rebroadcast_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS favorites_only_until TIMESTAMPTZ;

ALTER TABLE public.shared_courses
  ADD COLUMN IF NOT EXISTS pool_id UUID REFERENCES public.partner_course_pool(id) ON DELETE SET NULL;

-- Trigger : bloquer cash dans le pool
CREATE OR REPLACE FUNCTION public.enforce_no_cash_in_pool()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_method TEXT;
BEGIN
  SELECT payment_method INTO v_payment_method FROM courses WHERE id = NEW.course_id;
  IF v_payment_method IS NOT NULL AND lower(v_payment_method) IN ('cash', 'especes', 'espèces') THEN
    RAISE EXCEPTION 'Les courses payées en espèces ne peuvent pas être partagées (carte uniquement via Stripe).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_no_cash_in_pool ON public.partner_course_pool;
CREATE TRIGGER trg_enforce_no_cash_in_pool
  BEFORE INSERT OR UPDATE OF course_id ON public.partner_course_pool
  FOR EACH ROW EXECUTE FUNCTION public.enforce_no_cash_in_pool();

CREATE OR REPLACE FUNCTION public.enforce_no_cash_in_shared()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_method TEXT;
BEGIN
  SELECT payment_method INTO v_payment_method FROM courses WHERE id = NEW.course_id;
  IF v_payment_method IS NOT NULL AND lower(v_payment_method) IN ('cash', 'especes', 'espèces') THEN
    RAISE EXCEPTION 'Les courses payées en espèces ne peuvent pas être partagées (carte uniquement via Stripe).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_no_cash_in_shared ON public.shared_courses;
CREATE TRIGGER trg_enforce_no_cash_in_shared
  BEFORE INSERT ON public.shared_courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_no_cash_in_shared();

-- Trigger : Premium requis pour publier
CREATE OR REPLACE FUNCTION public.enforce_premium_to_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium BOOLEAN;
BEGIN
  SELECT 
    (
      (free_access_granted = TRUE AND free_access_type IN ('unlimited', 'administrative'))
      OR
      (subscription_tier = 'premium' AND subscription_paid = TRUE AND subscription_status = 'active')
    )
  INTO v_is_premium
  FROM drivers
  WHERE id = NEW.sender_driver_id;

  IF NOT COALESCE(v_is_premium, FALSE) THEN
    RAISE EXCEPTION 'Seuls les chauffeurs Premium peuvent partager des courses au réseau de partenariat.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_premium_pool ON public.partner_course_pool;
CREATE TRIGGER trg_enforce_premium_pool
  BEFORE INSERT ON public.partner_course_pool
  FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_to_share();

DROP TRIGGER IF EXISTS trg_enforce_premium_shared ON public.shared_courses;
CREATE TRIGGER trg_enforce_premium_shared
  BEFORE INSERT ON public.shared_courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_to_share();

-- ============================================================
-- ÉTAPE 3 : RPC publication
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_course_to_pool(
  p_course_id UUID,
  p_sender_driver_id UUID,
  p_commission_percentage NUMERIC DEFAULT 20,
  p_target_favorite_ids UUID[] DEFAULT NULL,
  p_also_broadcast_network BOOLEAN DEFAULT TRUE,
  p_favorites_window_minutes INTEGER DEFAULT 5,
  p_message TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, pool_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course RECORD;
  v_pool_id UUID;
  v_scope TEXT;
  v_favorites_until TIMESTAMPTZ;
  v_estimated_commission NUMERIC;
  v_solocab_fee_cents INTEGER := 50;
  v_sender_user_id UUID;
BEGIN
  IF p_commission_percentage < 20 OR p_commission_percentage > 25 THEN
    RETURN QUERY SELECT FALSE, 'La commission doit être comprise entre 20 % et 25 %', NULL::UUID;
    RETURN;
  END IF;

  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  IF v_course IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Course introuvable', NULL::UUID;
    RETURN;
  END IF;

  IF lower(COALESCE(v_course.payment_method, '')) IN ('cash', 'especes', 'espèces') THEN
    RETURN QUERY SELECT FALSE, 'Les courses en espèces ne peuvent pas être partagées', NULL::UUID;
    RETURN;
  END IF;

  SELECT user_id INTO v_sender_user_id FROM drivers WHERE id = p_sender_driver_id;
  IF v_course.driver_id != p_sender_driver_id AND COALESCE(v_course.created_by, '00000000-0000-0000-0000-000000000000'::uuid) != COALESCE(v_sender_user_id, '00000000-0000-0000-0000-000000000001'::uuid) THEN
    RETURN QUERY SELECT FALSE, 'Vous ne pouvez pas partager une course qui ne vous appartient pas', NULL::UUID;
    RETURN;
  END IF;

  IF p_target_favorite_ids IS NOT NULL AND array_length(p_target_favorite_ids, 1) > 0 THEN
    v_scope := CASE WHEN p_also_broadcast_network THEN 'favorites_then_network' ELSE 'favorites' END;
    v_favorites_until := now() + (p_favorites_window_minutes || ' minutes')::INTERVAL;
  ELSE
    v_scope := 'network';
    v_favorites_until := NULL;
  END IF;

  v_estimated_commission := ROUND(COALESCE(v_course.final_price, v_course.price_estimate, 0) * p_commission_percentage / 100, 2);

  INSERT INTO partner_course_pool (
    course_id, sender_driver_id, course_amount, commission_percentage,
    estimated_commission, message, status, expires_at, sharing_scope,
    target_driver_ids, solocab_fee_cents, favorites_only_until,
    pickup_latitude, pickup_longitude, pickup_city
  ) VALUES (
    p_course_id, p_sender_driver_id,
    COALESCE(v_course.final_price, v_course.price_estimate, 0),
    p_commission_percentage, v_estimated_commission, p_message,
    'available',
    COALESCE(v_course.scheduled_date, now() + INTERVAL '24 hours'),
    v_scope, p_target_favorite_ids, v_solocab_fee_cents, v_favorites_until,
    v_course.pickup_latitude, v_course.pickup_longitude, v_course.pickup_city
  )
  RETURNING id INTO v_pool_id;

  RETURN QUERY SELECT TRUE, 'Course publiée avec succès', v_pool_id;
END;
$$;

-- ============================================================
-- ÉTAPE 4 : RPC réclamer
-- ============================================================
DROP FUNCTION IF EXISTS public.claim_pool_course(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.claim_pool_course(
  p_pool_id UUID,
  p_claimer_driver_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, course_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool RECORD;
  v_claimer RECORD;
BEGIN
  SELECT * INTO v_pool FROM partner_course_pool WHERE id = p_pool_id FOR UPDATE NOWAIT;
  IF v_pool IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Course introuvable', NULL::UUID;
    RETURN;
  END IF;

  IF v_pool.status != 'available' THEN
    RETURN QUERY SELECT FALSE, 'Cette course n''est plus disponible', NULL::UUID;
    RETURN;
  END IF;

  IF v_pool.expires_at < now() THEN
    UPDATE partner_course_pool SET status = 'expired', updated_at = now() WHERE id = p_pool_id;
    RETURN QUERY SELECT FALSE, 'Cette course a expiré', NULL::UUID;
    RETURN;
  END IF;

  IF v_pool.sender_driver_id = p_claimer_driver_id THEN
    RETURN QUERY SELECT FALSE, 'Vous ne pouvez pas accepter votre propre course', NULL::UUID;
    RETURN;
  END IF;

  IF v_pool.sharing_scope IN ('favorites', 'favorites_then_network')
     AND v_pool.favorites_only_until IS NOT NULL
     AND v_pool.favorites_only_until > now() THEN
    IF NOT (p_claimer_driver_id = ANY(COALESCE(v_pool.target_driver_ids, ARRAY[]::UUID[]))) THEN
      RETURN QUERY SELECT FALSE, 'Cette course est réservée aux favoris du chauffeur pendant quelques minutes', NULL::UUID;
      RETURN;
    END IF;
  END IF;

  IF v_pool.sharing_scope = 'favorites'
     AND NOT (p_claimer_driver_id = ANY(COALESCE(v_pool.target_driver_ids, ARRAY[]::UUID[]))) THEN
    RETURN QUERY SELECT FALSE, 'Cette course est réservée aux favoris uniquement', NULL::UUID;
    RETURN;
  END IF;

  SELECT id, stripe_connect_account_id, stripe_connect_charges_enabled
  INTO v_claimer FROM drivers WHERE id = p_claimer_driver_id;

  IF v_claimer IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Chauffeur introuvable', NULL::UUID;
    RETURN;
  END IF;

  IF v_claimer.stripe_connect_account_id IS NULL OR v_claimer.stripe_connect_charges_enabled IS NOT TRUE THEN
    RETURN QUERY SELECT FALSE, 'Vous devez configurer votre compte Stripe pour accepter une course partagée', NULL::UUID;
    RETURN;
  END IF;

  UPDATE partner_course_pool
  SET status = 'claimed', claimed_by_driver_id = p_claimer_driver_id,
      claimed_at = now(), updated_at = now()
  WHERE id = p_pool_id;

  INSERT INTO shared_courses (
    course_id, sender_driver_id, receiver_driver_id, course_amount,
    commission_percentage, commission_amount, status, accepted_at, pool_id
  ) VALUES (
    v_pool.course_id, v_pool.sender_driver_id, p_claimer_driver_id,
    v_pool.course_amount, v_pool.commission_percentage, v_pool.estimated_commission,
    'accepted', now(), p_pool_id
  );

  RETURN QUERY SELECT TRUE, 'Course acceptée avec succès', v_pool.course_id;

EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT FALSE, 'Cette course est en cours d''acceptation par un autre chauffeur', NULL::UUID;
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, ('Erreur: ' || SQLERRM), NULL::UUID;
END;
$$;

-- ============================================================
-- ÉTAPE 5 : RPC re-diffusion sur annulation
-- ============================================================
CREATE OR REPLACE FUNCTION public.rebroadcast_pool_course(
  p_pool_id UUID,
  p_reason TEXT DEFAULT 'cancelled_by_receiver'
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool RECORD;
BEGIN
  SELECT * INTO v_pool FROM partner_course_pool WHERE id = p_pool_id FOR UPDATE;
  IF v_pool IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Pool introuvable';
    RETURN;
  END IF;

  UPDATE partner_course_pool
  SET status = 'available', claimed_by_driver_id = NULL, claimed_at = NULL,
      sharing_scope = 'network', target_driver_ids = NULL,
      favorites_only_until = NULL,
      rebroadcast_count = COALESCE(rebroadcast_count, 0) + 1,
      last_rebroadcast_at = now(), updated_at = now()
  WHERE id = p_pool_id;

  UPDATE shared_courses
  SET status = 'cancelled', updated_at = now()
  WHERE pool_id = p_pool_id AND status IN ('pending', 'accepted');

  RETURN QUERY SELECT TRUE, 'Course re-diffusée au réseau';
END;
$$;
