CREATE OR REPLACE FUNCTION public.publish_course_to_pool(
  p_course_id uuid,
  p_sender_driver_id uuid,
  p_commission_percentage numeric DEFAULT 20,
  p_target_favorite_ids uuid[] DEFAULT NULL,
  p_also_broadcast_network boolean DEFAULT true,
  p_favorites_window_minutes integer DEFAULT 5,
  p_message text DEFAULT NULL
)
RETURNS TABLE(success boolean, message text, pool_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_course RECORD;
  v_pool_id UUID;
  v_scope TEXT;
  v_favorites_until TIMESTAMPTZ;
  v_estimated_commission NUMERIC;
  v_solocab_fee_cents INTEGER := 50;
  v_sender_user_id UUID;
  v_course_amount NUMERIC;
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
  IF v_course.driver_id != p_sender_driver_id 
     AND COALESCE(v_course.created_by_user_id, '00000000-0000-0000-0000-000000000000'::uuid) 
         != COALESCE(v_sender_user_id, '00000000-0000-0000-0000-000000000001'::uuid) THEN
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

  v_course_amount := COALESCE(v_course.final_payment_amount, v_course.guest_estimated_price, 0);
  v_estimated_commission := ROUND(v_course_amount * p_commission_percentage / 100, 2);

  INSERT INTO partner_course_pool (
    course_id, sender_driver_id, course_amount, commission_percentage,
    estimated_commission, message, status, expires_at, sharing_scope,
    target_driver_ids, solocab_fee_cents, favorites_only_until,
    pickup_latitude, pickup_longitude
  ) VALUES (
    p_course_id, p_sender_driver_id,
    v_course_amount,
    p_commission_percentage, v_estimated_commission, p_message,
    'available',
    COALESCE(v_course.scheduled_date, now() + INTERVAL '24 hours'),
    v_scope, p_target_favorite_ids, v_solocab_fee_cents, v_favorites_until,
    v_course.pickup_latitude, v_course.pickup_longitude
  )
  RETURNING id INTO v_pool_id;

  RETURN QUERY SELECT TRUE, 'Course publiée avec succès', v_pool_id;
END;
$function$;