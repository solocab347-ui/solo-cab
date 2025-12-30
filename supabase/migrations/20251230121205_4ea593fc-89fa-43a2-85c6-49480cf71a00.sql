-- Fix SECURITY DEFINER views by recreating with SECURITY INVOKER
-- This ensures RLS policies are enforced based on the querying user, not the view creator

-- Drop and recreate available_partner_courses view
DROP VIEW IF EXISTS public.available_partner_courses;
CREATE VIEW public.available_partner_courses
WITH (security_invoker = true)
AS
SELECT pcp.id AS pool_id,
    pcp.course_id,
    pcp.sender_driver_id,
    pcp.course_amount,
    pcp.commission_percentage,
    pcp.estimated_commission,
    pcp.message,
    pcp.expires_at,
    pcp.created_at,
    c.pickup_address,
    c.destination_address,
    c.scheduled_date,
    c.passengers_count,
    c.distance_km,
    c.duration_minutes,
    p.full_name AS sender_name,
    pr.profile_photo_url AS sender_photo,
    d.company_name AS sender_company
   FROM ((((partner_course_pool pcp
     JOIN courses c ON ((c.id = pcp.course_id)))
     JOIN drivers d ON ((d.id = pcp.sender_driver_id)))
     JOIN profiles p ON ((p.id = d.user_id)))
     LEFT JOIN profiles pr ON ((pr.id = d.user_id)))
  WHERE ((pcp.status = 'available'::text) AND (pcp.expires_at > now()));

-- Drop and recreate driver_data_isolation view
DROP VIEW IF EXISTS public.driver_data_isolation;
CREATE VIEW public.driver_data_isolation
WITH (security_invoker = true)
AS
SELECT d.id AS driver_id,
    p.full_name AS driver_name,
    count(DISTINCT c.id) AS total_clients,
    count(DISTINCT co.id) AS total_courses,
    count(DISTINCT dv.id) AS total_devis,
    count(DISTINCT f.id) AS total_factures
   FROM (((((drivers d
     LEFT JOIN profiles p ON ((p.id = d.user_id)))
     LEFT JOIN clients c ON (((c.driver_id = d.id) OR (d.id = ANY (c.driver_ids)))))
     LEFT JOIN courses co ON (((co.driver_id = d.id) OR (d.id = ANY (co.driver_ids)))))
     LEFT JOIN devis dv ON ((dv.driver_id = d.id)))
     LEFT JOIN factures f ON ((f.driver_id = d.id)))
  GROUP BY d.id, p.full_name;

-- Drop and recreate drivers_available_for_sharing view
DROP VIEW IF EXISTS public.drivers_available_for_sharing;
CREATE VIEW public.drivers_available_for_sharing
WITH (security_invoker = true)
AS
SELECT d.id,
    d.user_id,
    d.sharing_number,
    format_sharing_number(d.sharing_number) AS formatted_sharing_number,
    d.working_sectors,
    d.rating,
    d.total_rides,
    d.company_name,
    d.vehicle_brand,
    d.vehicle_model,
    p.full_name,
    p.profile_photo_url,
        CASE
            WHEN d.show_phone_for_sharing THEN p.phone
            ELSE NULL::text
        END AS phone
   FROM (drivers d
     JOIN profiles p ON ((d.user_id = p.id)))
  WHERE ((d.sharing_available = true) AND (d.partnerships_suspended = false) AND (d.status = 'validated'::driver_status) AND (d.sharing_number IS NOT NULL));

-- Drop and recreate public_driver_profiles view
DROP VIEW IF EXISTS public.public_driver_profiles;
CREATE VIEW public.public_driver_profiles
WITH (security_invoker = true)
AS
SELECT id,
    user_id,
    company_name,
    vehicle_model,
    vehicle_brand,
    vehicle_color,
    vehicle_year,
    bio,
    service_description,
    services_offered,
    vehicle_equipment,
    working_sectors,
    vehicle_photos,
    gallery_photos,
    rating,
    total_rides,
    max_passengers,
    display_driver_name,
    display_company_name,
    show_phone,
    show_email,
    card_photo_url
   FROM drivers d
  WHERE ((public_profile_enabled = true) AND (status = 'validated'::driver_status));