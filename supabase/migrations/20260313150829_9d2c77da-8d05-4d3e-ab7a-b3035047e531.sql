
-- 12. COURSE INVITATIONS - token is UUID type
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.course_invitations;

DROP FUNCTION IF EXISTS public.get_course_invitation_by_token(text);
DROP FUNCTION IF EXISTS public.get_course_invitation_by_token(uuid);

CREATE FUNCTION public.get_course_invitation_by_token(p_token uuid)
RETURNS SETOF public.course_invitations
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.course_invitations WHERE token = p_token LIMIT 1; $$;

-- 13. FLEET INVITATIONS - check which ones still need creating
DROP POLICY IF EXISTS "Anyone can view pending invitations" ON public.fleet_manager_invitations;
DROP POLICY IF EXISTS "Anyone can view unused invitations" ON public.fleet_driver_invitations;
DROP POLICY IF EXISTS "Anyone can view pending fleet client invitations" ON public.fleet_client_invitations;
DROP POLICY IF EXISTS "Anyone can view pending invitations" ON public.company_employee_invitations;

DROP FUNCTION IF EXISTS public.get_fleet_manager_invitation_by_token(text);
CREATE FUNCTION public.get_fleet_manager_invitation_by_token(p_token text)
RETURNS SETOF public.fleet_manager_invitations
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.fleet_manager_invitations WHERE token = p_token AND used = false LIMIT 1; $$;

DROP FUNCTION IF EXISTS public.get_fleet_driver_invitation_by_token(text);
CREATE FUNCTION public.get_fleet_driver_invitation_by_token(p_token text)
RETURNS SETOF public.fleet_driver_invitations
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.fleet_driver_invitations WHERE token = p_token AND used = false LIMIT 1; $$;

DROP FUNCTION IF EXISTS public.get_fleet_client_invitation_by_token(text);
CREATE FUNCTION public.get_fleet_client_invitation_by_token(p_token text)
RETURNS SETOF public.fleet_client_invitations
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.fleet_client_invitations WHERE token = p_token AND status = 'pending' LIMIT 1; $$;

DROP FUNCTION IF EXISTS public.get_company_employee_invitation_by_token(text);
CREATE FUNCTION public.get_company_employee_invitation_by_token(p_token text)
RETURNS SETOF public.company_employee_invitations
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.company_employee_invitations WHERE token = p_token AND is_used = false LIMIT 1; $$;

-- 14. WEEKLY SETTLEMENTS
DROP POLICY IF EXISTS "Authenticated can view settlements" ON public.weekly_settlements;
