
-- Fonction pour récupérer les infos du chauffeur pour les courses entreprise acceptées
-- SECURITY DEFINER permet de contourner les RLS pour les accès non-authentifiés (guest tracking)
CREATE OR REPLACE FUNCTION public.get_company_course_driver_profile(driver_user_id uuid)
RETURNS TABLE(
  full_name text,
  profile_photo_url text,
  phone text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Retourner les infos du profil pour un chauffeur ayant accepté une course entreprise
  -- On vérifie que le driver existe et est validé
  IF EXISTS (
    SELECT 1 FROM drivers d 
    WHERE d.user_id = driver_user_id 
    AND d.status = 'validated'
  ) THEN
    RETURN QUERY
    SELECT 
      p.full_name,
      p.profile_photo_url,
      CASE 
        WHEN d.show_phone = true THEN COALESCE(d.contact_phone, p.phone)
        ELSE NULL::TEXT 
      END as phone,
      CASE 
        WHEN d.show_email = true THEN COALESCE(d.contact_email, p.email)
        ELSE NULL::TEXT 
      END as email
    FROM profiles p
    JOIN drivers d ON d.user_id = p.id
    WHERE p.id = driver_user_id;
  ELSE
    RETURN;
  END IF;
END;
$$;

-- Donner l'accès à tous (pour les pages publiques de suivi)
GRANT EXECUTE ON FUNCTION public.get_company_course_driver_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_company_course_driver_profile(uuid) TO authenticated;
