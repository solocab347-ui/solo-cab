
-- Add request_type column (exclusive = 1 driver, multi = multiple drivers)
ALTER TABLE public.ride_requests 
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'exclusive' 
    CHECK (request_type IN ('exclusive', 'multi'));

-- Add driver_count for display purposes
ALTER TABLE public.ride_requests 
  ADD COLUMN IF NOT EXISTS driver_count integer DEFAULT 1;

-- Update timeout default to 90 seconds for new requests
-- (timeout_at is already set per-request at creation time)

-- Create a function for atomic ride acceptance with FOR UPDATE NOWAIT
CREATE OR REPLACE FUNCTION public.atomic_accept_ride_request(
  p_ride_request_id uuid,
  p_driver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request ride_requests%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Lock the row atomically to prevent race conditions
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

  -- Check expiration
  IF v_request.timeout_at IS NOT NULL AND v_request.timeout_at < now() THEN
    UPDATE ride_requests SET status = 'expired', updated_at = now() 
    WHERE id = p_ride_request_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cette demande a expiré.',
      'expired', true
    );
  END IF;

  -- Accept the request
  UPDATE ride_requests 
  SET status = 'accepted', 
      accepted_by_driver_id = p_driver_id, 
      updated_at = now()
  WHERE id = p_ride_request_id;

  -- Cancel all sibling requests in the same group
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
    'guest_phone', v_request.guest_phone
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.atomic_accept_ride_request(uuid, uuid) TO authenticated;

-- Auto-expire ride requests function (for cron)
CREATE OR REPLACE FUNCTION public.expire_timed_out_ride_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE ride_requests 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND timeout_at IS NOT NULL
    AND timeout_at < now();
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_timed_out_ride_requests() TO service_role;
