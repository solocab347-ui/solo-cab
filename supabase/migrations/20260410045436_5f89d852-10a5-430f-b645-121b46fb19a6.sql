CREATE OR REPLACE FUNCTION public.atomic_accept_ride_request(p_ride_request_id uuid, p_driver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request ride_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request 
  FROM ride_requests 
  WHERE id = p_ride_request_id 
    AND selected_driver_id = p_driver_id
    AND status = 'pending'
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cette demande a déjà été prise ou n''est plus disponible.',
      'already_taken', true
    );
  END IF;

  IF v_request.timeout_at IS NOT NULL AND v_request.timeout_at < now() THEN
    UPDATE ride_requests SET status = 'expired', updated_at = now() 
    WHERE id = p_ride_request_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cette demande a expiré.',
      'expired', true
    );
  END IF;

  UPDATE ride_requests 
  SET status = 'accepted', 
      accepted_by_driver_id = p_driver_id, 
      updated_at = now()
  WHERE id = p_ride_request_id;

  IF v_request.request_group_id IS NOT NULL THEN
    UPDATE ride_requests 
    SET status = 'expired', updated_at = now()
    WHERE request_group_id = v_request.request_group_id
      AND id != p_ride_request_id
      AND status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'request_type', v_request.request_type,
    'request_group_id', v_request.request_group_id,
    'client_id', v_request.client_id,
    'pickup_address', v_request.pickup_address,
    'destination_address', v_request.destination_address,
    'pickup_latitude', v_request.pickup_latitude,
    'pickup_longitude', v_request.pickup_longitude,
    'destination_latitude', v_request.destination_latitude,
    'destination_longitude', v_request.destination_longitude,
    'distance_km', v_request.distance_km,
    'estimated_price', v_request.estimated_price,
    'payment_method', v_request.payment_method,
    'scheduled_date', v_request.scheduled_date,
    'guest_name', v_request.guest_name,
    'guest_email', v_request.guest_email,
    'guest_phone', v_request.guest_phone,
    'stripe_customer_id', v_request.stripe_customer_id,
    'stripe_payment_method_id', v_request.stripe_payment_method_id
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Course en cours d''attribution, réessayez.',
      'locked', true
    );
END;
$$;