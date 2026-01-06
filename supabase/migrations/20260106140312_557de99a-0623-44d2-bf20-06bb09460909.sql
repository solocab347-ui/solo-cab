-- Ajouter un champ pour distinguer le type d'admin (owner vs admin)
ALTER TABLE public.company_administrators 
ADD COLUMN IF NOT EXISTS admin_type text NOT NULL DEFAULT 'admin';

-- Créer un trigger pour ajouter automatiquement le créateur comme owner dans company_administrators
CREATE OR REPLACE FUNCTION public.handle_new_company_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Ajouter le créateur de l'entreprise comme administrateur principal (owner)
  INSERT INTO public.company_administrators (
    company_id,
    user_id,
    role,
    admin_type,
    is_active,
    accepted_at
  ) VALUES (
    NEW.id,
    NEW.user_id,
    'admin',
    'owner',
    true,
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_company_created_add_owner ON public.companies;
CREATE TRIGGER on_company_created_add_owner
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_company_owner();

-- Insérer les owners existants qui manquent dans company_administrators
INSERT INTO public.company_administrators (company_id, user_id, role, admin_type, is_active, accepted_at)
SELECT c.id, c.user_id, 'admin', 'owner', true, c.created_at
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_administrators ca 
  WHERE ca.company_id = c.id AND ca.user_id = c.user_id
);