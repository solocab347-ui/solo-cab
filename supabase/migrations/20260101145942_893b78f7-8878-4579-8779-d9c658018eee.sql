-- Mettre à jour la fonction get_visible_fleet_managers pour inclure les champs de visibilité des compteurs
DROP FUNCTION IF EXISTS public.get_visible_fleet_managers();

CREATE FUNCTION public.get_visible_fleet_managers()
RETURNS TABLE (
  id uuid,
  company_name text,
  contact_name text,
  contact_email text,
  logo_url text,
  description text,
  driver_profile_description text,
  default_partnership_commission numeric,
  address text,
  total_drivers integer,
  total_clients integer,
  services_offered text[],
  partnership_terms text,
  show_contact_name boolean,
  show_address boolean,
  show_phone boolean,
  show_email boolean,
  contact_phone text,
  show_driver_count_public boolean,
  show_client_count_public boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    fm.id,
    fm.company_name,
    fm.contact_name,
    CASE WHEN fm.show_email THEN fm.contact_email ELSE NULL END,
    fm.logo_url,
    fm.description,
    fm.driver_profile_description,
    fm.default_partnership_commission,
    CASE WHEN fm.show_address THEN fm.address ELSE NULL END,
    fm.total_drivers,
    fm.total_clients,
    fm.services_offered,
    fm.partnership_terms,
    fm.show_contact_name,
    fm.show_address,
    fm.show_phone,
    fm.show_email,
    CASE WHEN fm.show_phone THEN fm.contact_phone ELSE NULL END,
    COALESCE(fm.show_driver_count_public, false),
    COALESCE(fm.show_client_count_public, false)
  FROM fleet_managers fm
  WHERE fm.visible_to_drivers = true;
$function$;