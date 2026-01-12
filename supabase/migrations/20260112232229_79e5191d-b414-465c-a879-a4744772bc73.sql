
-- 1. Mettre à jour la fonction get_guest_booking_by_token pour retourner le prix du devis au lieu du guest_estimated_price
DROP FUNCTION IF EXISTS public.get_guest_booking_by_token(uuid);

CREATE OR REPLACE FUNCTION public.get_guest_booking_by_token(_token uuid)
RETURNS TABLE(
  id uuid,
  pickup_address text,
  destination_address text,
  scheduled_date timestamptz,
  status text,
  guest_name text,
  guest_estimated_price numeric,
  driver_name text,
  driver_company text,
  driver_phone text,
  driver_avatar_url text,
  created_at timestamptz,
  is_shared_course boolean,
  shared_drivers jsonb,
  devis_amount numeric,
  quote_number text
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
  ),
  devis_info AS (
    SELECT 
      dv.course_id,
      dv.amount as devis_amount,
      dv.quote_number
    FROM devis dv
    JOIN courses c ON dv.course_id = c.id
    WHERE c.guest_tracking_token = _token
      AND c.is_guest_booking = true
    ORDER BY dv.created_at DESC
    LIMIT 1
  )
  SELECT 
    c.id,
    c.pickup_address,
    c.destination_address,
    c.scheduled_date,
    c.status::text,
    c.guest_name,
    -- IMPORTANT: Utiliser le prix du devis s'il existe, sinon l'estimation initiale
    COALESCE(di.devis_amount, c.guest_estimated_price) as guest_estimated_price,
    md.d_name,
    md.d_company,
    md.d_phone,
    md.d_avatar,
    c.created_at,
    (c.driver_ids IS NOT NULL AND array_length(c.driver_ids, 1) > 1) as is_shared_course,
    COALESCE(sdi.shared_drivers_json, '[]'::jsonb) as shared_drivers,
    di.devis_amount,
    di.quote_number
  FROM courses c
  CROSS JOIN main_driver md
  LEFT JOIN shared_drivers_info sdi ON sdi.course_id = c.id
  LEFT JOIN devis_info di ON di.course_id = c.id
  WHERE c.guest_tracking_token = _token
    AND c.is_guest_booking = true;
END;
$$;

-- 2. Synchroniser les compteurs de réservation avec le max réel utilisé pour chaque chauffeur
-- Cela corrige les compteurs qui sont supérieurs au nombre réel de réservations
UPDATE drivers d
SET reservation_counter = COALESCE(
  (
    SELECT MAX(
      CASE 
        WHEN quote_number ~ '^RES-[0-9]+$' 
        THEN CAST(REGEXP_REPLACE(quote_number, '[^0-9]', '', 'g') AS INTEGER)
        ELSE 0 
      END
    )
    FROM devis 
    WHERE driver_id = d.id
  ),
  0
)
WHERE d.reservation_counter > 0;

-- 3. S'assurer que les chauffeurs sans devis ont un compteur à 0
UPDATE drivers
SET reservation_counter = 0
WHERE id NOT IN (SELECT DISTINCT driver_id FROM devis WHERE driver_id IS NOT NULL)
AND reservation_counter > 0;

-- 4. Synchroniser les course_number avec les quote_number des devis correspondants
-- Pour éviter les désynchronisations futures
UPDATE courses c
SET course_number = dv.quote_number
FROM devis dv
WHERE dv.course_id = c.id
AND (c.course_number IS NULL OR c.course_number != dv.quote_number);
