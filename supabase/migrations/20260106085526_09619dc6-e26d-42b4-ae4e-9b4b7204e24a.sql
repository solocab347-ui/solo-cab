-- Create a function to get company_id for current user
CREATE OR REPLACE FUNCTION public.get_company_id_for_user(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM companies WHERE companies.user_id = get_company_id_for_user.user_id LIMIT 1;
$$;

-- Add RLS policy for companies to view their factures
CREATE POLICY "Companies can view their factures" 
ON public.factures 
FOR SELECT 
USING (company_id = get_company_id_for_user(auth.uid()));