-- Supprimer et recréer la fonction pour supporter les courses partagées
DROP FUNCTION IF EXISTS public.get_guest_booking_by_token(uuid);

CREATE FUNCTION public.get_guest_booking_by_token(_token uuid)
RETURNS TABLE(
  id uuid,
  pickup_address text,
  destination_address text,
  scheduled_date timestamp with time zone,
  status text,
  guest_name text,
  guest_estimated_price numeric,
  driver_name text,
  driver_company text,
  driver_phone text,
  driver_avatar_url text,
  created_at timestamp with time zone,
  is_shared_course boolean,
  shared_drivers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH main_driver AS (
    SELECT 
      d.id as driver_id,
      p.full_name AS d_name,
      d.company_name AS d_company,
      CASE WHEN d.show_phone THEN p.phone ELSE NULL END AS d_phone,
      p.profile_photo_url AS d_avatar
    FROM courses c
    JOIN drivers d ON c.driver_id = d.id
    JOIN profiles p ON d.user_id = p.id
    WHERE c.guest_tracking_token = _token
      AND c.is_guest_booking = true
    LIMIT 1
  ),
  shared_drivers_info AS (
    SELECT 
      c.id as course_id,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', d.id,
            'name', COALESCE(d.company_name, p.full_name),
            'avatar_url', p.profile_photo_url
          )
        ) FILTER (WHERE d.id IS NOT NULL AND d.id != c.driver_id),
        '[]'::jsonb
      ) as shared_drivers_json
    FROM courses c
    LEFT JOIN unnest(c.driver_ids) AS driver_id_elem ON true
    LEFT JOIN drivers d ON d.id = driver_id_elem::uuid
    LEFT JOIN profiles p ON d.user_id = p.id
    WHERE c.guest_tracking_token = _token
      AND c.is_guest_booking = true
    GROUP BY c.id
  )
  SELECT 
    c.id,
    c.pickup_address,
    c.destination_address,
    c.scheduled_date,
    c.status,
    c.guest_name,
    c.guest_estimated_price,
    md.d_name,
    md.d_company,
    md.d_phone,
    md.d_avatar,
    c.created_at,
    (c.driver_ids IS NOT NULL AND array_length(c.driver_ids, 1) > 1) as is_shared_course,
    COALESCE(sdi.shared_drivers_json, '[]'::jsonb) as shared_drivers
  FROM courses c
  CROSS JOIN main_driver md
  LEFT JOIN shared_drivers_info sdi ON sdi.course_id = c.id
  WHERE c.guest_tracking_token = _token
    AND c.is_guest_booking = true;
END;
$$;