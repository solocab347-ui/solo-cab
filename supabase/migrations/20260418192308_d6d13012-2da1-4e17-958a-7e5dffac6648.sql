-- ============================================================
-- FILET DE SÉCURITÉ: Création automatique des factures manquantes
-- Garantit qu'aucune course terminée ne reste sans facture
-- (clients libres, exclusifs, guests, peu importe le mode de paiement)
-- ============================================================

-- 1) Fonction qui crée une facture minimale si manquante
CREATE OR REPLACE FUNCTION public.ensure_invoice_for_completed_course(_course_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_course RECORD;
  v_devis RECORD;
  v_invoice_number text;
  v_amount numeric;
  v_payment_method text;
  v_payment_status payment_status;
  v_paid_at timestamptz;
  v_is_stripe_driver boolean := false;
  v_solocab_fee numeric := 0;
  v_stripe_fee numeric := 0;
  v_total_fees numeric := 0;
  v_net_to_driver numeric;
  v_new_id uuid;
BEGIN
  -- Skip si déjà facturée
  SELECT id INTO v_existing_id FROM public.factures WHERE course_id = _course_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Charger la course
  SELECT id, driver_id, client_id, payment_method, payment_status, distance_km,
         guest_estimated_price, deposit_amount, deposit_status, status
  INTO v_course
  FROM public.courses
  WHERE id = _course_id;

  IF v_course.id IS NULL OR v_course.status <> 'completed' THEN
    RETURN NULL;
  END IF;

  -- Trouver le devis accepté (ou le plus récent)
  SELECT id, amount, base_price, distance_price, time_price, quote_number,
         discount_amount, promo_code, evening_surcharge_amount,
         weekend_surcharge_amount, peak_hours_surcharge_amount,
         pricing_source, city_pricing_name, distance_km
  INTO v_devis
  FROM public.devis
  WHERE course_id = _course_id
  ORDER BY (status = 'accepted') DESC, created_at DESC
  LIMIT 1;

  IF v_devis.id IS NULL THEN
    RAISE LOG '[ensure_invoice] No devis for course %', _course_id;
    RETURN NULL;
  END IF;

  -- Auto-accepter si pas déjà accepté
  UPDATE public.devis
  SET status = 'accepted', accepted_at = COALESCE(accepted_at, now())
  WHERE id = v_devis.id AND status <> 'accepted';

  v_invoice_number := COALESCE(v_devis.quote_number, 'FAC-' || substr(_course_id::text, 1, 8));
  v_amount := COALESCE(v_devis.amount, 0);

  -- Détection Stripe Connect
  SELECT (stripe_connect_account_id IS NOT NULL
          AND stripe_connect_charges_enabled = true)
  INTO v_is_stripe_driver
  FROM public.drivers WHERE id = v_course.driver_id;

  -- Frais
  IF v_is_stripe_driver AND v_course.payment_method IN ('stripe', 'card') THEN
    v_solocab_fee := 0.50;
    v_stripe_fee := round((v_amount * 0.015 + 0.25)::numeric, 2);
    v_payment_method := 'stripe';
    v_payment_status := 'paid';
    v_paid_at := now();
  ELSIF v_course.payment_method = 'cash' THEN
    v_payment_method := 'cash';
    v_payment_status := COALESCE(v_course.payment_status, 'pending');
    v_paid_at := CASE WHEN v_course.payment_status = 'paid' THEN now() ELSE NULL END;
  ELSIF v_course.payment_method = 'card' THEN
    v_payment_method := 'card';
    v_payment_status := COALESCE(v_course.payment_status, 'pending');
    v_paid_at := CASE WHEN v_course.payment_status = 'paid' THEN now() ELSE NULL END;
  ELSE
    v_payment_method := COALESCE(v_course.payment_method, 'cash');
    v_payment_status := COALESCE(v_course.payment_status, 'pending');
    v_paid_at := NULL;
  END IF;

  v_total_fees := v_solocab_fee + v_stripe_fee;
  v_net_to_driver := round((v_amount - v_total_fees)::numeric, 2);

  INSERT INTO public.factures (
    driver_id, course_id, devis_id, client_id,
    invoice_number, amount, discount_amount, promo_code,
    payment_method, payment_status, paid_at,
    base_price, distance_price, time_price,
    evening_surcharge_amount, weekend_surcharge_amount, peak_hours_surcharge_amount,
    pricing_source, city_pricing_name, distance_km,
    is_stripe_payment, solocab_fee_amount, stripe_fee_amount,
    total_fees_amount, net_amount_to_driver,
    deposit_amount, deposit_status,
    final_payment_amount
  ) VALUES (
    v_course.driver_id, _course_id, v_devis.id, v_course.client_id,
    v_invoice_number, v_amount, COALESCE(v_devis.discount_amount, 0), v_devis.promo_code,
    v_payment_method, v_payment_status, v_paid_at,
    COALESCE(v_devis.base_price, 0), COALESCE(v_devis.distance_price, 0), COALESCE(v_devis.time_price, 0),
    COALESCE(v_devis.evening_surcharge_amount, 0), COALESCE(v_devis.weekend_surcharge_amount, 0), COALESCE(v_devis.peak_hours_surcharge_amount, 0),
    v_devis.pricing_source, v_devis.city_pricing_name, COALESCE(v_devis.distance_km, v_course.distance_km),
    v_is_stripe_driver, v_solocab_fee, v_stripe_fee,
    v_total_fees, v_net_to_driver,
    COALESCE(v_course.deposit_amount, 0), v_course.deposit_status,
    v_amount - COALESCE(v_course.deposit_amount, 0)
  )
  RETURNING id INTO v_new_id;

  RAISE LOG '[ensure_invoice] Created invoice % for course %', v_invoice_number, _course_id;
  RETURN v_new_id;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ensure_invoice] Failed for course %: % %', _course_id, SQLERRM, SQLSTATE;
  RETURN NULL;
END;
$$;

-- 2) Trigger AFTER UPDATE sur courses: filet de sécurité
CREATE OR REPLACE FUNCTION public.trg_auto_create_invoice_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.ensure_invoice_for_completed_course(NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[trg_auto_create_invoice] Non-blocking failure for course %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_invoice_on_complete ON public.courses;
CREATE TRIGGER auto_create_invoice_on_complete
AFTER UPDATE OF status ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_create_invoice_on_complete();

-- 3) BACKFILL: Toutes les courses completed sans facture
DO $$
DECLARE
  r RECORD;
  result_id uuid;
BEGIN
  FOR r IN
    SELECT c.id
    FROM public.courses c
    LEFT JOIN public.factures f ON f.course_id = c.id
    WHERE c.status = 'completed' AND f.id IS NULL
  LOOP
    SELECT public.ensure_invoice_for_completed_course(r.id) INTO result_id;
    RAISE LOG '[backfill] Course % -> facture %', r.id, result_id;
  END LOOP;
END$$;