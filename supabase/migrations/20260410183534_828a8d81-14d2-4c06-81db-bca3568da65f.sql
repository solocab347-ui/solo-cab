
-- Fix driver_wallets view to include both 'succeeded' and 'completed' statuses
CREATE OR REPLACE VIEW public.driver_wallets AS
SELECT 
  d.id AS driver_id,
  d.user_id,
  COALESCE(sum(st.gross_amount), 0::numeric) AS total_revenue,
  COALESCE(sum(st.solocab_fee_amount), 0::numeric) AS total_solocab_fees,
  COALESCE(sum(st.stripe_fee_amount), 0::numeric) AS total_stripe_fees,
  COALESCE(sum(st.net_amount), 0::numeric) AS net_earnings,
  count(st.id) AS total_courses,
  COALESCE((
    SELECT sum(st2.net_amount)
    FROM stripe_transactions st2
    WHERE st2.driver_id = d.id
      AND st2.status IN ('succeeded', 'completed')
      AND st2.stripe_transfer_id IS NULL
  ), 0::numeric) AS pending_balance,
  COALESCE((
    SELECT sum(st3.net_amount)
    FROM stripe_transactions st3
    WHERE st3.driver_id = d.id
      AND st3.status IN ('succeeded', 'completed')
      AND st3.stripe_transfer_id IS NOT NULL
  ), 0::numeric) AS paid_out_balance
FROM drivers d
LEFT JOIN stripe_transactions st ON st.driver_id = d.id AND st.status IN ('succeeded', 'completed')
GROUP BY d.id, d.user_id;

-- Update get_guest_booking_by_token to return privacy-safe driver name
CREATE OR REPLACE FUNCTION public.get_guest_booking_by_token(_token text)
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
      -- Privacy: first name + last name initial
      CASE 
        WHEN p.full_name IS NOT NULL AND p.full_name != '' THEN
          split_part(p.full_name, ' ', 1) || 
          CASE 
            WHEN split_part(p.full_name, ' ', 2) != '' 
            THEN ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.'
            ELSE ''
          END
        ELSE 'Chauffeur'
      END AS d_name,
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
