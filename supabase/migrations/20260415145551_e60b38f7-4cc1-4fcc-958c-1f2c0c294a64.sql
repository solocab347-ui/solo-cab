
CREATE OR REPLACE FUNCTION public.get_guest_booking_by_token(_token text)
RETURNS TABLE(
  id uuid, pickup_address text, destination_address text, 
  scheduled_date timestamptz, status text, guest_name text, 
  guest_estimated_price double precision, driver_name text, 
  driver_company text, driver_phone text, driver_avatar text, 
  created_at timestamptz, is_shared_course boolean, shared_drivers jsonb,
  devis_amount double precision, quote_number text, 
  final_payment_amount double precision, distance_km double precision, 
  duration_minutes integer, pickup_latitude double precision, 
  pickup_longitude double precision, destination_latitude double precision, 
  destination_longitude double precision, driver_latitude double precision, 
  driver_longitude double precision, driver_heading double precision, 
  client_rating integer, vehicle_brand text, vehicle_model text, 
  vehicle_color text, vehicle_plate text, facture_id uuid, 
  facture_number text, facture_amount double precision, 
  facture_payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_uuid uuid;
BEGIN
  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN;
  END;

  RETURN QUERY
  WITH main_driver AS (
    SELECT 
      c2.id as course_id,
      CASE 
        WHEN p.full_name IS NOT NULL AND p.full_name != '' THEN
          split_part(p.full_name, ' ', 1) || 
          CASE 
            WHEN split_part(p.full_name, ' ', 2) != '' 
            THEN ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.'
            ELSE ''
          END
        ELSE NULL
      END AS d_name,
      d.company_name AS d_company,
      CASE WHEN d.show_phone THEN p.phone ELSE NULL END AS d_phone,
      p.profile_photo_url AS d_avatar,
      d.current_latitude::double precision AS d_lat,
      d.current_longitude::double precision AS d_lng,
      0::double precision AS d_heading,
      d.vehicle_brand AS d_vehicle_brand,
      d.vehicle_model AS d_vehicle_model,
      d.vehicle_color AS d_vehicle_color,
      d.vehicle_plate AS d_vehicle_plate
    FROM courses c2
    LEFT JOIN drivers d ON c2.driver_id = d.id
    LEFT JOIN profiles p ON d.user_id = p.id
    WHERE c2.guest_tracking_token = _token_uuid
      AND c2.is_guest_booking = true
    LIMIT 1
  ),
  shared_drivers_info AS (
    SELECT 
      c3.id as course_id,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', d.id,
            'name', CASE 
              WHEN d.company_name IS NOT NULL AND d.company_name != '' THEN d.company_name
              WHEN p.full_name IS NOT NULL AND p.full_name != '' THEN
                split_part(p.full_name, ' ', 1) || 
                CASE 
                  WHEN split_part(p.full_name, ' ', 2) != '' 
                  THEN ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.'
                  ELSE ''
                END
              ELSE 'Chauffeur'
            END,
            'avatar_url', p.profile_photo_url
          )
        ) FILTER (WHERE d.id IS NOT NULL AND d.id != c3.driver_id),
        '[]'::jsonb
      ) as shared_drivers_json
    FROM courses c3
    LEFT JOIN unnest(c3.driver_ids) AS driver_id_elem ON true
    LEFT JOIN drivers d ON d.id = driver_id_elem::uuid
    LEFT JOIN profiles p ON d.user_id = p.id
    WHERE c3.guest_tracking_token = _token_uuid
      AND c3.is_guest_booking = true
    GROUP BY c3.id
  ),
  devis_info AS (
    SELECT 
      dv.course_id,
      dv.amount::double precision as devis_amount,
      dv.quote_number
    FROM devis dv
    JOIN courses c4 ON dv.course_id = c4.id
    WHERE c4.guest_tracking_token = _token_uuid
      AND c4.is_guest_booking = true
    ORDER BY dv.created_at DESC
    LIMIT 1
  ),
  facture_info AS (
    SELECT
      f.id as f_id,
      COALESCE(f.invoice_number_generated, f.invoice_number) as f_number,
      f.amount::double precision as f_amount,
      f.payment_status::text as f_payment_status,
      f.course_id
    FROM factures f
    JOIN courses c5 ON f.course_id = c5.id
    WHERE c5.guest_tracking_token = _token_uuid
      AND c5.is_guest_booking = true
    ORDER BY f.created_at DESC
    LIMIT 1
  )
  SELECT 
    c.id,
    c.pickup_address,
    c.destination_address,
    c.scheduled_date,
    c.status::text,
    c.guest_name,
    COALESCE(di.devis_amount, c.final_payment_amount::double precision, c.guest_estimated_price::double precision),
    md.d_name,
    md.d_company,
    md.d_phone,
    md.d_avatar,
    c.created_at,
    (c.driver_ids IS NOT NULL AND array_length(c.driver_ids, 1) > 1),
    COALESCE(sdi.shared_drivers_json, '[]'::jsonb),
    di.devis_amount,
    di.quote_number,
    c.final_payment_amount::double precision,
    c.distance_km::double precision,
    c.duration_minutes,
    c.pickup_latitude::double precision,
    c.pickup_longitude::double precision,
    c.destination_latitude::double precision,
    c.destination_longitude::double precision,
    md.d_lat,
    md.d_lng,
    md.d_heading,
    c.client_rating,
    md.d_vehicle_brand,
    md.d_vehicle_model,
    md.d_vehicle_color,
    md.d_vehicle_plate,
    fi.f_id,
    fi.f_number,
    fi.f_amount,
    fi.f_payment_status
  FROM courses c
  LEFT JOIN main_driver md ON md.course_id = c.id
  LEFT JOIN shared_drivers_info sdi ON sdi.course_id = c.id
  LEFT JOIN devis_info di ON di.course_id = c.id
  LEFT JOIN facture_info fi ON fi.course_id = c.id
  WHERE c.guest_tracking_token = _token_uuid
    AND c.is_guest_booking = true;
END;
$$;
