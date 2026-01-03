-- Update the get_course_partner_info function to hide phone after course completion
CREATE OR REPLACE FUNCTION public.get_course_partner_info(p_course_id uuid, p_client_user_id uuid)
RETURNS TABLE(
  shared_course_id uuid, 
  shared_status text, 
  partner_driver_id uuid, 
  partner_name text, 
  partner_photo text, 
  partner_company text, 
  partner_phone text, 
  partner_vehicle_model text, 
  partner_vehicle_color text, 
  partner_rating numeric, 
  partner_total_rides integer, 
  show_rating boolean, 
  show_phone boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Vérifier que l'utilisateur est bien le client de cette course
  IF NOT EXISTS (
    SELECT 1 FROM courses c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = p_course_id AND cl.user_id = p_client_user_id
  ) THEN
    RETURN;
  END IF;

  -- Retourner les infos du partenaire actif
  -- Le client peut voir le téléphone UNIQUEMENT pendant une course active (pas après completion)
  RETURN QUERY
  SELECT 
    sc.id AS shared_course_id,
    sc.status AS shared_status,
    sc.receiver_driver_id AS partner_driver_id,
    p.full_name AS partner_name,
    COALESCE(d.card_photo_url, p.profile_photo_url) AS partner_photo,
    d.company_name AS partner_company,
    -- Téléphone visible uniquement pendant course active
    CASE 
      WHEN sc.status IN ('pending', 'accepted', 'in_progress') THEN p.phone 
      ELSE NULL 
    END AS partner_phone,
    d.vehicle_model AS partner_vehicle_model,
    d.vehicle_color AS partner_vehicle_color,
    CASE WHEN COALESCE(d.show_rating_for_sharing, d.show_rating_public, false) = true THEN d.rating ELSE NULL END AS partner_rating,
    CASE WHEN COALESCE(d.show_rides_for_sharing, false) = true THEN d.total_rides ELSE NULL END AS partner_total_rides,
    COALESCE(d.show_rating_for_sharing, d.show_rating_public, false) AS show_rating,
    -- show_phone est true uniquement pendant course active
    (sc.status IN ('pending', 'accepted', 'in_progress')) AS show_phone
  FROM shared_courses sc
  JOIN drivers d ON sc.receiver_driver_id = d.id
  JOIN profiles p ON d.user_id = p.id
  WHERE sc.course_id = p_course_id
    AND sc.status IN ('pending', 'accepted', 'in_progress', 'completed')
    AND sc.cancelled_at IS NULL
  ORDER BY sc.created_at DESC
  LIMIT 1;
END;
$function$;